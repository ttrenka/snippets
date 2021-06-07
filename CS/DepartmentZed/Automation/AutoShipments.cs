using System;
using System.Collections;
using System.Data;
using System.Net ;
using System.Text;
using DepartmentZed;
using DepartmentZed.eCommerce;
using DepartmentZed.Data;

namespace DepartmentZed.Automation {
	public class AutoShipments : IPackage {
		private string connectionString = "";
		private string transUser;
		private string transPwd;
		private string transKey;
		private bool transTest;
		private string custServEmail;

		public string CustomerService {
			get { return custServEmail; }
			set { custServEmail = value; }
		}
		public string TransactionUser {
			get { return transUser; }
			set { transUser = value; }
		}
		public string TransactionPassword {
			get { return transPwd; }
			set { transPwd = value; }
		}
		public string TransactionKey {
			get { return transKey; }
			set { transKey = value; }
		}
		public bool TransactionAsTest {
			get { return transTest; }
			set { transTest = value; }
		}

		public AutoShipments() : this("") { }
		public AutoShipments(string cn) {
			connectionString = cn ;
		}

		public void SetConnectionString(string cn){
			connectionString = cn ;
		}

		public void Execute(){
			string sql;
			DataRowCollection rows;

			Utilities.SaveEmails = true;

			//	init the catalog if needed
			if (!Catalog.IsInitialized) Catalog.Initialize(connectionString);

			//	get all relevant autoship templates.
			sql = "SELECT DISTINCT "
				+ "	co.usrMaster, "
				+ "	co.CreatedOn, "
				+ "	co.LastModifiedOn, "
				+ "	co.Status, "
				+ "	co.usrRemitment, "
				+ "	co.usrAddress "
				+ "FROM usrContinuityOrder co "
				+ "INNER JOIN usrContinuityOrderItem ci "
				+ "	ON ci.usrMaster = co.usrMaster "
				+ "WHERE IsNull(co.usrRemitment,0) > 0 "
				+ "	AND co.Status IN ('P','L') "
				+ "	AND ci.ReorderInterval > 0";

			rows = Utilities.GetRecordSet(sql, connectionString);

			//	build the order template list.
			OrderTemplateList otl = new OrderTemplateList();
			for (int i = 0; i < rows.Count; i++){
				otl.Add(new OrderTemplate(rows[i], connectionString));
			}
			if (otl.Count == 0) return;

			//	ok, we have a full list of order templates.  Let's go through and make
			//	whatever new orders we need to make.
			AuthorizeDotNetTransaction a = new AuthorizeDotNetTransaction(
				transUser,
				transPwd,
				transKey,
				transTest
			);
			a.Source = "Continuity";
			DateTime now = DateTime.Now;
			for (int i = 0; i < otl.Count; i++){
				OrderTemplate ot = otl[i];
				bool makeOrder = false;

				//	to figure it out, we need to check the template for any items to be shipped today.
				for (int j = 0; j < ot.Items.Count; j++) {
					DateTime nesd = ot.Items[j].NextEstimatedShipDate;
					if (ot.Items[j].ReorderInterval > 0
						&& now.Year == nesd.Year
						&& now.Month == nesd.Month
						&& now.Day == nesd.Day
					){
						makeOrder = true;
					}
				}

				if (makeOrder) {
					//	create new orders from the info, and post the trans.
					Order o = new Order(connectionString);
					o.OrderType = OrderTypes.Continuity;
					o.User = ot.User;
					o.BillingAddress = ot.BillingAddress;
					o.ShippingAddress = ot.ShippingAddress;
					o.PaymentInformation = ot.PaymentInformation;

					//	we always ignore anyone not in the US.
					if (o.BillingAddress.Country != "US"
						|| o.ShippingAddress.Country != "US"
					) continue;

					//	build the cart items.
					for (int j = 0; j < ot.Items.Count; j++) {
						ContinuityItem ci = ot.Items[j];
						DateTime nesd = ci.NextEstimatedShipDate;
						if (ci.ReorderInterval > 0
							&& now.Year == nesd.Year
							&& now.Month == nesd.Month
							&& now.Day == nesd.Day
						){
							o.Items.Add(new CartItem(ci.Quantity, ci.Product));
						}
					}

					o.ShippingInformation = Shipping.GetShipping(o);
					PromotionList pl = PromotionEngine.GetCurrentPromotions(connectionString);
					for (int j = 0; j < pl.Count; j++){
						if (pl[j].Class == PromotionClasses.FreeShippingForContinuity) {
							o.ShippingInformation.Cost = 0;
							break;
						}
					}

					bool isGood = true;
					isGood = o.Approve(a);
					if (isGood) {
						//	grab the continuity items, and update the next shipping date.
						for (int j = 0; j < o.Items.Count; j++){
							ContinuityItem c = ot.Items.GetByKey(o.Items[j].Product.Key);
							c.LastShippedOn = DateTime.Now;
						}
						ot.History.Add(o);
						ot.Save();

						//	send out the email.
						Utilities.SendMail(
							"mylocker@example.com",
							ot.User.Username,
							"DepartmentZed AutoShip Order #" + o.OrderNumber,
							Receipt.AsText(o),
							Receipt.AsHtml(o)
						);
					} else {
						//	disable the order, send an email to the customer
						string subject = "Error with your DepartmentZed locker";
						string msg = "Login name: " + o.User.Username + "\r\n\r\n"
							+ "Dear " + o.User.FirstName + ",\r\n\r\n"
							+ "We are having some difficulty fulfilling your next DepartmentZed Locker order, which was set to ship on " + DateTime.Now.ToLongDateString() + ". The error is:\r\n\r\n"
							+ "Credit Card not no longer accepted: " + a.Result.Reason + "\r\n\r\n"
							+ "To correct this problem, please click here:\r\n\r\n"
							+ "http://www.example.com/autoship.aspx\r\n\r\n"
							+ "If we can be of service, just let us know. The DepartmentZed Locker Service Center can be reached by email at mylocker@example.com or by phone toll-free at 1-800-295-8877 (9AM - 6PM EST).\r\n\r\n"
							+ "Unfortunately your Locker orders cannot be shipped until you click on the link above and correct the error indicated above.\r\n\r\n\r\n"
							+ "Best regards,\r\n\r\n"
							+ "DepartmentZed Locker Administrator";
						string html = "<html><head></head><body>"
							+ "<p>Login name: " + o.User.Username + "</p>"
							+ "<p>Dear " + o.User.FirstName + ",</p>"
							+ "<p>We are having some difficulty fulfilling your next DepartmentZed Locker order, which was set to ship on " + DateTime.Now.ToLongDateString() + ". The error is:</p>"
							+ "<p><b>Credit Card not no longer accepted: <pre>" + a.Result.Reason + "</pre></b></p>"
							+ "<p>To correct this problem, <a href=\"http://www.example.com/autoship.aspx\">please click here</a>.</p>"
							+ "<p>If we can be of service, just let us know. The DepartmentZed Locker Service Center can be reached by email at mylocker@example.com or by phone toll-free at 1-800-295-8877 (9AM - 6PM EST).</p>"
							+ "<p>Unfortunately your Locker orders cannot be shipped until you click on the link above and correct the error indicated above.</p>"
							+ "<p><div>Best regards,</div>"
							+ "<div>DepartmentZed Locker Administrator</div></p>"
							+ "</body></html>";

						Utilities.SendMail(
							"mylocker@example.com",
							o.User.Username,
							subject,
							msg,
							html
						);

						ot.Status = Statuses.Disabled;
						ot.Save();
					}
				}
			}
			Utilities.SaveEmails = false;
			return;
		}
	}
}
