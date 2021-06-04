using System;
using System.Data;
using System.IO ;
using System.Diagnostics;
using DepartmentZed;
using DepartmentZed.eCommerce;
using Zirh.Data;

namespace Zirh.Automation {
	public class LinkShare : IPackage {
		private string delim = "\t" ;
		private string backupPath = String.Empty;
		private string linksharePath = String.Empty ;
		private string lstransExe = String.Empty;
		private string logFile = String.Empty;
		private string connectionString = "";
		public string BackupPath { 
			get { return backupPath ; }
			set { backupPath = value ; }
		}
		public string LinksharePath {
			get { return linksharePath ; }
			set { linksharePath = value ; }
		}
		public string ExecutablePath {
			get { return lstransExe ; }
			set { lstransExe = value; }
		}
		public string LogFile {
			get { return logFile; }
			set { logFile = value; }
		}
		public LinkShare() : this("") { }
		public LinkShare(string cn) {
			connectionString = cn ;
		}

		public void SetConnectionString(string cn){
			connectionString = cn;
		}
		public void Execute() {
			if (linksharePath == String.Empty)
				throw new ArgumentNullException("LinksharePath", "You must supply a valid path to the Linkshare file.") ;

			if (backupPath != String.Empty) {
				//	add info to the backup path
				DateTime dt = DateTime.Now ;
				backupPath += dt.ToString("yyyyMMddhhmmss") + ".txt" ;

				//	move the current linkshare file to a backup.
				FileInfo fi = new FileInfo(linksharePath);
				if (fi.Exists) {
					// Ensure that the target file does not exist, since this is disallowed.
					if (File.Exists(backupPath)) File.Delete(backupPath);

					// Move this file to another file.
					fi.MoveTo(backupPath);
				}
			}
			File.Delete(linksharePath) ;
			StreamWriter sw = new StreamWriter(linksharePath) ;

			string sql = "SELECT DISTINCT "
				+ "	o.Id, "
				+ "	ol.SiteId, "
				+ "	ol.SessionDate, "
				+ "	o.PostedOn, "
				+ "	oi.SKU, "
				+ "	oi.Quantity, "
				+ "	(oi.LineTotal * 100) AS LineTotal, "
				+ "	'USD' AS CurrencyType, "
				+ "	o.EmailAddress, "
				+ "	op.PaymentType, "
				+ "	op.AccountNumber, "
				+ "	oa.PostalCode, "
				+ "	oi.Title "
				+ "FROM usrOrder o "
				+ "INNER JOIN usrOrderItem oi "
				+ "	ON oi.usrOrder = o.id "
				+ "INNER JOIN usrOrderPayment op "
				+ "	ON op.usrOrder = o.id "
				+ "INNER JOIN usrOrderAddress oa "
				+ "	ON oa.usrOrder = o.id "
				+ "INNER JOIN usrOrderLinkshare ol "
				+ "	ON ol.usrOrder = o.id "
				+ "WHERE oa.AddressType = 'B' "
				+ "	AND IsNull(ol.Collected, 0) = 0 "
				+ "ORDER BY o.Id ";
			DataRowCollection rows = Utilities.GetRecordSet(sql, connectionString);

			string s ;
			for (int i = 0; i < rows.Count; i++){
				DataRow row = rows[i];
				s = (int)row["id"] + delim
					+ (string)row["siteId"] + delim
					+ ((DateTime)row["SessionDate"]).ToUniversalTime().ToString("s").Replace("T", "/") + delim
					+ ((DateTime)row["PostedOn"]).ToUniversalTime().ToString("s").Replace("T", "/") + delim
					+ (string)row["SKU"] + delim
					+ (int)row["quantity"] + delim
					+ Math.Round((decimal)row["LineTotal"], 0).ToString() + delim
					+ (string)row["CurrencyType"] + delim
					+ (string)row["emailAddress"] + delim;
				if ((string)row["PaymentType"] == PaymentTypes.ECheck) s += "eCheck" + delim;
				else s += Remitment.Decrypt((string)row["AccountNumber"]).Substring(0, 12) + delim;
				s += (string)row["PostalCode"] + delim
					+ (string)row["title"] ;
				sw.WriteLine(s);
			}

			//	write it to the file.
			sw.Close();

			//	ok, now we are going to try to execute the program.
			try {
				Process.Start(
					lstransExe + "lstrans.exe", 
					"-dir " + lstransExe + " -file " + linksharePath
				);
		        StreamWriter w = File.AppendText(lstransExe + logFile);
				w.WriteLine(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") 
					+ "\t"
					+ "Execution of lstrans.exe Successful."
				);
				w.Close();
				sql = "UPDATE usrOrderLinkshare SET Collected = 1 WHERE Collected = 0";
				Utilities.ExecuteNonQuery(sql, connectionString);
			} catch (Exception ex) {
		        StreamWriter w = File.AppendText(lstransExe + logFile);
				w.WriteLine(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") 
					+ "\t"
					+ "Error in execution of lstrans.exe:"
				);
				w.WriteLine(ex.ToString());
				w.Close();
			}
		}
	}
}