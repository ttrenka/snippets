using System;
using System.Collections;
using System.Data;
using System.IO;
using System.Net ;
using System.Text ;
using DepartmentZed;
using DepartmentZed.eCommerce;

namespace DepartmentZed.Automation {
	public class AmazonUploadTypes {
		public static string FulfillmentData = "_POST_FLAT_FILE_FULFILLMENT_DATA_" ;
	}
	public class AmazonShipmentConfirmation : IPackage {
		private string connectionString ;
		private string id ;
		private string name;
		private string amazonUri ;
		private string user;
		private string pwd;

		//	used for methods here.
		private string typeString = "multipart/related;boundary=----------MULTIPART_BOUNDARY_eeebd415d71----------";
		private string carrierCode = "700";
		private string carrierName = "FedEx";
		private string trackingNumber = "";
		private string shipMethod = "Ground";

		public string MerchantId {
			get { return id ; }
			set { id = value ; }
		}
		public string MerchantName {
			get { return name ; }
			set { name = value ; }
		}
		public string AmazonUri {
			get { return amazonUri ; }
			set { amazonUri = value ; }
		}
		public string User {
			get { return user ; }
			set { user = value ; }
		}
		public string Password {
			get { return pwd ; }
			set { pwd = value ; }
		}
		public AmazonShipmentConfirmation() : this(""){	}
		public AmazonShipmentConfirmation(string cn){ 
			connectionString = cn ;
		}
		public void SetConnectionString(string cn) {
			connectionString = cn ;
		}

		public void Execute() {
			StringWriter sw = new StringWriter();
			string sql;
			DataRowCollection rows;
			ArrayList keys = new ArrayList();

			sql = "SELECT DISTINCT "
				+ " o.id AS OrderNumber,"
				+ "	oa.AmazonOrderId, "
				+ "	oi.AmazonOrderItemId, "
				+ "	oi.Quantity, "
				+ "	o.PostedOn "
				+ "FROM usrOrder o "
				+ "INNER JOIN usrOrderItem oi "
				+ "	ON oi.usrOrder = o.id "
				+ "INNER JOIN usrOrderAmazon oa "
				+ "	ON oa.usrOrder = o.id "
				+ "WHERE o.CurrentStatus = '" + OrderStatuses.Fulfilled + "' "
				+ "	AND IsNull(oa.IsConfirmed, 0) = 0";
			rows = Utilities.GetRecordSet(sql, connectionString);

			if (rows.Count > 0) {
				//	write the header line
				sw.WriteLine(
					"order-id"
					+ "\torder-item-id"
					+ "\tquantity"
					+ "\tship-date"
					+ "\tcarrier-code"
					+ "\tcarrier-name"
					+ "\ttracking-number"
					+ "\tship-method"
				);

				for (int i = 0; i < rows.Count; i++){
					DataRow dr = rows[i];
					sw.WriteLine(
						(string)dr["AmazonOrderId"]
						+ "\t" + (string)dr["AmazonOrderItemId"]
						+ "\t" + (int)dr["Quantity"]
						+ "\t" + ((DateTime)dr["PostedOn"]).ToString("s")
						+ "\t" + carrierCode
						+ "\t" + carrierName
						+ "\t" + trackingNumber
						+ "\t" + shipMethod
					);
					keys.Add((int)dr["OrderNumber"]);
				}
			}

			// we have data, send to Amazon
			if (sw.ToString().Length > 0) postConfirmation(AmazonUploadTypes.FulfillmentData, sw.ToString());

			//	mark the orders sent as confirmed to amazon.
			for (int i = 0; i < keys.Count; i++){
				sql = "UPDATE usrOrder SET CurrentStatus = '" + OrderStatuses.Confirmed + "', PostedOn=GetDate() "
					+ "WHERE id = " + keys[i];
				Utilities.ExecuteNonQuery(sql, connectionString);

				sql = "UPDATE usrOrderAmazon SET IsConfirmed=1, ConfirmedOn=GetDate() "
					+ "WHERE usrOrder = " + keys[i];
				Utilities.ExecuteNonQuery(sql, connectionString);

				sql = "DELETE FROM usrOrderStatus "
					+ "WHERE usrOrder = " + keys[i]
					+ " AND OrderStatus = '" + OrderStatuses.Confirmed + "'";
				Utilities.ExecuteNonQuery(sql, connectionString);

				sql = "INSERT INTO usrOrderStatus (usrOrder, OrderStatus, PostedOn, Comments) "
					+ "VALUES ("
					+ keys[i] + ","
					+ "'" + OrderStatuses.Confirmed + "', "
					+ "GetDate(),"
					+ "'Confirmation posted to Amazon by DepartmentZed TaskManager.'"
					+ ")";
				Utilities.ExecuteNonQuery(sql, connectionString);
			}
			return;
		}

		private bool postConfirmation(string messageType, string file){
			string body = "\r\n------------MULTIPART_BOUNDARY_eeebd415d71----------\r\n"
				+ "content-type: text/xml; charset=\"UTF-8\"\r\n\r\n"
				+ "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
				+ "<ns0:Envelope xmlns:ns0=\"http://schemas.xmlsoap.org/soap/envelope/\">"
				+ "<ns0:Body ns0:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\" "
				+ "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" "
				+ "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" "
				+ "xmlns:SOAP-ENC=\"http://schemas.xmlsoap.org/soap/encoding/\">"
				+ "<postDocument>"
				+ "<merchant xsi:type=\"ns0:Merchant\" xmlns:ns0=\"nsMerchantDataExchange\">"
				+ "<merchantName xsi:type=\"xsd:string\">"
				+ name
				+ "</merchantName>"
				+ "<merchantIdentifier xsi:type=\"ns0:MerchantIdentifier\">"
				+ id
				+ "</merchantIdentifier>"
				+ "</merchant>"
				+ "<messageType xsi:type=\"ns1:MessageType\" "
				+ "xmlns:ns1=\"nsMerchantDataExchange\">"
				+ messageType
				+ "</messageType>"
				+ "</postDocument>"
				+ "</ns0:Body>"
				+ "</ns0:Envelope>\r\n"
				+ "------------MULTIPART_BOUNDARY_eeebd415d71----------\r\n"
				+ "content-type: text/xml\r\n"
				+ file
				+ "\r\n------------MULTIPART_BOUNDARY_eeebd415d71------------\r\n";

			WebClient wc = new WebClient() ;
			wc.Headers.Add("Authorization", "Basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes(user + ":" + pwd)));
			wc.Headers.Add("Content-Type", typeString);
			string response = Encoding.UTF8.GetString(wc.UploadData(amazonUri, Encoding.UTF8.GetBytes(body)));
			return true ;
		}
	}
}
