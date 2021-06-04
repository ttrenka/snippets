<?php

require_once(dirname(__FILE__)."/../Presence.php");
require_once(dirname(__FILE__)."/../OAuthService.php");

class MySpacePresence extends Presence {
	private $base_url = "http://api.myspace.com/";
	private $request_token_url = 'request_token';
	private $authorize_url = 'authorize';
	private $access_token_url = 'access_token';

	//	using the default one in the Presence for now.
	//	public function generate_execption($info){ }

	public function __construct($u, $set = null){
		$this->service = 3;		//	hard-code the ID of the service.
		parent::__construct($u, $set);
	}

	private function convert($r, $type="JSON"){
		//	private function to convert the response given to something usable by PHP.
		$ret = NULL;
		if($type=="XML"){
			$ret = new SimpleXMLElement($r);
		}
		else if($type=="ATOM"){
			$ret = new SimpleXMLElement(utf8_encode($r));
		}
		else if($type=="JSON"){
			$ret = json_decode($r);
		}
		return $ret;
	}

	private function fetch_user($service){
		$r = $service->GET($this->base_url . 'v1/user.json');
		$t = $this->convert($r['response']);
		return $t;
	}

	private function fetch_profile($service){
		$r = $service->GET(
			$this->base_url . 'v1/users/' . $this->properties['uid'] . '/profile.json',
			array(
				"detailtype" => "extended"
			)
		);
		$t = $this->convert($r['response']);
		return $t;	//	return them all, just in case.
	}

	private function fetch_profile_comments($service){
		$r = $service->GET($this->base_url . 'v1/users/' . $this->properties['uid'] . '/comments.json');
		$t = $this->convert($r['response']);
		return $t;	//	return them all, just in case.
	}

	private function fetch_activites($service){
		//364152197
		$r = $service->GET($this->base_url . 'v1/users/' . $this->properties['uid'] . '/activities.atom');
		$t = $this->convert($r['response'], 'ATOM');
		return $t;
	}

	private function fetch_friends($service){
		$r = $service->GET(
			$this->base_url . 'v1/users/' . $this->properties['uid'] . '/friends.json',
			array(
				"page_size" => "all"
			)
		);
	//	FB::log($r['response']);
		$t = $this->convert($r['response']);
		return $t;	//	return them all, just in case.
	}

	private function fetch_albums($service){
		$r = $service->GET(
			$this->base_url . 'v1/users/' . $this->properties['uid'] . '/albums.json',
			array(
				"page_size" => "all"
			)
		);
		$t = $this->convert($r['response']);
		return $t;	//	return them all, just in case.
	}

	public function update(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;

		if(time() < strtotime($this->last_fetch_stamp) + $c["refreshLimit"]){
			$code = PresenceExceptionCodes::UPDATE_TOO_SOON;
			throw new Exception(str_replace("<service>", $this->name(), PresenceExceptionCodes::$descriptions[$code]), $code);
		}

		try {
			$oauth = new OAuthService(
				$c["myspace"]["key"], 
				$c["myspace"]["secret"],
				$this->authorization->key,
				$this->authorization->secret
			);

			//	with each of these, we need the method to return an exception generated
			//	but NOT throw the actual error.
			if(!array_key_exists('uid', $this->properties)){
				//	get the current user info
				$u = $this->fetch_user($oauth);
				$this->set_properties(array(
					"screen_name" => $u->name,
					"url" => $u->webUri,
					"avatar" => $u->image,
					"uid" => $u->userId
				));
			}
			$uid = $this->properties['uid'];

			/*
			$pc = $this->fetch_profile_comments($oauth);
			$a = $this->fetch_activites($oauth);
			$f = $this->fetch_friends($oauth);
			*/

			$this->last_fetch(time());
			$this->save();
		} catch(Exception $ex){
			//	we don't know what happened, throw the unknown error
			$code = PresenceExceptionCodes::ERROR_UNKNOWN;
			throw new Exception(str_replace("<service>", $this->name(), PresenceExceptionCodes::$descriptions[$code]), $code, $ex);
		}
	}

	public function get_auth_url(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$oauth = new OAuthService(
			$c["myspace"]["key"], 
			$c["myspace"]["secret"]
		);

		$t = $oauth->get_request_token($this->base_url . $this->request_token_url);
		if(session_id()){
			$_SESSION["myspace_oauth_key"] = $t->key;
			$_SESSION["myspace_oauth_secret"] = $t->secret;
		} else {
			throw new Exception('MySpacePresence->get_auth_url: No session exists to temporarily store the request tokens.');
		}
		return $this->base_url . $this->authorize_url . "?oauth_token=" . $t->key 
			. "&oauth_callback=" . urlencode($c["baseUrl"] . "addpresence/myspace");
	}

	public function get_token(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		if(session_id() && array_key_exists("myspace_oauth_key", $_SESSION)){
			$oauth = new OAuthService(
				$c["myspace"]["key"], 
				$c["myspace"]["secret"],
				$_SESSION["myspace_oauth_key"],
				$_SESSION["myspace_oauth_secret"]
			);
			$_SESSION["myspace_oauth_key"] = NULL;
			$_SESSION["myspace_oauth_secret"] = NULL;
			unset($_SESSION["myspace_oauth_key"]);
			unset($_SESSION["myspace_oauth_secret"]);

			//	go get the access token.
			$t = $oauth->get_access_token($this->base_url . $this->access_token_url);
			if($t){
				$u = $this->fetch_user($oauth);
				if($this->is_unique_and_owned($u->userId)){
					$this->authorization($t);
					$this->create();
					$this->set_properties(array(
						"screen_name" => $u->name,
						"url" => $u->webUri,
						"avatar" => $u->image,
						"uid" => $u->userId
					));
				} else {
					throw new Exception('MySpacePresence->get_token: a user with this profile already exists on Sliqr!');
				}
			}
		}
	}

	public function get_home_link(){
		$lnk = $this->get_property("url");
		$name = $this->get_property("screen_name");
		return "<a class=\"extern\" href=\"{$lnk}\">{$name} @ MySpace</a>";
	}
}
?>
