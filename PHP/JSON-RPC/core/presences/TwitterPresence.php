<?php

require_once(dirname(__FILE__)."/../Presence.php");
require_once(dirname(__FILE__)."/../OAuthService.php");

class TwitterPresence extends Presence {
	private $base_url = "https://twitter.com";
	private $request_token_url = '/oauth/request_token';
	private $authorize_url = '/oauth/authorize';
	private $access_token_url = '/oauth/access_token';

	public function generate_exception($info){
		//	take the execption object passed and generate something sliqr-friendly.
		//	$info should be the ioArgs returned from OAuth.
		if(array_key_exists("error", $info["raw"])){
			//	this is likely Twitter's way of pulling a revoked access.
			$code = PresenceExceptionCodes::CANT_AUTHENTICATE;
		} else {
			switch($info["status"]){
				case "401":{
					$code = PresenceExceptionCodes::CANT_AUTHENTICATE;
					break;
				}
				case "500":
				case "501":
				case "502": {
					$code = PresenceExceptionCodes::SERVER_DOWN;
					break;
				}
				case "503": 
				case "403":
				case "400": {
					$code = PresenceExceptionCodes::API_LIMIT_REACHED;
					break;
				}
				default: {
					$code = PresenceExceptionCodes::ERROR_UNKNOWN;
				}
			}
		}

		$desc = str_replace("<service>", $this->name(), PresenceExceptionCodes::$descriptions[$code]);
		if($code == PresenceExceptionCodes::CANT_AUTHENTICATE){
			$url = $this->get_auth_url();
			$desc = str_replace("edit your settings", '<a href="' . $url . '">re-authorize ' . $this->name() . ' </a>', $desc);
		}
		return new Exception($desc, $code);
	}

	public function __construct($u, $set = null){
		$this->service = 1;
		parent::__construct($u, $set);
	}

	public function update(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		
		if(time() < strtotime($this->last_fetch_stamp) + $c["refreshLimit"]){
			$code = PresenceExceptionCodes::UPDATE_TOO_SOON;
			throw new Exception(str_replace("<service>", $this->name, PresenceExceptionCodes::$descriptions[$code]), $code);
		}

		$oauth = new OAuthService(
			$c["twitter"]["key"], 
			$c["twitter"]["secret"],
			$this->authorization->key,
			$this->authorization->secret
		);

		$bForceThrow = false;
		$tweet_ex = null;
		try {
			$r = $oauth->GET($this->base_url . "/account/verify_credentials.json");
			$obj = json_decode($r["response"]);

			if($r["ioArgs"]["status"] == "200" && !array_key_exists("error", $r["response"])){
				if(!array_key_exists('uid', $this->properties)){
					//	set some properties
					$this->set_properties(array(
						"uid"=>$obj->id,
						"screen_name"=>$obj->screen_name,
						"avatar"=>$obj->profile_image_url,
						"url"=>"http://twitter.com/" . $obj->screen_name
					), true);
				}

				//	update our stats.
				foreach($this->stats as $stat){
					$tmp = 0;
					switch($stat->name()){
						case "Following":
							$tmp = $obj->friends_count;
							break;
						case "Followers":
							$tmp = $obj->followers_count;
							break;
						case "Tweets":
							$tmp = $obj->statuses_count;
							break;
						/*
						case "Favorites":
							$tmp = $obj->favourites_count;
							break;
						*/
					}
					//	raw_score delta calc handled by the stat.
					$stat->raw_score($tmp);
				}
				$this->last_fetch(time());
				$this->save();
			} else {
				$tweet_ex = $this->generate_exception($r["ioArgs"]);
				$bForceThrow = true;
			}
		} catch(Exception $ex){
			//	we don't know what happened, throw the unknown error
			$code = PresenceExceptionCodes::ERROR_UNKNOWN;
			throw new Exception(str_replace("<service>", $this->name(), PresenceExceptionCodes::$descriptions[$code]), $code);
		}

		if($bForceThrow){
			//	something happened and we have to manually throw this outside of the try...catch
			throw $tweet_ex;
		}
	}

	public function get_auth_url(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$oauth = new OAuthService(
			$c["twitter"]["key"], 
			$c["twitter"]["secret"]
		);

		$t = $oauth->get_request_token($this->base_url . $this->request_token_url);
		if(session_id()){
			$_SESSION["twitter_oauth_key"] = $t->key;
			$_SESSION["twitter_oauth_secret"] = $t->secret;
		} else {
			throw new Exception('TwitterPresence->get_auth_url: No session exists to temporarily store the request tokens.');
		}
		return $this->base_url . $this->authorize_url . "?oauth_token=" . $t->key;
	}

	public function get_token(){
		//	call this when the user is returning from Twitter.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		if(session_id() && array_key_exists("twitter_oauth_key", $_SESSION)){
			$oauth = new OAuthService(
				$c["twitter"]["key"], 
				$c["twitter"]["secret"],
				$_SESSION["twitter_oauth_key"],
				$_SESSION["twitter_oauth_secret"]
			);
			$_SESSION["twitter_oauth_key"] = NULL;
			$_SESSION["twitter_oauth_secret"] = NULL;
			unset($_SESSION["twitter_oauth_key"]);
			unset($_SESSION["twitter_oauth_secret"]);

			//	go get the access token.
			$t = $oauth->get_access_token($this->base_url . $this->access_token_url);
			if($t){
				//	get the user's info and test for unique.
				$r = $oauth->GET($this->base_url . "/account/verify_credentials.json");
				$obj = json_decode($r["response"]);
				$uid = $obj->id;

				if($this->is_unique_and_owned($uid)){
					$this->authorization($t);
					$this->create();
					$this->set_properties(array(
						"uid"=>$obj->id,
						"screen_name"=>$obj->screen_name,
						"avatar"=>$obj->profile_image_url,
						"url"=>"http://twitter.com/" . $obj->screen_name
					), true);
				} else {
					throw new Exception('TwitterPresence->get_token: a user with this profile already exists on Sliqr!');
				}
			}
		}
	}

	public function get_home_link(){
		$lnk = "twitter.com/" . $this->get_property("screen_name");
		return "<a class=\"extern\" href=\"http://{$lnk}\">{$lnk}</a>";
	}
}
?>
