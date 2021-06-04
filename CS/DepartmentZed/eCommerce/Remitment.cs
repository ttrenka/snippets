using System;
using System.Data;
using System.Security.Cryptography;
using System.Text;
using DepartmentZed;

namespace DepartmentZed.eCommerce {
	public class PaymentTypes {
		public static string MasterCard {
			get { return "MC"; }
		}
		public static string Visa {
			get { return "VISA" ; }
		}
		public static string Discover {
			get { return "DISC" ; }
		}
		public static string AmericanExpress {
			get { return "AMEX" ; }
		}
		public static string ECheck {
			get { return "ECHECK" ; }
		}
		public static string GetName(string n) {
			if (n == PaymentTypes.MasterCard) return "MasterCard";
			if (n == PaymentTypes.Visa) return "Visa";
			if (n == PaymentTypes.Discover) return "Discover";
			if (n == PaymentTypes.AmericanExpress) return "American Express";
			if (n == PaymentTypes.ECheck) return "eCheck";
			return "Unknown";
		}
	}
	public class eCheckTypes {
		public static string Checking {
			get { return "CHECKING" ; }
		}
		public static string BusinessChecking {
			get { return "BCHECKING" ; }
		}
		public static string Savings {
			get { return "SAVINGS" ; }
		}
	}
	public class Remitment {
		#region Properties
		private Guid usrMaster;
		private int key;
		private string status;
		private string paymentType;
		private string eCheckType;
		private string abacode;
		private string accountNumber;
		private string securityCode;
		private string bankName;
		private string accountName;
		private string expirationDate;
		private DateTime createdOn;
		private DateTime lastModifiedOn;
		private bool isDefault;
		private string comments = String.Empty;
		
		private bool isDirty = false;
		private string connectionString;
		
		//	encryption stuff for the account numbers.
		private const string KEY = "drRll3l8oA4qZ8Rxm3IJa8iLeIbeAI9y";
		private const string IV = "ts47ijTeK28=";
		#endregion		
	
		#region Fields
		public int Key {
			get { return key; }
			set {
				key = value;
				isDirty = true;
			}
		}
		public string Status {
			get { return status; }
			set {
				status = value;
				isDirty = true;
			}
		}
		public string PaymentType {
			get { return paymentType; }
			set {
				paymentType = value;
				isDirty = true;
			}
		}
		public string ECheckType {
			get { return eCheckType; }
			set {
				eCheckType = value;
				isDirty = true;
			}
		}
		public string ABACode {
			get { return abacode; }
			set {
				abacode = value;
				isDirty = true;
			}
		}
		public string AccountNumber {
			get { 
				TripleDES crypto = new TripleDESCryptoServiceProvider();
				crypto.Key = Convert.FromBase64String(KEY);
				crypto.IV = Convert.FromBase64String(IV);
				byte[] an = Convert.FromBase64String(accountNumber);
				return Encoding.ASCII.GetString(
					(crypto.CreateDecryptor()).TransformFinalBlock(an, 0, an.Length)
				); 
			}
			set {
				TripleDES crypto = new TripleDESCryptoServiceProvider();
				crypto.Key = Convert.FromBase64String(KEY);
				crypto.IV = Convert.FromBase64String(IV);
				byte[] an = Encoding.ASCII.GetBytes(value);
				
				accountNumber = Convert.ToBase64String(
					(crypto.CreateEncryptor()).TransformFinalBlock(an, 0, an.Length)
				);
				isDirty = true;
			}
		}
		public string AccountNumberEncrypted {
			get { return accountNumber; }
		}

		public string SecurityCode {
			get { return securityCode; }
			set {
				securityCode = value;
				isDirty = true;
			}
		}
		public string BankName {
			get { return bankName; }
			set {
				bankName = value;
				isDirty = true;
			}
		}
		public string AccountName {
			get { return accountName; }
			set {
				accountName = value;
				isDirty = true;
			}
		}
		public string ExpirationDate {
			get { return expirationDate; }
			set {
				expirationDate = value;
				isDirty = true;
			}
		}
		public DateTime CreatedOn {
			get { return createdOn; }
		}
		public DateTime LastModifiedOn {
			get { return lastModifiedOn; }
		}
		public bool IsDefault {
			get { return isDefault; }
			set {
				isDefault = value;
				isDirty = true;
			}
		}
		public bool IsExpired {
			get {
				int m = DateTime.Now.Month;
				int y = DateTime.Now.Year;
				string[] d = expirationDate.Split('/');
				return (y == Int32.Parse(d[1]) && m > (Int32.Parse(d[0])));
			}
		}
		public string Comments {
			get { return comments; }
			set { comments = value; }
		}
		#endregion
	
		#region Constructors
		public Remitment(Guid usr, string cn) { 
			usrMaster = usr;
			connectionString = cn;
		}
		public Remitment(string uid, int k, string cn) {
			usrMaster = new Guid(uid);
			key = k;
			connectionString = cn;
			
			string sql = "SELECT * FROM usrRemitment WHERE usrMaster = '" + uid + "' AND id = " + key;
			DataRowCollection rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
			if (rows.Count > 0) {
				DataRow dr = rows[0];
				status = Convert.ToString(dr["status"]);
				createdOn = Convert.ToDateTime(dr["createdOn"]);
				lastModifiedOn = Convert.ToDateTime(dr["modifiedOn"]);	
				paymentType = Convert.ToString(dr["paymentType"]);

				if (!dr.IsNull("eCheckType")) eCheckType = Convert.ToString(dr["eCheckType"]);
				else eCheckType = "";

				if (!dr.IsNull("abacode")) abacode = Convert.ToString(dr["abacode"]);
				else abacode = "";

				accountNumber = Convert.ToString(dr["accountNumber"]);

				if (!dr.IsNull("securityCode")) securityCode = Convert.ToString(dr["securityCode"]);
				else securityCode = "";

				if (!dr.IsNull("bankName")) bankName = Convert.ToString(dr["bankName"]);
				else bankName = "";

				if (!dr.IsNull("accountName")) accountName = Convert.ToString(dr["accountName"]);
				else accountName = "";

				if (!dr.IsNull("expirationDate")) expirationDate = Convert.ToString(dr["expirationDate"]);
				else expirationDate = "";

				if (!dr.IsNull("comments")) comments = (string)dr["comments"];
				else comments = "";
			}
		}
		public Remitment(Guid usr, string cn, string pt, string anum, string aname, string sc, string ed) {
			usrMaster = usr;
			key = 0;
			connectionString = cn;
			paymentType = pt;
			accountNumber = Remitment.Encrypt(anum);
			accountName = aname;
			securityCode = sc;
			expirationDate = ed;
			isDirty = true;
		}
		public Remitment(DataRow dr, string cn){
			if (dr.Table.Columns.Contains("usrMaster")) {
				//	from usrRemitment
				usrMaster = (Guid)dr["usrMaster"];
				key = Convert.ToInt32(dr["id"]);
				status = Convert.ToString(dr["status"]);
				createdOn = Convert.ToDateTime(dr["createdOn"]);
				lastModifiedOn = Convert.ToDateTime(dr["modifiedOn"]);	
			}
			paymentType = Convert.ToString(dr["paymentType"]);

			if (!dr.IsNull("eCheckType")) eCheckType = Convert.ToString(dr["eCheckType"]);
			else eCheckType = "";

			if (!dr.IsNull("abacode")) abacode = Convert.ToString(dr["abacode"]);
			else abacode = "";

			accountNumber = Convert.ToString(dr["accountNumber"]);

			if (!dr.IsNull("securityCode")) securityCode = Convert.ToString(dr["securityCode"]);
			else securityCode = "";

			if (!dr.IsNull("bankName")) bankName = Convert.ToString(dr["bankName"]);
			else bankName = "";

			if (!dr.IsNull("accountName")) accountName = Convert.ToString(dr["accountName"]);
			else accountName = "";

			if (!dr.IsNull("expirationDate")) expirationDate = Convert.ToString(dr["expirationDate"]);
			else expirationDate = "";

			if (!dr.IsNull("comments")) comments = (string)dr["comments"];
			else comments = "";
			connectionString = cn;	
		}
		
		#endregion

		#region Public Methods
		//	static methods to encrypt and decrypt numbers for things other than usrRemitment.
		public static string Encrypt(string accountNumber){
			TripleDES crypto = new TripleDESCryptoServiceProvider();
			crypto.Key = Convert.FromBase64String(KEY);
			crypto.IV = Convert.FromBase64String(IV);
			byte[] an = Encoding.ASCII.GetBytes(accountNumber);
			return Convert.ToBase64String(
				(crypto.CreateEncryptor()).TransformFinalBlock(an, 0, an.Length)
			);
		}
		public static string Decrypt(string encrypted) {
			TripleDES crypto = new TripleDESCryptoServiceProvider();
			crypto.Key = Convert.FromBase64String(KEY);
			crypto.IV = Convert.FromBase64String(IV);
			byte[] an = Convert.FromBase64String(encrypted);
			return Encoding.ASCII.GetString(
				(crypto.CreateDecryptor()).TransformFinalBlock(an, 0, an.Length)
			); 
		}


		//	use the following when displaying the number.
		public string GetAccountNumber(){
			string an = this.AccountNumber;
			int n = an.Length - 4;
			string ret = "";
			switch (paymentType) {
				case "VISA" : 
				case "MC" : 
				case "DISC" : {
					ret = "XXXX-XXXX-XXXX-" + an.Substring(an.Length - 4, 4);
					break;
				}
				case "AMEX" : {
					ret = "XXXX-XXXX-XXXX-" + an.Substring(an.Length - 3, 3);
					break;
				}
			}
			return ret;
		}		
		public void Save(){
			if (!isDirty) return;
			string sql;
			if (key == 0){
				sql = "SELECT TOP 1 id FROM usrRemitment WHERE usrMaster = '" + usrMaster.ToString() + "' ORDER BY Id DESC";
				DataRowCollection rows = Utilities.GetDataSet(sql, connectionString).Tables[0].Rows;
				if (rows.Count > 0) {
					key = Convert.ToInt32(rows[0]["id"]) + 1;
				} else key = 1;
				sql = "INSERT INTO usrRemitment (usrMaster, Id, status, sortorder, paymenttype, echecktype, abacode, accountnumber, securitycode, bankname, accountname, expirationdate, createdon, modifiedon, isdefault, comments) "
					+ " VALUES ( "
					+ "'" + usrMaster.ToString() + "',"
					+ key + ","
					+ "'P',"
					+ (key * 10) + ","
					+ "'" + paymentType + "',"
					+ "'" + eCheckType + "',"
					+ "'" + abacode + "',"
					+ "'" + accountNumber + "',"
					+ "'" + securityCode + "',"
					+ "'" + bankName + "',"
					+ "'" + accountName + "',"
					+ "'" + expirationDate + "',"
					+ "GETDATE(),"
					+ "GETDATE(),"
					+ ((isDefault) ? "1" : "0") + ","
					+ "'" + comments.Replace("'", "''") + "'"
					+ ")";
				Utilities.ExecuteNonQuery(sql, connectionString);
			} else {
				sql = "UPDATE usrRemitment SET "
					+ "status='" + status + "', "
					+ "paymentType='" + paymentType + "', "
					+ "eCheckType='" + eCheckType + "', "
					+ "abacode='" + abacode + "', "
					+ "accountNumber='" + accountNumber + "', "
					+ "securityCode='" + securityCode + "', "
					+ "bankName='" + bankName + "', "
					+ "accountName='" + accountName + "', "
					+ "expirationDate='" + expirationDate + "', "
					+ "isdefault=" + ((isDefault) ? "1" : "0") + ","
					+ "comments='" + comments.Replace("'", "''") + "'"
					+ " WHERE usrMaster = '" + usrMaster.ToString() + "' AND Id = " + key;
				Utilities.ExecuteNonQuery(sql, connectionString);
			}
			isDirty = false;
		}
		#endregion
	}
}