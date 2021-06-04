using System;
using System.Data;
using Zirh.Data;

namespace DepartmentZed.eCommerce {
	public class CartItem {
		private int quantity;
		private Product product;
		private Promotion promo;
		
		//	if this is from an order, we want historical info.
		private string amazonOrderItemId = "";
		private string sku = "";
		private string title = "";
		private string weight = "";
		private string promotionInfo = "";
		private decimal price = decimal.MinValue;
		private decimal lineTotalOverride = decimal.MinValue ;

		private bool isPromotion = false;
		private bool isPriceAdjustedByPromotion = false;

		public int Quantity {
			get { return quantity; }
			set {
				if (value < 0) throw new ArgumentException("You may not set a negative value for Quantity.") ; 
				quantity = value ; 
			}
		}
		public Product Product {
			get { return product ; }
			set { product = value ; }
		}
		
		//	overridden shit if need be.
		public string AmazonItem {
			get { return amazonOrderItemId; }
			set { amazonOrderItemId = value; }
		}
		public string SKU {
			get { 
				if (sku != String.Empty) return sku;
				else return product.SKU;
			}
			set { sku = value; }
		}
		public string Title {
			get {
				if (title != String.Empty) return title;
				else return product.Family.Title;
			}
			set { title = value; }
		}
		public string Weight {
			get {
				if (weight != String.Empty) return weight;
				else return product.Weight;
			}
			set { weight = value; }
		}
		public string PromotionInfo {
			get { return promotionInfo; }
		}
		public decimal Price {
			get {
				if (price != decimal.MinValue) return price;
				else return product.Price;
			}
			set { price = value; }
		}
		public decimal LineValue {
			get { return product.Price * quantity; }
		}
		public decimal LineTotal {
			get { 
				if (lineTotalOverride != decimal.MinValue) return lineTotalOverride;
				else return product.Price * quantity; 
			}
			set {
				if (value != decimal.MinValue) lineTotalOverride = value;
				else throw new ArgumentException("(set) CartItem.LineTotal: value cannot be equal to decimal.MinValue.");
			}
		}

		//	the attached promotion
		public Promotion Promo {
			get { return promo ; }
			set { 
				promo = value; 
				promotionInfo = value.Title;
			}
		}

		//	promo test
		public bool IsPromotion {
			get { return isPromotion; }
			set { isPromotion = value; }
		}
		public bool IsPriceAdjustedByPromotion {
			get { return isPriceAdjustedByPromotion; }
			set { isPriceAdjustedByPromotion = value; }
		}

		public CartItem(int q, Product p) : this(q, p, null, decimal.MinValue){ }
		public CartItem(int q, Product p, Promotion pr, decimal c) {
			quantity = q;
			product = p ;
			lineTotalOverride = c;
			promo = pr;
			if (pr != null) isPromotion = true;
		}
		public CartItem(DataRow dr) : this(dr, "usrOrderItem"){}
		public CartItem(DataRow dr, string source) {
			if (source == "usrOrderItem") {
				if (!dr.IsNull("AmazonOrderItemId")) amazonOrderItemId = (string)dr["AmazonOrderItemId"];
				if (!dr.IsNull("promotionInfo")) promotionInfo = (string)dr["promotionInfo"];
				sku = (string)dr["sku"];
				title = (string)dr["title"];
				if (!dr.IsNull("weight")) weight = (string)dr["weight"];
				price = (decimal)dr["Price"];
				lineTotalOverride = (decimal)dr["LineTotal"];
			}
			quantity = (int)dr["quantity"];
			if (!dr.IsNull("prdMaster")) product = Catalog.Products.GetByKey((int)dr["prdMaster"]);	
			else if (Catalog.Products.GetBySKU(sku) != null) product = Catalog.Products.GetBySKU(sku);
			else {
				product = new Product();
				product.SKU = sku;
				product.Title = title;
				product.Weight = weight;
				product.Price = price;
			}
		}

		public void ResetLineTotal(){
			lineTotalOverride = decimal.MinValue;
		}
	}
}