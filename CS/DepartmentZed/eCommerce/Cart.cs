using System;
using System.Data;
using DepartmentZed;
using DepartmentZed.Data;

namespace DepartmentZed.eCommerce {
	public class Cart {
		#region Properties
		private Guid userId;
		private DateTime createdOn;
		private DateTime lastModifiedOn;
		private CartItems items;
		private string connectionString;
		#endregion

		#region Fields		
		public DateTime CreatedOn {
			get { return createdOn; }
			set { createdOn = value ; }
		}
		public DateTime LastModifiedOn {
			get { return lastModifiedOn ; }
			set { lastModifiedOn = value ; }
		}
		public CartItems Items {
			get { return items; }
		}
		#endregion
		
		public Cart(string cn){
			connectionString = cn ;
			items = new CartItems();
		}
		
		#region Public Methods
		
		private void load() {
			string sql ;
			DataRowCollection rows;
			
			sql = @"SELECT DISTINCT 
				c.CreatedOn, 
				c.LastModifiedOn, 
				ci.Id AS LineNumber,
				ci.Quantity,
				ci.prdMaster
			FROM usrCart c
			INNER JOIN usrCartItem ci
				ON ci.usrMaster = c.usrMaster
			WHERE c.usrMaster = '" + userId.ToString() + @"' 
			ORDER BY Id";
			rows = (Utilities.GetDataSet(sql, connectionString)).Tables[0].Rows;
			
			if (rows.Count > 0) {
				for (int i = 0; i < rows.Count; i++) {
					int q = Convert.ToInt32(rows[i]["Quantity"]);
					int prdMaster = Convert.ToInt32(rows[i]["prdMaster"]);
					if (Catalog.Products.GetByKey(prdMaster) != null) {
						items.Add(new CartItem(q, Catalog.Products.GetByKey(prdMaster)));
					}
				}
			}
			return;
		}
		public void Load(string userId) {
			Load(new Guid(userId));
		}
		public void Load(Guid uid){
			userId = uid;
			load();
		}
		
		public void Save(){
			string sql;
			sql = "DELETE FROM usrCartItem WHERE usrMaster = '" + userId.ToString() + "'";
			Utilities.ExecuteNonQuery(sql, connectionString);
			
			//	put the items in
			for (int i = 0; i < items.Count; i++) {
				sql = "INSERT INTO usrCartItem (usrMaster, Id, Quantity, prdMaster)" 
					+ " VALUES('" + userId.ToString() + "', " + (i + 1) + "," + items[i].Quantity + ", " + items[i].Product.Key + ")" ;
				Utilities.ExecuteNonQuery(sql, connectionString);
			}
			
			//	update the cart entry
			sql = "SELECT * FROM usrCart WHERE usrMaster = '" + userId.ToString() + "'";
			DataRowCollection rows = (Utilities.GetDataSet(sql, connectionString)).Tables[0].Rows;
			if (rows.Count > 0){
				sql = "UPDATE usrCart SET LastModifiedOn = GETDATE() WHERE usrMaster = '" + userId.ToString() + "' ";
				Utilities.ExecuteNonQuery(sql, connectionString);
			} else {
				sql = "SELECT id FROM usrMaster WHERE id = '" + userId.ToString() + "'";
				rows = (Utilities.GetDataSet(sql, connectionString)).Tables[0].Rows;
				if (rows.Count > 0) {
					sql = "INSERT INTO usrCart (usrMaster, CreatedOn, LastModifiedOn) " 
						+ " VALUES('" + userId.ToString() + "', GETDATE(), GETDATE()) ";
					Utilities.ExecuteNonQuery(sql, connectionString);
				}
			}
			return;
		}
		public void Save(string userId) {
			Save(new Guid(userId));
		}
		public void Save(Guid uid){
			userId = uid;
			Save();
		}
		#endregion
	}
}
