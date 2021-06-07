using System;
using System.Data;
using DepartmentZed;

namespace DepartmentZed.eCommerce {
	public class WishList {
		#region Properties
		private Guid usrMaster;
		private int key;
		private string status = "P";
		private bool viewable;
		private string title;
		private string description;
		private DateTime createdOn;
		private DateTime lastModifiedOn;
		private bool isActive = false;
		private CartItems items = new CartItems();
		
		private string connectionString;
		private bool isDirty = false;
		#endregion
	
		#region Fields
		public int Key {
			get { return key; }
			set {
				key = value;
				isDirty = true;
			}
		}
		public string Status {
			get { return status; }
			set {
				status = value;
				isDirty = true;
			}
		}
		public bool IsViewableByPublic {
			get { return viewable; }
			set {
				viewable = value;
				isDirty = true;
			}
		}
		public bool IsActive {
			get { return isActive; }
			set {
				isActive = value;
				isDirty = true;
			}
		}
		public string Title {
			get { return title; }
			set {
				title = value;
				isDirty = true;
			}
		}
		public string Abstract {
			get { return description; }
			set {
				description = value;
				isDirty = true;
			}
		}
		public DateTime CreatedOn {
			get { return createdOn; }
		}
		public DateTime LastModifiedOn {
			get { return lastModifiedOn; }
		}
		public CartItems Items {
			get {
				return items; 
			}
		}
		
		#endregion
		
		#region Constructors
		public WishList(Guid u, string cn):this(u, 0, cn){}
		public WishList(Guid u, int k, string cn) {
			usrMaster = u;
			key = k;
			connectionString = cn;
			if (key == 0) isDirty = true;
		}
		public WishList(DataRow dr, string cn) {
			connectionString = cn;
			initialize(dr);
		}
		#endregion
					
		private void initialize(DataRow dr){
			usrMaster = (Guid)dr["usrMaster"];
			key = Convert.ToInt32(dr["id"]);
			status = Convert.ToString(dr["status"]);
			viewable = (Convert.ToInt32(dr["viewablebypublic"]) == 1);
			title = Convert.ToString(dr["title"]);
			if (!dr.IsNull("abstract")) description = Convert.ToString(dr["abstract"]);
			else description = "";
			createdOn = Convert.ToDateTime(dr["createdOn"]);
			lastModifiedOn = Convert.ToDateTime(dr["lastModifiedOn"]);
			isActive = (Convert.ToInt32(dr["isActive"]) == 1);
			
			string sql;
			DataRowCollection rows;
			sql = "SELECT * FROM usrWishListItem WHERE usrMaster = '" + usrMaster.ToString() + "' AND usrWIshList = " + key + " ORDER BY Id ";
			rows = (Utilities.GetDataSet(sql, connectionString)).Tables[0].Rows;
			if (rows.Count > 0){
				for (int i = 0; i < rows.Count; i++) {
					items.Add(
						new CartItem(
							1,
							DepartmentZed.Data.Catalog.Products.GetByKey(Convert.ToInt32(rows[i]["prdMaster"]))
						)
					);
				}
			}
		}
		
		public void Save(){
			string sql;
			DataRowCollection rows;
			if (isDirty) {
				if (key == 0) {
					//	get the highest key, and save it.
					sql = "SELECT TOP 1 id FROM usrWishList WHERE usrMaster = '" + usrMaster.ToString() + "' ORDER BY id DESC" ;
					rows = Utilities.GetDataSet(sql, connectionString).Tables[0].Rows;
					key = 1;
					if (rows.Count > 0) {
						key = (Convert.ToInt32(rows[0]["id"])) + 1;
					}
					sql = "INSERT INTO usrWishList (usrMaster, id, status, sortorder, viewablebypublic, title, abstract, createdon, lastmodifiedon, isactive) "
						+ " VALUES ("
						+ "'" + usrMaster.ToString() + "',"
						+ key + ","
						+ "'" + status + "',"
						+ (key * 10) + ","
						+ ((viewable)?"1":"0") + ","
						+ "'" + title.Replace("'", "''") + "',"
						+ "'" + description.Replace("'", "''") + "',"
						+ "GETDATE(),"
						+ "GETDATE(),"
						+ ((isActive)?"1":"0")
						+ ")";
					Utilities.ExecuteNonQuery(sql, connectionString);
				} else {
					sql = "UPDATE usrWishList SET "
						+ " status='" + status + "', "
						+ " sortorder=" + (key * 10) + ", "
						+ " viewablebypublic=" + ((viewable)?"1":"0") + ", "
						+ " isactive=" + ((isActive)?"1":"0") + ", "
						+ " title='" + title.Replace("'", "''") + "', "
						+ " abstract='" + description.Replace("'", "''") + "', "
						+ " lastmodifiedon=GETDATE() "
						+ " WHERE usrMaster='" + usrMaster.ToString() + "' "
						+ " AND Id = " + key;
					Utilities.ExecuteNonQuery(sql, connectionString);
				}
			}
			//	always save the items.
			sql = "DELETE FROM usrWishListItem WHERE usrMaster='" + usrMaster.ToString() + "' AND usrWishList=" + key;
			Utilities.ExecuteNonQuery(sql, connectionString);
			
			for (int i = 0; i < items.Count; i++) {
				if (items[i] != null) {
					sql = "INSERT INTO usrWishListItem (usrMaster, usrWishList, Id, prdMaster)"
						+ " VALUES ("
						+ "'" + usrMaster.ToString() + "',"
						+ key + ","
						+ (i + 1) + ","
						+ items[i].Product.Key + ")" ;
					Utilities.ExecuteNonQuery(sql, connectionString);
				}
			}
			isDirty = false;
		}
	}
}
