<?php
/*	HttpService.php
 *	Base class for all service brokers.  Should handle things like
 *	database access and info for any service.
 */

class HttpService {
	public $name;
	public $base_url;
	public $hits = 0;
	public $limit = 0;
	public $limit_unit = "day";
	public $request_count = 0;
	public $request_unit = "D";	//	days

	public function __construct(){
		//	For any service, the constructor should
		//	fetch the needed info from the database
		//	in their own constructors.
	}

	private static $curl_errors = array(
		"CURL_OK",
		"CURLE_UNSUPPORTED_PROTOCOL",	/* 1 */
		"CURLE_FAILED_INIT",			/* 2 */
		"CURLE_URL_MALFORMAT",			/* 3 */
		"CURLE_URL_MALFORMAT_USER",		/* 4 - NOT USED */
		"CURLE_COULDNT_RESOLVE_PROXY",	/* 5 */
		"CURLE_COULDNT_RESOLVE_HOST",	/* 6 */
		"CURLE_COULDNT_CONNECT",		/* 7 */
		"CURLE_FTP_WEIRD_SERVER_REPLY"	/* 8 */
	);

	public function fetch($method, $url, $post_data = null, $headers = null){
		//	the main cURL function; written to behave somewhat like dojo's XHR functions, without
		//	the callbacks (we don't need the callbacks, instead look for "error" in the returned
		//	object).  We're leaving it as a static public function in case someone wants to access
		//	it directly.
		//
		//	Even though we don't use it, we require the HTTP method anyways.
		$request = curl_init($url);
		/*
		if(defined("CURL_SA_BUNDLE_PATH")){
			curl_setopt($request, CURLOPT_CAINFO, CURL_CA_BUNDLE_PATH);
		}
		*/
	//	curl_setopt($request, CURLOPT_URL, $url);
	//	curl_setopt($request, CURLOPT_CONNECTTIMEOUT, 30);
	//	curl_setopt($request, CURLOPT_TIMEOUT, 30);
		curl_setopt($request, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($request, CURLOPT_SSL_VERIFYPEER, FALSE);
		if($method == "POST" || isset($post_data)){
			curl_setopt($request, CURLOPT_POST, 1);
			if(isset($post_data)){
				$post_string = "";
				foreach($post_data as $key=>$value){
					$post_string .= $key . "=" . urlencode($value) . "&";
				}
				$post_string = rtrim($post_string, "& ");
				curl_setopt($request, CURLOPT_POSTFIELDS, $post_string);
			}
		}
		if(isset($headers)){
			//	should be an array of headers to set for the fetch.
			curl_setopt($request, CURLOPT_HTTPHEADER, $headers);
		} else {
			curl_setopt($request, CURLOPT_HEADER, 0);
		}

		$response = curl_exec($request);
		$args = array(
			"status" => curl_getinfo($request, CURLINFO_HTTP_CODE),
			"url" => $url,
			"content" => $post_data,
			"raw" => $response,
			"info" => curl_getinfo($request)
		);

		if($response === false){
			//	it failed for some reason, this is an error
			$args["error"] = array(
				"code" => curl_errno($request),
				"type" => self::$curl_errors[curl_errno($request)] || "CURLE_GENERAL_ERROR",
				"message" => curl_error($request)
			);
		}
		curl_close($request);

		return array(
			"response"=>$response,
			"ioArgs"=>$args
		);
	}	

	public function GET($url, $headers = null, $get_data = array()){
		if(count($get_data)){
			$qs = implode("&", $get_data);
			if(strpos($url, "?")!==false){
				$url .= "&" . $qs;
			} else {
				$url .= "?" . $qs;
			}
		}
		return $this->fetch("GET", $url, null, $headers);
	}

	public function POST($url, $post_data, $headers = null){
		return $this->fetch("POST", $url, $post_data, $headers);
	}
}
?>
