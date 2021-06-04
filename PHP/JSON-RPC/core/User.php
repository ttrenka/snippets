<?php
require_once("Storage.php");

class User {
	const STATUS_DELETED = 'D';
	const STATUS_ACTIVE = 'L';
	const STATUS_ADMIN = 'A';

	private $uid = 0;
	private $password = "";
	private $activated = false;
	private $invited_by = 0;
	private $last_login;
	private $last_updated;

	public $username = "";
	public $name_first = "";
	public $name_last = "";
	public $email = "";
	public $invitations_left = 0;
	public $invitations_sent = 0;
	public $is_pro = false;
	public $receive_updates = false;
	public $created_on;
	public $created_on_formatted;
	public $stats_as_numbers = true;
	public $last_login_formatted;
	public $actions = "";
	public $last_newsread;
	public $tags = array();
	public $original_tags = array();

	public $last_rank = 0;
	public $last_score = 0;

	private $is_valid = false;

	//	change this based on the specification.
	const DEFAULT_INVITES = 5;

	public function __construct($user, $pwd){
		//	when creating the user object, force the username and password.
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);
		$res = $s->fetch(
			"SELECT * FROM user WHERE username = :username AND password =:password AND status != 'D'",
			array(
				"username"=>$user,
				"password"=>$pwd
			)
		);

		if(count($res)){
			//	this is a valid user, fill in all our properties
			$row = $res[0];
			$this->uid = $row["id"];
			$this->username = $row["username"];
			$this->password = $row["password"];
			$this->name_first = $row["name_first"];
			$this->name_last = $row["name_last"];
			$this->email = $row["email"];
			$this->activated = $row["activated"]!=0;
			$this->invited_by = $row["invited_by"];
			$this->invitations_left = $row["invitations_left"];
			$this->invitations_sent = $row["invitations_sent"];
			$this->is_pro = $row["is_pro"]!=0;
			$this->receive_updates = $row["receive_updates"]!=0;
			$this->last_login = time();
			$this->last_login_formatted = date('F j, Y @ g:i a', $this->last_login);
			$this->created_on = $row["created_on"];
			$this->created_on_formatted = date_format($s->convert_date($row["created_on"]), 'F j, Y');
			$this->stats_as_numbers = $row["stats_as_numbers"]!=0;
			$this->actions = is_null($row["actions"])?"":$row["actions"];
			$this->last_rank = is_null($row["last_rank"])?0:$row["last_rank"];
			$this->last_score = is_null($row["last_score"])?0:$row["last_score"];
			$this->last_newsread = $row["last_newsread"];
			$this->is_valid = true;

			$tag_res = $s->fetch(
				"SELECT tag FROM user_tag WHERE user = :userid ORDER BY sort_order",
				array("userid"=>$this->uid)
			);
			if(count($tag_res)){
				foreach($tag_res as $row){
					$this->tags[] = $row["tag"];
					$this->original_tags[] = $row["tag"];
				}
			}

			//	update the last login
			$s->execute(
				"UPDATE user SET last_login = :last_login, last_updated = NOW() WHERE id = :id",
				array(
					"id"=>$this->uid,
					"last_login"=>$s->convert_date($this->last_login, "sql")
				)
			);
		} else {
			throw new Exception("The supplied credentials were not found or were invalid.");
		}
	}

	//	generic getter/setter mechanism.
	public function __call($fn, $args){
		$whitelist = array("uid","password","activated","invited_by","last_login","last_updated");
		if(is_null($fn) || !in_array($fn, $whitelist)){ return null; }
		if(count($args)){
			// setter
			$this->$fn = $args[0];
		}
		// getter
		return $this->$fn;
	}

	public function valid(){
		return $is_valid;
	}

	public function get_password(){
		return $this->password;
	}

	//	Update the user's records
	public function save_settings($settings=array()){
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);

		//	set the variables here
		if(array_key_exists("password", $settings)){ $this->password = $settings["password"]; }
		if(array_key_exists("name_first", $settings)){ $this->name_first = $settings["name_first"]; }
		if(array_key_exists("name_last", $settings)){ $this->name_last = $settings["name_last"]; }
		if(array_key_exists("email", $settings)){ $this->email = $settings["email"]; }
		if(array_key_exists("receive_updates", $settings)){ $this->receive_updates = $settings["receive_updates"]; }
		if(array_key_exists("stats_as_numbers", $settings)){ $this->stats_as_numbers = $settings["stats_as_numbers"]; }
		if(array_key_exists("actions", $settings)){ $this->actions = $settings["actions"]; }
		if(array_key_exists("last_newsread", $settings)){ $this->last_newsread = $settings["last_newsread"]; }
		if(array_key_exists("last_rank", $settings)){ $this->last_rank = $settings["last_rank"]; }
		if(array_key_exists("last_score", $settings)){ $this->last_score = $settings["last_score"]; }

		$sql = "UPDATE user SET 
			password=:password, 
			name_first=:name_first, 
			name_last=:name_last,
			email=:email, 
			is_pro=:is_pro, 
			receive_updates=:receive_updates,
			stats_as_numbers=:stats_as_numbers,
			actions=:actions,
			last_newsread=:last_newsread,
			last_rank=:rank,
			last_score=:last_score,
			last_updated=NOW() 
			WHERE id=:uid";

		$params = array(
			"password"=>$this->password,
			"name_first"=>$this->name_first,
			"name_last"=>$this->name_last,
			"email"=>$this->email,
			"is_pro"=>$this->is_pro?1:0,
			"receive_updates"=>$this->receive_updates?1:0,
			"stats_as_numbers"=>$this->stats_as_numbers?1:0,
			"actions"=>$this->actions,
			"last_newsread"=>$this->last_newsread,
			"rank"=>$this->last_rank,
			"last_score"=>$this->last_score,
			"uid"=>$this->uid
		);

		/*
		print "<!-- user.save_settings \n";
		print_r($params);
		print "\n-->\n";
		// */

	//	$this->save_tags();

		$c = $s->execute($sql, $params);
		return ($c > 0);
	}

	//	invitation functionality
	public function invite($email, $nick=""){
		//	invite someone.  If you're out of invites, this will throw an Exception.
		//	It will make sure that the code generated is unique in the current table
		//	of invitation codes.
		if(!$this->invitations_left){
			throw new Exception("This user has no more invitations available to send.");
		}
		global $SLIQR_CONFIG;

		//	generate a UUID.
		$res = Storage::singleton($SLIQR_CONFIG)->fetch(
			"SELECT UPPER(UUID()) AS uuid"
		);
		$token = $res[0]["uuid"];

		//	store it in the invitations table.
		$res = Storage::singleton($SLIQR_CONFIG)->execute(
			"INSERT INTO invitation_tokens (token, created_on, source_topic, source_reference, max_uses, num_used, expires_on, last_updated)
			VALUES (:token, NOW(), :topic, :ref, :max, :used, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())",
			array(
				"token"=>$token,
				"topic"=>"user",
				"ref"=>$this->uid,
				"max"=>1,
				"used"=>0
			)
		);
		$res = Storage::singleton($SLIQR_CONFIG)->execute(
			"INSERT INTO invitation_tokens_detail (token, email, nickname, used)
			VALUES (:token, :email, :nick, :used)",
			array(
				"token"=>$token,
				"email"=>$email,
				"nick"=>$nick,
				"used"=>0
			)
		);

		//	update the invitations remaining and sent.
		$this->invitations_left--;
		$this->invitations_sent++;
		$res = Storage::singleton($SLIQR_CONFIG)->execute(
			"UPDATE user SET invitations_left = :left, invitations_sent = :sent, last_updated = NOW() WHERE id = :id", 
			array(
				"left" => $this->invitations_left,
				"sent" => $this->invitations_sent,
				"id" => $this->uid
			)
		);

		//	return the pertinent information
		return array(
			"success" => true,
			"token" => $token,
			"email" => $email,
			"nickname" => $nick,
			"invitations_left" => $this->invitations_left,
			"invitations_sent" => $this->invitations_sent
		);
	}

	public static function get_invitation($token){
		//	returns the basic information contained within an invite.
		global $SLIQR_CONFIG;
		$res = Storage::singleton($SLIQR_CONFIG)->fetch(
			"SELECT DISTINCT i.token, i.source_topic, i.num_used, i.source_reference, d.email, d.nickname, i.expires_on < NOW() AS expired, i.max_uses - i.num_used AS uses_left, d.used
			 FROM invitation_tokens i
			 INNER JOIN invitation_tokens_detail d
			 	ON d.token = i.token
			WHERE i.token = :token",
			array("token"=>$token)
		);

		if(count($res)){
			// check for an expired code
			if($res[0]["expired"]){
				return array(
					"error"=>"Invitation token expired",
					"message"=>"That code has expired. If you'd like to receive a fresh code as soon as we can support more users, please register your email address below."
				);
			}
			// check that the code isn't used already
			if($res[0]["used"]){
				return array(
					"error"=>"Invitation token used.",
					"message"=>"That code has already been used. If you'd like to receive a fresh code as soon as we can support more users, please register your email address below."
				);
			}

			//	double check to make sure the nickname is unique.
			$nickname = $res[0]["nickname"];
			$test = self::user_name_check($nickname);
			if(!$test){
				$nickname = "";
			}

			//	return the info needed for the sign-up form.
			return array(
				"success"=>true,
				"num_used"=>$res[0]["num_used"],
				"uses_left"=>$res[0]["uses_left"],
				"topic"=>$res[0]["source_topic"],
				"ref"=>$res[0]["source_reference"],
				"token"=>$token,
				"email"=>$res[0]["email"],
				"nickname"=>$nickname
			);
		} else {
			return array(
				"error"=>"Invitation token not found",
				"message"=>"That isn't a valid code. If you'd like to receive a fresh code as soon as we can support more users, please register your email address below."
			);
		}
	}

	//	static functions
	public static function user_name_check($name){
		global $SLIQR_CONFIG;
		$res = Storage::singleton($SLIQR_CONFIG)->fetch(
			"SELECT username FROM user WHERE username=:name",
			array("name"=>$name)
		);
		return (count($res)==0);
	}

	public static function user_email_check($email){
		global $SLIQR_CONFIG;
		$res = Storage::singleton($SLIQR_CONFIG)->fetch(
			"SELECT email FROM user WHERE email=:email",
			array("email"=>$email)
		);
		return (count($res)==0);
	}

	public static function wait_list_check($email){
		global $SLIQR_CONFIG;
		$res = Storage::singleton($SLIQR_CONFIG)->fetch(
			"SELECT email FROM waitlist WHERE email=:email",
			array("email"=>$email)
		);
		return (count($res)>0); // true if on the wait list
	}

	public static function generate_invite_code($len=8){
		$charset = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789";
		for ($i=0; $i<$len; $i++){
			$key .= $charset[(mt_rand(0,(strlen($charset)-1)))];
		}
		return $key;
	}

	public static function reset_password($email){
		//	lock the account, generate a token and return the token
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);
		$res = $s->fetch(
			"SELECT id, username, email FROM user WHERE email=:email",
			array("email"=>$email)
		);

		if(count($res)){
			//	we found the email, create a token, lock the account and return the token with
			//	the rest of the user's info.  Token is a hex representation.
			$id = $res[0]["id"];
			$token = sha1($id . "&" . time());
			$c = $s->execute(
				"DELETE FROM password_tokens WHERE user_id = :id",
				array("id"=>$id)
			);
			$c = $s->execute(
				"INSERT INTO password_tokens (user_id, token, last_updated) VALUES (:id, :token, NOW())",
				array("id"=>$id, "token"=>$token)
			);
			$c = $s->execute(
				"UPDATE user SET locked = 1 WHERE id = :id",
				array("id"=>$id)
			);
			return array(
				"email"=>$email,
				"token"=>$token,
				"username"=>$res[0]["username"],
			);
		} else {
			return array(
				"error" => "Email not found",
				"message" => "The email address '" . $email . "' was not found in the Sliqr database."
			);
		}
	}

	public static function change_password($token, $pwd){
		//	change to pwd based on the passed token.
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);
		$res = $s->fetch(
			"SELECT user_id, token, last_updated <= DATE_SUB(NOW(), INTERVAL 1 DAY) AS expired FROM password_tokens WHERE token=:token",
			array("token"=>$token)
		);

		if(count($res)){
			$row = $res[0];
			// delete the token regardless of whether it's valid or not, since we
			// only ever have one available per user, and if it's expired, it needs
			// to get cleaned out anyway
			$c = $s->execute(
				"DELETE FROM password_tokens WHERE user_id=:id",
				array(
					"id"=>$row["user_id"]
				)
			);
			if(!$row["expired"]){
				//	update the user table.
				$c = $s->execute(
					"UPDATE user SET locked = 0, password = :password, last_updated = NOW() WHERE id = :id",
					array(
						"id"=>$row["user_id"],
						"password"=>$pwd
					)
				);
				return array(
					"success"=>true,
					"message"=>"Your password has been successfully reset."
				);
			}
		}
		return array(
			"error" => "Token not found",
			"message" => "The passed reset token was not found in the Sliqr database."
		);
	}

	public static function password_token_check($token){
		//	check for the validity of the given token
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);
		$res = $s->fetch(
			"SELECT token FROM password_tokens WHERE token=:token AND last_updated > DATE_SUB(NOW(), INTERVAL 1 DAY)",
			array("token"=>$token)
		);

		return count($res) ? true : false;
	}

	public static function password_strength($str){
		$strength = 0; 
		$len = strlen($str); 

		if($len < 4){ 
			return $strength; 
		} else { 
			$strength = $len * 4; 
		} 

		for ($i = 2; $i <= 4; $i++) { 
			$temp = str_split($str, $i); 
			$strength -= (ceil($len / $i) - count(array_unique($temp))); 
		}

		preg_match_all('/[0-9]/', $str, $num); 
		if(!empty($num)){ 
			$num = count($num[0]); 
			if ($num >= 3){ $strength += 5; } 
		} else { 
			$num = 0; 
		} 

		preg_match_all('/[|!@#$%&*\/=?,;.:\-_+~^¨\\\]/', $str, $sym); 
		if (!empty($sym)) { 
			$sym = count($sym[0]); 
			if($sym >= 2){ $strength += 5; } 
		} else { 
			$sym = 0; 
		} 

		preg_match_all('/[a-z]/', $str, $lc); 
		preg_match_all('/[A-Z]/', $str, $uc); 
		if(!empty($lc)){ $lc = count($lc[0]); } 
		else { $lc = 0; } 
		if(!empty($uc)){ $uc = count($uc[0]); } 
		else { $uc = 0; } 

		if($lc>0 && $uc>0){ $strength += 10; } 
		$c = $lc + $uc; 

		if ($num > 0 && $sym > 0) { $strength += 15; } 
		if ($num > 0 && $c > 0) { $strength += 15; } 
		if ($sym > 0 && $c > 0) { $strength += 15; } 
		if ($num == 0 && $sym == 0) { $strength -= 10; } 
		if ($sym == 0 && $c == 0) { $strength -= 10; } 
		if ($strength < 0) { $strength = 0; } 
		if ($strength > 100) { $strength = 100; } 

		return $strength; 
	}

	public static function get_user($user, $pwd){
		//	FIXME: this is for dev purposes ONLY and should not be used for production!
		try {
			$u = new User($user, $pwd);
			return $u;
		} catch (Exception $ex) {
			return null;
		}
	}

	public static function create_user($user, $pwd, $email, $name_first="", $name_last="", $token="", $receive_updates = true){
		//	add the user to the database, and if the token is present, fix up the invites.
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);

		if(strlen($token)){
			$info = self::get_invitation($token);
		} else {
			$info = array();
		}

		// problem with the invitation (e.g., already used)?
		if(array_key_exists("error", $info)){
			return $info;
		}

		$c = $s->execute(
			"INSERT INTO user (status, username, password, name_first, name_last, email, invited_by, activated, invitations_left, invitations_sent, receive_updates, last_updated, created_on)
			 VALUES (:status, :username, :password, :name_first, :name_last, :email, :invite_user, 1, :left, 0, :receive, NOW(), NOW())",
			array(
				"status"=>self::STATUS_ACTIVE,
				"username"=>$user,
				"password"=>$pwd,
				"name_first"=>$name_first,
				"name_last"=>$name_last,
				"email"=>$email,
				"invite_user"=>array_key_exists("ref", $info)? ($info["topic"]=="user"?$info["ref"]:0) : 0,
				"left"=>self::DEFAULT_INVITES,
				"receive"=>$receive_updates?1:0
			)
		);

		$uid = $s->id();

		if($uid){
			//	we're good, continue on.
			if(strlen($token)){
				//	fill out the invite information
				$c = $s->execute(
					"UPDATE invitation_tokens SET num_used=:used, last_updated=NOW() WHERE token=:token",
					array(
						"used"=>$info["num_used"]+1,
						"token"=>$token
					)
				);

				if($info["topic"] == "user"){
					//	this record should exist, so do an UPDATE.
					$c = $s->execute(
						"UPDATE invitation_tokens_detail SET invitee_id=:id, nickname=:user, used=1, used_on=NOW() WHERE token=:token",
						array(
							"token"=>$token,
							"id"=>$uid,
							"user"=>$user
						)
					);
				}
				else if($info["topic"] == "bulk_inviters"){
					//	this record does not exist, so do an INSERT.
					$c = $s->execute(
						"INSERT INTO invitation_tokens_detail (token, invitee_id, email, nickname, used, used_on)
						 VALUES (:token, :id, :email, :user, 1, NOW())",
						array(
							"token"=>$token,
							"id"=>$uid,
							"email"=>$email,
							"user"=>$user
						)
					);
				}
			}

			//	TODO: see if this needs to have different info in it.
			return array(
				"success"=>true,
				"username"=>$user,
				"password"=>$pwd,
				"active"=>true
			);
		}

		//	if we got here, that means the INSERT above failed.
		return array(
			"error"=>"There was a problem registering the new user.",
			"message"=>"The new user registration was unable to be created.  Please check your information and try again."
		);
	}

	public static function delete_user($user){
		//	The method simply deactivates an account, as opposed to actually
		//	deleting information.
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);
		$c = $s->execute(
			"UPDATE user SET status = :status, last_updated = NOW() WHERE id = :id",
			array(
				"id"=>$user->uid(),
				"status"=>self::STATUS_DELETED
			)
		);
		return ($c > 0);
	}

	public function save_tags(){
		//	Save the user's tag to the user_tag table
		//	FIXME: no longer used but keeping for posterity at the moment.
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);

		// only persist tags if they've changed since load
		if((count($this->tags) != count($this->original_tags)) ||
		   count(array_diff($this->tags, $this->original_tags))){
			// we just delete tags before re-adding them
			$tag_sql = "DELETE FROM user_tag WHERE `user` = :userid";
			$tag_params = array("userid"=>$this->uid);
			$s->execute($tag_sql, $tag_params);

			if(count($this->tags)){
				// build up a single INSERT that covers all tags
				$tag_sql = "INSERT INTO user_tag (`user`,`tag`) VALUES (:userid, :tag)";
				$tag_params = array("userid"=>$this->uid, "tag"=>$this->tags[0]);
				for($i=1; $i<count($this->tags); $i++){
					$tag_sql .= ",(:userid, :tag{$i})";
					$tag_params["tag{$i}"] = $this->tags[$i];
				}
				$s->execute($tag_sql, $tag_params);
			}

			$this->original_tags = $this->tags;
		}
	}

	public function add_tag($tag){
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);

		$this->tags[] = $tag;
		$sql = "INSERT INTO user_tag (user, tag, sort_order, last_updated) "
			. "VALUES (:user, :tag, :sort, NOW())";
		$s->execute($sql, array(
			"user"=>$this->uid,
			"tag"=>$tag,
			"sort"=>count($this->tags) * 10
		));

		$this->original_tags = $this->tags;
	}

	public function remove_tag($tag){
		global $SLIQR_CONFIG;
		$s = Storage::singleton($SLIQR_CONFIG);

		$arr = array();
		foreach($this->tags as $t){
			if($t != $tag){
				$arr[] = $t;
			}
		}

		$this->tags = $arr;
		$this->original_tags = $this->tags;

		$sql = "DELETE FROM user_tag WHERE user = :user AND tag = :tag";
		$s->execute($sql, array(
			"user"=>$this->uid,
			"tag"=>$tag
		));

		//	go update the sort order for all the user's tags.
		$counter = 10;
		foreach($this->tags as $t){
			$sql = "UPDATE user_tag SET sort_order=:sort, last_updated=NOW() WHERE user = :user AND tag = :tag";
			$s->execute($sql, array(
				"user"=>$this->uid,
				"tag"=>$t,
				"sort"=>$counter
			));
			$counter += 10;
		}

		//	finally, remove the tag from all the user's presences.
		$sql = "DELETE FROM user_tag_presence WHERE user = :user AND tag = :tag";
		$s->execute($sql, array(
			"user" => $this->uid,
			"tag" => $tag
		));
	}
}
?>
