<?php

require_once(dirname(__FILE__)."/../Presence.php");
require_once(dirname(__FILE__)."/../HttpService.php");
require_once(dirname(__FILE__)."/../../ext/facebook-platform/facebookapi_php5_restlib.php");

class FacebookPresence extends Presence {
	private $base_url = "http://www.facebook.com/";
	private $request_token_url = '';
	private $authorize_url = "authorize.php";
	private $login_url = "login.php";
	private $access_token_url = '';

	public function __construct($u, $set = null){
		$this->service = 2;
		parent::__construct($u, $set);
	}

	//	indexed FQL
	private $FRIENDS = "SELECT uid2 FROM friend WHERE uid1=<uid>";
	private $ALL_WALL = "SELECT actor_id, target_id, likes.count, comments.count, created_time FROM stream WHERE source_id=<uid> LIMIT 2500";
	private $PROFILE = "SELECT name, url, pic, pic_square, pic_small, pic_big FROM profile WHERE id=<uid>";

	/*
	private $POSTED = "SELECT status_id FROM status WHERE uid=<uid>";
	private $PHOTOS = "SELECT size FROM album WHERE owner=<uid>";
	private $GROUPS = "SELECT gid FROM group WHERE gid IN (SELECT gid FROM group_member WHERE uid=<uid>)";
	private $LINKS = "SELECT link_id FROM link WHERE owner=<uid>";

	//	unindexed FQL
	private $PAGES = "SELECT page_id FROM page WHERE page_id IN (SELECT page_id FROM page_fan WHERE uid =<uid>)";
	private $STREAM = "SELECT post_id, actor_id, target_id, message, attribution, action_links, attachment, comments, likes FROM stream WHERE filter_key in (SELECT filter_key FROM stream_filter WHERE uid = <uid> AND type = 'newsfeed')";
	*/

	public function generate_exception($info){
		//	take the execption object passed and generate something sliqr-friendly.
		//	$info should either be a FacebookRestClientException or an Exception object.
		//	$code = FacebookAPIErrorCodes::API_EC_BATCH_ALREADY_STARTED;
		if($info instanceof FacebookRestClientException){
			//	oh boy.  Here's where we start pulling code ranges.
			$fb_code = $info->getCode();
			$code_tables = array(
				PresenceExceptionCodes::CANT_AUTHENTICATE => array(102,400,401,402,403,450,451,452,453,454,455),
				PresenceExceptionCodes::SERVER_DOWN => array(2),
				PresenceExceptionCodes::API_LIMIT_REACHED => array(4,9)
			);

			$code = PresenceExceptionCodes::ERROR_UNKNOWN;
			foreach($code_tables as $key=>$table){
				if(in_array($fb_code, $table)){
					$code = $key;
					break;
				}
			}
			$desc = str_replace("<service>", $this->name(), PresenceExceptionCodes::$descriptions[$code]);
			if($code == PresenceExceptionCodes::CANT_AUTHENTICATE){
				$url = $this->get_auth_url();
				$desc = str_replace("edit your settings", '<a href="' . $url . '">re-authorize ' . $this->name() . ' </a>', $desc);
			}
			return new Exception($desc, $code);
		}
		$code = PresenceExceptionCodes::ERROR_UNKNOWN;
		return new Exception(str_replace("<service>", $this->name(), PresenceExceptionCodes::$descriptions[$code]), $code);
	}

	public function update(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;

		/*
		if(time() < strtotime($this->last_fetch_stamp) + $c["refreshLimit"]){
			$code = PresenceExceptionCodes::UPDATE_TOO_SOON;
			throw new Exception(str_replace("<service>", $this->name(), PresenceExceptionCodes::$descriptions[$code]), $code);
		}
		*/

		try {
			$api = new FacebookRestClient($c["facebook"]["key"], $c["facebook"]["secret"], $this->authorization["session"]);
			$token = $this->authorization['token'];
			$uid = $this->authorization['uid'];
			$api->set_user($uid);

			//	try to get a new session
			//$this->get_session();

			$api->begin_batch();

			// indexed stats
			$friends = &$api->fql_query(str_replace("<uid>", $uid, $this->FRIENDS));
			$stream = &$api->fql_query(str_replace("<uid>", $uid, $this->ALL_WALL));

			//	profile info
			$profile = &$api->fql_query(str_replace("<uid>", $uid, $this->PROFILE));
			$api->end_batch();

			/*
			print "<script>";
			print "console.log(" . json_encode($stream) . ");";
			print "</script>";
			// */

			//	calculate the activities, comments and likes.
			if($stream){
				$activities = count($stream);
				$comments = 0;
				$likes = 0;
				foreach($stream as $activity){
					$comments += (array_key_exists("count", $activity["comments"])) ? (int)$activity["comments"]["count"] : 0;
					$likes += (array_key_exists("count", $activity["likes"])) ? (int)$activity["likes"]["count"] : 0;
				}
			} else {
				throw new Exception("No stream was returned from the Facebook ReST API.");
			}

			/*
			print "<textarea style=\"width:100%;height:800px;\">\n";
			print "Activity count: " . $activities . "\n";
			print "Likes count: " . $likes . "\n";
			print "Comments count: " . $comments . "\n";
			print_r($stream);
			print "\n</textarea>\n";
			// */

			//	do the property bag stuff.
			$this->set_properties(array(
				"screen_name"=>$profile[0]["name"],
				"avatar"=>$profile[0]["pic_square"],
				"url"=>$profile[0]["url"],
				"uid"=>$uid
			), true);

			$friends = count($friends);

			//	loop through our stats and set up some data.
			foreach($this->stats as $stat){
				$tmp = 0;
				switch($stat->name()){
					case "Friends":
						$tmp = $friends;
						break;
					case "Activity":
					case "Activities":
						$tmp = $activities;
						break;
					case "Comments":
						$tmp = $comments;
						break;
					case "Likes":
						$tmp = $likes;
						break;
				}
				//	raw score delta calc handled by the stat.
				$stat->raw_score($tmp);
			}
			$this->last_fetch(time());
			$this->save();
			// */
		} catch(Exception $ex){
			throw $this->generate_exception($ex);
		}
	}

	public function remove(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		try {
			$api = new FacebookRestClient($c["facebook"]["key"], $c["facebook"]["secret"], $this->authorization["session"]);
			$token = $this->authorization['token'];
			$uid = $this->authorization['uid'];

			$api->auth_revokeAuthorization($uid);
		} catch(Exception $ex){
			//	swallow it, in case the app was removed at Facebook first.
		}
		parent::remove();
	}

	public function get_auth_url(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		return $this->base_url . $this->authorize_url . "?api_key=" . $c["facebook"]["key"] . "&v=1.0&ext_perm=read_stream";
	}

	public function get_token($token){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$api = new FacebookRestClient($c["facebook"]["key"], $c["facebook"]["secret"], null);

		$api->session_key = null;
		$result = $api->auth_getSession($token, "false");

		if($this->is_unique_and_owned($result["uid"])){
			$this->authorization(array(
				"token"=>$token,
				"session"=>$result["session_key"],
				"uid"=>$result["uid"],
				"expires"=>$result["expires"]
			));
			$this->create();
		} else {
			throw new Exception('FacebookPresence->get_token: a user with this profile already exists on Sliqr!');
		}
	}

	public function get_offline_perm_url(){
		//	we don't need the token because they will issue a new one on return here.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		return $this->base_url . $this->authorize_url . "?api_key=" . $c["facebook"]["key"] . "&v=1.0&ext_perm=offline_access&next="
			. urlencode($c["baseUrl"] . "addpresence/facebook?offline=1");
	}

	public function get_stream_perm_url($token){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		return $this->base_url . $this->authorize_url . "?api_key=" . $c["facebook"]["key"] . "&v=1.0&ext_perm=read_stream&next="
			. urlencode($c["baseUrl"] . "addpresence/facebook?stream=1&at=".$token);
	}

	public function get_home_link(){
		$lnk = $this->get_property("url");
		$name = $this->get_property("screen_name");
		return "<a class=\"extern\" href=\"{$lnk}\">{$name} @ Facebook</a>";
	}
}
?>
