using System;
using System.Collections;
using System.Data ;
using System.IO;
using System.Net ;
using System.Text ;
using System.Xml ;
using DepartmentZed;
using DepartmentZed.eCommerce;
using Zirh.Data;

namespace Zirh.Automation {
	public sealed class AmazonReportTypes {
		public static readonly string OrdersData = "_GET_FLAT_FILE_ORDERS_DATA_" ; 
		public static readonly string PaymentSettlementData = "_GET_FLAT_FILE_PAYMENT_SETTLEMENT_DATA_" ;
		public static readonly string OpenListingsData = "_GET_FLAT_FILE_OPEN_LISTINGS_DATA_" ;
	}

	public class AmazonOrders : IPackage {
		#region properties
		private string connectionString ;
		private string id ;
		private string name;
		private string amazonUri ;
		private string user;
		private string pwd;
		private int nOrders = 5;
		#endregion
		#region fields
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
		public int NumberOfOrders {
			get { return nOrders; }
			set { nOrders = value; }
		}
		#endregion
		#region constructors
		public AmazonOrders() : this("") { }
		public AmazonOrders(string cn){ 
			connectionString = cn ;
		}
		#endregion
		public void SetConnectionString(string cn){
			connectionString = cn ;
		}

		public void Execute() {
			string[] docs = getPendingOrderDocumentIds(AmazonReportTypes.OrdersData, nOrders);
			for (int i = 0; i < docs.Length; i++) getDocument(docs[i]);
		}

		private string[] getPendingOrderDocumentIds(string reportType, int howMany) {
			ArrayList result = new ArrayList();
			string body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
				+ "<ns0:Envelope xmlns:ns0=\"http://schemas.xmlsoap.org/soap/envelope/\">"
				+ "<ns0:Body ns0:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\" "
				+ "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" "
				+ "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" "
				+ "xmlns:SOAP-ENC=\"http://schemas.xmlsoap.org/soap/encoding/\">"
				+ "<ns0:getLastNPendingDocumentInfo xmlns:ns0=\"nsMerchantDataExchange\">"
				+ "<merchant xsi:type=\"ns0:Merchant\">"
				+ "<merchantName xsi:type=\"xsd:string\">"
				+ name
				+ "</merchantName>"
				+ "<merchantIdentifier xsi:type=\"ns0:MerchantIdentifier\">"
				+ id
				+ "</merchantIdentifier>"
				+ "</merchant>"
				+ "<messageType xsi:type=\"ns0:MessageType\">"
				+ reportType
				+ "</messageType>"
				+ "<howMany xsi:type=\"xsd:int\">"
				+ howMany
				+ "</howMany>"
				+ "</ns0:getLastNPendingDocumentInfo>"
				+ "</ns0:Body>"
				+ "</ns0:Envelope>" ;

			WebClient wc = new WebClient() ;
			wc.Headers.Add("Authorization", "Basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes(user + ":" + pwd)));
			wc.Headers.Add("Content-Type", "text/xml");
			string response = Encoding.UTF8.GetString(wc.UploadData(amazonUri, Encoding.UTF8.GetBytes(body)));
			XmlDocument doc = new XmlDocument();
			doc.LoadXml(response) ;

			XmlNodeList nl = doc.DocumentElement.SelectNodes("//documentID");
			for (int i = 0; i < nl.Count; i++) result.Add((string)((XmlElement)nl[i]).InnerText) ;
			return (string[])result.ToArray("".GetType()); 
		}

		private void getDocument(string docId) {
			string body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
				+ "<ns0:Envelope xmlns:ns0=\"http://schemas.xmlsoap.org/soap/envelope/\">"
				+ "<ns0:Body ns0:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\" "
				+ "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" "
				+ "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" "
				+ "xmlns:SOAP-ENC=\"http://schemas.xmlsoap.org/soap/encoding/\">"
				+ "<ns0:getDocument xmlns:ns0=\"nsMerchantDataExchange\">"
				+ "<merchant xsi:type=\"ns0:Merchant\">"
				+ "<merchantName xsi:type=\"xsd:string\">"
				+ name
				+ "</merchantName>"
				+ "<merchantIdentifier xsi:type=\"ns0:MerchantIdentifier\">"
				+ id
				+ "</merchantIdentifier>"
				+ "</merchant>"
				+ "<documentIdentifier xsi:type=\"ns0:DocumentID\">"
				+ docId
				+ "</documentIdentifier>"
				+ "</ns0:getDocument>"
				+ "</ns0:Body>"
				+ "</ns0:Envelope>" ;

			WebClient wc = new WebClient() ;
			wc.Headers.Add("Authorization", "Basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes(user + ":" + pwd)));
			wc.Headers.Add("Content-Type", "text/xml");
			string response = Encoding.UTF8.GetString(wc.UploadData(amazonUri, Encoding.UTF8.GetBytes(body)));

			try {
				if (response.Length > 0) {
					string splitter = "application/binary" ;
					string data = response.Substring(response.IndexOf(splitter) + splitter.Length + 4);
					inputOrder(data);
				}
				acknowledgeDocument(docId);
			} catch (Exception ex){
				Utilities.SaveEmails = true;
				string data = "";
				if (response.Length > 0) {
					string splitter = "application/binary" ;
					data = response.Substring(response.IndexOf(splitter) + splitter.Length + 4);
				}
				string message = "There was an error with the Amazon import order functionality.  Here's some info:\r\n\r\n"
					+ "Error as reported: \r\n-----------------------------------\r\n" + ex.Message + "\r\n\r\n"
					+ "Document ID: " + docId + "\r\n"
					+ "Data transmitted from Amazon:\r\n--------------------------------\r\n"
					+ data + "\r\n\r\n"
					+ "This document was NOT acknowledged in the Amazon system.";
				Utilities.SendMail("support@zirh.com", "rkenney@zirh.com","Error within Amazon order import, " + DateTime.Now.ToString(), message);
				Utilities.SaveEmails = false;
			}
		}

		private bool acknowledgeDocument(string documentId) {
			string body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
				+ "<ns0:Envelope xmlns:ns0=\"http://schemas.xmlsoap.org/soap/envelope/\">"
				+ "<ns0:Body ns0:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\" "
				+ "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" "
				+ "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" "
				+ "xmlns:SOAP-ENC=\"http://schemas.xmlsoap.org/soap/encoding/\">"
				+ "<ns0:postDocumentDownloadAck xmlns:ns0=\"nsMerchantDataExchange\">"
				+ "<merchant xsi:type=\"ns0:Merchant\">"
				+ "<merchantName xsi:type=\"xsd:string\">"
				+ name
				+ "</merchantName>"
				+ "<merchantIdentifier xsi:type=\"ns0:MerchantIdentifier\">"
				+ id
				+ "</merchantIdentifier>"
				+ "</merchant>"
				+ "<documentIdentifierArray SOAP-ENC:arrayType=\"ns0:DocumentID[1]\">"
				+ "<item xsi:type=\"ns0:DocumentID\">"
				+ documentId
				+ "</item>"
				+ "</documentIdentifierArray>"
				+ "</ns0:postDocumentDownloadAck>"
				+ "</ns0:Body>"
				+ "</ns0:Envelope>" ;

			WebClient wc = new WebClient() ;
			wc.Headers.Add("Authorization", "Basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes(user + ":" + pwd)));
			wc.Headers.Add("Content-Type", "text/xml");
			string response = Encoding.UTF8.GetString(wc.UploadData(amazonUri, Encoding.UTF8.GetBytes(body)));
			XmlDocument doc = new XmlDocument();
			doc.LoadXml(response) ;
			XmlElement node = (XmlElement)doc.DocumentElement.SelectSingleNode("//documentDownloadAckProcessingStatus") ;
			return (node != null) ;
		}

		private bool inputOrder(string data) {
			int defaultId = 90000;
			string sql;
			DataRowCollection rows;

			//	clean out the table first.
 			sql = "DELETE FROM atAmazon";
			Utilities.ExecuteNonQuery(sql, connectionString);

			//	get doc info and put it in the table.
	        using (StringReader sr = new StringReader(data)) {
				String line;
				while ((line = sr.ReadLine()) != null) createRecord(line);
			}

			//	1.  update the temp table with orderIds, if they exist.
			sql = "UPDATE atAmazon SET usrOrder = oa.usrOrder "
				+ "FROM atAmazon a INNER JOIN usrOrderAmazon oa "
				+ "ON oa.AmazonOrderId = a.orderId" ;
			Utilities.ExecuteNonQuery(sql, connectionString);

			//	2. create new orders for those that don't.
			sql = "SELECT DISTINCT orderId FROM atAmazon WHERE IsNull(usrOrder, 0) = 0 ORDER BY orderId";
			rows = Utilities.GetRecordSet(sql, connectionString);
			int usrOrder = defaultId;
			for (int i = 0; i < rows.Count; i++) {
				sql = "SELECT TOP 1 id FROM usrOrder ORDER BY id DESC";
				DataRowCollection orderRows = Utilities.GetRecordSet(sql, connectionString);

				if (orderRows.Count > 0) usrOrder = (int)orderRows[0]["id"] + 1;
				sql = "INSERT INTO usrOrder(id, orderType, currentstatus, postedon) VALUES (" + usrOrder + ", '" + OrderTypes.Amazon + "', '" + OrderStatuses.NewOrder + "', GETDATE())";
				Utilities.ExecuteNonQuery(sql, connectionString);

				sql = "INSERT INTO usrOrderAmazon(usrOrder, AmazonOrderId, IsConfirmed)"
					+ " VALUES (" 
					+ usrOrder + ","
					+ "'" + rows[i]["orderId"] + "',"
					+ "0)";
				Utilities.ExecuteNonQuery(sql, connectionString);
			}

			//	3.  re-update the temp table with orderIds.
			sql = "UPDATE atAmazon SET usrOrder = oa.usrOrder "
				+ "FROM atAmazon a INNER JOIN usrOrderAmazon oa "
				+ "ON oa.AmazonOrderId = a.orderId" ;
			Utilities.ExecuteNonQuery(sql, connectionString);

			//	4. Update the usrOrderAddress table.
			sql = "INSERT INTO usrOrderAddress "
				+ "SELECT DISTINCT "
				+ "	usrOrder, "
				+ "	'S', "
				+ "	recipientName, "
				+ "	nameFirst, "
				+ "	nameLast, "
				+ "	nameMiddle, "
				+ "	address1, "
				+ "	address2, "
				+ "	address3, "
				+ "	city, "
				+ "	state, "
				+ "	postalCode, "
				+ "	country, "
				+ "	phoneNumber, "
				+ "	'', "
				+ "	0, "
				+ "	0 "
				+ "FROM atAmazon a" ;
			Utilities.ExecuteNonQuery(sql, connectionString);

			//	5. Insert into the usrOrderItem table.
			sql = "SELECT * FROM atAmazon ORDER BY orderId, orderItemId";
			rows = Utilities.GetRecordSet(sql, connectionString);
			int idx = 0;
			int orderNumber = 0;
			for (int i = 0; i < rows.Count; i++){
				if (orderNumber == 0 || orderNumber != (int)rows[i]["usrOrder"]){
					orderNumber = (int)rows[i]["usrOrder"];
					idx = 0;
				}
				idx++;
				sql = "INSERT INTO usrOrderItem "
					+ "SELECT " 
					+ "	a.usrOrder, "
					+ idx + ", "
					+ "	a.orderItemId, "
					+ "	CASE  "
					+ "		WHEN IsNull(a.itemPromoDiscount,0) <> 0  "
					+ "			THEN 'Amazon promotion id ' + a.itemPromoId + ': ' + Convert(varchar,a.itemPromoDiscount) "
					+ "		ELSE '' "
					+ "	END, "
					+ "	p.id, "
					+ "	a.quantity, "
					+ "	a.sku, "
					+ "	a.productName, "
					+ "	p.weight,  "
					+ "	a.itemPrice, "
					+ "	(a.quantity * a.itemPrice) "
					+ "FROM atAmazon a "
					+ "LEFT OUTER JOIN prdMaster p "
					+ "	ON p.sku = a.sku "
					+ "WHERE a.usrOrder = " + rows[i]["usrOrder"]
					+ "  AND a.orderItemId = '" + rows[i]["orderItemId"] + "'";
				Utilities.ExecuteNonQuery(sql, connectionString);
			}

			//	6.  Insert into status and notes.
			sql = "INSERT INTO usrOrderNote "
				+ "SELECT DISTINCT "
				+ "	usrOrder, "
				+ " 1,"
				+ "	GETDATE(), "
				+ "	'Amazon Orders Automated Task', "
				+ "	'Order created in system by ZIRH TaskManager.' "
				+ "FROM atAmazon" ;
			Utilities.ExecuteNonQuery(sql, connectionString);

			sql = "INSERT INTO usrOrderStatus "
				+ "SELECT DISTINCT "
				+ "	usrOrder, "
				+ "	'N', "
				+ "	GETDATE(), "
				+ "	'Posted by ZIRH TaskManager from Amazon.com' "
				+ "FROM atAmazon" ;
			Utilities.ExecuteNonQuery(sql, connectionString);

			//	7. Update usrOrder with info from atAmazon.
			sql = "UPDATE usrOrder SET "
				+ "	itemsTotal = (SELECT sum(itemprice) + sum(itempromodiscount) FROM atAmazon WHERE usrOrder = o.id), "
				+ "	shipping = (SELECT sum(shippingprice) + sum(shippromodiscount) FROM atAmazon WHERE usrOrder = o.id), "
				+ "	tax = (SELECT sum(itemtax) + sum(shippingtax) FROM atAmazon WHERE usrOrder = o.id), "
				+ "	total = (SELECT (sum(itemprice) + sum(itempromodiscount)) "
				+ "		+ (sum(shippingprice) + sum(shippromodiscount)) "
				+ "		+ (sum(itemtax) + sum(shippingtax)) "
				+ "		+ (sum(giftWrapPrice) + sum(giftWrapTax)) "
				+ "		FROM atAmazon WHERE usrOrder = o.id "
				+ "	), "
				+ "	carriercode = '700', "
				+ "	carriername = 'FedEx', "
				+ "	emailaddress = a.email, "
				+ "	shippingmethod = a.shipServiceLevel "
				+ "FROM usrOrder o "
				+ "INNER JOIN atAmazon a "
				+ "	ON a.usrOrder = o.Id" ;
			Utilities.ExecuteNonQuery(sql, connectionString);

			//	figure out if there's any gift wrapping going on, and if so, update usrOrder
			sql = "UPDATE usrOrder SET "
				+ "giftWrap = CASE WHEN IsNull(a.giftWrapType,'') <> '' THEN 1 ELSE 0 END, "
				+ "giftWrapProduct = (SELECT TOP 1 id FROM prdMaster WHERE sku=a.giftWrapType), "
				+ "giftComments = a.giftMessageText "
				+ " FROM usrOrder o "
				+ " INNER JOIN atAmazon a "
				+ " ON a.usrOrder = o.Id";
			Utilities.ExecuteNonQuery(sql, connectionString);
			return true;
		}
		
		private void createRecord(string record) {
			//	parse the line and insert it into the temp table.
			string sql;
			string[] fields = record.Split('\t');

			//	if this is the header line, ignore it and return.
			if (fields.Length < 30) return;
			if (fields[0] == "order-id") return;
			string orderId = fields[0];
			string orderItemId = fields[1];
			DateTime purchaseDate = DateTime.Parse(fields[2]);
			DateTime paymentDate = DateTime.Parse(fields[3]);
			string email = fields[4];
			string[] name = fields[5].Split(' ');
			string nameFirst = "" ;
			string nameLast = "";
			string nameMiddle = "";
			if (name.Length == 2) {
				nameFirst = name[0];
				nameLast = name[1];
			} else if (name.Length == 3) {
				nameFirst = name[0];
				nameMiddle = name[1];
				nameLast = name[2];
			} else {
				nameFirst = nameLast = name[0];
			}
			string phoneNumber = fields[6];
			string sku = fields[7];
			string productName = fields[8];
			int quantity = Int32.Parse(fields[9]);
			double itemPrice = Double.Parse(fields[10]);
			double itemTax = Double.Parse(fields[11]);
			double shippingPrice = Double.Parse(fields[12]);
			double shippingTax = Double.Parse(fields[13]);
			double giftWrapPrice = (fields[14].Length>0)?Double.Parse(fields[14]):0;
			double giftWrapTax = (fields[15].Length>0)?Double.Parse(fields[15]):0;
			string shipServiceLevel = fields[16];
			string recipient = fields[17];
			string address1 = fields[18];
			string address2 = fields[19];
			string address3 = fields[20];
			string city = fields[21];
			string state = fields[22];
			string postalCode = fields[23];
			string country = fields[24];
			string giftWrapType = fields[25];
			string giftWrapMessage = fields[26];
			double itemPromoDiscount = Double.Parse(fields[27]);
			string itemPromoId = fields[28];
			double shipPromoDiscount = Double.Parse(fields[29]);
			string shipPromoId = fields[30];

			// insert the record into the temp table.
			sql = "INSERT INTO atAmazon ( "
				+ "	orderId, "
				+ "	orderItemId, "
				+ "	purchaseDate, "
				+ "	paymentDate, "
				+ "	email, "
				+ "	nameFirst, "
				+ "	nameLast, "
				+ "	nameMiddle, "
				+ "	phoneNumber, "
				+ "	sku, "
				+ "	productName, "
				+ "	quantity, "
				+ "	itemPrice, "
				+ "	itemTax, "
				+ "	shippingPrice, "
				+ "	shippingTax, "
				+ " giftWrapPrice,"
				+ " giftWrapTax, "
				+ "	shipServiceLevel, "
				+ " recipientName, "
				+ "	address1, "
				+ "	address2, "
				+ "	address3, "
				+ "	city, "
				+ "	state, "
				+ "	postalCode, "
				+ "	country, "
				+ " giftWrapType,"
				+ " giftMessageText, "
				+ "	itemPromoDiscount, "
				+ "	itemPromoId, "
				+ "	shipPromoDiscount, "
				+ "	shipPromoId "
				+ ") VALUES ( "
				+ "'" +	orderId + "', "
				+ "'" +	orderItemId + "', "
				+ "'" +	purchaseDate.ToString("yyyy-MM-dd HH:mm:ss") + "', "
				+ "'" +	paymentDate.ToString("yyyy-MM-dd HH:mm:ss") + "', "
				+ "'" +	email + "', "
				+ "'" +	nameFirst.Replace("'","''") + "', "
				+ "'" +	nameLast.Replace("'","''") + "', "
				+ "'" +	nameMiddle.Replace("'","''") + "', "
				+ "'" +	phoneNumber.Replace("'","''") + "', "
				+ "'" +	sku + "', "
				+ "'" +	productName.Replace("'","''") + "', "
				+ quantity + ", "
				+ itemPrice + ", "
				+ itemTax + ", "
				+ shippingPrice + ", "
				+ shippingTax + ", "
				+ giftWrapPrice + ", "
				+ giftWrapTax + ", "
				+ "'" +	shipServiceLevel.Replace("'","''") + "', "
				+ "'" +	recipient.Replace("'","''") + "', "
				+ "'" +	address1.Replace("'","''") + "', "
				+ "'" +	address2.Replace("'","''") + "', "
				+ "'" +	address3.Replace("'","''") + "', "
				+ "'" +	city.Replace("'","''") + "', "
				+ "'" +	state.Replace("'","''") + "', "
				+ "'" +	postalCode + "', "
				+ "'" +	country + "', "
				+ "'" + giftWrapType.Replace("'","''") + "', "
				+ "'" + giftWrapMessage.Replace("'", "''") + "', "
				+ itemPromoDiscount + ", "
				+ "'" +	itemPromoId.Replace("'","''") + "', "
				+ shipPromoDiscount + ", "
				+ "'" +	shipPromoId.Replace("'","''") + "'"
				+ ")";
			Utilities.ExecuteNonQuery(sql, connectionString);
		}
	}
}