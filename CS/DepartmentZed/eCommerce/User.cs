using System;
using System.Collections;
using System.Collections.Specialized;
using System.Data;
using System.Web;
using DepartmentZed;

namespace DepartmentZed.eCommerce {
	public class User {
		#region properties
		//	properties of the user
		private Guid userId;
		private string userName = "";	//	this is the email address.
		private string password = "";
		private string nameFirst = "";
		private string nameLast = "";
		private string nameMiddle = "";

		private string address1 = "";
		private string address2 = "";
		private string city = "";
		private string region = "";
		private string postalcode = "";
		private string country = "";
		private string phonehome = "";
		private string phoneother = "";

		private string comments = "";
		
		private bool isValid = false;
		private bool isSaved = false;
		private bool isDirty = false;

		//	assume this is a new customer always.
		private bool isNewCustomer = true;
		
		private string connectionString;

		//	let's enable the ecommerce stuff.
		private Cart cart;
		private AddressList addresses = new AddressList();
		private RemitmentList remitments = new RemitmentList();
		private OrderList orders = new OrderList();
		private OrderTemplate orderTemplate ;
		private WishLists wishlists = new WishLists();
		
		#endregion
		
		#region Fields
		#region User Information
		public bool IsValidated {
			get { return isValid; }
		}
		public string ConnectionString {
			get { return connectionString; }
			set { 
				connectionString = value; 
			}
		}
		public Guid UserGuid {
			get { return userId ; }
		}
		public string Username {
			get { return userName; }
			set { 
				userName = value ; 
				isDirty = true;
			}
		}
		public string Password {
			get { return password; }
			set { 
				password = value; 
				isDirty = true;
			}
		}	
		public string FirstName {
			get { return nameFirst; }
			set { 
				nameFirst = value; 
				isDirty = true ;
			}
		}
		public string LastName {
			get { return nameLast; }
			set { 
				nameLast = value; 
				isDirty = true ;
			}
		}
		public string MiddleInitial {
			get { return nameMiddle; }
			set { 
				nameMiddle = value; 
				isDirty = true ;
			}
		}
		public string FullName {
			get {
				if (nameMiddle.Length > 0){
					return nameFirst + " " + nameMiddle + " " + nameLast;
				} else {
					return nameFirst + " " + nameLast;
				}
			}
		}
		public string Address1 {
			get { return address1; }
			set { 
				address1 = value;
				isDirty = true;
			}
		}
		public string Address2 {
			get { return address2; }
			set { 
				address2 = value;
				isDirty = true;
			}
		}
		public string City {
			get { return city; }
			set { 
				city = value;
				isDirty = true;
			}
		}
		public string Region {
			get { return region; }
			set { 
				region = value;
				isDirty = true;
			}
		}
		public string PostalCode {
			get { return postalcode; }
			set { 
				postalcode = value;
				isDirty = true;
			}
		}
		public string Country {
			get { return country; }
			set { 
				country = value;
				isDirty = true;
			}
		}
		public string PhoneHome {
			get { return phonehome; }
			set { 
				phonehome = value;
				isDirty = true;
			}
		}
		public string PhoneOther {
			get { return phoneother; }
			set { 
				phoneother = value;
				isDirty = true;
			}
		}
		public string Comments {
			get { return comments; }
			set { comments = value; }
		}
		#endregion
		
		#region eCommerce Items
		public bool IsNewCustomer {
			get { return isNewCustomer; }
			set {
				isNewCustomer = value;
			}
		}
		public Cart Cart { 
			get { return cart ; }
		}
		public int NumberOfCartItems {
			get { 
				int q = 0;
				for (int i = 0; i < cart.Items.Count; i++) q += cart.Items[i].Quantity;
				return q; 
			}
		}
		public AddressList Addresses {
			get { 
				if (!addresses.IsInitialized) 
					addresses.Initialize(userId, connectionString);
				return addresses; 
			}
		}
		public RemitmentList Remitments {
			get { 
				if (!remitments.IsInitialized) 
					remitments.Initialize(userId, connectionString);
				return remitments; 
			}
		}
		public OrderList Orders {
			get { 
				if (!orders.IsInitialized) 
					orders.Initialize(userId, connectionString);
				return orders; 
			}
		}
		public OrderTemplate OrderTemplate{
			get { return orderTemplate; }
			set { orderTemplate = value; }
		}
		public WishLists Wishlists {
			get { 
				if (!wishlists.IsInitialized) 
					wishlists.Initialize(userId, connectionString);
				return wishlists; 
			}
		}
		#endregion
		#endregion
		
		#region Constructors
		//	default, brand new user
		public User() : this("", Guid.NewGuid().ToString(), false){ }
		
		//	Gimme just the connection string
		public User(string cn) : this(cn, Guid.NewGuid().ToString(), false){ }

		//	used when creating from a cookie
		public User(string cn, string uid) : this(cn, uid, false) {	}

		//	used when creating from a Session
		public User(string cn, string uid, bool isValidated) {
			connectionString = cn;
			userId = new Guid(uid);
			isValid = isValidated;
			cart = new Cart(cn);

			string sql = "SELECT * FROM usrMaster WHERE id = '" + uid + "'";
			DataRowCollection rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
			
			if (rows.Count > 0) {
				DataRow dr = rows[0];
				userId = new Guid((dr["id"]).ToString());
				userName = Convert.ToString(dr["username"]);	
				password = Convert.ToString(dr["password"]);
				nameFirst = Convert.ToString(dr["nameFirst"]);
				nameLast = Convert.ToString(dr["nameLast"]);
				nameMiddle = Convert.ToString(dr["nameMiddle"]);
				if (!dr.IsNull("comments")) comments = (string)dr["comments"];
				initAddress(dr);
				isSaved = true;
				cart.Load(userId);			
				wishlists.Initialize(userId, connectionString);
			}

			sql = "SELECT * FROM usrOrder WHERE usrMaster = '" + uid + "'" ;
			rows = Utilities.GetRecordSet(sql, cn);
			isNewCustomer = (rows.Count == 0);

			if (isValidated && wishlists.Count == 0){
				// create a default wishlist
				WishList wl = new WishList(userId, connectionString);
				wl.Title = nameFirst + "'s Locker";
				wl.IsActive = true;
				wl.Abstract = "This is your locker at ZIRH.com.  You can use it to bookmark items for quick reference, and to create Auto-Shipped orders.";
				wishlists.Add(wl);
				wishlists.Save();
			}
		}

		//	used when creating from a login form.
		public User(string cn, string un, string pwd) {
			connectionString = cn;
			string sql = "SELECT * FROM usrMaster WHERE username='" + un + "' AND password='" + pwd + "'";
			DataRowCollection rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
			cart = new Cart(cn);
			
			if (rows.Count > 0) {
				DataRow dr = rows[0];
				userId = new Guid((dr["id"]).ToString());
				userName = Convert.ToString(dr["username"]);	
				password = Convert.ToString(dr["password"]);
				nameFirst = Convert.ToString(dr["nameFirst"]);
				nameLast = Convert.ToString(dr["nameLast"]);
				nameMiddle = Convert.ToString(dr["nameMiddle"]);
				if (!dr.IsNull("comments")) comments = (string)dr["comments"];
				initAddress(dr);
				isSaved = true;
				isValid = true;
				cart.Load(userId);
				wishlists.Initialize(userId, connectionString);

				sql = "SELECT * FROM usrOrder WHERE usrMaster = '" + userId.ToString() + "'" ;
				rows = Utilities.GetRecordSet(sql, cn);
				isNewCustomer = (rows.Count == 0);

				if (wishlists.Count == 0){
					// create a default wishlist
					WishList wl = new WishList(userId, connectionString);
					wl.Title = nameFirst + "'s Locker";
					wl.IsActive = true;
					wl.Abstract = "This is your locker at ZIRH.com.  You can use it to bookmark items for quick reference, and to create Auto-Shipped orders.";
					wishlists.Add(wl);
					wishlists.Save();
				}
				return;
			}
			throw new Exception("new User(): user not found.");
		}
		#endregion
		
		private void initAddress(DataRow dr) {
			address1 = Convert.ToString(dr["address1"]);
			if (!dr.IsNull("address2")) address2 = Convert.ToString(dr["address2"]);
			city = Convert.ToString(dr["city"]);
			if (!dr.IsNull("region")) region = Convert.ToString(dr["region"]);
			if (!dr.IsNull("postalcode")) postalcode = Convert.ToString(dr["postalcode"]);
			country = Convert.ToString(dr["country"]);
			phonehome = Convert.ToString(dr["phonehome"]);
			if (!dr.IsNull("phoneother")) phoneother = Convert.ToString(dr["phoneother"]);
		}
		
		#region Public Methods
		public override string ToString() {
			return userId.ToString();
		}

		public static bool Exists(string username, string cn) {
			string sql = "SELECT * FROM usrMaster WHERE username = '" + username + "'";
			DataRowCollection rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
			return (rows.Count > 0);
		}
		
		public static User GetUser(string username, string cn) {
			string sql = "SELECT * FROM usrMaster WHERE username = '" + username + "'";
			DataRowCollection rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
			if (rows.Count > 0){
				return new User(cn, ((System.Guid)(rows[0]["id"])).ToString());
			}
			return null;
		}
		
		public void TransferCart(Cart c) {
			cart = c;
			Save();
		}
		
		public void Reset(){
			cart = new Cart(connectionString);
			cart.Save(userId);
		}

		public bool Save(){
			if (isDirty) {
				string sql;
				if (!isSaved) {
					sql = "INSERT INTO usrMaster(id) VALUES ('" + userId.ToString() + "')" ;
					Utilities.ExecuteNonQuery(sql, connectionString);
				}
				//	do the update 
				sql = "UPDATE usrMaster SET "
					+ "username = '" + userName + "',";
				if (password.Length > 0)
					sql += "password = '" + password + "', " ;
				sql += "namefirst = '" + nameFirst + "', "
					+ "namelast = '" + nameLast + "', "
					+ "nameMiddle = '" + nameMiddle + "', "
					+ "address1='" + address1 + "',"
					+ "address2='" + address2 + "',"
					+ "city='" + city + "',"
					+ "region='" + region + "',"
					+ "postalcode='" + postalcode + "',"
					+ "country='" + country + "',"
					+ "phonehome='" + phonehome + "',"
					+ "phoneother='" + phoneother + "',"
					+ "comments='" + comments.Replace("'", "''") + "' "
					+ " WHERE id = '" + userId.ToString() + "' " ;
				Utilities.ExecuteNonQuery(sql, connectionString);
			}		

			//	save the rest of the stuff as well
			cart.Save(userId);
			if (orderTemplate != null) orderTemplate.Save();
			if (addresses.Count > 0) addresses.Save();
			if (remitments.Count > 0) remitments.Save();
			if (wishlists.Count > 0) wishlists.Save();

			isSaved = true;
			isDirty = false;
			return true;
		}
		#endregion
	}
}