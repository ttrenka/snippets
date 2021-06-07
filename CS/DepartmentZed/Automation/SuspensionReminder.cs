using System;
using System.Data;
using DepartmentZed;
using DepartmentZed.eCommerce;

namespace DepartmentZed.Automation {
	public class SuspensionReminder : IPackage {
		private string connectionString;

		public SuspensionReminder(){ }
		public SuspensionReminder(string cn){ 
			connectionString = cn;
		}
		#region IPackage Members

		public void SetConnectionString(string cn) {
			connectionString = cn;
		}

		public void Execute() {
			string sql;
			DataRowCollection rows;

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
				+ "	AND co.Status IN ('S') "
				+ "	AND ci.ReorderInterval > 0 "
				+ "	AND DatePart(yyyy, co.LastModifiedOn) = DatePart(yyyy, DateAdd(m, -1, GetDate())) "
				+ "	AND DatePart(m, co.LastModifiedOn) = DatePart(m, DateAdd(m, -1, GetDate())) "
				+ "	AND DatePart(d, co.LastModifiedOn) = DatePart(d, DateAdd(m, -1, GetDate()))";
			rows = Utilities.GetRecordSet(sql, connectionString);

			//	build the order template list.
			OrderTemplateList otl = new OrderTemplateList();
			for (int i = 0; i < rows.Count; i++){
				otl.Add(new OrderTemplate(rows[i], connectionString));
			}
			if (otl.Count == 0) return;

			string subject = "Your locker is waiting for you";
			for (int i = 0; i < otl.Count; i++) {
				OrderTemplate o = otl[i];
				if (o.BillingAddress.Country != "US") continue;
				if (o.ShippingAddress.Country != "US") continue;

				string msg = "Login name: " + o.User.Username + "\r\n\r\n"
					+ "Dear " + o.User.FirstName + ",\r\n\r\n"
					+ "We just wanted to let you know that your personal DepartmentZed Locker is still ready and waiting for you.\r\n\r\n"
					+ "To re-activate it, please click here:\r\n"
					+ "http://www.example.com/locker.aspx\r\n\r\n "
					+ "If we can be of service, just let us know. The DepartmentZed Locker Service Center can be reached by email at mylocker@example.com or by phone toll-free at 1-800-295-8877 (9AM - 6PM EST).\r\n\r\n "
					+ "Best regards,\r\n"
					+ "DepartmentZed Locker Administrator" ;
				
				string html = "<html><head></head><body>"
					+ "<p>Login name: " + o.User.Username + "</p>"
					+ "<p>Dear " + o.User.FirstName + ",</p>"
					+ "<p>We just wanted to let you know that your personal DepartmentZed Locker is still ready and waiting for you.</p>"
					+ "<p>To re-activate it, please click here:<br/>"
					+ "<p><a href=\"http://www.example.com/locker.aspx\">http://www.example.com/locker.aspx</a></p> "
					+ "<p>If we can be of service, just let us know. The DepartmentZed Locker Service Center can be reached by email at mylocker@example.com or by phone toll-free at 1-800-295-8877 (9AM - 6PM EST).</p> "
					+ "<p>Best regards,<br/>"
					+ "DepartmentZed Locker Administrator</p>"
					+ "</body></html>";

				Utilities.SendMail(
					"mylocker@example.com",
					o.User.Username,
					subject,
					msg,
					html
				);
			}
		}
		#endregion
	}
}
