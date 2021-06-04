using System;
using System.Collections;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Text;
using EnterpriseDT.Net.Ftp;
using DepartmentZed;
using DepartmentZed.eCommerce;
using Zirh.Data;

namespace Zirh.Automation {
	public class Fulfillment : IPackage	{
		private string ftpUri ;
		private string ftpDirectory;
		private string user;
		private string pwd;
		private string connectionString ;
		private string errorEmails = "";
		private Hashtable files = new Hashtable();
		private OrderList orders = new OrderList();

		public string FtpUri {
			get { return ftpUri ; }
			set { ftpUri = value ; }
		}
		public string Directory {
			get { return ftpDirectory ; }
			set { ftpDirectory = value ; }
		}
		public string User {
			get { return user ; }
			set { user = value ; }
		}
		public string Password {
			get { return pwd ; }
			set { pwd = value ; }
		}
		public string ErrorEmails {
			get { return errorEmails ; }
			set { errorEmails = value ; }
		}

		public Fulfillment() : this("") {}
		public Fulfillment(string cn) {
			connectionString = cn ;
		}

		//	remove this the next time it gets deployed over
		private string get2DayCode(string code){
			DateTime now = DateTime.Now;
			if (now.Year==2005 && now.Month==12 && now.Day >= 16 && now.Day <=22){
				if (code=="700") return "705";
				if (code=="714") return "721";
				if (code=="715") return "722";
				if (code=="716") return "723";
			}
			return code;
		}

		private string clean(string s){
			return s.Replace("\r\n", "\\n")
					.Replace("\n", "\\n")
					.Replace("\r", "\\n")
					.Replace("|", "")
					.Replace(";", ",")
					.Replace("\"", "");
		}

		private string format(Order o){
			string comments = String.Empty;
			if (o.IsGiftWrapped) {
				comments = clean(o.GiftComments);
			}

			return "\"SOURCEDOC|CHARGECUST|CUSTID|SHIPTONAME|ADDRESS1|ADDRESS2|CITY|STATE|ZIPCODE|COUNTRY|SHIPTOPHONE|ORDERDATE|CARRIERID|SHIPTOEMAIL|REMARKS|SRCPORELEASE|;"
				+ o.OrderNumber + "|"		//	order id
				+ "" + "|"		//	supposed to be the cust id?
				+ "" + "|"			//	leave blank?
				+ clean(o.ShippingAddress.FullName) + "|"		//	name on shipping address
				+ clean(o.ShippingAddress.Address1) + "|"		//	shipping address.
				+ clean(o.ShippingAddress.Address2) + "|"
				+ clean(o.ShippingAddress.City) + "|"
				+ clean(o.ShippingAddress.Region) + "|"
				+ clean(o.ShippingAddress.PostalCode) + "|"
				+ o.ShippingAddress.Country + "|"
				+ clean(o.ShippingAddress.PhoneHome) + "|"
				+ o.PostedOn.ToString("MM/dd/yyyy") + "|"		//	orderstatus['N'].postedon
				+ get2DayCode(o.ShippingInformation.CarrierCode) + "|"		//	shipping carrier code.
				+ clean(o.Email) + "|"
				+ comments + "|"			//	gfitwrap stuff.
				+ "" + "|"	//	leave empty
				+ "\"" ;
		}

		private string formatItems(Order o){
			StringBuilder sb = new StringBuilder();
			CartItems ci = o.Items;
			for (int i = 0; i < ci.Count; i++) {
				string sku = ci[i].SKU;
				if (sku.IndexOf("-") > -1) {
					sku = sku.Substring(sku.Length - 7, 7);
				}
				sb.Append(
					"\"LINENO|SOURCEDOC|UOMCODE|ITEMID|QTYORDER|LINETOTAL|UNITPRICE|;"
					+ (i + 1) + "|"
					+ o.OrderNumber + "|"
					+ "EA|"
					+ "31-" + sku + "|"
					+ ci[i].Quantity + "|"
					+ ci[i].LineTotal + "|"
					+ ci[i].Price + "|"
					+ "\"\r\n"
				);
			}
			if (o.IsGiftWrapped) {
				CartItem gw = o.GiftWrapping;
				sb.Append(
					"\"LINENO|SOURCEDOC|UOMCODE|ITEMID|QTYORDER|LINETOTAL|UNITPRICE|;"
					+ (ci.Count + 1) + "|"
					+ o.OrderNumber + "|"
					+ "EA|"
					+ "31-" + gw.SKU.Substring(gw.SKU.Length - 7, 7) + "|"
					+ gw.Quantity + "|"
					+ gw.LineTotal + "|"
					+ gw.Price + "|"
					+ "\"\r\n"
				);
			}
			return sb.ToString();
		}

		
		public void SetConnectionString(string cn){
			connectionString = cn ;
		}

 		public void Execute() {
			//	init the catalog if needed
			if (!Catalog.IsInitialized) Catalog.Initialize(connectionString);

			string sql;
			DataRowCollection rows;

			sql = "SELECT * FROM usrOrder "
				+ " WHERE CurrentStatus = '" + OrderStatuses.NewOrder + "' "
				+ " AND OrderType NOT IN ('CREDIT','VOID') "
				+ " AND IsNull(CarrierCode, '') <> '' "
				+ " ORDER BY id ";
			rows = Utilities.GetRecordSet(sql, connectionString);

			//	get all new orders and fill them out.
			for (int i = 0; i < rows.Count; i++) {
				Order o = new Order(rows[i], connectionString);
				orders.Add(o);
				files[o.OrderNumber + "worder.txt"] = format(o);
				files[o.OrderNumber + "worderline.txt"] = formatItems(o);
			}

			//	ftp the pig
			try {
				FTPClient ftp = new FTPClient(ftpUri);
				ftp.DebugResponses(true);
				ftp.Login(user, pwd);
				ftp.TransferType = FTPTransferType.BINARY;
				if (ftpUri == "dept-z.mine.nu") ftp.ConnectMode = FTPConnectMode.ACTIVE;
				ftp.ChDir(ftpDirectory);

				foreach(string key in files.Keys){
					byte[] ba = Encoding.ASCII.GetBytes((string)files[key]);
					ftp.Put(ba, key);
				}
				ftp.Quit();

				sql = "DELETE FROM usrOrderStatus "
					+ "WHERE usrOrder IN (SELECT id FROM usrOrder WHERE currentStatus = '" + OrderStatuses.NewOrder + "') "
					+ "AND OrderStatus = '" + OrderStatuses.InProgress + "' ";
				Utilities.ExecuteNonQuery(sql, connectionString);

				sql = "INSERT INTO usrOrderStatus (usrOrder, OrderStatus, PostedOn, Comments)"
					+ "SELECT DISTINCT id, '" + OrderStatuses.InProgress + "', GETDATE(), 'Posted to TripleFin on " + DateTime.Now.ToLongDateString() + " at " + DateTime.Now.ToLongTimeString() + " by Automated ZIRH TaskManager.' "
					+ "FROM usrOrder WHERE CurrentStatus = '" + OrderStatuses.NewOrder + "' ";
				Utilities.ExecuteNonQuery(sql, connectionString);

				sql = "UPDATE usrOrder "
					+ "SET CurrentStatus = '" + OrderStatuses.InProgress + "', "
					+ "PostedOn = GETDATE() "
					+ "WHERE CurrentStatus = '" + OrderStatuses.NewOrder + "' ";
				Utilities.ExecuteNonQuery(sql, connectionString);
			} catch (Exception ex) {
				if (errorEmails.Length > 0) {
					string msg = "There was an error FTPing orders to Triplefin.  Message as follows:\r\n\r\n" 
						+ ex.Message 
						+ "\r\n\r\nSource:\r\n" 
						+ ex.Source
						+ "\r\n\r\nAffected Orders:\r\n" ;
					for (int i = 0; i < orders.Count; i++) {
						msg += orders[i].OrderNumber + "\r\n";
					}
					msg += "\r\n\r\nHave fun.";
					Utilities.SendMail(
						"customercare@zirh.com",
						errorEmails,
						"Fulfillment package error on " + DateTime.Now.ToString("g"),
						msg
					);
				}
			}
			return;
		}
	}
}