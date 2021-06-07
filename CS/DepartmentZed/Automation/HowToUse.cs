using System;
using System.Data;
using System.Data.SqlClient;
using System.Text;
using DepartmentZed;

namespace DepartmentZed.Automation {
	public class HowToUse : IPackage {
		private string from = "how-to-use@example.com" ;
		private string subject = "How to use your new DepartmentZed products" ;
		private string msgIntro = "As a service to our customers, we like to provide instructions on how to use your new DepartmentZed products..." ;
		private string connectionString = "" ;

		public HowToUse() : this("") {}
		public HowToUse(string cn) {
			connectionString = cn ; 
		}

		public void SetConnectionString(string cn){
			connectionString = cn ;
		}

		public void Execute() {
			string sql = "SELECT DISTINCT "
				+ "	o.Id AS OrderNumber, "
				+ "	os.PostedOn, "
				+ "	u.NameFirst, "
				+ "	u.NameLast, "
				+ "	o.EmailAddress, "
				+ "	oi.Id AS item, "
				+ " f.Title, "
				+ " CASE "
				+ " WHEN (IsNull(p.UsageInstructions, '') <> '') THEN p.UsageInstructions "
				+ " ELSE f.UsageInstructions END AS Instructions "
				+ "FROM usrOrder o "
				+ "INNER JOIN usrOrderStatus os "
				+ "	ON os.usrOrder = o.id "
				+ "INNER JOIN usrMaster u "
				+ "	ON u.id = o.usrMaster "
				+ "INNER JOIN (usrOrderItem oi "
				+ "INNER JOIN (prdMaster p "
				+ "INNER JOIN prdFamily f "
				+ "	ON f.id = p.prdFamily) "
				+ "	ON p.id = oi.prdMaster)  "
				+ "	ON oi.usrOrder = o.Id "
				+ "WHERE IsNull(o.emailaddress, '') <> '' "
				+ " AND (IsNull(p.UsageInstructions, '') <> '' OR IsNull(f.UsageInstructions, '') <> '') "
				+ "	AND os.OrderStatus = 'N' "
				+ " AND o.OrderType NOT IN ('CREDIT','VOID') "
				+ "	AND DatePart(yyyy, os.PostedOn) = DatePart(yyyy, DateAdd(d, -5, GETDATE())) "
				+ "	AND DatePart(mm, os.PostedOn) = DatePart(mm, DateAdd(d, -5, GETDATE())) "
				+ "	AND DatePart(dd, os.PostedOn) = DatePart(dd, DateAdd(d, -5, GETDATE())) "
				+ "ORDER BY u.NameLast, u.NameFirst, o.id, oi.Id";
			DataRowCollection rows = Utilities.GetRecordSet(sql, connectionString);			

			int g = 0;
			string s = "";
			string html = "";
			string email = "";
			for (int i = 0; i < rows.Count; i++){
				if ((int)rows[i]["OrderNumber"] != g) {
					if (i > 0) {
						html += "</body></html>";
						Utilities.SendMail(from, email, subject, s, html);
					}
					g = (int)rows[i]["OrderNumber"];
					s = "Dear " + (string)rows[i]["NameFirst"] + ",\r\n\r\n"
						+ msgIntro + "\r\n\r\n" ;
					html = "<html><head></head><body style=\"font-size:85%;font-family:lucida grande,arial,helvetica;\">"
						+ "<p>Dear " + (string)rows[i]["NameFirst"] + ",</p>"
						+ "<p>" + msgIntro + "</p>";
					email = (string)rows[i]["emailaddress"];
				}

				//	get the instructions.
				s += rows[i]["Title"]
					+ "\r\n-----------------------------------------------\r\n" 
					+ rows[i]["Instructions"] 
					+ "\r\n\r\n" ;
				html += "<p>"
					+ "<h4 style=\"border-bottom:1px solid black;margin:0;margin-top:12px;\">" 
					+ rows[i]["Title"] 
					+ "</h4>"
					+ rows[i]["Instructions"] 
					+ "</p>";
			}
			//	send the last one.
			html += "</body></html>";
			Utilities.SendMail(from, email, subject, s, html);
			return ;
		}
	}
}
