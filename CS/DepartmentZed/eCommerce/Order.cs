using System;
using System.Data;
using DepartmentZed;
using DepartmentZed.Data;

namespace DepartmentZed.eCommerce {
	public sealed class OrderTypes {
		public readonly static string Web = "WEB";
		public readonly static string Phone = "800";
		public readonly static string Amazon = "AMAZON";
		public readonly static string Continuity = "CONTINUITY";
		public readonly static string Credit = "CREDIT";
		public readonly static string Void = "VOID";
	}
	public sealed class OrderStatuses {
		public readonly static string NewOrder = "N";
		public readonly static string InProgress = "P";
		public readonly static string Fulfilled = "F";
		public readonly static string Confirmed = "C";
	}
	public class OrderNote {
		private int key;
		private DateTime createdOn;
		private string createdBy;
		private string note;
		public int Key {
			get { return key ; }
		}
		public DateTime CreatedOn {
			get { return createdOn; }
		}
		public string CreatedBy {
			get { return createdBy ; }
		}
		public string Note {
			get { return note; }
		}
		public OrderNote(string cb, string n) {
			key = 0;
			createdOn = DateTime.Now;
			createdBy = cb;
			note = n;
		}
		public OrderNote(DataRow row) {
			key = (int)row["id"];
			createdOn = (DateTime)row["createdOn"];
			createdBy = (string)row["createdBy"];
			note = (string)row["note"];
		}
	}
	public class OrderStatus {
		private string status;
		private DateTime postedon;
		private string comment;
		public string Status {
			get { return status ; }
			set {
				if (value == OrderStatuses.NewOrder
					|| value == OrderStatuses.InProgress
					|| value == OrderStatuses.Fulfilled
					|| value == OrderStatuses.Confirmed
				) status = value ;
				else throw new ArgumentException("OrderStatus: passed value is not a member of OrderStatuses."); 
			}
		}
		public DateTime PostedOn {
			get { return postedon; }
			set { postedon = value; }
		}
		public string Comment {
			get { return comment; }
			set { comment = value; }
		}
		public OrderStatus(string s, DateTime dt) : this(s, dt, ""){ }
		public OrderStatus(string s, DateTime dt, string c){
			status = s;
			postedon = dt;
			comment = c;
		}
	}
	
	public class Order {
		#region Properties
			#region usrOrder
				private int orderId = 0;
				private User user;
				private string orderType = OrderTypes.Web;
				private string transactionId;
				private string ipaddress;
				private string email;
				private Shipping shipping;
				private bool expedite;
				private bool isGiftWrapped;
				private CartItem giftWrap;
				private string giftComment = "";

				private bool couponApplied = false;
				
				private decimal subTotal = decimal.MinValue;
				private decimal shippingTotal = decimal.MinValue;
				private decimal taxTotal = decimal.MinValue;
				private decimal orderTotal = decimal.MinValue;
			#endregion
			#region usrOrderAddress, usrOrderItems, usrOrderPayment
				private Address billingAddress;
				private Address shippingAddress;
				private CartItems items = new CartItems();
				private Remitment remitment;

				//	for pre-tax promotional credits
				private CreditItems credits = new CreditItems();

				//	for payments made outside of remitments, like GCs
				private CreditItems payments = new CreditItems();
				private PromotionList promotions = new PromotionList();
			#endregion
			#region usrOrderLinkshare
				private string linkshareSiteId = "";
				private DateTime linkshareDate;
				private bool collectedForLinkshare = false;
			#endregion
			#region usrOrderAmazon
				private string amazonOrderId;
				private string amazonSessionId;
				private bool isConfirmedToAmazon = false;
				private DateTime confirmedOn;
			#endregion
			#region usrOrderStatus
				private string orderStatus;
				private DateTime postedOn;
				private string statusComment;
				private OrderStatusList statusHistory;
			#endregion
			#region usrOrderNotes
				private OrderNoteList notes;
			#endregion

			private OrderList associatedOrders = new OrderList();
			
			private string errorMessage = "";
			private bool isreadonly = false;
			private string connectionString;
		#endregion
		
		#region Fields
			#region usrOrder
				public int OrderNumber {
					get { return orderId; }
				}
				public User User {
					get { return user; }
					set { 
						if (!isreadonly) {
							user = value;
							email = user.Username;
						}
					}		
				}
				public string Email {
					get { return email; }
					set {
						if (!isreadonly) {
							email = value;
						}
					}
				}
				public string OrderType {
					get { return orderType; }
					set { 
						if (!isreadonly) orderType = value;
					}		
				}
				public string TransactionId {
					get { return transactionId; }
					set { 
						if (!isreadonly) transactionId = value;
					}		
				}
				public string IPAddress {
					get { return ipaddress; }
					set { 
						if (!isreadonly) ipaddress = value;
					}
				}
				public bool Expedite {
					get { return expedite; }
					set {
						if (!isreadonly) expedite = value ;
					}
				}
				public Shipping ShippingInformation {
					get { return shipping; }
					set {
						if (!isreadonly) shipping = value;
					}
				}
				public bool IsGiftWrapped {
					get { return isGiftWrapped; }
					set { 
						if (!isreadonly) {
							isGiftWrapped = value ; 
						}
					}
				}
				public CartItem GiftWrapping {
					get { return giftWrap; }
					set { 
						if (!isreadonly) {
							giftWrap = value ;
						}
					}
				}
				public string GiftComments {
					get { return giftComment; }
					set { 
						if (!isreadonly) {
							giftComment = value ;
						}
					}
				}

				public string ConnectionString {
					get { return connectionString; }
				}

				//	calculated values
				public decimal SubTotal {
					get { 
						if (subTotal != decimal.MinValue) return subTotal;
						decimal t = items.GetTotal();
						if (giftWrap != null) t += giftWrap.LineTotal;
						return t; 
					}
				}
				public decimal Value {
					get { 
						decimal t = items.GetValue();
						if (giftWrap != null) t += giftWrap.LineValue;
						return t; 
					}
				}
				public decimal ShippingTotal {
					get { 
						if (shippingTotal != decimal.MinValue) return shippingTotal;
						if (shipping == null) return 0;
						return shipping.Cost; 
					}
				}
				public decimal Tax {
					get {
						if (taxTotal != decimal.MinValue) return taxTotal;
						if (shipping == null) return 0;
						if (shippingAddress.Country == "US" && shippingAddress.Region == "NY") 
							return ((SubTotal - credits.GetTotal()) + ShippingTotal) * 0.08375M;
						else return 0;
					}
					set {
						taxTotal = value;
					}
				}
				public decimal Total {
					get { 
						if (orderTotal != decimal.MinValue) return orderTotal;
						decimal t = SubTotal + ShippingTotal + Tax;
						if (credits.Count > 0) {
							for (int i = 0; i < credits.Count; i++)
								t -= credits[i].Value;
						}
						if (t < 0 && orderType != OrderTypes.Credit) t = 0;
						return t; 
					}
				}
				public decimal BalanceDue {
					get {
						decimal t = Total - payments.GetTotal();
						if (t < 0) t = 0; 
						return t;
					}
				}
				public int TotalItems {
					get {
						int ret = 0;
						for (int i = 0; i < items.Count; i++) {
							if (!items[i].IsPromotion)
								ret += items[i].Quantity;
						}
						return ret;
					}
				}

				public bool IsCouponApplied {
					get { return couponApplied; }
					set { couponApplied = value; }
				}
			#endregion
			#region usrOrderAddress, usrOrderPayment, usrOrderItems/Promotions
			public Address BillingAddress {
				get { return billingAddress; }
				set {
					if (!isreadonly) billingAddress = value ;
				}
			}
			public Address ShippingAddress {
				get { return shippingAddress; }
				set {
					if (!isreadonly) shippingAddress = value ;
				}
			}

			public Remitment PaymentInformation {
				get { return remitment; }
				set {
					if (!isreadonly) remitment = value;
				}
			}
			public CreditItems Credits {
				get { return credits; }
			}
			public CreditItems PaymentsApplied {
				get { return payments; }
			}
			
			public PromotionList Promotions {
				get { return promotions; }
			}

			public CartItems Items {
				get { return items; }
			}

			
		#endregion
			#region usrOrderAmazon
				public string AmazonOrderId {
					get { return amazonOrderId; }
					set { amazonOrderId = value ; }
				}
				public string AmazonSessionId {
					get { return amazonSessionId; }
					set { amazonSessionId = value ; }
				}
				public bool IsConfirmedToAmazon {
					get { return isConfirmedToAmazon; }
					set { isConfirmedToAmazon = value ; }
				}
				public DateTime AmazonConfirmedOn {
					get { return confirmedOn; }
					set { confirmedOn = value ; }
				}
			#endregion
			#region usrOrderLinkshare
				public string LinkshareSiteId {
					get { return linkshareSiteId; }
					set { linkshareSiteId = value ; }
				}
				public DateTime LinkshareDate {
					get { return linkshareDate; }
					set { linkshareDate = value ; }
				}
				public bool CollectedForLinkshare {
					get { return collectedForLinkshare; }
					set { collectedForLinkshare = value ; }
				}
			#endregion
			#region usrOrderStatus
				public string CurrentStatus {
					get { return orderStatus; }
					set {
						orderStatus = value;
					}
				}
				public DateTime PostedOn {
					get {
						return postedOn; 
					}
					set { postedOn = value; }
				}
				public string StatusComment {
					get { return statusComment; }
					set { statusComment = value; }
				}
				public OrderStatusList StatusHistory {
					get { return statusHistory; }
				}
			#endregion
			#region usrOrderNote
				public OrderNoteList Notes {
					get { return notes; }
				}
			#endregion

			public OrderList AssociatedOrders {
				get { return associatedOrders; }
			}

			public string ErrorMessage {
				get { return errorMessage; }
				set { errorMessage = value; }
			}
		#endregion	
		
		#region Constructors
			public Order(string cn){	
				connectionString = cn;
				statusHistory = new OrderStatusList();
				notes = new OrderNoteList();
			}
			public Order(int orderId, string cn) :	this((Utilities.GetDataSet("SELECT * FROM usrOrder WHERE id=" + orderId, cn)).Tables[0].Rows[0], cn){ }
			public Order(DataRow row, string cn) {
				connectionString = cn;
				string sql;
				DataRowCollection rows;
				isreadonly = true;	//	make sure it's read only.
				
				transactionId = "";
				ipaddress = "";
				email = "";
				expedite = false;
				isGiftWrapped = false;
				giftComment = "";

				statusHistory = new OrderStatusList();
				notes = new OrderNoteList();
				
				//	ok, let's fill out the order now.
				orderId = (int)row["id"];
				if (!row.IsNull("usrMaster")) user = new User(cn, ((Guid)row["usrMaster"]).ToString());
				orderType = (string)row["orderType"];

				orderStatus = OrderStatuses.NewOrder;
				if (!row.IsNull("currentStatus")) orderStatus = (string)row["currentStatus"];

				postedOn = DateTime.Now;
				if (!row.IsNull("PostedOn")) postedOn = (DateTime)row["PostedOn"];
				if (!row.IsNull("TransactionId")) transactionId = (string)row["transactionId"];
				if (!row.IsNull("emailaddress")) email = (string)row["emailaddress"];
				else if (user != null) email = user.Username;
				if (!row.IsNull("ShippingMethod")) expedite = ((string)row["shippingmethod"] == "Overnight");
				if (!row.IsNull("GiftWrap")) isGiftWrapped = (bool)row["giftwrap"];
				if (!row.IsNull("GiftComments")) giftComment = (string)row["giftComments"];

				//	set up the gift wrapping cart item.
				if (isGiftWrapped) {
					int gprd = (int)row["GiftWrapProduct"];
					giftWrap = new CartItem(
						1, 
						DepartmentZed.Data.Catalog.Products.GetByKey(gprd)
					);
				}
				
				//	we should have historical values, let's use them instead.
				subTotal = (decimal)row["itemstotal"];
				shippingTotal = (decimal)row["shipping"];
				taxTotal = (decimal)row["tax"];
				orderTotal = (decimal)row["total"];

				//	get the shipping.
				shipping = new Shipping();
				shipping.Carrier = (row.IsNull("carrierName") ? "" : (string)row["carrierName"]);
				shipping.CarrierCode = (row.IsNull("carrierCode") ? "" : (string)row["carrierCode"]);
				shipping.ShipVia = (row.IsNull("carrierCode") ? "" : CarrierCodes.GetShipVia(shipping.CarrierCode));
				shipping.Cost = shippingTotal;
				
				//	get the address info.
				billingAddress = new Address();
				shippingAddress = new Address();
				sql = "SELECT * FROM usrOrderAddress WHERE usrOrder = " + orderId + " ORDER BY AddressType" ;
				rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
				for (int i = 0; i < rows.Count; i++) {
					string type = (string)rows[i]["addressType"];
					if (type == "B") {
						billingAddress = new Address(rows[i], cn);
					} else {
						shippingAddress = new Address(rows[i], cn);
					}
				}
				
				//	get the payment.
				sql = "SELECT * FROM usrOrderPayment WHERE usrOrder=" + orderId;
				rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
				if (rows.Count > 0) remitment = new Remitment(rows[0], cn);

				//	get the order items.
				items = new CartItems();
				sql = "SELECT * FROM usrOrderItem WHERE usrOrder = " + orderId + " ORDER BY Id";
				rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
				for (int i = 0; i < rows.Count; i++) items.Add(new CartItem(rows[i], "usrOrderItem"));										

				//	get the promotion history.
				sql = "SELECT * FROM usrOrderPromotions WHERE usrOrder = " + orderId;
				rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
				for (int i = 0; i < rows.Count; i++){
					//	altered:  figure out which are promos and which are credits.
					Promotion promo = new Promotion((int)rows[i]["promoMaster"], cn);
					if (promo.Class == PromotionClasses.Dollar || promo.Class == PromotionClasses.Percent){
						promo.Apply(this);
					} else {
						promotions.Add(promo);
					}
				}

				//	get any payments outside of credit cards applied
				sql = "SELECT * FROM usrOrderPaymentsApplied WHERE usrOrder = " + orderId;
				rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
				for (int i = 0; i < rows.Count; i++){
					row = rows[i];
					if ((string)row["usrTopic"] == "usrCertificate") {
						GiftCertificate g = GiftCertificate.Get((string)row["usrReference"], cn);
						CreditItem ci = new CreditItem(g);
						ci.Value = (decimal)row["Amount"];
						payments.Add(ci);
					} else if ((string)row["usrTopic"] == "usrOrderPayment") {
						DataRow dr = (Utilities.GetRecordSet("SELECT * FROM usrOrderPayment WHERE usrOrder=" + orderId, cn))[0];
						RemitmentCreditItem rci = new RemitmentCreditItem(new Remitment(dr, cn));
						rci.PaymentAmount = (decimal)row["Amount"];
						CreditItem ci = new CreditItem(rci);
						ci.Value = rci.PaymentAmount;
						payments.Add(ci);
					}
				}

				//	get the status history.
				sql = "SELECT * FROM usrOrderStatus WHERE usrOrder = " + orderId + " ORDER BY postedOn";
				rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
				for (int i = 0; i < rows.Count; i++) {
					statusHistory.Add(
						new OrderStatus(
							(string)rows[i]["OrderStatus"],
							(DateTime)rows[i]["PostedOn"],
							(string)rows[i]["comments"]
						)
					);
					if ((string)rows[i]["OrderStatus"] == orderStatus) {
						statusComment = statusHistory[i].Comment;
					}
				}
				
				//	get any notes.
				sql = "SELECT * FROM usrOrderNote WHERE usrOrder = " + orderId + " ORDER BY createdOn";
				rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
				for (int i = 0; i < rows.Count; i++){
					notes.Add(new OrderNote(rows[i]));
				}
				
				//	get amazon info if it exists.
				sql = "SELECT * FROM usrOrderAmazon WHERE usrOrder = " + orderId;
				rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
				if (rows.Count > 0) {
					amazonOrderId = (string)rows[0]["AmazonOrderId"];
					amazonSessionId = ((!rows[0].IsNull("AmazonSessionId")) ? (string)rows[0]["AmazonSessionId"] : String.Empty);
					isConfirmedToAmazon = (bool)rows[0]["IsConfirmed"];
					if (!rows[0].IsNull("confirmedOn")) confirmedOn = (DateTime)rows[0]["confirmedOn"];
				}
				
				//	get the linkshare info.
				sql = "SELECT * FROM usrOrderLinkshare WHERE usrOrder = " + orderId;
				rows = (Utilities.GetDataSet(sql, cn)).Tables[0].Rows;
				if (rows.Count > 0) {
					linkshareSiteId = (string)rows[0]["SiteId"];
					linkshareDate = (DateTime)rows[0]["SessionDate"];
					collectedForLinkshare = (bool)rows[0]["collected"];
				}

				//	check for associated orders, for shits and giggles.
				sql = "SELECT * FROM usrOrderAssociates WHERE usrOrder = " + orderId;
				rows = Utilities.GetRecordSet(sql, cn);
				if (rows.Count > 0) {
					for (int i = 0; i < rows.Count; i++){
						associatedOrders.Add(new Order((int)rows[i]["associatedOrder"], cn));
					}
				}

				if (orderStatus != OrderStatuses.NewOrder) isreadonly = true;
			}
			public Order(CartItems ci, string cn) {
				connectionString = cn;
				items = new CartItems(ci);
				statusHistory = new OrderStatusList();
				notes = new OrderNoteList();
			}
		#endregion
		
		#region Public Methods
			//	transactions.
			public bool Approve(ITransaction t) {
				//	only try the transaction once.
				if (orderId != 0 && isreadonly) return true;
				bool ret = false;

				if (BalanceDue > 0) {
					ret = t.Approve(this);
					if (ret) transactionId = t.GetResult().TransactionID;
				} else ret = true;

				//	if we are approved, save the bitch and make it readonly.
				if (ret) {
					int idx = -1;
					for (int i = 0; i < statusHistory.Count; i++) {
						if (statusHistory[i].Status == OrderStatuses.NewOrder) {
							idx = i;
							break;
						}
					}

					if (idx > -1) {
						statusHistory[idx] = new OrderStatus(OrderStatuses.NewOrder, DateTime.Now);
					} else {
						statusHistory.Add(
							new OrderStatus(OrderStatuses.NewOrder, DateTime.Now)
						);
					}

					//	set everything else.
					orderStatus = OrderStatuses.NewOrder;
					postedOn = DateTime.Now;
					Save();

					isreadonly = true;
				} else {
					errorMessage = "Your order was not approved: "
						+ "(" + t.GetResult().ResponseReasonCode + ") " 
						+ t.GetResult().Reason ;
					isreadonly = false;
				}
				return ret; 
			}
			public bool Finalize(ITransaction t) {
				bool ret = t.Finalize(this);
				return ret; 
			}

			public bool Process(ITransaction t){
				if (orderId != 0 && isreadonly) return true;
				bool ret = false;
				ret = t.Process(this);
				if (ret) {
					transactionId = t.GetResult().TransactionID;
					statusHistory.Clear();
					statusHistory.Add(new OrderStatus(OrderStatuses.NewOrder, DateTime.Now));
					statusHistory.Add(new OrderStatus(OrderStatuses.InProgress, DateTime.Now));
					statusHistory.Add(new OrderStatus(OrderStatuses.Fulfilled, DateTime.Now));
					statusHistory.Add(new OrderStatus(OrderStatuses.Confirmed, DateTime.Now));

					//	set everything else.
					orderStatus = OrderStatuses.Confirmed;
					postedOn = DateTime.Now;
					Save();

					isreadonly = true;
				} else {
					errorMessage = "Your order was not approved: "
						+ "(" + t.GetResult().ResponseReasonCode + ") " 
						+ t.GetResult().Reason ;
					isreadonly = false;
				}
				return ret; 
			}

			public bool Credit(ITransaction t){
				bool ret = false;
				ret = t.Credit(this);
				if (ret) {
					transactionId = t.GetResult().TransactionID;
					statusHistory.Clear();
					statusHistory.Add(new OrderStatus(OrderStatuses.NewOrder, DateTime.Now));
					statusHistory.Add(new OrderStatus(OrderStatuses.InProgress, DateTime.Now));
					statusHistory.Add(new OrderStatus(OrderStatuses.Fulfilled, DateTime.Now));
					statusHistory.Add(new OrderStatus(OrderStatuses.Confirmed, DateTime.Now));

					//	set everything else.
					orderStatus = OrderStatuses.Confirmed;
					postedOn = DateTime.Now;
					Save();
				} else {
					errorMessage = "Your credit order was not approved: "
						+ "(" + t.GetResult().ResponseReasonCode + ") " 
						+ t.GetResult().Reason ;
				}
				return ret; 
			}

			public bool Void(ITransaction t) {
				//	need a transaction id to do this.
				if (transactionId == null) return false;
				bool ret = false;
				ret = t.Void(this);
				if (ret) {
					transactionId = t.GetResult().TransactionID;
					statusHistory.Clear();
					statusHistory.Add(new OrderStatus(OrderStatuses.NewOrder, DateTime.Now));
					statusHistory.Add(new OrderStatus(OrderStatuses.InProgress, DateTime.Now));
					statusHistory.Add(new OrderStatus(OrderStatuses.Fulfilled, DateTime.Now));
					statusHistory.Add(new OrderStatus(OrderStatuses.Confirmed, DateTime.Now));

					//	set everything else.
					orderStatus = OrderStatuses.Confirmed;
					orderType = OrderTypes.Void;
					postedOn = DateTime.Now;
					Save();
				} else {
					errorMessage = "VOID order was not approved: "
						+ "(" + t.GetResult().ResponseReasonCode + ") " 
						+ t.GetResult().Reason ;
				}
				return ret;
			}

			//	maintenance
			public void ClearPromotions(){
				//	start with the promotion list
				for (int i = 0; i < promotions.Count; i++) {
					if (promotions[i].Type == PromotionTypes.Automatic
					)
						promotions.Remove(promotions[i]);
				}

				//	clear out any automatic ones in the cart
				for (int i = 0; i < items.Count; i++){
					if (items[i].IsPromotion
						&& items[i].Promo.Type == PromotionTypes.Automatic
					){
						items.Remove(items[i]);
					}
				}

				//	clean out the credits on the order.
				for (int i = 0; i < credits.Count; i++) {
					if (credits[i].Type == CreditItemTypes.Promotion
						&& ((PromotionCreditItem)credits[i].Source).IsAutomatic
					) {
						credits.Remove(credits[i]);
					}
				}
			}

			//	used for potential calculations
			public decimal GetPotentialTax(Shipping s){
				if (taxTotal != decimal.MinValue) return taxTotal;
				if (shippingAddress.Country == "US" && shippingAddress.Region == "NY") 
					return ((SubTotal - credits.GetTotal()) + s.Cost) * 0.08375M;
				else return 0;
			}
			public decimal GetPotentialTotal(Shipping s){
				return (SubTotal + GetPotentialTax(s) + s.Cost - credits.GetTotal());
			}
			public decimal GetPotentialBalance(Shipping s){
				decimal ret = GetPotentialTotal(s) - payments.GetTotal();
				if (ret < 0) ret = 0;
				return ret;
			}

			//	persistence.
			public void Save(){
				Save(connectionString);
			}
			public void Save(string cn) {
				string sql;
				DataRowCollection rows;

				//	set up some basics, if they are available.
				if (user != null) email = user.Username;
				if (ipaddress == null) ipaddress = "";

				//	insert the order first.
				if (orderId == 0) {
					sql = "SELECT TOP 1 id FROM usrOrder ORDER BY id DESC";
					rows = Utilities.GetRecordSet(sql, cn);

					orderId = 90000;
					if (rows.Count > 0) {
						orderId = ((int)rows[0]["Id"]) + 1 ;
					}
					
					sql = "INSERT INTO usrOrder (Id, orderType) VALUES ("
						+ orderId + "," 
						+ "'" + orderType + "'"
						+ ")";
					Utilities.ExecuteNonQuery(sql, cn);
				}
				
				string tmp = "";
				if (isGiftWrapped) {
					tmp += ", GiftWrap = " + ((isGiftWrapped) ? "1":"0") + ", "
						+ "GiftWrapProduct = " + giftWrap.Product.Key + ", "
						+ "GiftComments='" + giftComment.Replace("'","''") + "' ";
				}

				if (user != null) {
					tmp += ", usrMaster = '" + user.UserGuid.ToString() + "' ";
				}

				//	update the order table.
				sql = "UPDATE usrOrder SET "
					+ "CurrentStatus = '" + orderStatus + "', "
					+ "PostedOn = '" + postedOn.ToString("yyyy-MM-dd HH:mm:ss") + "', "
					+ "TransactionID='" + transactionId + "', "
					+ "emailaddress='" + email + "', "
					+ "IPAddress='" + ipaddress + "', "
					+ "ItemsTotal=" + SubTotal + ", "
					+ "Shipping=" + ShippingTotal + ", "
					+ "Tax=" + Tax + ", "
					+ "Total=" + Total + " ";
				if (shipping != null){
					sql += ", CarrierCode='" + shipping.CarrierCode + "', "
					+ "CarrierName='" + shipping.Carrier + "' ";
					if (shippingAddress != null) {
						sql += ", ShippingMethod='" + ((shippingAddress.Country == "US" && expedite) ? "Overnight" : "Standard") + "' ";
					}
				}
				sql	+= tmp
					+ "WHERE Id=" + orderId;		
				Utilities.ExecuteNonQuery(sql, cn);
				
				//	update the items table.
				sql = "DELETE FROM usrOrderItem WHERE usrOrder = " + orderId;
				Utilities.ExecuteNonQuery(sql, cn);

				for (int i = 0; i < items.Count; i++) {
					string pi = items[i].PromotionInfo;
					if (pi != String.Empty) pi = pi.Replace("'", "''");
					int k = items[i].Product.Key;
					string sku = items[i].SKU;
					string title = items[i].Title;
					if (title == String.Empty && items[i].Product.Family != null) 
						title = items[i].Product.Family.Title;
					title = title.Replace("'", "''");
					string weight = items[i].Product.Weight;
					if (weight != String.Empty) weight = weight.Replace("'", "''");
					sql = "INSERT INTO usrOrderItem (usrOrder, Id, promotionInfo, prdMaster, Quantity, SKU, Title, Weight, Price, LineTotal) "
						+ " VALUES ("
						+ orderId + ", "
						+ (i + 1) + ", "
						+ "'" + pi + "', "
						+ k + ", "
						+ items[i].Quantity + ", "
						+ "'" + sku + "', "
						+ "'" + title + "', "
						+ "'" + weight + "', "
						+ items[i].Product.Price + ", "
						+ items[i].LineTotal
						+ ")" ;
					Utilities.ExecuteNonQuery(sql, cn);
				}
				
				//	update the address table
				sql = "DELETE FROM usrOrderAddress WHERE usrOrder = " + orderId;
				Utilities.ExecuteNonQuery(sql, cn);
				if (billingAddress != null) {
					sql = "INSERT INTO usrOrderAddress(usrOrder, AddressType, title, namefirst, namelast, namemiddle, address1, address2, city, region, postalcode, country, phonehome, phoneother, isbusinessaddress, ismilitaryorpobox) "
						+ "VALUES ("
						+ orderId + ","
						+ "'B',"
						+ "'" + billingAddress.Title + "',"
						+ "'" + billingAddress.NameFirst.Replace("'","''") + "',"
						+ "'" + billingAddress.NameLast.Replace("'","''") + "',"
						+ "'" + billingAddress.NameMiddle + "',"
						+ "'" + billingAddress.Address1.Replace("'","''") + "',"
						+ "'" + billingAddress.Address2 + "',"
						+ "'" + billingAddress.City.Replace("'","''") + "',"
						+ "'" + billingAddress.Region.Replace("'","''") + "',"
						+ "'" + billingAddress.PostalCode + "',"
						+ "'" + billingAddress.Country + "',"
						+ "'" + billingAddress.PhoneHome + "',"
						+ "'" + billingAddress.PhoneOther + "',"
						+ ((billingAddress.IsBusiness)?"1":"0") + ","
						+ ((billingAddress.IsPOBoxOrMilitary)?"1":"0")
						+ ")" ;
					Utilities.ExecuteNonQuery(sql, cn);
				}

				if (shippingAddress != null) {
					sql = "INSERT INTO usrOrderAddress(usrOrder, AddressType, title, namefirst, namelast, namemiddle, address1, address2, city, region, postalcode, country, phonehome, phoneother, isbusinessaddress, ismilitaryorpobox) "
						+ "VALUES ("
						+ orderId + ","
						+ "'S',"
						+ "'" + shippingAddress.Title + "',"
						+ "'" + shippingAddress.NameFirst.Replace("'","''") + "',"
						+ "'" + shippingAddress.NameLast.Replace("'","''") + "',"
						+ "'" + shippingAddress.NameMiddle + "',"
						+ "'" + shippingAddress.Address1.Replace("'","''") + "',"
						+ "'" + shippingAddress.Address2 + "',"
						+ "'" + shippingAddress.City.Replace("'","''") + "',"
						+ "'" + shippingAddress.Region.Replace("'","''") + "',"
						+ "'" + shippingAddress.PostalCode + "',"
						+ "'" + shippingAddress.Country + "',"
						+ "'" + shippingAddress.PhoneHome + "',"
						+ "'" + shippingAddress.PhoneOther + "',"
						+ ((shippingAddress.IsBusiness)?"1":"0") + ","
						+ ((shippingAddress.IsPOBoxOrMilitary)?"1":"0")
						+ ")" ;
					Utilities.ExecuteNonQuery(sql, cn);
				}
				
				//	update the order payment table.
				sql = "DELETE FROM usrOrderPayment WHERE usrOrder = " + orderId;
				Utilities.ExecuteNonQuery(sql, cn);

				if (remitment != null) {
					sql = "INSERT INTO usrOrderPayment (usrOrder, paymenttype, echecktype, abacode, accountnumber, securitycode, bankname, accountname, expirationdate) "
						+ " VALUES ( "
						+ orderId + ","
						+ "'" + remitment.PaymentType + "',"
						+ "'" + remitment.ECheckType + "',"
						+ "'" + remitment.ABACode + "',"
						+ "'" + remitment.AccountNumberEncrypted + "',"
						+ "'" + remitment.SecurityCode + "',"
						+ "'" + remitment.BankName + "',"
						+ "'" + remitment.AccountName.Replace("'","''") + "',"
						+ "'" + remitment.ExpirationDate + "'"
						+ ")";
					Utilities.ExecuteNonQuery(sql, connectionString);
				}

				//	record any promotions that have been applied
				sql = "DELETE FROM usrOrderPromotions WHERE usrOrder = " + orderId;
				Utilities.ExecuteNonQuery(sql, connectionString);
				for (int i = 0; i < promotions.Count; i++) {
					sql = "INSERT INTO usrOrderPromotions("
						+ "usrOrder,"
						+ "promoMaster, "
						+ "Amount"
						+ ") VALUES (" 
						+ orderId + ", " 
						+ promotions[i].Key + ","
						+ promotions[i].Amount
						+ ")";
					Utilities.ExecuteNonQuery(sql, connectionString);
				}

				//	record any payment information
				sql = "DELETE FROM usrOrderPaymentsApplied WHERE usrOrder = " + orderId;
				Utilities.ExecuteNonQuery(sql, connectionString);
				for (int i = 0; i < payments.Count; i++) {
					string usrTopic;
					string usrReference;

					if (payments[i].Type == CreditItemTypes.GiftCertificate) {
						usrTopic = "usrCertificate";
						usrReference = ((GiftCertificate)(payments[i].Source)).SerialNumber.ToString();
						sql = "INSERT INTO usrOrderPaymentsApplied (usrOrder, Id, usrTopic, usrReference, Amount) "
							+ "VALUES (" + orderId + "," 
							+ (i + 1) + ", "
							+ "'" + usrTopic + "', "
							+ "'" + usrReference + "', "
							+ payments[i].Value
							+ ")";
						Utilities.ExecuteNonQuery(sql, connectionString);
					} else if (payments[i].Type == CreditItemTypes.Remitment) {
						usrTopic = "usrOrderPayment";
						usrReference = "";
						sql = "INSERT INTO usrOrderPaymentsApplied (usrOrder, Id, usrTopic, usrReference, Amount) "
							+ "VALUES (" + orderId + "," 
							+ (i + 1) + ", "
							+ "'" + usrTopic + "', "
							+ "'" + usrReference + "', "
							+ payments[i].Value
							+ ")";
						Utilities.ExecuteNonQuery(sql, connectionString);
					}
				}

				//	if there's linkshare stuff, update that.
				if (linkshareSiteId != String.Empty) {
					sql = "DELETE FROM usrOrderLinkshare WHERE usrOrder = " + orderId;
					Utilities.ExecuteNonQuery(sql, cn);
					
					sql = "INSERT INTO usrOrderLinkshare (usrOrder, siteId, sessionDate) "
						+ "VALUES ("
						+ orderId + ","
						+ "'" + linkshareSiteId + "',"
						+ "'" + linkshareDate.ToString("yyyy-MM-dd HH:mm:ss") + "')";
					Utilities.ExecuteNonQuery(sql, cn);
				}
				
				//	if there's Amazon info, update that.
				if (amazonOrderId != null && amazonOrderId != String.Empty) {
					sql = "DELETE FROM usrOrderAmazon WHERE usrOrder = " + orderId;
					Utilities.ExecuteNonQuery(sql, cn);
					
					sql = "INSERT INTO usrOrderAmazon (usrOrder, AmazonOrderId, AmazonSessionId) "
						+ "VALUES ("
						+ orderId + ","
						+ "'" + amazonOrderId + "',"
						+ "'" + amazonSessionId + "')";
					Utilities.ExecuteNonQuery(sql, cn);
				}
				
				//	insert the status.
				sql = "DELETE FROM usrOrderStatus WHERE usrOrder = " + orderId;
				Utilities.ExecuteNonQuery(sql, cn);
				for (int i = 0; i < statusHistory.Count; i++) {
					sql = "INSERT INTO usrOrderStatus(usrOrder, OrderStatus, PostedOn, Comments) "
						+ "VALUES ("
						+ orderId + ","
						+ "'" + statusHistory[i].Status + "',"
						+ "'" + statusHistory[i].PostedOn.ToString("yyyy-MM-dd HH:mm:ss") + "',"
						+ "'" + statusHistory[i].Comment.Replace("'","''") + "'"
						+ ")";
					Utilities.ExecuteNonQuery(sql, cn);
				}

				//	insert the notes.
				sql = "DELETE FROM usrOrderNote WHERE usrOrder = " + orderId;
				Utilities.ExecuteNonQuery(sql, cn);
				for (int i = 0; i < notes.Count; i++) {
					sql = "INSERT INTO usrOrderNote(usrOrder, id, createdon, createdby, note) "
						+ "VALUES ("
						+ orderId + ","
						+ (i + 1) + ","
						+ "'" + notes[i].CreatedOn.ToString("yyyy-MM-dd HH:mm:ss") + "',"
						+ "'" + notes[i].CreatedBy.Replace("'","''") + "',"
						+ "'" + notes[i].Note.Replace("'","''") + "'"
						+ ")";
					Utilities.ExecuteNonQuery(sql, cn);
				}

				//	deal with any associated orders.
				sql = "DELETE FROM usrOrderAssociates WHERE usrOrder = " + orderId;
				Utilities.ExecuteNonQuery(sql, cn);
				for (int i = 0; i < associatedOrders.Count; i++) {
					sql = "INSERT INTO usrOrderAssociates(usrOrder, associatedOrder) "
						+ " VALUES (" + orderId + ", " + associatedOrders[i].OrderNumber + ")";
					Utilities.ExecuteNonQuery(sql, cn);
				}
			}
		#endregion
	}
}
