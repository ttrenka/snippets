using System;
using System.Data;
using DepartmentZed;

namespace DepartmentZed.eCommerce {
	public class GiftCertificate : ICreditItem {
		#region Properties
			private Guid guid;
			private User user;
			private bool userInitialized = false;
			private Guid usrMaster;
			private decimal purchaseAmount;
			private decimal balance;
			private DateTime purchaseDate;
			private DateTime expirationDate;

			private string to = String.Empty;
			private string from = String.Empty;
			private string emailTo = String.Empty;
			private string message = String.Empty;

			private string connectionString;
		#endregion

		#region Fields
		public Guid SerialNumber {
			get { return guid; }
		}
		public User Purchaser {
			get {
				if (!userInitialized) user = new User(connectionString, usrMaster.ToString());
				return user;
			}
		}
		public decimal PurchaseAmount {
			get { return purchaseAmount; }
		}
		public decimal Balance {
			get { return balance; }
		}
		public DateTime PurchaseDate {
			get { return purchaseDate; }
		}
		public DateTime ExpirationDate {
			get { return expirationDate; }
		}

		public bool IsExpired {
			get { return (expirationDate.Ticks - DateTime.Now.Ticks) <= 0 ; }
		}

		public string To {
			get { return to; }
			set { to = value; }
		}
		public string From {
			get { return from; }
			set { from = value; }
		}
		public string EmailTo {
			get { return emailTo; }
			set { emailTo = value; }
		}
		public string Message {
			get { return message; }
			set { message = value ; }
		}
		#endregion

		public GiftCertificate(User u) : this(u, 0M){ }
		public GiftCertificate(User u, decimal amt) {
			guid = Guid.NewGuid();
			user = u;
			usrMaster = u.UserGuid;
			userInitialized = true;
			purchaseAmount = amt;
			balance = amt;
			purchaseDate = DateTime.Now;
			expirationDate = DateTime.Now.AddYears(1);
			connectionString = u.ConnectionString;
		}
		public GiftCertificate(DataRow row, string cn) {
			connectionString = cn;
			guid = (Guid)row["GUID"];
			usrMaster = (Guid)row["usrMaster"];
			user = new User(cn, usrMaster.ToString());
			userInitialized = true;
			purchaseAmount = (decimal)row["purchaseAmount"];
			balance = (decimal)row["balance"];
			purchaseDate = (DateTime)row["PurchaseDate"];
			expirationDate = (DateTime)row["ExpirationDate"];
			if (!row.IsNull("strTo")) to = (string)row["strTo"];
			if (!row.IsNull("strFrom")) to = (string)row["strFrom"];
			if (!row.IsNull("EmailTo")) to = (string)row["EmailTo"];
			if (!row.IsNull("strMessage")) to = (string)row["strMessage"];
		}

		public static GiftCertificate Get(string g, string cn){
			return GiftCertificate.Get(new Guid(g), cn);
		}
		public static GiftCertificate Get(Guid g, string cn){
			string sql = "SELECT * FROM usrCertificate WHERE guid = '" + g.ToString() + "'";
			DataRowCollection rows = Utilities.GetRecordSet(sql, cn);
			if (rows.Count > 0) return new GiftCertificate(rows[0], cn);
			return null;
		}


		public void Use(decimal amount){ balance -= amount; }
		public void Save(){
			Save(connectionString);
		}
		public void Save(string cn){
			string sql = "SELECT guid FROM usrCertificate WHERE guid = '" + guid.ToString() + "'";
			DataRowCollection rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
			if (rows.Count > 0) {
				sql = "UPDATE usrCertificate SET balance = " + balance + " WHERE guid = '" + guid.ToString() + "' ";
			} else {
				sql = "INSERT INTO usrCertificate (guid, usrMaster, PurchaseAmount, Balance, PurchaseDate, ExpirationDate, strTo, strFrom, emailTo, strmessage) "
					+ "VALUES ("
					+ "'" + guid.ToString() + "', "
					+ "'" + usrMaster.ToString() + "', "
					+ purchaseAmount + ", "
					+ balance + ", "
					+ "'" + purchaseDate.ToString("yyyy-MM-dd HH:mm:ss") + "', "
					+ "'" + expirationDate.ToString("yyyy-MM-dd HH:mm:ss") + "',"
					+ "'" + to.Replace("'", "''") + "', "
					+ "'" + from.Replace("'", "''") + "', "
					+ "'" + emailTo + "', "
					+ "'" + message.Replace("'", "''") + "' "
					+ ")";
			}
			Utilities.ExecuteNonQuery(sql, cn);
		}

		#region ICreditItem Members
			public decimal GetValue() {
				return balance;
			}

			public string GetTitle() {
				return "Gift Certificate " + guid.ToString("P");
			}

			public string GetAbstract() {
				return "";
			}
		#endregion
	}
}
