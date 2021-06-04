using System;

namespace DepartmentZed.eCommerce {
	public enum CreditItemTypes {
		GiftCertificate, Promotion, Remitment
	}
	public interface ICreditItem {
		string GetTitle();
		string GetAbstract();
		decimal GetValue();
	}

	public class PromotionCreditItem : ICreditItem {
		private string title;
		private string description;
		private decimal cost;
		private bool isAutomatic = true;

		public decimal Cost {
			get { return cost; }
			set { cost = value; }
		}
		public bool IsAutomatic {
			get { return isAutomatic; }
			set { isAutomatic = value; }
		}

		public PromotionCreditItem(){}
		public PromotionCreditItem(string t, decimal c):this(t, "", c){}
		public PromotionCreditItem(string t, string a, decimal c) {
			title = t;
			description = a;
			cost = c;
		}
		#region ICreditItem Members

		public string GetTitle() {
			return title;
		}

		public string GetAbstract() {
			return description;
		}

		public decimal GetValue() {
			return cost;
		}

		#endregion
	}

	public class RemitmentCreditItem : ICreditItem {
		private string title;
		private string description;
		private decimal paymentAmount;
		private Remitment remitment;

		public Remitment PaymentMethod {
			get { return remitment; }
		}
		public decimal PaymentAmount {
			get { return paymentAmount; }
			set { paymentAmount = value; }
		}

		public RemitmentCreditItem(Remitment r) : this(r, 0, "", ""){ }
		public RemitmentCreditItem(Remitment r, decimal amt) : this(r, amt, "", ""){ }
		public RemitmentCreditItem(Remitment r, decimal amt, string t) : this(r, amt, t, ""){ }
		public RemitmentCreditItem(Remitment r, decimal amt, string t, string a){ 
			remitment = r;
			paymentAmount = amt;
			title = t;
			description = a;
		}

		#region ICreditItem Members
			public string GetTitle() { return title; }
			public string GetAbstract() { return description; }
			public decimal GetValue() {	return paymentAmount; }
		#endregion
	}


	public class CreditItem	{
		private CreditItemTypes type;
		private string title;
		private string description;
		private ICreditItem source;
		private decimal overrideValue = decimal.MinValue;

		public CreditItemTypes Type {
			get { return type; }
			set { type = value; }
		}
		public ICreditItem Source {
			get { return source; }
			set { source = value; }
		}
		public string Title {
			get { return title; }
			set { title = value ; }
		}
		public string Abstract {
			get { return description; }
			set { description = value; }
		}
		public decimal Value {
			get {
				if (overrideValue != decimal.MinValue) return overrideValue;
				return source.GetValue();
			}
			set { overrideValue = value; }
		}

		public CreditItem(ICreditItem s) : this(s, CreditItemTypes.GiftCertificate, "", ""){}
		public CreditItem(ICreditItem s, string t) : this(s, CreditItemTypes.GiftCertificate, t, ""){ }
		public CreditItem(ICreditItem s, CreditItemTypes tp, string t) : this(s, tp, t, ""){ }
		public CreditItem(ICreditItem s, CreditItemTypes tp, string t, string d) {
			type = tp;
			title = t;
			description = d;
			source = s;
		}
	}
}
