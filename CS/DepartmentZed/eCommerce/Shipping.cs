using System;
using System.Collections;

namespace DepartmentZed.eCommerce {
	public class CarrierCodes {
		public static string Ground {
			get { return "700"; }
		}
		public static string GroundSignatureRequired {
			get { return "714"; }
		}
		public static string GroundResidential {
			get { return "715"; }
		}
		public static string GroundResidentailSignatureRequired {
			get { return "716"; }
		}
		public static string StandardOvernight {
			get { return "704"; }
		}
		public static string StandardOvernightSignatureRequired {
			get { return "717"; }
		}
		public static string InternationalEconomy {
			get { return "712"; }
		}
		public static string InternationalEconomyPickUp {
			get { return "720"; }
		}
		public static string USPSPriorityMail {
			get { return "601"; }
		}
		public static string GetShipVia(string code){
			switch (code) {
				case "700": return "FedEx Ground";
				case "714": return "FedEx Ground (Signature Required)";
				case "715": return "FedEx Home Delivery";
				case "716": return "FedEx Home Delivery (Signature Required)";
				case "704": return "FedEx Standard Overnight";
				case "717": return "FedEx Standard Overnight (Signature Required)";
				case "712": return "FedEx International Economy";
				case "720": return "FedEx International Economy (Pickup Required)";
				default : return "US Postal Service Priority Mail";
			}
		}
	}

	public class Shipping {
		private string carrier;
		private string shipVia;
		private string carrierCode;
		private decimal cost;
		
		public string Carrier {
			get { return carrier; }
			set { carrier = value ; }
		}
		public string CarrierCode {
			get { return carrierCode; }
			set { carrierCode = value ; }
		}
		public string ShipVia {
			get { return shipVia; }
			set { shipVia = value; }
		}
		public decimal Cost {
			get { return cost; }
			set { cost = value ; }
		}

		public static Shipping GetShipping(Order o) {
			//	returns a Shipping object.
			Shipping ret = new Shipping();
			if (o.ShippingAddress.Country != "US") {
				ret.carrier = "FedEx";
				if (o.SubTotal > 225) {
					ret.carrierCode = CarrierCodes.InternationalEconomyPickUp;
				} else {
					ret.carrierCode = CarrierCodes.InternationalEconomy;
				}
				if (o.ShippingAddress.Country == "CA") ret.cost = 12.95M;
				else ret.cost = 29.95M;
			} else {
				if (o.ShippingAddress.IsPOBoxOrMilitary) {
					ret.carrier = "US Postal Service" ;
					ret.carrierCode = CarrierCodes.USPSPriorityMail;
					if (o.TotalItems >= 1 && o.TotalItems <= 2) ret.cost = 4.95M;
					else if (o.TotalItems == 3)	ret.cost = 5.95M;
					else if (o.TotalItems == 4) ret.cost = 7.95M;
					else ret.cost = 10;
				} else {
					ret.carrier = "FedEx";
					if (o.Expedite) {
						ret.cost = 19.95M;
						if (o.SubTotal > 200){ 
							ret.carrierCode = CarrierCodes.StandardOvernightSignatureRequired;
						} else {
							ret.carrierCode = CarrierCodes.StandardOvernight;
						}
					} else {
						if (o.ShippingAddress.IsBusiness){
							if (o.SubTotal > 200){ 
								ret.carrierCode = CarrierCodes.GroundSignatureRequired;
							} else {
								ret.carrierCode = CarrierCodes.Ground;
							}
						} else {
							if (o.SubTotal > 200){ 
								ret.carrierCode = CarrierCodes.GroundResidentailSignatureRequired;
							} else { 
								ret.carrierCode = CarrierCodes.GroundResidential;
							}
						}
						if (o.TotalItems >= 1 && o.TotalItems <= 2) ret.cost = 4.95M;
						else if (o.TotalItems == 3)	ret.cost = 5.95M;
						else if (o.TotalItems == 4) ret.cost = 7.95M;
						else ret.cost = 10;
					}
				}
			}
			ret.shipVia = CarrierCodes.GetShipVia(ret.CarrierCode);
			return ret;
		}

		public static ShippingList GetShippingOptions(Order o){
			ShippingList sl = new ShippingList();
			bool tmpExpedite = o.Expedite;
			Shipping s;

			o.Expedite = false;
			s = GetShipping(o);
			for (int i = 0; i < o.Promotions.Count; i++) {
				if (o.Promotions[i].Class == PromotionClasses.FreeShipping){
					s.Cost = 0;
					s.ShipVia = o.Promotions[i].Title;
					break;
				}
			}
			sl.Add(s);

			o.Expedite = true;
			if (GetShipping(o).ShipVia != s.ShipVia) {
				s = GetShipping(o);
				sl.Add(s);
			}

			o.Expedite = tmpExpedite;
			return sl;
		}
	}
}