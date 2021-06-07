using System;
using System.Collections;
using System.Data;
using System.IO;
using DepartmentZed;
using DepartmentZed.Data;

namespace DepartmentZed.eCommerce {
	public sealed class PromotionTypes {
		public static readonly string Automatic = "A";
		public static readonly string Manual = "M";
		public static string GetType(string s){
			if (s == PromotionTypes.Automatic) return "Automatic";
			if (s == PromotionTypes.Manual) return "Manual Entry";
			return "Unknown";
		}
	}
	public sealed class PromotionUsages {
		public static readonly string Single = "S";
		public static readonly string Unlimited = "U";
		public static string GetUsage(string s){
			if (s == PromotionUsages.Single) return "Single Use Only";
			if (s == PromotionUsages.Unlimited) return "Unlimited Usage";
			return "Unknown";
		}
	}
	public sealed class PromotionClasses {
		public static readonly string Dollar = "DOLLAR";
		public static readonly string FreeGift = "FREEGIFT";
		public static readonly string FreeShipping = "FREESHIP";
		public static readonly string FreeShippingForContinuity = "FREESHIPFORAUTO";
		public static readonly string GiftWrap = "GIFTWRAP";
		public static readonly string Percent = "PERCENT";
		public static string GetClass(string s){
			if (s == PromotionClasses.Dollar) return "Dollar(s) Off";
			if (s == PromotionClasses.Percent) return "Percent Off";
			if (s == PromotionClasses.GiftWrap) return "Free Gift wrapping";
			if (s == PromotionClasses.FreeGift) return "Free Gift / Sample";
			if (s == PromotionClasses.FreeShipping) return "Free Shipping";
			if (s == PromotionClasses.FreeShippingForContinuity) return "Free Shipping on Continuity Orders";
			return "Unknown";
		}
	}

	public class PromotionEngine {
		public static void Apply(Order o){
			o.ClearPromotions();

			PromotionList pl = PromotionEngine.GetCurrentPromotions(o.ConnectionString);
			for (int i = 0; i < pl.Count; i++) {
				pl[i].Apply(o);
			}
		}
		public static PromotionList GetCurrentPromotions(string cn){
			string sql;
			DataRowCollection rows;
			PromotionList pl = new PromotionList();

			//	get all current promotions.
			sql = "SELECT * FROM promoMaster "
				+ "WHERE status IN ('P','L') "
				+ "AND PromotionType = '" + PromotionTypes.Automatic + "' "
				+ "AND PromotionUsage = '" + PromotionUsages.Unlimited + "' "
				+ "AND GETDATE() BETWEEN EffectiveOn AND ExpiresOn "
				+ "ORDER BY Id";
			rows = Utilities.GetRecordSet(sql, cn);
			for (int i = 0; i < rows.Count; i++) {
				pl.Add(new Promotion(rows[i], cn));
			}
			return pl;
		}
		public static PromotionList GetAllPromotions(string cn){
			string sql;
			DataRowCollection rows;
			PromotionList pl = new PromotionList();

			//	get all current promotions.
			sql = "SELECT * FROM promoMaster "
				+ "ORDER BY Status DESC, effectiveon DESC";
			rows = Utilities.GetRecordSet(sql, cn);
			for (int i = 0; i < rows.Count; i++) {
				pl.Add(new Promotion(rows[i], cn));
			}
			return pl;
		}
		public static PromotionList GetUnlimitedPromotions(string cn){
			string sql;
			DataRowCollection rows;
			PromotionList pl = new PromotionList();

			//	get all current promotions.
			sql = "SELECT * FROM promoMaster "
				+ "WHERE PromotionUsage = 'U' "
				+ "ORDER BY Status DESC, effectiveon DESC";
			rows = Utilities.GetRecordSet(sql, cn);
			for (int i = 0; i < rows.Count; i++) {
				pl.Add(new Promotion(rows[i], cn));
			}
			return pl;
		}

		public static Promotion GetByCode(string code, string cn){
			string sql = "SELECT * FROM promoMaster WHERE PromotionCode = '" + code + "' ";
			DataRowCollection rows = Utilities.GetRecordSet(sql, cn);
			if (rows.Count > 0) return new Promotion(rows[0], cn);
			return null;
		}
	}

	public class Promotion {
		#region Properties
			private int key;
			private string status;
			private string type;
			private string usage;
			private string pclass;
			private string code;
			private DateTime createdOn;
			private string createdBy;
			private DateTime effectiveOn;
			private DateTime expiresOn;
			private string title;
			private string description;
			private string expression;
			private decimal amount;

			private RuleList rules = new RuleList();

			private string connectionString;
		#endregion		
		#region Fields
			public int Key {
				get { return key; }
			}
			public string Status {
				get { return status; }
				set { status = value; }
			}
			public string Type {
				get { return type; }
				set { type = value; }
			}
			public string Usage {
				get { return usage; }
				set { usage = value; }
			}
			public string Class {
				get { return pclass; }
				set { pclass = value; }
			}
			public string Code {
				get { return code; }
				set { code = value ; }
			}
			public DateTime CreatedOn {
				get { return createdOn; }
			}
			public string CreatedBy {
				get { return createdBy; }
				set { createdBy = value; }
			}
			public DateTime EffectiveOn {
				get { return effectiveOn; }
				set { effectiveOn = value; }
			}
			public DateTime ExpiresOn {
				get { return expiresOn; }
				set { expiresOn = value; }
			}
			public string Title {
				get { return title; }
				set { title = value; }
			}
			public string Abstract {
				get { return description; }
				set { description = value; }
			}
			public string Expression {
				get { return expression; }
				set { expression = value; }
			}
			public string ConnectionString {
				get { return connectionString; }
				set { connectionString = value; }
			}
			public RuleList Rules {
				get { return rules; }
			}
			public bool WillBeActive {
				get {
					return (status == Statuses.Published)
						&& (EffectiveOn.CompareTo(DateTime.Now) > 0)
						&& (ExpiresOn.CompareTo(DateTime.Now) > 0);
				}
			}
			public bool IsActive {
				get {
					return (status == Statuses.Published)
						&& (EffectiveOn.CompareTo(DateTime.Now) < 0)
						&& (ExpiresOn.CompareTo(DateTime.Now) > 0);
				}
			}
			public bool IsCompleted {
				get {
					return (status == Statuses.Published)
						&& (EffectiveOn.CompareTo(DateTime.Now) < 0)
						&& (ExpiresOn.CompareTo(DateTime.Now) < 0);
				}
			}

			public decimal Amount {
				get {
					return amount;
				}
				set {
					amount = value;
				}
			}
		#endregion

		#region Constructors
			public Promotion() : this("M", "U", "DOLLAR", null) { }
			public Promotion(string t) : this(t, "U", "DOLLAR", null) {}
			public Promotion(string t, string u, string c) : this(t, u, c, null){ }
			public Promotion(string t, string u, string c, string cd){
				key = -1;
				type = t;
				usage = u;
				pclass = c;
				code = cd;
				createdOn = DateTime.Now;
			}
			public Promotion(string code, string cn) 
				: this(
					(Utilities.GetRecordSet(
						"SELECT * FROM promoMaster WHERE PromotionCode='" + code + "' AND Status ='P' AND GETDATE() BETWEEN EffectiveOn AND ExpiresOn", 
						cn
					)
				)[0], cn){}
			public Promotion(int k, string cn) : this((Utilities.GetRecordSet("SELECT * FROM promoMaster WHERE id=" + k, cn))[0], cn){}
			public Promotion(DataRow row, string cn){
				connectionString = cn;
				key = (int)row["Id"];
				status = (string)row["status"];
				type = (string)row["PromotionType"];
				usage = (string)row["PromotionUsage"];
				pclass = (string)row["PromotionClass"];
				code = null;
				if (!row.IsNull("PromotionCode")) code = (string)row["PromotionCode"];
				createdOn = (DateTime)row["createdOn"];
				createdBy = (string)row["createdBy"];
				effectiveOn = (DateTime)row["effectiveOn"];
				expiresOn = (DateTime)row["expiresOn"];
				title = "";
				description = "";
				if (!row.IsNull("title")) title = (string)row["title"];
				if (!row.IsNull("abstract")) description = (string)row["abstract"];
				expression = (string)row["expression"];
				loadRules();
			}
		#endregion

		private void loadRules(){
			if (rules.Count > 0) rules.Clear();
			string sql = "SELECT * FROM promoQualifier WHERE promoMaster=" + key;
			DataRowCollection rows = Utilities.GetRecordSet(sql, connectionString);
			for (int i = 0; i < rows.Count; i++) {
				rules.Add(new Qualifier(this, rows[i]));
			}
		}
		private void loadRules(string rulesString){
			if (rules.Count > 0) rules.Clear();
			StringReader sr = new StringReader(rulesString);
			string line;
			while ((line = sr.ReadLine()) != null){
				string[] fields = line.Split('\t');
				rules.Add(new Qualifier(this, Int32.Parse(fields[0]),fields[1], Int32.Parse(fields[2]), fields[3]));
			}
		}

		private bool test(Order o){
			// basically, false if any rule fails, otherwise true.
			for (int i = 0; i < rules.Count; i++){
				if (!rules[i].Test(o)) return false;
			}
			return true;
		}

		public bool Test(Order o){ return test(o); }

		public void Apply(Order o){
			//	ensure uniqueness.
			bool t = false;
			for (int i = 0; i < o.Promotions.Count; i++){
				if (o.Promotions[i].key == key) {
					t = true;
					break;
				}
			}

			if (!t){
				if (test(o)){
					//	ok, let's do the actual application now.
					if (pclass == PromotionClasses.GiftWrap){
						ApplyFreeGiftWrap(o);
					}
					if (pclass == PromotionClasses.FreeShipping) {
						ApplyFreeShipping(o);
					}
					if (pclass == PromotionClasses.FreeGift) {
						o.Items.Add(GetCartItem(o));
					}
					if (pclass == PromotionClasses.Dollar
						|| pclass == PromotionClasses.Percent
					){
						o.Credits.Add(GetCreditItem(o));
					}
					if (type == PromotionTypes.Manual) o.IsCouponApplied = true;
				}
			}
		}

		//	adjusts a line for gift wrapping, if the gift wrap is on the order
		public void ApplyFreeGiftWrap(Order o){
			if (pclass != PromotionClasses.GiftWrap) return;
			if (o.GiftWrapping != null) {
				amount = o.GiftWrapping.LineTotal;

				o.GiftWrapping.LineTotal = 0;
				o.GiftWrapping.IsPriceAdjustedByPromotion = true;

				//	add it to the list of promos applied to the order
				o.Promotions.Add(this);
			}
			return;
		}

		//	apply against shipping
		public void ApplyFreeShipping(Order o){
			if (pclass != PromotionClasses.FreeShipping) return;
			if (o.ShippingInformation == null) {
				o.ShippingInformation = Shipping.GetShipping(o);
			}
			amount = o.ShippingInformation.Cost;
			o.ShippingInformation.Cost = 0;

			//	add it to the list of promos applied to the order
			o.Promotions.Add(this);
		}

		//	returns a cart item that represents the gift this promo represents.
		public CartItem GetCartItem(Order o) {
			if (pclass == PromotionClasses.FreeGift) {
				int key = Int32.Parse(expression);
				Product p = Catalog.Products.GetByKey(key);
				amount = p.Price;

				CartItem ci = new CartItem(1, p, this, 0);
				ci.Title = title;

				//	add it to the list of promos applied to the order
				o.Promotions.Add(this);
				return ci;
			}
			return null;
		}

		//	returns a PromotionCreditItem that this promotion represents.
		public CreditItem GetCreditItem(Order o){
			//	the would be the actual line item translation of this promotion.
			if (pclass == PromotionClasses.Dollar
				|| pclass == PromotionClasses.Percent
			) {
				decimal c = 0;
				decimal v = o.SubTotal;
				if (pclass == PromotionClasses.Dollar) c = decimal.Parse(expression);
				else c = (decimal.Parse(expression) / 100) * v;
				CreditItem ci = new CreditItem(
					new PromotionCreditItem(title, c), 
					CreditItemTypes.Promotion, 
					title
				);
				if (type == PromotionTypes.Manual) 
					((PromotionCreditItem)ci.Source).IsAutomatic = false;

				//	add it to the list of promos applied to the order
				amount = c;
				o.Promotions.Add(this);
				return ci;
			}
			return null;
		}

		//	standard methods
		public void Save(){
			Save(connectionString);
		}
		public void Save(string cn){
			string sql;
			DataRowCollection rows;
			if (key < 1) {
				sql = "INSERT INTO promoMaster (PromotionType) VALUES ('" + type + "') SELECT @@IDENTITY AS Id";
				rows = Utilities.GetRecordSet(sql, cn);
				if (rows.Count > 0) key = Convert.ToInt32(rows[0]["id"]);
			}
			sql = "UPDATE promoMaster SET " 
				+ "status = '" + status + "', "
				+ "PromotionType = '" + type + "', "
				+ "PromotionUsage = '" + usage + "', "
				+ "PromotionClass = '" + pclass + "', "
				+ "PromotionCode = '" + code.Replace("'","''") + "', "
				+ "CreatedOn = '" + createdOn.ToString("yyyy-MM-dd HH:mm:ss") + "', "
				+ "CreatedBy = '" + createdBy.Replace("'","''") + "', "
				+ "EffectiveOn = '" + effectiveOn.ToString("yyyy-MM-dd HH:mm:ss") + "', "
				+ "ExpiresOn = '" + expiresOn.ToString("yyyy-MM-dd HH:mm:ss") + "', "
				+ "Title = '" + title.Replace("'","''") + "', "
				+ "Abstract = '" + description.Replace("'","''") + "', "
				+ "Expression = '" + expression + "' "
				+ "WHERE id=" + key;
			Utilities.ExecuteNonQuery(sql, cn);

			sql = "DELETE FROM promoQualifier WHERE promoMaster=" + key;
			Utilities.ExecuteNonQuery(sql, cn);
			for (int i = 0; i < rules.Count; i++) {
				sql = "INSERT INTO promoQualifier (promomaster, id, qualifierType, quantity, expression) "
					+ "VALUES ("
					+ key + ","
					+ (i + 1) + ","
					+ "'" + rules[i].Type + "',"
					+ rules[i].Quantity + ","
					+ "'" + rules[i].Expression + "'"
					+ ")";
				Utilities.ExecuteNonQuery(sql, cn);
				rules[i].Key = (i + 1);
			}
		}
	}

	public sealed class QualifierTypes {
		public static readonly string DollarAmount = "D";
		public static readonly string Geography = "GEO";
		public static readonly string Category = "C";
		public static readonly string Family = "F";
		public static readonly string Product = "P";
		public static string GetType(string s){
			if (s == QualifierTypes.DollarAmount) return "Order is greater than $(X)";
			if (s == QualifierTypes.Geography) return "Order is being shipped to (X)";
			if (s == QualifierTypes.Category) return "Order has at least (n) item(s) from the following category(s): (X)";
			if (s == QualifierTypes.Family) return "Order has at least (n) (X)";
			if (s == QualifierTypes.Product) return "Order has at least (n) (X) ";
			return "Unknown";
		}
	}

	public class Qualifier {
		private Promotion parent;
		private int key;
		private string type;
		private int quantity = 1;
		private string expression;

		public Promotion Parent {
			get { return parent; }
			set { parent = value ; }
		}
		public int Key {
			get { return key; }
			set { key = value ; }
		}
		public string Type {
			get { return type; }
			set { type = value; }
		}
		public int Quantity {
			get { return quantity; }
			set { quantity = value; }
		}
		public string Expression {
			get { return expression; }
			set { expression = value ; }
		}

		//	constructors
		public Qualifier(string t, string e) : this(null, 0, t, 1, e){ }
		public Qualifier(string t, int q, string e) : this(null, 0, t, q, e){ }
		public Qualifier(Promotion p) : this(p, 0, "D", 1, ""){ }
		public Qualifier(Promotion p, int k) : this(p, k, "D", 1, ""){ }
		public Qualifier(Promotion p, int k, string t) : this(p, k, t, 1, ""){ }
		public Qualifier(Promotion p, int k, string t, string e) : this(p, k, t, 1, e){ }
		public Qualifier(Promotion p, int k, string t, int q, string e){ 
			parent = p;
			key = k;
			type = t;
			quantity = q;
			expression = e;
		}
		public Qualifier(Promotion p, DataRow row){
			parent = p;
			key = (int)row["id"];
			type = (string)row["QualifierType"];
			quantity = (int)row["quantity"];
			expression = (string)row["expression"];
		}

		public bool Test(Order o){
			if (type == QualifierTypes.DollarAmount) {
				if (o.SubTotal > Decimal.Parse(expression)) return true;
				return false;
			} else if (type == QualifierTypes.Category) {
				string cn = parent.ConnectionString;
				if (cn != null && cn != String.Empty){
					ArrayList ar = new ArrayList();
					string[] c = expression.Split(',');
					for (int i = 0; i < c.Length; i++){
						if (c[i].Trim() != String.Empty)
							ar.Add("'" + c[i].Trim() + "'");
					}
					string search = String.Join(",", (string[])ar.ToArray("".GetType()));
					string sql = "SELECT DISTINCT prdTopic, prdReference FROM prdCategories WHERE prdCategory IN (" + search + ") AND status IN ('P','L') ORDER BY prdTopic, prdReference";
					DataRowCollection rows = Utilities.GetRecordSet(sql, cn);
					if (rows.Count > 0) {
						for (int i = 0; i < o.Items.Count; i++){
							for (int j = 0; j < rows.Count; j++) {
								string topic = (string)rows[j]["prdTopic"];
								int reference = (int)rows[j]["prdReference"];
								if (topic == "prdFamily"){
									if (o.Items[i].Product.Family.Key == reference) return true;
								} else {
									if (o.Items[i].Product.Key == reference) return true;
								}
							}
						}
					}
				}
				return false;
			} else if (type == QualifierTypes.Family) {
				string[] exp = expression.Split(',');
				CartItems ci = new CartItems();
				for (int i = 0; i < o.Items.Count; i++){
					int key = o.Items[i].Product.Family.Key;
					bool test = false;
					for (int j = 0; j < ci.Count; j++){
						if (ci[j].Product.Family.Key == key) {
							ci[j].Quantity += o.Items[i].Quantity;
							test = true;
							break;
						}
					}
					if (!test){
						ci.Add(new CartItem(o.Items[i].Quantity, o.Items[i].Product));
					}
				}
				for (int i = 0; i < ci.Count; i++){
					for (int j = 0; j < exp.Length; j++) {
						if (exp[j] != String.Empty 
							&& Int32.Parse(exp[j].Trim()) == ci[i].Product.Family.Key
							&& o.Items[i].Quantity >= quantity
						) return true;
					}
				}
				return false;
			} else if (type == QualifierTypes.Product) {
				string[] exp = expression.Split(',');
				for (int i = 0; i < o.Items.Count; i++){
					int key = o.Items[i].Product.Key;
					for (int j = 0; j < exp.Length; j++) {
						if (exp[j] != String.Empty 
							&& Int32.Parse(exp[j].Trim()) == key
							&& o.Items[i].Quantity >= quantity
						) return true;
					}
				}
				return false;
			} else if (type == QualifierTypes.Geography) {
				string c = o.ShippingAddress.Country;
				string[] exp = expression.Split(',');
				for (int i = 0; i < exp.Length; i++){
					if (exp[i] != String.Empty && exp[i].Trim() == c) return true;
				}
				return false;
			}
			return true;	//	make the assumption that this rules makes no sense.
		}
	}
}
