using System;
using System.Data;
using DepartmentZed;
using DepartmentZed.Data;

namespace DepartmentZed.eCommerce {
	public sealed class ShipPeriodUnit {
		public readonly static string Day = "D";
		public readonly static string Week = "W";
		public readonly static string Month = "M";
		public readonly static string Quarter = "Q";
		public readonly static string SemiAnnual = "S";
		public readonly static string Year = "Y";
		public static string GetDefault(){ return ShipPeriodUnit.Month; }
	}
	public class ContinuityItem {
		private OrderTemplate ot;	
		private int quantity;
		private Product product;
		private DateTime dateAdded;
		private DateTime lastShippedOn;
		private int reorderInterval;
		private string shipPeriodUnit;

		public OrderTemplate Template {
			get { return ot; }
			set { ot = value; }
		}
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
		public DateTime DateAdded {
			get { return dateAdded; }
		}
		public int ReorderInterval {
			get { return reorderInterval; }
			set { reorderInterval = value ; }
		}
		public string ShipPeriodUnit {
			get { return shipPeriodUnit ; }
			set { shipPeriodUnit = value ; }
		}
		public DateTime LastShippedOn {
			get { return lastShippedOn;	}
			set { lastShippedOn = value; }
		}
		public DateTime NextEstimatedShipDate {
			get {
				if (shipPeriodUnit == DepartmentZed.eCommerce.ShipPeriodUnit.Day) return lastShippedOn.AddDays(reorderInterval);
				if (shipPeriodUnit == DepartmentZed.eCommerce.ShipPeriodUnit.Week) return lastShippedOn.AddDays(reorderInterval * 7);
				if (shipPeriodUnit == DepartmentZed.eCommerce.ShipPeriodUnit.Month) return lastShippedOn.AddMonths(reorderInterval);
				if (shipPeriodUnit == DepartmentZed.eCommerce.ShipPeriodUnit.Quarter) return lastShippedOn.AddMonths(reorderInterval * 3);
				if (shipPeriodUnit == DepartmentZed.eCommerce.ShipPeriodUnit.SemiAnnual) return lastShippedOn.AddMonths(reorderInterval * 6);
				return lastShippedOn.AddYears(reorderInterval);
			}
		}
		
		public ContinuityItem(OrderTemplate ot, int q, Product p) : this(ot, q, p, 1, "M", DateTime.Now){ }
		public ContinuityItem(OrderTemplate ot, int q, Product p, int ivl) : this(ot, q, p, ivl, "M", DateTime.Now) { }
		public ContinuityItem(OrderTemplate ot, int q, Product p, int ivl, string u) : this(ot, q, p, ivl, u, DateTime.Now) { }
		public ContinuityItem(OrderTemplate ot, int q, Product p, int ivl, string u, DateTime initDate) { 
			this.ot = ot;
			quantity = q;
			product = p;
			dateAdded = initDate;
			reorderInterval = ivl;
			shipPeriodUnit = u;

			int d = ot.ShipOrderOn;
			lastShippedOn = new DateTime(dateAdded.Year, dateAdded.Month, d);
			if (lastShippedOn > dateAdded) lastShippedOn = lastShippedOn.AddMonths(-1);
		}
		public ContinuityItem(OrderTemplate t, DataRow row) {
			ot = t;
			quantity = (int)row["quantity"];
			product = Catalog.Products.GetByKey((int)row["prdMaster"]);
			dateAdded = (DateTime)row["DateAdded"];
			reorderInterval = (int)row["reorderinterval"];
			shipPeriodUnit = (string)row["shipPeriodUnit"];
			if (!row.IsNull("lastShippedOn"))
				lastShippedOn = (DateTime)row["lastShippedOn"];
			else {
				int d = ot.ShipOrderOn;
				lastShippedOn = new DateTime(dateAdded.Year, dateAdded.Month, d);
				if (lastShippedOn > dateAdded) lastShippedOn = lastShippedOn.AddMonths(-1);
			}
		}
	}
}
