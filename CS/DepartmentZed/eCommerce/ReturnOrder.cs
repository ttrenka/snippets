using System;
using System.Data;
using DepartmentZed;
using DepartmentZeDepartmentZed.Data;

namespace DepartmentZed.eCommerce {
	public class ReturnOrder {
		private Order source;
		private Order credit;
		private string connectionString;
		private Product returnItem;

		public string ConnectionString {
			get { return connectionString; }
		}
		public Order Source {
			get { return source; }
		}
		public Order Credit {
			get { return credit; }
		}
		public CartItems CreditedItems {
			get { return credit.Items; }
		}

		public ReturnOrder(string cn) {
			connectionString = cn;
		}
		public ReturnOrder(Order o){
			connectionString = o.ConnectionString;
			source = o;
			credit = new Order(o.ConnectionString);
			credit.OrderType = OrderTypes.Credit;

			credit.User = o.User;
			credit.IPAddress = o.IPAddress;
			credit.TransactionId = o.TransactionId;
			credit.CurrentStatus = OrderStatuses.NewOrder;
			credit.Email = o.Email;

			credit.BillingAddress = o.BillingAddress;
			credit.ShippingAddress = o.ShippingAddress;
			credit.PaymentInformation = o.PaymentInformation;

			returnItem = new Product();
			returnItem.SKU = "RETURN";
			returnItem.Title = "Credit Line Item";
			returnItem.Weight = "N/A";
			returnItem.Price = 0;
		}

		//	add cart items to the return order.
		public void Add(CartItem ci){
			//	this is an existing cart item we are crediting.
			CartItem c = new CartItem(ci.Quantity, ci.Product);
			c.LineTotal = c.LineTotal * -1;
			credit.Items.Add(c);
		}
		public void Add(CartItem ci, int qty) {
			if (qty > ci.Quantity) throw new Exception("You cannot return more items than ordered.");
			CartItem c = new CartItem(qty, ci.Product);
			c.LineTotal = c.LineTotal * -1;
			credit.Items.Add(c);
		}
		public void Add(decimal amt) {
			Product p = new Product();
			p.SKU = returnItem.SKU;
			p.Title = returnItem.Title;
			p.Weight = returnItem.Weight;
			p.Price = returnItem.Price;

			CartItem ret = new CartItem(1, p);
			ret.Title = p.Title;
			ret.LineTotal = amt;
			credit.Items.Add(ret);
		}
		public void Add(string t, decimal amt) {
			//	this is a miscellaneous item
			Product p = new Product();
			p.SKU = returnItem.SKU;
			p.Title = returnItem.Title + ": " + t;
			p.Weight = returnItem.Weight;
			p.Price = returnItem.Price;

			CartItem ret = new CartItem(1, p);
			ret.Title = p.Title;
			ret.LineTotal = amt;
			credit.Items.Add(ret);
		}

		public bool Process(ITransaction t){
			//	let's fill out the credit order.
			credit.User = source.User;
			credit.IPAddress = source.IPAddress;
			credit.TransactionId = source.TransactionId;
			credit.Email = source.Email;
			credit.CurrentStatus = OrderStatuses.NewOrder;
			credit.BillingAddress = source.BillingAddress;
			credit.ShippingAddress = source.ShippingAddress;
			credit.PaymentInformation = source.PaymentInformation;
			credit.AssociatedOrders.Add(source);

			//	figure out tax returns, if any.
			if (source.Tax > 0) {
				//	get the total to be returned.
				decimal tax = -1 * credit.Total;
				credit.Tax = -1 * (tax * 0.08375M);
				if (-1 * credit.Tax > source.Tax) credit.Tax = -1 * source.Tax;
			}

			//	ok, let's do the credit.
			return credit.Credit(t);
		}
	}
}
