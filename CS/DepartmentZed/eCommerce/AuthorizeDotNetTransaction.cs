using System;
using System.Net;
using System.Text;

namespace DepartmentZed.eCommerce {
	public sealed class TransactionTypes {
		//	default; will process settlement right away.
		public readonly static string AuthorizeAndCapture = "AUTH_CAPTURE";
		
		//	gets and holds transaction for 30 days
		public readonly static string Authorize = "AUTH_ONLY";

		//	finishes transaction from above.
		public readonly static string PriorAuthorizeAndCapture = "PRIOR_AUTH_CAPTURE";

		//	to settle a transaction not first captured here; need authorization code.
		public readonly static string Capture = "CAPTURE_ONLY";
		
		//	to issue a credit on an order
		public readonly static string Credit = "CREDIT";

		//	to void an Authorize order.
		public readonly static string Void = "VOID";
	}
	
	public class AuthorizeDotNetTransaction : ITransaction {
		private string login;
		private string password;
		private string tran_key;
		private string source;
		private bool isTestRequest;
		private string orderNumber = "";
		private string ipaddress = "";
		
		private TransactionResult result;
		
		public bool IsTest {
			get { return isTestRequest; }
			set { isTestRequest = value; }
		}
		public string Source {
			get { return source; }
			set { source = value; }
		}
		public string OrderNumber {
			get { return orderNumber ; }
			set { orderNumber = value ; }
		}
		public string IPAddress {
			get { return ipaddress; }
			set { ipaddress = value ; }
		}
		public TransactionResult Result {
			get { return result ; }
		}
		public string Url {
			get {
				if (isTestRequest) return "https://certification.authorize.net/gateway/transact.dll";
				else return "https://secure.authorize.net/gateway/transact.dll";
			}
		}
	
		public AuthorizeDotNetTransaction(string l, string pwd, string k) : this(l, pwd, k, "Web", false, "", ""){ }
		public AuthorizeDotNetTransaction(string l, string pwd, string k, bool t) : this(l, pwd, k, "Web", t, "", ""){ }
		public AuthorizeDotNetTransaction(string l, string pwd, string k, string s, bool t, string on, string ip) {
			login = l;
			password = pwd;
			tran_key = k;
			source = s;
			isTestRequest = t;
			orderNumber = on;
			ipaddress = ip;
		}
		
		#region ITransaction Members
		public bool Process(Order o) {
			string transType = TransactionTypes.AuthorizeAndCapture;
			result = doTransaction(o, transType);
			return (result.ResponseCode == ResponseCodes.Approved);
		}
		
		public bool Approve(Order o) {
			string transType = TransactionTypes.Authorize;
			result = doTransaction(o, transType);
			return (result.ResponseCode == ResponseCodes.Approved);
		}

		public bool Finalize(Order o) {
			string transType = TransactionTypes.PriorAuthorizeAndCapture;
			result = doTransaction(o, transType);
			return (result.ResponseCode == ResponseCodes.Approved);
		}

		public bool Void(Order o) {
			string transType = TransactionTypes.Void;
			result = doTransaction(o, transType);
			return (result.ResponseCode == ResponseCodes.Approved);
		}
		
		public bool Credit(Order o) {
			string transType = TransactionTypes.Credit;
			result = doTransaction(o, transType);
			return (result.ResponseCode == ResponseCodes.Approved);
		}
		
		public TransactionResult GetResult(){
			return result;
		}
		#endregion
		
		private TransactionResult doTransaction(Order order, string transtype) {
			//	build the posting data
			StringBuilder data = new StringBuilder() ;
			data.Append("x_login=" + login) ;
			data.Append("&x_password=" + password);
			data.Append("&x_tran_key=" + tran_key) ;
			data.Append("&x_version=3.1") ;
			data.Append("&x_source=" + source) ;

			//	Change to FALSE when deployed to Production
			data.Append("&x_test_request=" + (isTestRequest?"TRUE":"FALSE")) ;	
//			data.Append("&x_test_request=FALSE") ;	

			//	continue
			data.Append("&x_delim_data=TRUE") ;
			data.Append("&x_delim_char=,") ;
			data.Append("&x_relay_response=FALSE") ;
			
			//	invoice.
			if (orderNumber != String.Empty) data.Append("&x_invoice_num=" + orderNumber);
			if (order.TransactionId != String.Empty) data.Append("&x_trans_id=" + order.TransactionId);

			//	Customer Information
			if (order.User != null) data.Append("&x_cust_id=" + order.User.UserGuid.ToString()) ;
			if (ipaddress != String.Empty) data.Append("&x_customer_ip=" + ipaddress) ;
			
			data.Append("&x_first_name=" + order.BillingAddress.NameFirst) ;
			data.Append("&x_last_name=" + order.BillingAddress.NameLast) ;
			string tmp = "&x_address=" + order.BillingAddress.Address1 ;
			if (order.BillingAddress.Address2 != String.Empty) tmp += " " + order.BillingAddress.Address2;
			data.Append(tmp) ;
			data.Append("&x_city=" + order.BillingAddress.City);
			data.Append("&x_state=" + order.BillingAddress.Region) ;
			data.Append("&x_zip=" + order.BillingAddress.PostalCode) ;
			data.Append("&x_phone=" + order.BillingAddress.PhoneHome) ;
			
			//	Shipping Address
			data.Append("&x_ship_to_first_name=" + order.ShippingAddress.NameFirst);
			data.Append("&x_ship_to_last_name=" + order.ShippingAddress.NameLast) ;
			tmp = "&x_ship_to_address=" + order.ShippingAddress.Address1 ;
			if (order.ShippingAddress.Address2 != "") tmp += " " + order.ShippingAddress.Address2 ;
			data.Append(tmp) ;
			data.Append("&x_ship_to_city=" + order.ShippingAddress.City) ;
			data.Append("&x_ship_to_state=" + order.ShippingAddress.Region) ;
			data.Append("&x_ship_to_zip=" + order.ShippingAddress.PostalCode) ;

			//	Transaction data
			if (order.OrderType == OrderTypes.Credit){
				data.Append("&x_amount=" + (-1*order.Total)) ;
			} else {
				data.Append("&x_amount=" + order.BalanceDue) ;
			}

			data.Append("&x_currency_code=USD");
			Remitment r = order.PaymentInformation;
			if (r.PaymentType != PaymentTypes.ECheck) {
				data.Append("&x_method=CC") ;
				data.Append("&x_type=" + transtype) ;
				data.Append("&x_card_num=" + r.AccountNumber) ;
				data.Append("&x_exp_date=" + r.ExpirationDate) ;
				if (r.SecurityCode != String.Empty) data.Append("&x_card_code=" + r.SecurityCode) ;
			} else {
				data.Append("&x_method=ECHECK") ;
				data.Append("&x_bank_aba_code=" + r.ABACode);
				data.Append("&x_bank_acct_num=" + r.AccountNumber) ;
				data.Append("&x_bank_name=" + r.BankName) ;
				data.Append("&x_bank_acct_name=" + r.AccountName) ;
				data.Append("&x_echeck_type=" + r.ECheckType) ;
			}

			//	get the response
			WebClient wc = new WebClient();
			wc.Headers.Add("Content-Type", "application/x-www-form-urlencoded") ;
			byte[] ba = wc.UploadData(
				this.Url, 
				"POST",
				Encoding.ASCII.GetBytes(data.ToString())
			) ; 
			
			return new TransactionResult(Encoding.ASCII.GetString(ba), order.ConnectionString);
		}
	}
}
