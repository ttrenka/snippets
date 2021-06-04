<?php
//	class for handling Authorize.NET transactions.
include_once("HttpService.php");

class AuthNetTransactionTypes {
	//	static transaction types
	const AUTHORIZE_AND_CAPTURE = "AUTH_CAPTURE";
	const AUTHORIZE = "AUTH_ONLY";
	const PRIOR_AUTHORIZE_AND_CAPTURE = "PRIOR_AUTH_CAPTURE";
	const CAPTURE = "CAPTURE_ONLY";
	const CREDIT = "CREDIT";
	const VOID = "VOID";
}

class ResponseCodes {
	const APPROVED = 1;
	const DECLINED = 2;
	const ERROR = 3;
}

class AVSResponseCodes {
	const ADDRESS_NOT_ZIP = "A";
	const ADDRESS_NOT_PROVIDED = "B";
	const AVS_ERROR = "E";
	const NON_US_ISSUING_BANK = "G";
	const NO_MATCH_ADDRESS = "N";
	const NOT_APPLICABLE = "P";
	const SYSTEM_TIMEOUT = "R";
	const SERVICE_NOT_SUPPORTED = "S";
	const ADDRESS_UNAVAILABLE = "U";
	const ZIP_9DIGIT_NOT_ADDRESS = "W";
	const ADDRESS_AND_9DIGIT_ZIP = "X";
	const ADDRESS_AND_5DIGIT_ZIP = "Y";
	const ZIP_5DIGIT_NOT_ADDRESS = "Z";
}

class TransactionResult {
	private $data;
	private $code = ResponseCodes::ERROR;
	private $sub_code;
	private $reason_code;
	private $reason;
	private $approval_code;
	private $avs_result;
	private $transaction_id;

	//	Human-readable fields returned from authorize.net.
	private $response_codes = array(
		"Response Code", "Response Subcode", "Response Reason Code", "Response Reason Text",
		"Approval Code", "AVS Result Code", "Transaction ID", "Invoice Number",
		"Description", "Amount", "Method", "Transaction Type",
		"Customer ID", "Cardholder First Name", "Cardholder Last Name", "Company",
		"Billing Address", "City", "State", "Zip",
		"Country", "Phone", "Fax", "Email",
		"Ship to First Name", "Ship to Last Name", "Ship to Company", "Ship to Address",
		"Ship to City", "Ship to State", "Ship to Zip", "Ship to Country",
		"Tax Amount", "Duty Amount", "Freight Amount", "Tax Exempt Flag",
		"PO Number", "MD5 Hash", "Card Code (CVV2/CVC2/CID) Response Code",
		"Cardholder Authentication Verification Value (CAVV) Response Code" 
	);

	public function __construct($d, $delim = "|"){
		$this->data = explode($delim, $d);
		if(count($this->data) > 1){
			$this->code = $this->data[0];
			$this->sub_code = $this->data[1];
			$this->reason_code = $this->data[2];
			$this->reason = $this->data[3];
			$this->approval_code = $this->data[4];
			$this->avs_result = $this->data[5];
			$this->transaction_id = $this->data[6];
		}
	}

	public function __call($fn, $args){
		//	we are setting this up to be read-only, every time.
		if(is_null($fn)){
			return null;
		}
		return $this->$fn;
	}

	public function save($provider){
		$sql =<<<EOM
INSERT INTO transaction (
	response_code,
	response_sub_code,
	response_reason_code,
	response_reason_text,
	approval_code,
	avs_result_code,
	transaction_id,
	invoice_number,
	description,
	amount,
	method,
	transaction_type,
	customer,
	cardholder_first_name,
	cardholder_last_name,
	company,
	billing_address,
	city,
	state,
	postal_code,
	country,
	phone,
	fax,
	email,
	ship_to_first_name,
	ship_to_last_name,
	ship_to_company,
	ship_to_address,
	ship_to_city,
	ship_to_state,
	ship_to_postal_code,
	ship_to_country,
	tax_amount,
	duty_amount,
	freight_amount,
	tax_exempt_flag,
	po_number,
	md5_hash,
	cvv2_response_code,
	cavv_response_code
) VALUES (
	:response_code,
	:response_sub_code,
	:response_reason_code,
	:response_reason_text,
	:approval_code,
	:avs_result_code,
	:transaction_id,
	:invoice_number,
	:description,
	:amount,
	:method,
	:transaction_type,
	:customer,
	:cardholder_first_name,
	:cardholder_last_name,
	:company,
	:billing_address,
	:city,
	:state,
	:postal_code,
	:country,
	:phone,
	:fax,
	:email,
	:ship_to_first_name,
	:ship_to_last_name,
	:ship_to_company,
	:ship_to_address,
	:ship_to_city,
	:ship_to_state,
	:ship_to_postal_code,
	:ship_to_country,
	:tax_amount,
	:duty_amount,
	:freight_amount,
	:tax_exempt_flag,
	:po_number,
	:md5_hash,
	:cvv2_response_code,
	:cavv_response_code
)
EOM;
		$params = array(
			"response_code" => $this->data[0],
			"response_sub_code" => $this->data[1],
			"response_reason_code" => $this->data[2],
			"response_reason_text" => $this->data[3],
			"approval_code" => $this->data[4],
			"avs_result_code" => $this->data[5],
			"transaction_id" => $this->data[6],
			"invoice_number" => $this->data[7],
			"description" => $this->data[8],
			"amount" => $this->data[9],
			"method" => $this->data[10],
			"transaction_type" => $this->data[11],
			"customer" => $this->data[12],
			"cardholder_first_name" => $this->data[13],
			"cardholder_last_name" => $this->data[14],
			"company" => $this->data[15],
			"billing_address" => $this->data[16],
			"city" => $this->data[17],
			"state" => $this->data[18],
			"postal_code" => $this->data[19],
			"country" => $this->data[20],
			"phone" => $this->data[21],
			"fax" => $this->data[22],
			"email" => $this->data[23],
			"ship_to_first_name" => $this->data[24],
			"ship_to_last_name" => $this->data[25],
			"ship_to_company" => $this->data[26],
			"ship_to_address" => $this->data[27],
			"ship_to_city" => $this->data[28],
			"ship_to_state" => $this->data[29],
			"ship_to_postal_code" => $this->data[30],
			"ship_to_country" => $this->data[31],
			"tax_amount" => $this->data[32],
			"duty_amount" => $this->data[33],
			"freight_amount" => $this->data[34],
			"tax_exempt_flag" => $this->data[35],
			"po_number" => $this->data[36],
			"md5_hash" => $this->data[37],
			"cvv2_response_code" => $this->data[38],
			"cavv_response_code" => $this->data[39]
		);

		$provider->execute($sql, $params);
		return $provider->id();
	}
}

class HttpServiceException extends Exception { }
class CreditCardException extends Exception { }
class TransactionException extends Exception { }

class CreditCard {
	public $type = "";
	public $name;
	public $account_number;
	public $expiration;
	public $ccv_code = "";

	private $valid = false;

	public function __construct($a, $e, $c = "", $n = ""){
		$this->account_number = $a;
		$this->expiration = $e;
		$this->ccv_code = $c;
		$this->name = $n;

		// run the validator.
		$types = CreditCard::validate($a);
		$this->valid = count($types) > 0;
		if(count($types)){
			$this->type = $types[0];
		}
	}

	public static function validate($num){
		$card_info = array(
			'Mastercard' => '5[1-5][0-9]{14}',
			'Eurocard' => '5[1-5][0-9]{14}',
			'Visa' => '4(?:[0-9]{12}|[0-9]{15})',
			'American Express' => '3[47][0-9]{13}', 
			'Diners Club' => '3(?:0[0-5][0-9]{11}|[68][0-9]{12})',
			'Carte Blanche' => '3(?:0[0-5][0-9]{11}|[68][0-9]{12})',
			'Discover' => '6011[0-9]{12}',
			'JCB'=> '(?:3[0-9]{15}|(2131|1800)[0-9]{11})',
			'Enroute' => '2(?:014|149)[0-9]{11}'
		);

		$cc = preg_replace('/[- ]/', '', $num);
		$result = array();
		foreach($card_info as $key=>$test){
			if(preg_match('/^'.$test . '$/', $cc)){
				$result[] = $key;
			}
		}
		return $result;
	}

	public function is_valid(){
		return $this->valid;
	}

	public function get_error(){
		return new CreditCardException($this->err_text, $this->err_no);
	}
}

interface ITransaction {
	public function process($invoice, $cc);
	public function approve($invoice, $cc);
	public function finalize($invoice, $cc);
	public function void($invoice, $cc);
	public function credit($invoice, $cc);
	public function result();
}

/*
370000000000002 American Express Test Card
6011000000000012 Discover Test Card
4007000000027 Visa Test Card
4012888818888 second Visa Test Card
3088000000000017 JCB 
38000000000006 Diners Club/ Carte Blanche
*/

class AuthorizeNetTransaction implements ITransaction {
	private $http;
	private $version = "3.1";
	private $url = "https://secure.authorize.net/gateway/transact.dll";
	private $login;
	private $password;
	private $trans_key;
	private $is_test = false;
	private $ip_address;
	private $trans_result;

	public function __construct($l, $t, $test=false){
		//	initialize the service
		$this->http = new HttpService();
		$this->login = $l;
		$this->trans_key = $t;
		$this->is_test = $test;
		$this->ip_address = $_SERVER["REMOTE_ADDR"];
	}

	//	generic getter/setter magic function
	public function __call($fn, $args = array()){
		$w = array("url", "is_test", "ip_address");
		$g = array("url", "login", "password", "trans_key", "is_test", "ip_address");
		if(is_null($fn) || !in_array($fn, $g)){
			return null;
		}

		//	being used as a setter
		if(in_array($fn, $w) && count($args)){
			$this->$fn = $args[0];
		}

		//	return the getter
		return $this->$fn;
	}

	//	the internal private poster.  $invoice should be a key-based array.
	private function post_transaction($invoice, $cc, $trans_type){
		if(!$cc->is_valid()){
			throw $cc->get_error();
		}

		//	make sure the invoice has been calculated.
		$invoice->calculate();
		$post_data = array(
			"x_login" => $this->login,
			"x_tran_key" => $this->trans_key,
			"x_version" => $this->version,
			"x_test_request" => ($this->is_test ? "TRUE" : "FALSE"),
			"x_delim_data" => "TRUE",
			"x_delim_char" => "|",
			"x_relay_response" => "FALSE",
			"x_invoice_num" => ($invoice->id() != null) ? $invoice->id() : "",
			"x_cust_id" => ($invoice->customer() != null) ? $invoice->customer() : "",
			"x_customer_ip" => $this->ip_address ? $this->ip_address : ""
		);

		$contact = $invoice->contact()->get();
		$billing = $invoice->billing_address()->get();
		$shipping = $invoice->shipping_address()->get();
		$shipping_name = $invoice->shipping_name();

		if($shipping_name != null){
			$name_first = substr($shipping_name, 0, strrpos($shipping_name, " "));
			$name_last = substr($shipping_name, strrpos($shipping_name, " ")+1);
		} 
		else if(strlen($contact["name_last"])){
			$name_first = $contact["name_first"];
			$name_last = $contact["name_last"];
		}
		else {
			$name_first = "";
			$name_last = "";
		}

		if(strlen($billing["address1"])){
			$addr = $billing["address1"];
			if(strlen($billing["address2"])){
				$addr .= "," . $billing["address2"];
			}
			if(strlen($billing["address3"])){
				$addr .= "," . $billing["address3"];
			}
			$post_data = array_merge($post_data, array(
				"x_first_name" => $name_first,
				"x_last_name" => $name_last,
				"x_address" => $addr,
				"x_city" => $billing["city"],
				"x_state" => $billing["region"],
				"x_zip" => $billing["postalcode"],
				"x_country" => $billing["country"],
				"x_phone" => $contact["phone"],
				"x_email" => $contact["email"]
			));
		}

		if(strlen($shipping["address1"])){
			$addr = $shipping["address1"];
			if(strlen($shipping["address2"])){
				$addr .= "," . $shipping["address2"];
			}
			if(strlen($shipping["address3"])){
				$addr .= "," . $shipping["address3"];
			}
			$post_data = array_merge($post_data, array(
				"x_ship_to_first_name" => $name_first,
				"x_ship_to_last_name" => $name_last,
				"x_ship_to_address" => $addr,
				"x_ship_to_city" => $shipping["city"],
				"x_ship_to_state" => $shipping["region"],
				"x_ship_to_zip" => $shipping["postalcode"],
				"x_ship_to_country" => $shipping["country"]
			));
		}

		//	add in the actual monetary amounts.
		$post_data = array_merge($post_data, array(
			"x_amount" => ($invoice->invoice_type() == "CREDIT" ? -1 * $invoice->total() : $invoice->total()),
			"x_currency_code" => "USD",
			"x_method" => "CC",
			"x_type" => $trans_type,
			"x_card_num" => $cc->account_number,
			"x_exp_date" => $cc->expiration
		));
		if(strlen($cc->ccv_code)){
			$post_data["x_card_code"] = $cc->ccv_code;
		}

		/*
		echo "<pre>";
		print "URL: " . $this->url . "\n";
		print_r($post_data);
		echo "</pre>";
		//		*/

		//	do the post.
		$r = $this->http->POST($this->url, $post_data);
		$response = $r["response"];
		$ioArgs = $r["ioArgs"];

		/*
		echo "<pre>";
		echo print_r($response);
		echo "</pre>";
		//		*/

		//	handle any errors, either a cURL error or a returned HTTP status code that isn't 200.
		if(isset($ioArgs["error"])){
			throw new HttpServiceException($ioArgs["error"]["message"], $ioArgs["error"]["code"]);
		} else if($ioArgs["status"] != 200) {
			throw new HttpServiceException($response, $ioArgs["status"]);
		} else {
			//	we're good to go, create the transaction result and return the response code.
			$this->trans_result = new TransactionResult($response);
		}
	}

	//	implementation of ITransaction

	// one fell swoop
	public function process($invoice, $cc){
		$this->post_transaction($invoice, $cc, AuthNetTransactionTypes::AUTHORIZE_AND_CAPTURE);
	 	return ($this->trans_result->code() == ResponseCodes::APPROVED);
	}

	//	step one of capture, do something, finalize.
	public function approve($invoice, $cc){
		$this->post_transaction($invoice, $cc, AuthNetTransactionTypes::AUTHORIZE);
		return ($this->trans_result->code() == ResponseCodes::APPROVED);
	}

	//	step two of capture, do something, finalize
	public function finalize($invoice, $cc){
		$this->post_transaction($invoice, $cc, AuthNetTransactionTypes::PRIOR_AUTHORIZE_AND_CAPTURE);
		return ($this->trans_result->code() == ResponseCodes::APPROVED);
	}

	//	void a transaction
	public function void($invoice, $cc){
		$this->post_transaction($invoice, $cc, AuthNetTransactionTypes::VOID);
		return ($this->trans_result->code() == ResponseCodes::APPROVED);
	}

	//	post a credit transaction (i.e. returning someone some money)
	public function credit($invoice, $cc){
		$this->post_transaction($invoice, $cc, AuthNetTransactionTypes::CREDIT);
		return ($this->trans_result->code() == ResponseCodes::APPROVED);
	}

	//	get the transaction result.  Needs to be read-only.
	public function result(){
		return $this->trans_result;
	}
}
?>
