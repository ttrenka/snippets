using System;
using System.Data;
using DepartmentZed;
using DepartmentZed.eCommerce;
using Zirh.Data;

namespace Zirh.Automation {
	public class AutoShipReminder : IPackage {
		private string connectionString;
		public AutoShipReminder() {	}
		public AutoShipReminder(string cn){ 
			connectionString = cn;
		}
		#region IPackage Members

		public void SetConnectionString(string cn) {
			connectionString = cn;
		}

		public void Execute() {
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

			DateTime now = DateTime.Now.AddDays(4);
			string subject = "Please verify your upcoming Zirh Locker order";
			for (int i = 0; i < otl.Count; i++){
				OrderTemplate ot = otl[i];
				if (ot.BillingAddress.Country != "US") continue;
				if (ot.ShippingAddress.Country != "US") continue;

				ContinuityItems ci = new ContinuityItems();
				for (int j = 0; j < ot.Items.Count; j++) {
					DateTime nesd = ot.Items[j].NextEstimatedShipDate;
					if (ot.Items[j].ReorderInterval > 0
						&& now.Year == nesd.Year
						&& now.Month == nesd.Month
						&& now.Day == nesd.Day
					){
						ci.Add(ot.Items[j]);
					}
				}

				if (ci.Count > 0){
					//	assemble the email and send it out.
					string msg = ot.User.FirstName + "'s Upcoming Zirh Locker Order\r\n"
						+ "Your order will ship approximately " + now.ToLongDateString() + ".\r\n"
						+ "Your login name: " + ot.User.Username + "\r\n\r\n"
						+ "Dear " + ot.User.FirstName + ",\r\n"
						+ "This is just a quick reminder that your upcoming Zirh Locker order is scheduled to ship around " + now.ToLongDateString() + ". We hope you enjoy the convenience of keeping your virtual Locker at Zirh!\r\n\r\n"
						+ "Scheduled Zirh Locker Items:\r\n\r\n"
						+ "\tItem\t\t\t\tPrice"
						+ "\t----------------\t\t\t\t------";
					for (int j = 0; j < ci.Count; j++) {
						msg += "\t" + ci[j].Product.Family.Title + "\t\t\t\t" + ci[j].Product.Price.ToString("C") + "\r\n";
					}
					msg += "\r\n"
						+ "If you need to edit your Zirh Locker schedule, please set your changes before " + ot.Items[0].NextEstimatedShipDate.ToLongDateString() + ".\r\n\r\n"
						+ "If we can be of service, please let us know. Our Customer Care Service Center can be reached by email at mylocker@zirh.com or by phone toll-free at 1-800-295-8877 (9AM - 6PM EST).\r\n\r\n"
						+ "Zirh looks forward to helping you look, feel and BE your best.";

					string html = "<html><head></head><body>"
						+ "<div>" + ot.User.FirstName + "'s Upcoming Zirh Locker Order</div>"
						+ "<div>Your order will ship approximately " + now.ToLongDateString() + ".</div>"
						+ "<p>Your login name: " + ot.User.Username + "</p>"
						+ "<div>Dear " + ot.User.FirstName + ",</div>"
						+ "<p>This is just a quick reminder that your upcoming Zirh Locker order is scheduled to ship around " + now.ToLongDateString() + ". We hope you enjoy the convenience of keeping your virtual Locker at Zirh!</p>"
						+ "<p>Scheduled Zirh Locker Items:</p>"
						+ "<table cellpadding=\"2\" cellspacing=\"0\" border=\"0\">"
						+ "<tr>"
						+ "<td style=\"border-bottom:1px solid black;\"><b>Item</b></td>"
						+ "<td style=\"border-bottom:1px solid black;\"><b>Price</b></td>"
						+ "</tr>";
					for (int j = 0; j < ci.Count; j++) {
						html += "<tr>"
							+ "<td>" + ci[j].Product.Family.Title + "</td>"
							+ "<td>" + ci[j].Product.Price.ToString("C") + "</td>"
							+ "</tr>";
					}
					html += "</table>"
						+ "<p>If you need to edit your Zirh Locker schedule, please set your changes before " + ot.Items[0].NextEstimatedShipDate.ToLongDateString() + ".</p>"
						+ "<p>If we can be of service, please let us know. Our Customer Care Service Center can be reached by email at mylocker@zirh.com or by phone toll-free at 1-800-295-8877 (9AM - 6PM EST).</p>"
						+ "<p>Zirh looks forward to helping you look, feel and BE your best.</p>";

					Utilities.SendMail(
						"mylocker@zirh.com",
						ot.User.Username,
						subject,
						msg,
						html
					);
				}
			}
			Utilities.SaveEmails = false;
		}
		#endregion
	}
}