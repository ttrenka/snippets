using System;
using System.Data;
using DepartmentZed;
using DepartmentZed.eCommerce;

namespace Zirh.Automation{
	public class CompleteImport : IPackage{
		private string connectionString;
		public CompleteImport(string cn) {
			connectionString = cn;
		}
		#region IPackage Members

		public void SetConnectionString(string cn) {
			connectionString = cn;
		}

		public void Execute() {
			string sql;
			DataRowCollection rows;

			sql = "SELECT * FROM usrOrderPayment";
			rows = Utilities.GetRecordSet(sql, connectionString);
			for (int i = 0; i < rows.Count; i++){
				int o = (int)rows[i]["usrOrder"];
				string an = Remitment.Encrypt((string)rows[i]["AccountNumber"]);
				sql = "UPDATE usrOrderPayment SET accountnumber = '" + an + "' WHERE usrOrder = " + o;
				Utilities.ExecuteNonQuery(sql, connectionString);
			}

			sql = "SELECT * FROM usrRemitment";
			rows = Utilities.GetRecordSet(sql, connectionString);
			for (int i = 0; i < rows.Count; i++){
				Guid g = (Guid)rows[i]["usrMaster"];
				int id = (int)rows[i]["id"];
				string an = Remitment.Encrypt((string)rows[i]["AccountNumber"]);
				sql = "UPDATE usrRemitment SET accountnumber = '" + an + "' WHERE usrMaster = '" + g.ToString() + "' AND id = " + id;
				Utilities.ExecuteNonQuery(sql, connectionString);
			}
		}

		#endregion
	}
}
