using System;
using System.Data;
using DepartmentZed;

namespace DepartmentZed.eCommerce {
	public class Address {
	#region Properties
		private Guid usrMaster;
		private int key = 0;
		private string status;
		private string title;
		private string namefirst;
		private string namelast;
		private string namemiddle = "";
		private string address1;
		private string address2 = "";
		private string city;
		private string region;
		private string postalcode;
		private string country;
		private string phonehome;
		private string phoneother = "";
		private bool isBusiness = false;
		private bool isMilitaryOrPOBox = false;
		
		private bool persist = true;
		
		private string connectionString;
	#endregion
	#region Fields
		public Guid UserGuid {
			get { return usrMaster; }
			set {
				usrMaster = value;
				persist = true;
			}
		}
		public int Key { 
			get { return key ; } 
			set { 
				key = value;
			}
		}
		public string Status {
			get { return status; }
			set { 
				status = value;
			}
		}
		public string Title {
			get { return title; }
			set { 
				title = value;
			}
		}
		public string NameFirst {
			get { return namefirst; }
			set { 
				namefirst = value;
			}
		}
		public string NameLast {
			get { return namelast; }
			set { 
				namelast = value;
			}
		}
		public string NameMiddle {
			get { return namemiddle; }
			set { 
				namemiddle = value;
			}
		}
		public string FullName {
			get {
				if (namemiddle.Length > 0){
					return namefirst + " " + namemiddle + " " + namelast;
				} else {
					return namefirst + " " + namelast;
				}
			}
		}
		public string Address1 {
			get { return address1; }
			set { 
				address1 = value;
			}
		}
		public string Address2 {
			get { return address2; }
			set { 
				address2 = value;
			}
		}
		public string City {
			get { return city; }
			set { 
				city = value;
			}
		}
		public string Region {
			get { return region; }
			set { 
				region = value;
			}
		}
		public string PostalCode {
			get { return postalcode; }
			set { 
				postalcode = value;
			}
		}
		public string Country {
			get { return country; }
			set { 
				country = value;
			}
		}
		public string PhoneHome {
			get { return phonehome; }
			set { 
				phonehome = value;
			}
		}
		public string PhoneOther {
			get { return phoneother; }
			set { 
				phoneother = value;
			}
		}
		public bool IsBusiness {
			get { return isBusiness; }
			set { 
				isBusiness = value;
			}
		}
		public bool IsPOBoxOrMilitary {
			get { return isMilitaryOrPOBox; }
			set { 
				isMilitaryOrPOBox = value;
			}
		}
		
		public string ConnectionString {
			set { 
				connectionString = value ; 
				persist = true;
			}
		}
	#endregion
	#region Constructors
		public Address(){
			persist = false ;
		}
		public Address(Address a){
			connectionString = a.connectionString;
			usrMaster = a.usrMaster;
			key = a.Key;
			status = a.status;
			title = a.title;
			namefirst = a.namefirst;
			namelast = a.namelast;
			namemiddle = a.namemiddle;
			address1 = a.address1;
			address2 = a.address2;
			city = a.city;
			region = a.region;
			postalcode = a.postalcode;
			country = a.country;
			phonehome = a.phonehome;
			phoneother = a.phoneother;
			isBusiness = a.isBusiness;
			isMilitaryOrPOBox = a.isMilitaryOrPOBox;
		}
		public Address(DataRow dr, string cn) {
			connectionString = cn;
			initialize(dr); 
		}
		public Address(Guid u, string cn) : this(u, 0, cn){	}
		public Address(Guid u, int k, string cn) {
			usrMaster = u;
			key = k;
			connectionString = cn;
			if (key != 0) initialize();
		}
	#endregion
	#region Private Methods
		private void initialize() {
			//	if this is a single record.
			string sql;
			DataRowCollection rows;
			sql = "SELECT * FROM usrAddress WHERE usrMaster='" + usrMaster.ToString() + "' AND Id = " + key;
			rows = (Utilities.GetDataSet(sql, connectionString)).Tables[0].Rows;
			if (rows.Count > 0) initialize(rows[0]);
		}
		
		private void initialize(DataRow dr) {
			if (dr.Table.Columns.Contains("usrMaster")) {
				//	pulling from usrAddress
				usrMaster = (Guid)dr["usrMaster"];
				key = Convert.ToInt32(dr["Id"]);
				status = Convert.ToString(dr["status"]);
			}
			title = Convert.ToString(dr["title"]);
			namefirst = Convert.ToString(dr["namefirst"]);
			namelast = Convert.ToString(dr["namelast"]);
			if (!dr.IsNull("namemiddle")) namemiddle = Convert.ToString(dr["namemiddle"]);
			address1 = Convert.ToString(dr["address1"]);
			if (!dr.IsNull("address2")) address2 = Convert.ToString(dr["address2"]);
			city = Convert.ToString(dr["city"]);
			if (!dr.IsNull("region")) region = Convert.ToString(dr["region"]);
			if (!dr.IsNull("postalcode")) postalcode = Convert.ToString(dr["postalcode"]);
			country = Convert.ToString(dr["country"]);
			phonehome = Convert.ToString(dr["phonehome"]);
			if (!dr.IsNull("phoneother")) phoneother = Convert.ToString(dr["phoneother"]);
			if (!dr.IsNull("isBusinessAddress")) isBusiness = (Convert.ToInt32(dr["isBusinessAddress"]) == 1);
			if (!dr.IsNull("isMilitaryOrPOBox")) isMilitaryOrPOBox = (Convert.ToInt32(dr["isMilitaryOrPOBox"]) == 1);
			return;
		}
	#endregion
	#region Public Methods
/*
		public override bool Equals(object obj) {
			return base.Equals(obj);
		}

		public override int GetHashCode() {
			return base.GetHashCode ();
		}

		public static bool operator ==(Address a, Address b) {
			try {
				return (a.FullName == b.FullName
					&& a.Address1 == b.Address1
					&& a.Address2 == b.Address2
					&& a.City == b.City
					&& a.Region == b.Region
					&& a.PostalCode == b.PostalCode
					&& a.Country == b.Country
					&& a.PhoneHome == b.PhoneHome
					&& a.IsBusiness == b.IsBusiness
					&& a.IsPOBoxOrMilitary == b.IsPOBoxOrMilitary
				);
			} catch { }
			return false;
		}
		public static bool operator !=(Address a, Address b) { return !(a == b); }
*/

		public bool IsEqual(Address a) {
			if (a == null) return false;
			return (a.FullName == this.FullName
				&& a.Address1 == this.Address1
				&& a.Address2 == this.Address2
				&& a.City == this.City
				&& a.Region == this.Region
				&& a.PostalCode == this.PostalCode
				&& a.Country == this.Country
				&& a.PhoneHome == this.PhoneHome
				&& a.IsBusiness == this.IsBusiness
				&& a.IsPOBoxOrMilitary == this.IsPOBoxOrMilitary
			);
		}

		public void Save(){
			if (!persist) return;	//	never save it if there's no persistence.
			if (connectionString == null || connectionString == String.Empty) return;
			string sql ;
			if (key != 0) {
				sql = "DELETE FROM usrAddress WHERE usrMaster = '" + usrMaster.ToString() + "' AND Id=" + key;
				Utilities.ExecuteNonQuery(sql, connectionString);
			} else {
				key = 1;
				sql = "SELECT TOP 1 id FROM usrAddress WHERE usrMaster = '" + usrMaster.ToString() + "' ORDER BY Id DESC" ;
				DataRowCollection rows = (Utilities.GetDataSet(sql, connectionString)).Tables[0].Rows;
				if (rows.Count > 0) {
					key = ((Int32)rows[0]["id"]) + 1;
				}
			}
			sql = "INSERT INTO usrAddress(usrMaster, id,status, sortorder, addresstype, title, namefirst, namelast, namemiddle, address1, address2, city, region, postalcode, country, phonehome, phoneother, isbusinessaddress, ismilitaryorpobox) "
				+ "VALUES ("
				+ "'" + usrMaster.ToString() + "',"
				+ key + ", "
				+ "'" + status + "',"
				+ (key * 10) + ","
				+ "'S', "
				+ "'" + title + "',"
				+ "'" + namefirst + "',"
				+ "'" + namelast + "',"
				+ "'" + namemiddle + "',"
				+ "'" + address1 + "',"
				+ "'" + address2 + "',"
				+ "'" + city + "',"
				+ "'" + region + "',"
				+ "'" + postalcode + "',"
				+ "'" + country + "',"
				+ "'" + phonehome + "',"
				+ "'" + phoneother + "',"
				+ ((isBusiness)?"1":"0") + ","
				+ ((isMilitaryOrPOBox)?"1":"0")
				+ ")" ;
			Utilities.ExecuteNonQuery(sql, connectionString);
		}
	#endregion
	}
}