using System;
using System.Data;
using DepartmentZed;

namespace DepartmentZed.eCommerce {
	public enum ResponseCodes: int {
		Approved = 1, Declined = 2, Error = 3
	}
	public sealed class AVSResponseCodes {
		public readonly static string AddressNotZip = "A";
		public readonly static string AddressNotProvided = "B";
		public readonly static string AVSError = "E";
		public readonly static string NonUSIssuingBank = "G";
		public readonly static string NoMatchAddress = "N";
		public readonly static string NotApplicable = "P";
		public readonly static string SystemTimeout = "R";
		public readonly static string ServiceNotSupported = "S";
		public readonly static string AddressUnavailable = "U";
		public readonly static string Zip9DigitNotAddress = "W";
		public readonly static string AddressAnd9DigitZip = "X";
		public readonly static string AddressAnd5DigitZip = "Y";
		public readonly static string Zip5DigitNotAddress = "Z";
	}

	public class TransactionResult {
		private ResponseCodes rcode ;
		private int code;
		private int rSubCode;
		private int rReasonCode;
		private string reason;
		private string apprCode;
		private string avsResult;
		private string transId;

		string[] responseCodes = new string[]{
			"Response Code",
			"Response Subcode",
			"Response Reason Code",
			"Response Reason Text",
			"Approval Code",
			"AVS Result Code",
			"Transaction ID",
			"Invoice Number",
			"Description",
			"Amount",
			"Method",
			"Transaction Type",
			"Customer ID",
			"Cardholder First Name",
			"Cardholder Last Name",
			"Company",
			"Billing Address",
			"City",
			"State",
			"Zip",
			"Country",
			"Phone",
			"Fax",
			"Email",
			"Ship to First Name",
			"Ship to Last Name",
			"Ship to Company",
			"Ship to Address",
			"Ship to City",
			"Ship to State",
			"Ship to Zip",
			"Ship to Country",
			"Tax Amount",
			"Duty Amount",
			"Freight Amount",
			"Tax Exempt Flag",
			"PO Number",
			"MD5 Hash",
			"Card Code (CVV2/CVC2/CID) Response Code",
			"Cardholder Authentication Verification Value (CAVV) Response Code" 
		};

		public ResponseCodes ResponseCode {
			get { return rcode; }
		}
		public int Code {
			get { return code ; }
		}
		public int ResponseSubCode {
			get { return rSubCode; }
		}
		public int ResponseReasonCode {
			get { return rReasonCode; }
		}
		public string Reason {
			get { return reason; }
		}
		public string ApprovalCode {
			get { return apprCode; }
		}
		public string AVSResultCode {
			get { return avsResult ; }
		}
		public string TransactionID {
			get { return transId; }
		}

		public TransactionResult(string csv, string cn) {
			string[] data = csv.Split(',');
			code = Convert.ToInt32(data[0]);
			rcode = (ResponseCodes)(Convert.ToInt32(data[0]));
			rSubCode = Convert.ToInt32(data[1]) ;
			rReasonCode = Convert.ToInt32(data[2]) ;
			reason = data[3];
			apprCode = data[4];
			avsResult = data[5];
			transId = data[6];
			save(data, cn);
		}

		private void save(string[] data, string cn) {
			string sql;
			sql = "INSERT INTO logTransactionResult ("
				+ "ResponseCode,"
				+ "ResponseSubcode,"
				+ "ResponseReasonCode,"
				+ "ResponseReasonText,"
				+ "ApprovalCode,"
				+ "AVSResultCode,"
				+ "TransactionID,"
				+ "InvoiceNumber,"
				+ "Description,"
				+ "Amount,"
				+ "Method,"
				+ "TransactionType,"
				+ "CustomerID,"
				+ "CardholderFirstName,"
				+ "CardholderLastName,"
				+ "Company,"
				+ "BillingAddress,"
				+ "City,"
				+ "State,"
				+ "Zip,"
				+ "Country,"
				+ "Phone,"
				+ "Fax,"
				+ "Email,"
				+ "ShiptoFirstName,"
				+ "ShiptoLastName,"
				+ "ShiptoCompany,"
				+ "ShiptoAddress,"
				+ "ShiptoCity,"
				+ "ShiptoState,"
				+ "ShiptoZip,"
				+ "ShiptoCountry,"
				+ "TaxAmount,"
				+ "DutyAmount,"
				+ "FreightAmount,"
				+ "TaxExemptFlag,"
				+ "PONumber,"
				+ "MD5Hash,"
				+ "CVV2ResponseCode,"
				+ "CAVVResponseCode"
				+ ") VALUES ("
				+ "'" + data[0] + "',"
				+ "'" + data[1] + "',"
				+ "'" + data[2] + "',"
				+ "'" + data[3] + "',"
				+ "'" + data[4] + "',"
				+ "'" + data[5] + "',"
				+ "'" + data[6] + "',"
				+ "'" + data[7] + "',"
				+ "'" + data[8] + "',"
				+ "'" + data[9] + "',"
				+ "'" + data[10] + "',"
				+ "'" + data[11] + "',"
				+ "'" + data[12] + "',"
				+ "'" + data[13] + "',"
				+ "'" + data[14] + "',"
				+ "'" + data[15] + "',"
				+ "'" + data[16] + "',"
				+ "'" + data[17] + "',"
				+ "'" + data[18] + "',"
				+ "'" + data[19] + "',"
				+ "'" + data[20] + "',"
				+ "'" + data[21] + "',"
				+ "'" + data[22] + "',"
				+ "'" + data[23] + "',"
				+ "'" + data[24] + "',"
				+ "'" + data[25] + "',"
				+ "'" + data[26] + "',"
				+ "'" + data[27] + "',"
				+ "'" + data[28] + "',"
				+ "'" + data[29] + "',"
				+ "'" + data[30] + "',"
				+ "'" + data[31] + "',"
				+ "'" + data[32] + "',"
				+ "'" + data[33] + "',"
				+ "'" + data[34] + "',"
				+ "'" + data[35] + "',"
				+ "'" + data[36] + "',"
				+ "'" + data[37] + "',"
				+ "'" + data[38] + "',"
				+ "'" + data[39] + "'"
				+ ")";
			Utilities.ExecuteNonQuery(sql, cn);
		}
	}
}
