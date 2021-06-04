<?php
require_once("console.php");
require_once("HttpService.php");
require_once(dirname(__FILE__)."/../ext/oauth/OAuth.php");

/*	OAuthService.php
 *	Base class for any service that uses the OAuth protocol
 *	for communication.
 */

class OAuthService extends HttpService {
	public $consumer = NULL;
	public $token = NULL;
	public $sig_method = NULL;

	private $_http_status;
	private $_last_api_call;

	//	Child classes should override these.
	public $request_token_url = '/oauth/request_token';
	public $authorize_url = '/oauth/authorize';
	public $access_token_url = '/oauth/access_token';

	public function __construct($c_key, $c_secret, $u_key = NULL, $u_secret = NULL){
		$this->sig_method = new OAuthSignatureMethod_HMAC_SHA1();
		$this->consumer = new OAuthConsumer(trim($c_key), trim($c_secret));
		if(!empty($u_key) && !empty($u_secret)){
			$this->token = new OAuthConsumer(trim($u_key), trim($u_secret));
		} else {
			$this->token = NULL;
		}
	}

	//	status functions
	public function last_status(){
		return $this->_http_status;
	}
	public function last_api_call(){
		return $this->_last_api_call;
	}

	//	parse the response.
	private function parse_response($response){
		$r = array();
		foreach(explode('&', $response) as $param){
			$p = explode('=', $param, 2);
			if(count($p) != 2){ continue; }
			$r[urldecode($p[0])] = urldecode($p[1]);
		}
		return $r;
	}
	
	//	functions for the handshake.  Note that we do NOT handle storing this in the
	//	database; that's up to the child class to do.
	public function get_request_token($url, $data = array()){
		$r = $this->GET($url, $data);
		if(!empty($r["response"])){
			$t = $this->parse_response($r["response"]);
			$this->token = new OAuthConsumer($t['oauth_token'], $t['oauth_token_secret']);
		}
		return $this->token;
	}

	public function get_access_token($url, $data = array()){
		$r = $this->GET($url, $data);
		if(!empty($r["response"])){
			$t = $this->parse_response($r["response"]);
			if(array_key_exists("oauth_token", $t)){
				$this->token = new OAuthConsumer($t['oauth_token'], $t['oauth_token_secret']);
			} else {
				throw new Exception("There was a problem getting an access token: " . $r["response"]);
			}
		}
		return $this->token;
	}

	private function oauth_fetch($method, $url, $args = array()){
		$req = OAuthRequest::from_consumer_and_token($this->consumer, $this->token, $method, $url, $args);
		$req->sign_request($this->sig_method, $this->consumer, $this->token);
		switch($method){
			case 'GET':{
				$result = parent::GET($req->to_url());
				break;
			}
			case 'POST':{
				$result = parent::POST($req->get_normalized_http_url(), $req->to_postdata());
				break;
			}
		}
		$this->_last_api_call = $url;
		$this->_http_status = $result["ioArgs"]["status"];
		return $result;
	}

	public function GET($url, $get_data = array()){
		return $this->oauth_fetch('GET', $url, $get_data);
	}

	public function POST($url, $post_data){
		return $this->oauth_fetch('POST', $url, $post_data);
	}
}
?>
