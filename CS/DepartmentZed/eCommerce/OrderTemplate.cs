using System;
using System.Data;
using DepartmentZed;

namespace DepartmentZed.eCommerce {
	public class OrderTemplate {
		#region Properties
			private const int begShipDay = 7;
			private const int endShipDay = 22;
			private User user;
			private DateTime createdOn;
			private DateTime lastModifiedOn;
			private string status;
			private Remitment remitment;
			private Address shippingAddress;	//	billing address is part of the User object.
			
			private string connectionString;

			private ContinuityItems items = new ContinuityItems();
			private OrderList history = new OrderList();
			private bool isHistoryInitialized = false;
		#endregion
		#region Fields
			public User User {
				get { return user; }
			}
			public DateTime CreatedOn {
				get { return createdOn; }
			}
			public DateTime LastModfiedOn {
				get { return lastModifiedOn; }
				set { lastModifiedOn = value; }
			}
			public int ShipOrderOn {
				get {
					int day = createdOn.Day;
					if (day >= 1 && day <= 15){
						return begShipDay;
					} else {
						return endShipDay;
					}
				}
			}
			public string Status {
				get { return status ; }
				set { status = value ; }
			}
			public Remitment PaymentInformation {
				get { return remitment; }
				set { remitment = value ; }
			}
			public Address BillingAddress {
				get {
					Address ret = new Address();
					ret.NameFirst = user.FirstName;
					ret.NameLast = user.LastName;
					ret.NameMiddle = user.MiddleInitial;
					ret.Address1 = user.Address1;
					ret.Address2 = user.Address2;
					ret.City = user.City;
					ret.Region = user.Region;
					ret.PostalCode = user.PostalCode;
					ret.Country = user.Country;
					ret.PhoneHome = user.PhoneHome;
					ret.PhoneOther = user.PhoneOther;
					ret.UserGuid = user.UserGuid;
					return ret;
				}
			}
			public Address ShippingAddress {
				get { 
					return shippingAddress; 
				}
				set { shippingAddress = value; }
			}
			public ContinuityItems Items {
				get { return items; }
			}
			public OrderList History {
				get {
					if (!isHistoryInitialized) {
						string sql = "SELECT * FROM usrContinuityOrderHistory WHERE usrMaster = '" + user.UserGuid.ToString() + "' ORDER BY OrderNumber ";
						DataRowCollection rows = (Utilities.GetDataSet(sql, connectionString)).Tables[0].Rows;
						if (rows.Count > 0) {
							for (int i = 0; i < rows.Count; i++) {
								history.Add(new Order((int)rows[i]["OrderNumber"], connectionString));
							}
						}
						isHistoryInitialized = true;
					}
					return history;
				}
			}
		#endregion

		#region Constructors	
		public OrderTemplate(){ }
		public OrderTemplate(string uid, string cn){ 
			user = new User(cn, uid);
			connectionString = cn;
			initialize();
		}
		public OrderTemplate(User u, string cn){ 
			user = u;
			connectionString = cn;
			initialize();
		}
		public OrderTemplate(DataRow dr, string cn) { 
			connectionString = cn;
			user = new User(cn, ((Guid)dr["usrMaster"]).ToString());
			initialize(dr);
		}

		#endregion

		#region Private Methods
		private void initialize(){
			string sql = "SELECT * FROM usrContinuityOrder WHERE usrMaster = '" + user.UserGuid.ToString() + "' ";
			DataRowCollection rows = (Utilities.GetDataSet(sql, connectionString)).Tables[0].Rows;

			//	if we got here, we have no template yet.
			createdOn = lastModifiedOn = DateTime.Now;
			status = Statuses.Published;
			remitment = new Remitment(user.UserGuid, connectionString);
			shippingAddress = new Address(user.UserGuid, connectionString);

			if (rows.Count > 0) {
				initialize(rows[0]);
				return;
			}
		}
		private void initialize(DataRow row) {
			if (!row.IsNull("createdOn")) createdOn = (DateTime)row["createdOn"];
			if (!row.IsNull("lastModifiedOn")) lastModifiedOn = (DateTime)row["lastModifiedOn"];
			if (!row.IsNull("status")) status = (string)row["status"];

			if (!row.IsNull("usrRemitment")) {
				int r = (int)row["usrRemitment"];
				if (r > 0) 
					remitment = new Remitment(user.UserGuid.ToString(), r, connectionString);
			}
			if (!row.IsNull("usrAddress")){
				int a = (int)row["usrAddress"];
				shippingAddress = new Address(user.UserGuid, a, connectionString);
			}

			//	go get any items we've added.
			string sql = "SELECT * FROM usrContinuityOrderItem WHERE usrMaster='" + user.UserGuid.ToString() + "' ORDER BY id";
			DataRowCollection rows = (Utilities.GetDataSet(sql, connectionString)).Tables[0].Rows;
			if (rows.Count > 0) {
				for (int i = 0; i < rows.Count; i++) {
					items.Add(new ContinuityItem(this, rows[i])) ;
				}
			}

			//	ok, initialize the address stuff.
			if (shippingAddress.Address1 == null) shippingAddress = new Address(BillingAddress);
		}
		#endregion

		#region Public Methods
		public void Apply(int orderNumber){
			Apply(new Order(orderNumber, connectionString));
		}

		public void Apply(Order o) {
			//	we switch the items or merge the items based on the passed order.
			for (int i = 0; i < o.Items.Count; i++) {
				CartItem ci = o.Items[i];
				//	check to make sure this item isn't already here.
				bool test = false;
				if (!ci.Product.CanAutoShip) test = true;
				else {
					for (int j = 0; j < items.Count; j++) {
						if (items[j].Product.Key == ci.Product.Key) {
							test = true ;
							break;
						}
					}
				}
								
				//	only if it isn't there already, add it.
				if (!test) {
					items.Add(new ContinuityItem(this, 1, ci.Product, 0, ShipPeriodUnit.Month, DateTime.Now));
				}
			}
		}

		public void Apply(WishList w) {
			//	we switch or merge the items based on the wish list.
			for (int i = 0; i < w.Items.Count; i++) {
				CartItem ci = w.Items[i];
				bool test = false ;
				if (!ci.Product.CanAutoShip) test = true;
				else {
					for (int j = 0; j < items.Count; j++) {
						if (items[j].Product.Key == ci.Product.Key) {
							test = true ;
							break;
						}
					}
				}
								
				//	only if it isn't there already, add it.
				if (!test) {
					items.Add(new ContinuityItem(this, 1, ci.Product, 0, ShipPeriodUnit.Month, DateTime.Now));
				}
			}
		}
		
		public void Save(){	Save(connectionString);	}
		public void Save(string cn) {
			connectionString = cn;
			string sql ;
			DataRowCollection rows;

			//	test to make sure there's a record there first.
			sql = "SELECT * FROM usrContinuityOrder WHERE usrMaster = '" + user.UserGuid.ToString() + "' ";
			rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
			if (rows.Count == 0) {
				sql = "INSERT INTO usrContinuityOrder (usrMaster, createdOn, lastmodifiedon, status) "
					+ "VALUES ("
					+ "'" + user.UserGuid.ToString() + "', "
					+ "GETDATE(),"
					+ "GETDATE(),"
					+ "'P'"
					+ ")";
				Utilities.ExecuteNonQuery(sql, cn);
			}
			
			//	update the date
			lastModifiedOn = DateTime.Now;

			//	ok, update it.
			sql = "UPDATE usrContinuityOrder SET "
				+ "lastModifiedOn = '" + lastModifiedOn.ToString("yyyy-MM-dd HH:mm:ss") + "', "
				+ "status = '" + status + "', "
				+ "usrRemitment = " + remitment.Key + ", "
				+ "usrAddress = " + shippingAddress.Key
				+ " WHERE usrMaster = '" + user.UserGuid.ToString() + "' ";
			Utilities.ExecuteNonQuery(sql, cn);

			//	ok, update the item list.
			sql = "DELETE FROM usrContinuityOrderItem WHERE usrMaster='" + user.UserGuid.ToString() + "' ";
			Utilities.ExecuteNonQuery(sql, cn);
			for (int i = 0; i < items.Count; i++) {
				sql = "INSERT INTO usrContinuityOrderItem (usrMaster, Id, quantity, prdMaster, DateAdded, LastShippedOn, Reorderinterval, shipperiodunit) "
					+ "VALUES ("
					+ "'" + user.UserGuid.ToString() + "',"
					+ (i + 1) + ", "
					+ items[i].Quantity + ", "
					+ items[i].Product.Key + ", "
					+ "'" + items[i].DateAdded.ToString("yyyy-MM-dd HH:mm:ss") + "', "
					+ "'" + items[i].LastShippedOn.ToString("yyyy-MM-dd HH:mm:ss") + "', "
					+ items[i].ReorderInterval + ", "
					+ "'" + items[i].ShipPeriodUnit + "'"
					+ ")";
				Utilities.ExecuteNonQuery(sql, cn);
			}

			sql = "DELETE FROM usrContinuityOrderHistory WHERE usrMaster='" + user.UserGuid.ToString() + "'";
			Utilities.ExecuteNonQuery(sql, cn);
			for (int i = 0; i < history.Count; i++) {
				sql = "INSERT INTO usrContinuityOrderHistory (usrMaster, id, orderdate, ordernumber, ordertotal) "
					+ " VALUES ( "
					+ "'" + user.UserGuid.ToString() + "', "
					+ (i + 1) + ","
					+ "'" + history[i].PostedOn.ToString("yyyy-MM-dd HH:mm:ss") + "',"
					+ history[i].OrderNumber + ","
					+ history[i].Total + ")";
				Utilities.ExecuteNonQuery(sql, cn);
			}
		}
		#endregion
	}
}