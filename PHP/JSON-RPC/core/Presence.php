<?php
/*	Presence.php
 *
 *	Defines the base class for all presences, and the class for 
 *	presence stats.
 */
require_once("Storage.php");

class PresenceExceptionCodes {
	const ERROR_UNKNOWN = 0;
	const CANT_AUTHENTICATE = 1;
	const SERVER_DOWN = 2;
	const API_LIMIT_REACHED = 3;
	const UPDATE_TOO_SOON = 4;

	public static $descriptions = array(
		"Sorry, our most recent attempt to update your <service> stats has failed because of an unknown error.  Please try again later.",
		"Sorry, our most recent attempt to update your <service> stats has failed because we couldn't authenticate your account. Please edit your settings and try again.",
		"Sorry, our most recent attempt to update your <service> stats has failed because we couldn't get a response from the appropriate server(s). Please try again later.",
		"Sorry, our most recent attempt to update your <service> stats has failed because we have reached the API limit for the appropriate server(s). Please try again later.",
		"Sorry, our most recent attempt to update your <service> stats has failed because your stats have recently been updated already. Please be kind to our servers and try again later."
	);
}

class PresenceStat {
	//	user comes along with the presence
	private $presence;
	private $id;
	private $name;
	private $indexed = false;
	private $optional = false;
	private $format = "float";
	private $weight = 1;
	private $score = 0;
	private $raw_score = 0;
	private $delta = 0;
	private $awf;
	private $last_updated;
	private $last_updated_stamp;

	private $has_values = false;
	private $initialized = false;

	public function __construct($p, $row = null){
		$this->presence = $p;
		if($row){
			$this->initialize($row);
		}
	}

	public function initialize($row){
		//	populate our vars based on the passed db row.
		$this->id = $row["s_id"];
		$this->name = $row["s_title"];
		$this->indexed = $row["indexed"] == 1;
		$this->optional = $row["optional"] == 1;
		if(array_key_exists("s_format", $row) && $row["s_format"]!=null)
			$this->format = $row["s_format"];
		if(array_key_exists("s_weight", $row) && $row["s_weight"]!=null)
			$this->weight = $row["s_weight"];
		if(array_key_exists("s_score", $row) && $row["s_score"]!=null){
			$this->score = $row["s_score"];
			$this->has_values = true;
		}
		if(array_key_exists("s_raw", $row) && $row["s_raw"]!=null)
			$this->raw_score = $row["s_raw"];
		if(array_key_exists("s_delta", $row) && $row["s_delta"]!=null)
			$this->delta = $row["s_delta"];

		$this->initialized = true;
	}

	public function is_presence_stat(){
		return $this->has_values;
	}

	public function save(){
		//	we are assuming that this has been created already.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	always recalculate
		$this->calculate();

		$sql = "UPDATE presence_stats SET weight = :weight, raw_score = :raw, score = :score, delta = :delta, last_updated = NOW() "
			. " WHERE user = :user AND service = :service AND presence = :presence AND service_stats = :id ";
		return $s->execute($sql, array(
			"user"=>$this->presence->user->uid(),
			"service"=>$this->presence->service(),	
			"presence"=>$this->presence->id(),
			"id"=>$this->id,
			"weight"=>$this->weight,
			"raw"=>$this->raw_score,
			"score"=>$this->score,
			"delta"=>$this->delta
		));
	}

	private function log_weight($old, $new){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$is_up = ($new >= $old);
		$is_down = ($old > $new);
		$delta = $new - $old;

		$s->execute(
			"INSERT INTO service_stats_log (service, service_stats, user, old_value, new_value, up, down, delta, last_updated) "
			. " VALUES (:service, :stat, :user, :old, :new, :up, :down, :delta, NOW())",
			array(
				"service"=>$this->presence->service(),
				"stat"=>$this->id,
				"user"=>$this->presence->user->uid(),
				"old"=>$old,
				"new"=>$new,
				"up"=>$is_up,
				"down"=>$is_down,
				"delta"=>$delta
			)
		);
	}

	public function __call($fn, $args){
		$w = array("id", "name", "indexed", "optional", "format", "weight", "score", "raw_score", "delta", "awf", "last_updated");
		$g = array("id", "name", "indexed", "optional", "format", "score", "delta");
		if(is_null($fn) || !in_array($fn, $w)){ return null; }
		if(!in_array($fn, $g) && count($args)){
			if(in_array($fn, array("weight"))){
				$this->log_weight($this->weight, $args[0]);
			}

			if($fn == "raw_score"){
				$this->delta = $args[0] - $this->raw_score;
				$this->raw_score = $args[0];
			} else {
				$this->$fn = $args[0];
			}
			if(in_array($fn, array("weight"))){
				$this->save();
				$m = PresenceManager::singleton($this->presence->user);
				$m->pull_stats_awf();
			}
			
			if(in_array($fn, array("weight","raw_score"))){
				$this->calculate();
			}
		}
		return $this->$fn;
	}

	public function full_id(){
		//	return the presence name + the stat name + the id.
		return $this->presence->name() . '_' . $this->name . '_' . $this->id;
	}

	private $median = null;
	public function get_median(){
		if($this->median != null){
			return $this->median;
		}
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$sql = "SELECT FLOOR(COUNT(*)/2) AS limiter FROM presence_stats "
			. "WHERE service = " . $this->presence->service()
			. " AND service_stats = " . $this->id
			. " AND user IN (SELECT id FROM user WHERE last_login >= DATE_SUB(NOW(), INTERVAL "
			. $c["loginInterval"] . " DAY))";
		$res = $s->fetch($sql);

		$sql = "SELECT raw_score AS score FROM presence_stats "
			. "WHERE service = " . $this->presence->service()
			. " AND service_stats = " . $this->id
			. " AND user IN (SELECT id FROM user WHERE last_login >= DATE_SUB(NOW(), INTERVAL "
			. $c["loginInterval"] . " DAY)) "
			. "LIMIT " . $res[0]["limiter"] . ",1";

		$res = $s->fetch($sql);
		$this->median = $res[0]["score"];
		return $this->median;
	}

	public function get_awf(){
		if($this->awf != null){
			return $this->awf;
		}

		//	call this instead of in the __call; this way we can pull and cache.
		$manager = PresenceManager::singleton($_SESSION["user"]);
		$this->awf = $manager->get_stat_awf($this->id);
		return $this->awf;
	}

	private $stddev = null;
	public function get_stddev(){
		if($this->stddev != null){
			return $this->stddev;
		}
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$sql = "SELECT STDDEV(ps.raw_score) AS std_dev "
			. "FROM presence_stats ps "
			. "INNER JOIN user u "
		  	. "ON u.id = ps.user "
			. "WHERE ps.service = :service "
		  	. "AND ps.service_stats = :stat "
		  	. "AND u.last_login > DATE_SUB(NOW(), INTERVAL :days DAY)";

		$res = $s->fetch($sql, array(
			"service"=>$this->presence->service(),
			"stat"=>$this->id,
			"days"=>$c["loginInterval"]
		));

		$this->stddev = $res[0]["std_dev"];
		return $this->stddev;
	}

	public function calculate(){
		if($this->indexed){
			$m = PresenceManager::singleton($this->presence->user);
			$this->awf = $m->get_stat_awf($this->id);
			$this->score = $this->awf * $this->raw_score;
		}
	}
}


class Presence {
	//	Note that we do NOT define methods that involve actually communicating
	//	with the service that this presence represents.
	//
	//	All presences should probably override the update() method.
	public $user;

	protected $service;
	protected $id = 1;	//	the default number.
	protected $name;
	protected $account_name;
	protected $order = 10;
	protected $weight = 1;
	protected $stats = array();
	protected $properties = array();
	protected $raw_score = 0;
	protected $score = 0;
	protected $delta = 0;
	protected $hits = 0;
	protected $added_on;
	protected $last_updated;
	protected $last_updated_stamp;
	protected $last_fetch;
	protected $last_fetch_stamp;
	protected $awf;
	protected $last_rank = 0;

	protected $authorization;		//	for use by the presence in question.  Can be anything.
	protected $update_limit_interval = 600;	//	minutes * seconds

	public function __construct($u, $set = null){
		$this->user = $u;
		$this->initialize($set);
	}

	private function _init($set){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$row = $set[0];

		//	get the main properties
		if(array_key_exists("id", $row)){
			$this->service = $row["id"];
		}
		if(array_key_exists("presence", $row) && !is_null($row["presence"])){
			$this->id = $row["presence"];
		}
		
		$this->name = $row["title"];
		if(array_key_exists("hits", $row))
			$this->hits = $row["hits"];
		if(array_key_exists("authorization", $row))
			$this->authorization(unserialize($row["authorization"]));
		$this->limit = $row["limit"];
		$this->limit_unit = $row["limit_unit"];
		if(array_key_exists("sort_order", $row))
			$this->order = $row["sort_order"];
		if(array_key_exists("weight", $row))
			$this->weight = $row["weight"];
		if(array_key_exists("raw_score", $row))
			$this->raw_score = $row["raw_score"];
		if(array_key_exists("score", $row))
			$this->score = $row["score"];
		if(array_key_exists("delta", $row))
			$this->delta = $row["delta"];
		if(array_key_exists("rank", $row))
			$this->last_rank = $row["rank"];
		if(array_key_exists("added_on", $row))
			$this->added_on = $s->convert_date($row["added_on"]);
		if(array_key_exists("last_updated", $row)){
			$this->last_updated_stamp = $row["last_updated"];
			$this->last_updated = $s->convert_date($row["last_updated"]);
		}
		if(array_key_exists("last_fetch", $row)){
			$this->last_fetch_stamp = $row["last_fetch"];
			$this->last_fetch = $s->convert_date($row["last_fetch"]);
		}

		foreach($set as $row){
			$this->add_stat(new PresenceStat($this, $row));
		}

		//	get any properties
		$this->get_properties();
	}

	public function initialize($set = null){
		//	get the info from the database.  We assume here that the user passed to us has already
		//	added this service to their presences.
		if(is_null($set)){
			global $SLIQR_CONFIG;
			$c = $SLIQR_CONFIG;
			$s = Storage::singleton($c);

			//	go get all the info we need from the db.
			$sql = "SELECT DISTINCT s.title, s.limit, s.limit_unit, "
				. "ss.id AS s_id, ss.title AS s_title, ss.indexed, ss.optional, ss.format AS s_format, p.added_on, p.last_updated, "
				. "p.id as presence, p.sort_order, p.weight, p.authorization, p.raw_score, p.score, p.delta, p.rank, p.hits, p.limit AS p_limit, "
				. "ps.weight AS s_weight, ps.raw_score AS s_raw, ps.score AS s_score, ps.delta AS s_delta, p.last_fetch "
				. "FROM (service s "
				. "INNER JOIN service_stats ss "
				. "  ON ss.service = s.id) "
				. "INNER JOIN (presence p "
				. "INNER JOIN presence_stats ps "
				. "  ON ps.user = p.user AND ps.service = p.service AND ps.presence = p.id) "
				. "  ON p.service = s.id AND ps.service_stats = ss.id "
				. "WHERE p.user = :user "
				. " AND s.id = :service "
				. " ORDER BY p.id, ss.sort_order ";
			$res = $s->fetch($sql, array(
				"user" => $this->user->uid(),
				"service" => $this->service
			));

			if(count($res)){
				$this->_init($res);
			}
		} else {
			$this->_init($set);
		}
	}

	private function reset(){
		$id = 1;	//	the default number.
		$name = NULL;
		$account_name = NULL;
		$order = 10;
		$weight = 1;
		$stats = array();
		$properties = array();
		$raw_score = 0;
		$score = 0;
		$delta = 0;
		$hits = 0;
		$last_rank = 0;
		$awf = NULL;
		$added_on;
		$last_updated = NULL;
		$last_updated_stamp = NULL;
		$last_fetch = NULL;
		$last_fetch_stamp = NULL;
	}

	private function log_weight($old, $new){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$is_up = ($new >= $old);
		$is_down = ($old > $new);
		$delta = $new - $old;

		$s->execute(
			"INSERT INTO service_log (service, user, old_weight, new_weight, up, down, delta, last_updated) "
			. " VALUES (:service, :user, :old, :new, :up, :down, :delta, NOW())",
			array(
				"service"=>$this->service,
				"user"=>$this->user->uid(),
				"old"=>$old,
				"new"=>$new,
				"up"=>$is_up,
				"down"=>$is_down,
				"delta"=>$delta
			)
		);
	}

	public function __call($fn, $args){
		$w = array("service", "id", "authorization", "name", "order", "weight", "score", "raw_score", "delta", "added_on", "stamp", "last_updated", "awf", "last_rank", "fetch_stamp", "last_fetch");
		$g = array("service", "id", "name", "added_on", "stamp", "last_updated", "fetch_stamp");
		if(is_null($fn) || !in_array($fn, $w)){ return null; }
		if(!in_array($fn, $g) && count($args)){
			//	FIXME: should we be allowing someone to set the raw_score?
			if(in_array($fn, array("weight","raw_score"))){
				if($fn == "weight"){
					$this->log_weight($this->weight, $args[0]);
				}
				$this->calculate();
			}
			$this->$fn = $args[0];
			if($fn == "last_fetch"){
				$this->last_fetch_stamp = date("Y-m-d H:i:s", $this->last_fetch);
			}
		}
		if($fn != "stamp" && $fn != "fetch_stamp"){
			return $this->$fn;
		} else {
			if($fn == "fetch_stamp"){
				return $this->last_fetch_stamp;
			}
			return $this->last_updated_stamp;
		}
	}

	public function full_id(){
		//	return the presence name + the id.
		return $this->name . '_' . $this->id;
	}

	//	properties
	public function get_property($key){
		if(array_key_exists($key, $this->properties)){
			return $this->properties[$key];
		}
		return null;
	}

	public function get_properties(){
		if(count($this->properties)){
			return $this->properties;
		}

		//	fetch them the first time only.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	this will be a named array
		$sql = "SELECT `key`, `value` FROM presence_properties WHERE user=:user AND service=:service AND presence=:id";
		$res = $s->fetch($sql, array(
			"user"=>$this->user->uid(),
			"service"=>$this->service,
			"id"=>$this->id
		));

		foreach($res as $row){
			$this->properties[$row["key"]] = $row["value"];
		}
		return $this->properties;
	}

	public function set_property($key, $value){
		$this->properties[$key] = $value;
		$this->save();
	}

	public function set_properties($arr, $remove = false){
		//	do a batch set; if $remove, delete all the current properties first.
		if($remove){
			$this->delete_properties();
		}

		//	set the properties.  Use a loop because we don't know if we're resetting the array or not.
		foreach($arr as $key=>$value){
			$this->properties[$key] = $value;
		}
		$this->save();
	}

	public function delete_property($key){
		$this->properties[$key] = NULL;
		unset($this->properties[$key]);
		$this->save();
	}

	public function delete_properties(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$s->execute(
			"DELETE FROM presence_properties WHERE user=:user AND service=:service AND presence=:id",
			array(
				"user"=>$this->user->uid(),
				"service"=>$this->service,
				"id"=>$this->id
			)
		);

		$this->properties = array();
	}

	//	stats functions.
	public function add_stat($stat){
		$this->stats[] = $stat;
	}

	public function get_stat_by_id($id){
		foreach($this->stats as $stat){
			if($stat->id() == $id){
				return $stat;
			}
		}
		return null;
	}

	public function get_stat_by_name($name){
		foreach($this->stats as $stat){
			if(strtolower($stat->name()) == strtolower($name)){
				return $stat;
			}
		}
		return null;
	}

	public function get_indexed_stats(){
		$arr = array();
		foreach($this->stats as $stat){
			if($stat->indexed()){
				$arr[] = $stat;
			}
		}
		return $arr;
	}

	public function get_unindexed_stats(){
		$arr = array();
		/*  TODO: removed for now but keep this around if needed in the future.
		foreach($this->stats as $stat){
			if(!$stat->indexed()){
				$arr[] = $stat;
			}
		}
		 */
		return $arr;
	}

	public function is_subscribed(){
		return !empty($this->authorization);
	}

	public function is_unique($uid){
		//	check to make sure the given UID is unique across the system (service-based).
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	we rely on the idea that for any given service, *one* of the properties is called "uid".
		$sql = "SELECT value FROM presence_properties WHERE service = :service AND key = 'uid' AND value = :uid";
		$res = $s->fetch($sql, array(
			"service" => $this->service,
			"uid" => $uid
		));

		return !(count($res));
	}

	public function is_unique_and_owned($uid){
		//	like is_unique above, but ensures that the returned value is true for the given user.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	we rely on the idea that for any given service, *one* of the properties is called "uid".
		$sql = "SELECT user, value FROM presence_properties WHERE service = :service AND key = 'uid' AND value = :uid";
		$res = $s->fetch($sql, array(
			"service" => $this->service,
			"uid" => $uid
		));

		if(!count($res)){
			return true;
		}
		return ($res[0]["user"] == $this->user->uid());
	}

	public function is_property_unique($prop, $val){
		//	check to see if an arbtrary property is unique across the system.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	we rely on the idea that for any given service, *one* of the properties is called "uid".
		$sql = "SELECT value FROM presence_properties WHERE service = :service AND key = :prop AND value = :val";
		$res = $s->fetch($sql, array(
			"service" => $this->service,
			"prop" => $prop,
			"val" => $val
		));

		return !(count($res));
	}

	public function is_property_unique_and_owned($prop, $val){
		//	check to see if an arbtrary property is unique across the system and owned by the current user.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	we rely on the idea that for any given service, *one* of the properties is called "uid".
		$sql = "SELECT user, value FROM presence_properties WHERE service = :service AND key = :prop AND value = :val";
		$res = $s->fetch($sql, array(
			"service" => $this->service,
			"prop" => $prop,
			"val" => $val
		));

		if(!count($res)){
			return true;
		}
		return ($res[0]["user"] == $this->user->uid());
	}

	public function create(){
		//	call this when creating the presence for the user the first time.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	do a test to see if it's there.
		$sql = "SELECT * FROM presence WHERE user = :user AND service = :service AND id = :id";
		$res = $s->fetch($sql, array("user"=>$this->user->uid(), "service"=>$this->service, "id"=>$this->id));

		if(!count($res)){
			//	do another test to make sure there *isn't* a presence for this already, if this is not a pro user.
			if(!$this->user->is_pro){
				$res = $s->fetch(
					"SELECT * FROM presence WHERE user = :user AND service = :service", 
					array("user"=>$this->user->uid(), "service"=>$this->service)
				);
				if(count($res)){
					throw new Exception('Presence->create: this user is not a pro user and cannot create more than one presence per service.');
					return false;	//	just in case.
				}
			}

			$this->delete_stats();
			$this->delete_presence();

			$params = array(
				"user"=>$this->user->uid(), 
				"service"=>$this->service,
				"id"=>$this->id,
				"token"=>$this->authorization,
				"order"=>$this->order
			);

			//	CREATE the records
			$sql = "INSERT INTO presence (user, service, id, authorization, sort_order, added_on, last_updated) "
				. "VALUES(:user, :service, :id, :token, :order, NOW(), NOW())";
			$s->execute($sql, $params);

			$sql = "INSERT INTO presence_stats (user, service, presence, service_stats, sort_order, last_updated) "
				. " SELECT :user, :service, :id, id, sort_order, NOW() FROM service_stats WHERE service = :service ORDER BY sort_order";
			$s->execute($sql, array("user"=>$this->user->uid(), "service"=>$this->service, "id"=>$this->id));

			//	reinitialize ourselves.
			$this->initialize();
		} else {
			//	TODO/FIXME: should we really just be updating the existing presence, or should we be deleting and then creating?
			$this->save();
		}
	}

	public function save(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	save the stats first, so that we can recalculate ourselves correctly.
		foreach($this->stats AS $stat){
			$stat->save();
		}
		$this->calculate();
		
		//	update the db
		$sql = "UPDATE presence SET weight=:weight, authorization=:token, sort_order=:order, raw_score=:raw, "
			. "score=:score, delta=:delta, rank=:rank, hits=:hits, last_updated = NOW(), last_fetch=:fetch "
			. "WHERE user = :user AND service = :service AND id=:id";
		$a = array(
			"user"=>$this->user->uid(), 
			"service"=>$this->service,
			"id"=>$this->id,
			"weight"=>$this->weight,
			"token"=>$this->authorization,
			"order"=>$this->order,
			"raw"=>$this->raw_score,
			"score"=>$this->score,
			"delta"=>$this->delta,
			"rank"=>$this->last_rank,
			"hits"=>$this->hits,
			"fetch"=>$this->last_fetch_stamp
		);
		$s->execute($sql, $a);

		//	do the properties
		$s->execute(
			"DELETE FROM presence_properties WHERE user=:user AND service=:service AND presence=:id",
			array(
				"user"=>$this->user->uid(),
				"service"=>$this->service,
				"id"=>$this->id
			)
		);

		$sql = "INSERT INTO presence_properties (`user`, `service`, `presence`, `key`, `value`, last_updated) "
			. " VALUES (:user, :service, :presence, :key, :value, NOW())";
		foreach($this->properties as $key=>$value){
			$params = array(
				"user"=>$this->user->uid(),
				"service"=>$this->service,
				"presence"=>$this->id,
				"key"=>$key,
				"value"=>$value
			);

			$s->execute($sql, $params);
		}
	}

	private function delete_stats(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$sql = "DELETE FROM presence_stats WHERE user = :user AND service = :service AND presence=:id";
		$s->execute($sql, array("user"=>$this->user->uid(), "service"=>$this->service, "id"=>$this->id));

		$this->stats = array();
	}

	private function delete_presence(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	DELETE everything first, REPLACE INTO was being goofy.
		$sql = "DELETE FROM presence WHERE user = :user AND service = :service AND id=:id";
		$s->execute($sql, array("user"=>$this->user->uid(), "service"=>$this->service, "id"=>$this->id));
	}

	public function remove(){
		//	remove this presence from the database, and re-initialize it so that it
		//	becomes a service again.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	kill the properties
		$this->delete_properties();

		//	kill the stats
		$this->delete_stats();

		//	kill the presence
		$this->delete_presence();

		//	reset our properties
		$this->reset();

		//	reinitialize ourselves
		$this->initialize();
	}

	private $median = null;
	public function get_median(){
		if($this->median != null){
			return $this->median;
		}
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$sql = "SELECT FLOOR(COUNT(*)/2) AS limiter FROM presence "
			. "WHERE service = " . $this->service
			. " AND user IN (SELECT id FROM user WHERE last_login >= DATE_SUB(NOW(), INTERVAL "
			. $c["loginInterval"] . " DAY))";
		$res = $s->fetch($sql);

		$sql = "SELECT score FROM presence WHERE service = " . $this->service
			. " AND user IN (SELECT id FROM user WHERE last_login >= DATE_SUB(NOW(), INTERVAL "
			. $c["loginInterval"] . " DAY)) "
			. "LIMIT " . $res[0]["limiter"] . ",1";

		$res = $s->fetch($sql);
		if(count($res)){
			$this->median = $res[0]["score"];
			return $this->median;
		} else {
			return 0;	//	fixme: not sure what to do here.
		}
	}

	public function get_awf(){
		if($this->awf != null){
			return $this->awf;
		}

		//	call this instead of in the __call; this way we can pull and cache.
		$manager = PresenceManager::singleton($_SESSION["user"]);
		$this->awf = $manager->get_service_awf($this->service);
		return $this->awf;
	}

	public function calculate(){
		//	Note that this assumes you are logged in and have updated;
		//	do not use this for figuring out existing users to compare against.
		//	New way of calculating.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);
		$stats = $this->get_indexed_stats();
		$count = count($stats);

		//	time to make the donuts.
		$sql_array = array();
		$sql = "SELECT "
			. "(SELECT SUM(ps.raw_score) "
			. "FROM presence_stats ps WHERE ps.service = " . $this->service
			. " AND ps.user = " . $this->user->uid()
			. " AND ps.presence = " . $this->id
			. ") AS raw_score, "
			. "(SELECT ROUND(SUM(a.score)/" . $count . ") FROM (";
		for($i = 0; $i < $count; $i++){
			$m = $stats[$i]->get_median();
			$std = $stats[$i]->get_stddev();
			$awf = $stats[$i]->get_awf();
			$sql_array[] = "SELECT ROUND((LEAST(ps" . $i . ".raw_score, (". $m . "+(" . $std . "*2)))/" . $m . ") * " . $awf . " * 100) AS score "
				. "FROM presence_stats ps" . $i
				. " WHERE ps" . $i . ".service = " . $this->service
				. " AND ps" . $i . ".service_stats = " . $stats[$i]->id()
				. " AND ps" . $i . ".presence = " . $this->id
				. " AND ps" . $i . ".user = " . $this->user->uid();
		}
		$sql .= implode($sql_array, " UNION ");
		$sql .= ") AS a) AS score";

		$res = $s->fetch($sql);
		$score = $res[0]["score"];

		//	store it only if the score has changed.
		if($score != $this->score){
			$this->raw_score = $res[0]["raw_score"];
			$this->delta = $score - $this->score;
			$this->score = $score;
		}
	}

	public function get_percentile(){
		//	get the percentile this score lies within for the trophies.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$sql = "SELECT ROUND(presencePercentile(:service, :user, :id, :days), 1) AS percentile ";
		$res = $s->fetch($sql, array(
			"service"=>$this->service,
			"user"=>$this->user->uid(),
			"id"=>$this->id,
			"days"=>$c["loginInterval"]
		));

		if(count($res)){
			return $res[0]["percentile"];
		}
		return null;
	}

	public function get_rank(){
		//	get the rank and the total for this presence.  $last_rank must be set.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);
		$l = $this->last_rank;

		//	changed to use score, not raw_score
		$sql = "SELECT ROUND(((SELECT score FROM presence WHERE user = " . $this->user->uid() . " AND service = " . $this->service . " AND id = " . $this->id . ") / "
 			. "(SELECT avg(score) AS average FROM presence WHERE service = " . $this->service . " AND user IN (SELECT id FROM user WHERE last_login > DATE_SUB(NOW(), INTERVAL " . $c["loginInterval"] . " DAY))))*100) AS idx, "
			. "(SELECT COUNT(*) FROM presence WHERE service = " . $this->service . ") AS total ";

		$res = $s->fetch($sql);

		$this->last_rank = $res[0]["idx"];
		$this->save();

		return array(
			"rank"=>($res[0]["idx"]!=null)?$res[0]["idx"]:100,
			"total"=>$res[0]["total"],
			"delta"=>$res[0]["idx"] - $l
		);
	}

	public function calculate_tagged($tag){
		//	return the scores based on the passed user tag; do not persist this.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);
		$this->calculate();
		$ret = array(
			"score"=>$this->score,
			"raw_score"=>$this->raw_score,
			"delta"=>$this->delta
		);

		//	get the current tag info.
		//	FIXME: do we need the delta?
		$rank = 0;
		$delta = 0;
		$sql = "SELECT rank, delta FROM user_tag_presence WHERE user = :user AND service = :service AND presence = :presence AND tag = :tag";
		$res = $s->fetch($sql, array(
			"user" => $this->user->uid(),
			"service" => $this->service,
			"presence" => $this->id,
			"tag" => $tag
		));
		if(count($res)){
			$rank = $res[0]["rank"];
			$delta = $res[0]["delta"];	//	pertains to a change in rank, not score.
		} else {
			//	if we got no results we need to insert the tag.
			$sql = "INSERT INTO user_tag_presence (user, service, presence, tag) VALUES (:user, :service, :presence, :tag)";
			$s->execute($sql, array(
				"user" => $this->user->uid(),
				"service" => $this->service,
				"presence" => $this->id,
				"tag" => $tag
			));
		}

		//	calculate it; changed to use score.
		$sql = "SELECT ROUND(((SELECT score FROM presence WHERE user = " . $this->user->uid() . " AND service = " . $this->service . " AND id = " . $this->id . ") / "
			. "(SELECT avg(score) AS average FROM presence WHERE service = " . $this->service 
			. " AND user IN (SELECT u.id FROM user u INNER JOIN user_tag t ON t.user = u.id WHERE u.last_login > DATE_SUB(NOW(), INTERVAL " . $c["loginInterval"] . " DAY) AND t.tag = :tag1))*100)) AS idx, "
			. "(SELECT COUNT(*) FROM presence WHERE service = " . $this->service 
			. " AND user IN (SELECT u.id FROM user u INNER JOIN user_tag t ON t.user = u.id WHERE t.tag = :tag2)) AS total ";
		$res = $s->fetch($sql, array("tag1"=>$tag, "tag2"=>$tag));

		$ret["rank"] = ($res[0]["idx"]!=null)?$res[0]["idx"]:100;
		$ret["index_delta"] = $ret["rank"] - $rank;
		$ret["total"] = $res[0]["total"];

		//	save the info
		$sql = "UPDATE user_tag_presence SET rank = :rank, delta = :delta, last_updated = NOW() WHERE user = :user AND service = :service AND presence = :presence AND tag = :tag";
		$s->execute($sql, array(
			"rank"=>$ret["rank"],
			"delta"=>$ret["index_delta"],
			"user"=>$this->user->uid(),
			"service"=>$this->service,
			"presence" => $this->id,
			"tag"=>$tag
		));

		//	get the percentile.
		$sql = "SELECT ROUND(presencePercentileTagged(:service, :user, :id, :days, :tag), 1) AS percentile ";
		$res = $s->fetch($sql, array(
			"service"=>$this->service,
			"user"=>$this->user->uid(),
			"id"=>$this->id,
			"days"=>$c["loginInterval"],
			"tag"=>$tag
		));
		if(count($res)){
			$ret["percentile"] = $res[0]["percentile"];
		}
		return $ret;
	}


	public function update(){
		//	this NEEDS to be overridden; call parent::save() last.
		$this->save();
	}

	public function generate_exception($info){
		//	override this
		$code = PresenceExceptionCodes::ERROR_UNKNOWN;
		return new Exception(str_replace("<service>", $this->name(), PresenceExceptionCodes::$descriptions[$code]), $code);
	}

	public function get_home_link(){
		// override this
		return null;
	}
}

class PresenceManager {
	private static $instance;

	//	We use this to manage all presences of a user.
	private $user;
	private $presences = array();

	private function __construct(){
		//	prevent construction
	}

	public static function singleton($u){
		if(!isset(self::$instance)){
            $c = __CLASS__;
			self::$instance = new $c;
			self::$instance->user = $u;
			self::$instance->init();
		}
		return self::$instance;
	}

	//	prevent users from being able to clone the instance
    public function __clone(){
        trigger_error('Clone is not allowed.', E_USER_ERROR);
	}

	private function init(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		//	Get all the presences available, including any that a user already has.
		$sql = "SELECT DISTINCT s.id, s.title, s.limit, s.limit_unit, s.sort_order, ss.sort_order AS s_sort_order, "
			. "	ss.id AS s_id, ss.title AS s_title, ss.indexed, ss.optional, ss.format AS s_format, p.added_on, p.last_updated, "
			. "	p.id AS presence, p.sort_order, p.weight, p.authorization, p.raw_score, p.score, p.delta, p.rank, p.hits, p.limit AS p_limit, "
			. "	ps.weight AS s_weight, ps.raw_score AS s_raw, ps.score AS s_score, ps.delta AS s_delta, p.user AS user, p.last_fetch "
			. "FROM (service s "
			. "INNER JOIN service_stats ss "
			. "  ON ss.service = s.id) "
			. "INNER JOIN (presence p "
			. "INNER JOIN presence_stats ps "
			. "  ON ps.user = p.user AND ps.service = p.service) "
			. "  ON p.service = s.id AND ps.service_stats = ss.id "
			. "WHERE p.user = :user "
			. "UNION "
			. "SELECT DISTINCT s.id, s.title, s.limit, s.limit_unit, s.sort_order, ss.sort_order AS s_sort_order, "
			. "	ss.id AS s_id, ss.title AS s_title, ss.indexed, ss.optional, ss.format AS s_format, NULL, NULL, "
			. "	NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, "
			. "	NULL, NULL, NULL, NULL, NULL, NULL "
			. "FROM service s "
			. "INNER JOIN service_stats ss "
			. "  ON ss.service = s.id "
			. "WHERE s.id NOT IN (SELECT service FROM presence WHERE user = :user) "
			. "ORDER BY 15, 5, 6, 9 DESC";

		$res = $s->fetch($sql, array(
			"user" => $this->user->uid()
		));

		$g = NULL;
		$arr = array();
		foreach($res as $row){
			if($row["id"] != $g){
				//	new presence, set it up.
				if(count($arr)){
					$classname = $arr[0]["title"]."Presence";
					include_once(dirname(__FILE__).'/presences/' . $classname . '.php');
					if(class_exists($classname)){
						$this->presences[] = new $classname($this->user, $arr);
					}
					$arr = array();	//	wipe it.
				}
				$g = $row["id"];
			}
			//	push the rows into $arr.
			$arr[] = $row;
		}
		//	last one.
		if(count($arr)){
			$classname = $arr[0]["title"]."Presence";
			include_once(dirname(__FILE__).'/presences/' . $classname . '.php');
			if(class_exists($classname)){
				$this->presences[] = new $classname($this->user, $arr);
			}
		}

		//	get the services.  This will also pull all the awf factors.
		$this->get_services();
	}

	//	awf storage for ranking purposes.
	private $services = array();
	private $stats_awf = array();
	private $services_awf = array();
	public function get_services(){
		//	get a unique list, in order, of services available.  The services returned
		//	are NOT mixed with the user themselves.  They are also cached if need be.
		if(count($this->services)){
			return $this->services;
		}

		if(count($this->presences)){
			//	build this list off unique presences.
			$id = 0;
			foreach($this->presences as $p){
				if($p->service() != $id){
					//	pop it into the services array.
					$this->services[] = $p;
					$id = $p->service();
				}
			}
		} else {
			global $SLIQR_CONFIG;
			$c = $SLIQR_CONFIG;
			$s = Storage::singleton($c);

			$sql = "SELECT DISTINCT s.id, s.title, s.limit, s.limit_unit, s.sort_order, ss.sort_order AS s_sort_order, "
				. "ss.id AS s_id, ss.title AS s_title, ss.indexed, ss.optional "
				. "FROM service s "
				. "INNER JOIN service_stats ss "
				. "  ON ss.service = s.id "
				. "ORDER BY s.sort_order, ss.sort_order, ss.indexed DESC ";
			$res = $s->fetch($sql, array());

			$g = NULL;
			$arr = array();
			foreach($res as $row){
				if($row["id"] != $g){
					//	new presence, set it up.
					if(count($arr)){
						$classname = $arr[0]["title"]."Presence";
						include_once(dirname(__FILE__).'/presences/' . $classname . '.php');
						if(class_exists($classname)){
							$this->services[] = new $classname($this->user, $arr);
						}
						$arr = array();	//	wipe it.
					}
					$g = $row["id"];
				}
				//	push the rows into $arr.
				$arr[] = $row;
			}
			//	last one.
			if(count($arr)){
				$classname = $arr[0]["title"]."Presence";
				include_once(dirname(__FILE__).'/presences/' . $classname . '.php');
				if(class_exists($classname)){
					$this->services[] = new $classname($this->user, $arr);
				}
			}
		}

		//	calculate our awfs
		$this->pull_stats_awf();
		$this->pull_services_awf();
		return $this->services;
	}

	public function pull_stats_awf(){
		//	$s == Storage.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$sql = "SELECT id AS service_stats, title, presenceStatAWF(service, id) AS awf FROM service_stats WHERE indexed = 1";
		$res = $s->fetch($sql);
		$this->stats_awf = array();	//	clear it out.
		foreach($res as $row){
			$this->stats_awf[$row["service_stats"]] = $row["awf"];
		}
	}

	public function pull_services_awf(){
		//	$s == Storage.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$sql = "SELECT id, presenceAWF(id) AS awf FROM service ";
		$res = $s->fetch($sql);
		$this->services_awf = array();	//	clear it out.
		foreach($res as $row){
			$this->services_awf[$row["id"]] = $row["awf"];
		}
	}

	//	the following two functions are really meant for Presence and PresenceStat
	public function get_stats_awf(){
		if(!count($this->services)){
			//	service info is not initialized
			$this->get_services();
		}
		return $this->stats_awf;
	}

	public function get_stat_awf($id){
		$t = $this->get_stats_awf();
		return $t[$id];
	}

	public function get_services_awf(){
		if(!count($this->services)){
			//	service info is not initialized
			$this->get_services();
		}
		return $this->services_awf;
	}

	public function get_service_awf($id){
		$t = $this->get_services_awf();
		return $t[$id];
	}

	public function get_presence($name){
		foreach($this->presences as $presence){
			if(strtolower($presence->name()) == strtolower($name)){
				return $presence;
			}
		}
		return NULL;
	}

	public function get_presence_by_id($id){
		//	$id should take the form of 'name_key'.  If there
		//	is no '_', '_1' is appended and used.
		$key = $id;
		if(!strpos($key, '_')){
			$key .= '_1';
		}
		foreach($this->presences as $presence){
			if(strtolower($presence->full_id()) == strtolower($key)){
				return $presence;
			}
		}
		return NULL;
	}

	private function is_subscribed($presence){
		return $presence->is_subscribed();
	}

	public function get_presences(){
		return array_filter($this->presences, array($this, "is_subscribed"));
	}

	public function reorder($arr){
		//	reorder the user's presences based on something coming from the DnD directory.
		//	$arr is an array of ids acceptible for use by get_presence_by_id.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$newarr = array();
		$ord = 10;
		foreach($arr as $p){
			$tmp = $this->get_presence_by_id($p);
			if($tmp){
				$newarr[] = $tmp;
				$tmp->order($ord);
				$ord += 10;
				$tmp->save();
			}
		}

		$this->presences = $newarr;
		return true;
	}

	public function update($p){
		//	wrapper function to get a presence to update itself.
		$class = "Presence";
		if(!($p instanceof $class)){
			throw new Exception('PresenceManager->update: the passed variable is not a Presence.');
		}

		//	force the update.
		$p->update();
		return $p;
	}

	//	for the user
	public function get_score(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$last_score = $this->user->last_score;

		//	and back to a similar old way.
		$p = $this->get_presences();

		$count = count($p);
		$sql = "SELECT SUM(a.score) AS score FROM (";
		$tmp = array();
		$i = 0;
		foreach($p as $pr){
			$m = $pr->get_median();
			$awf = $pr->get_awf();
			$tmp[] = "SELECT ROUND((p" . $i . ".score/" . $m . ") * " . $awf . " * 100) AS score "
				. "FROM presence p" . $i
				. " WHERE p" . $i . ".service = " . $pr->service()
				. " AND p" . $i . ".user = " . $this->user->uid();
			$i++;
		}
		$sql .= implode(" UNION ", $tmp);
		$sql .= ") AS a";

		$ret = array();
		$res = $s->fetch($sql);
		if(count($res)){
			$this->user->last_score = $res[0]["score"];
			$this->user->save_settings();
		}

		//	get the user's percentile.
		$sql = "SELECT ROUND(userPercentile(:user, :days), 1) AS percentile";
		$res = $s->fetch($sql, array(
			"user" => $this->user->uid(),
			"days" => $c["loginInterval"]
		));

		$ret["score"] = $this->user->last_score;
		$ret["delta"] = $this->user->last_score - $last_score;
		$ret["percentile"] = $res[0]["percentile"];
		return $ret;
	}

	public function get_rank(){
		//	return the user's rank vs the rest of the users in the system,
		//	along with a total and a delta.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$last_rank = $this->user->last_rank;
		$total = 0;

		//	new way of doing things.
		$sql = "SELECT "
			. "(SELECT COUNT(DISTINCT user) FROM presence) AS total, "
			. "ROUND(((SELECT SUM(score) FROM presence WHERE user = :user)/(SELECT AVG(scores) FROM "
			. "(SELECT user, SUM(score) AS scores FROM presence WHERE user IN (SELECT id FROM user WHERE last_login > DATE_SUB(NOW(), INTERVAL ". $c["loginInterval"] ." DAY)) GROUP BY user) AS a))*100) AS rank ";
		
		$res = $s->fetch($sql, array("user"=>$this->user->uid()));
		if(count($res)){
			$this->user->last_rank = $res[0]["rank"];
			$total = $res[0]["total"];
			$this->user->save_settings();
		}

		return array(
			"total"=>$total,
			"rank"=>$this->user->last_rank,
			"delta"=>$this->user->last_rank - $last_rank
		);
	}

	public function calculate_tagged($tag){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$ret = $this->get_score();

		//	get the last rank and delta
		$rank = 0;
		$delta = 0;
		$sql = "SELECT rank, delta FROM user_tag WHERE user = :user AND tag = :tag";
		$res = $s->fetch($sql, array(
			"user" => $this->user->uid(),
			"tag" => $tag
		));
		if(count($res)){
			$rank = $res[0]["rank"];
			$delta = $res[0]["delta"];
		}

		$sql = "SELECT "
			. "(SELECT COUNT(DISTINCT user) FROM presence WHERE user IN (SELECT user FROM user_tag WHERE tag=:tag1)) AS total, "
			. "ROUND((SELECT last_score FROM user WHERE id = :user)"
			. "/(SELECT AVG(u.last_score) FROM user u INNER JOIN user_tag t ON t.user = u.id WHERE t.tag=:tag2)*100) AS rank ";

		$res = $s->fetch($sql, array("user"=>$this->user->uid(), "tag1"=>$tag, "tag2"=>$tag));
		$ret["total"] = $res[0]["total"];
		$ret["rank"] = $res[0]["rank"];
		$ret["index_delta"] = $ret["rank"] - $rank;

		$sql = "UPDATE user_tag SET rank = :rank, delta = :delta, last_updated = NOW() WHERE user = :user AND tag = :tag";
		$s->execute($sql, array(
			"rank"=>$ret["rank"],
			"delta"=>$ret["index_delta"],
			"user"=>$this->user->uid(),
			"tag"=>$tag
		));

		$sql = "SELECT ROUND(userPercentileTagged(:user, :days, :tag), 1) AS percentile ";
		$res = $s->fetch($sql, array(
			"user"=>$this->user->uid(),
			"days"=>$c["loginInterval"],
			"tag"=>$tag
		));

		$ret["percentile"] = $res[0]["percentile"];
		return $ret;
	}

	public function analyze(){
		//	Return an array with the following statistics:
		//	1. Most influential presence (biggest score)
		//	2. Most active presence (biggest delta)
		//	3. Most active ratings on a service
		//	4. Most active ratings on stats in a service
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		$ret = array();
		$max_score = -1;
		$max_delta = -1;

		$p = $this->get_services();
		$count = count($p);
		$sql = "SELECT ";
		$sql2 = "SELECT ";
		$tmp = array();
		$tmp2 = array();
		$i = 0;
		foreach($p as $pr){
			$m = $pr->get_median();
			$awf = $pr->get_awf();
			$tmp[] = "(SELECT ROUND((p" . $i . ".score/" . $m . ") * " . $awf . " * 100) "
				. "FROM presence p" . $i
				. " WHERE p" . $i . ".service = " . $pr->service()
				. " AND p" . $i . ".user = " . $this->user->uid()
				. ") AS " . $pr->name();
			$tmp2[] = "(SELECT SUM(ABS(delta)) FROM presence_stats WHERE service = " . $pr->service()
				. " AND user = " . $this->user->uid()
				. ") AS " . $pr->name();
			$i++;
		}
		$sql .= implode(", ", $tmp);
		$sql2 .= implode(", ", $tmp2);

		$res = $s->fetch($sql);
		if(count($res)){
			foreach($res[0] as $field=>$value){
				if($value > $max_score){
					$max_score = $value;
					$ret["influential"] = $field;
				}
			}
		}

		$res = $s->fetch($sql2);
		if(count($res)){
			foreach($res[0] as $field=>$value){
				if($value > $max_delta){
					$max_delta = $value;
					$ret["active"] = $field;
				}
			}
		}

		//	top 5 signficant changes
		$sql3 =<<<EOM
SELECT service, stat, title, stat_title, COUNT(user) AS users, SUM(delta) AS delta,
  CASE WHEN SUM(delta) >= 0 THEN 'up'
  ELSE 'down' END AS direction
FROM (
SELECT sl.user AS user,
  DATE(sl.last_updated) AS dt,
  s.id AS service, NULL AS stat, s.title AS title, NULL AS stat_title,
  sum(sl.delta) AS delta
FROM service s
INNER JOIN service_log sl
	ON sl.service = s.id
WHERE sl.last_updated >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY sl.user, DATE(sl.last_updated), s.id, s.title
UNION
SELECT sl.user AS user,
  DATE(sl.last_updated) AS dt,
  s.id AS service, ss.id AS stat, s.title AS title, ss.title AS stat_title,
  sum(sl.delta) AS delta
FROM service s
INNER JOIN (service_stats ss
INNER JOIN service_stats_log sl
	ON sl.service = ss.id AND sl.service_stats = ss.id)
  ON ss.service = s.id
WHERE sl.last_updated >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY sl.user, DATE(sl.last_updated), s.id, ss.id, s.title, ss.title
) AS a
GROUP BY service, stat, title, stat_title
ORDER BY users DESC
LIMIT 0,5
EOM;

		$ret["topchanges"] = $s->fetch($sql3);
		return $ret;
	}
}
?>
