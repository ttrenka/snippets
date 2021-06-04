<?php
/*	Storage.php
 *	A singleton class to handle any database interaction.  Wraps
 *	the PDO functionality with simple to use methods.
 */
class Storage {
	//////////////////////////////////////////////////////////////
	//	BEGIN SINGLETON SETUP
	//////////////////////////////////////////////////////////////
	private static $instance;
	private function __construct(){
		//	private to prevent direct construction
	}

	//	the singleton pattern
	public static function singleton($config){
        if(!isset(self::$instance)) {
            $c = __CLASS__;
			self::$instance = new $c;
			self::$instance->connect($config["db"], $config["dbUsr"], $config["dbPwd"]);
        }
        return self::$instance;
	}

	//	prevent users from being able to clone the instance
    public function __clone(){
        trigger_error('Clone is not allowed.', E_USER_ERROR);
	}
	//////////////////////////////////////////////////////////////
	//	END SINGLETON SETUP
	//////////////////////////////////////////////////////////////
	
	//////////////////////////////////////////////////////////////
	//	BEGIN FUNCTIONALITY
	//////////////////////////////////////////////////////////////
	private $conn;
	public $last_error;
	public function connect($cstr, $usr, $pwd){
		//	set up the database connection based on the passed string
		try{
			$this->conn = new PDO($cstr, $usr, $pwd);
			/*
			//	turn this on if you want persistent connections (faster app)
			$conn = new PDO($cstr, $usr, $pwd, array(
				PDO::ATTR_PERSISTENT => true
			));
			 */
		} catch(PDOException $ex){
			print "Storage.connect ERROR: " . $ex->getMessage() . "<br/>";
			die();
		}
	}

	private function query($sql, $params){
		if(!isset($this->conn)){
			print "Storage.fetch/execute ERROR: you must connect to the database first.<br/>";
			die();
		}

		$s = $this->conn->prepare($sql);
		if(count($params)){
			foreach($params as $key => $value){
				if(is_null($value)){
					$s->bindValue(":" . $key, $value, PDO::PARAM_NULL);
				}
				else if(is_object($value) || is_array($value)){
					$s->bindValue(":" . $key, serialize($value), PDO::PARAM_STR);
				}
				else if(is_numeric($value)){
					$s->bindValue(":" . $key, $value, PDO::PARAM_INT);
				}
				else if(is_bool($value)){
					$s->bindValue(":" . $key, $value, PDO::PARAM_BOOL);
				}
				else {
					$s->bindValue(":" . $key, $value, PDO::PARAM_STR);
				}
			}
		}
		$s->execute();
		$this->last_error = $s->errorInfo();
		return $s;
	}

	// helper function
	public function convert_date($dt, $direction="php"){
		if($direction=="php"){
			return date_create($dt);
		}
		return date('Y-m-d H:i:s', $dt);
	}

	//	for SELECT statements
	public function fetch($sql, $params=array()){
		//	A NOTE:
		//	You are responsible for deserializing any arrays or objects that may have
		//	been stored.
		$res = $this->query($sql, $params);
		return $res->fetchAll();
	}

	//	for data modification
	public function execute($sql, $params=array()){
		//	A NOTE:
		//	Any objects or arrays passed as params will be automatically serialized;
		//	YOU are responsible for any deserialization when grabbing info from fetch.
		$res = $this->query($sql, $params);
		return $res->rowCount();
	}

	//	wrap the last insert id
	public function id(){
		if(!isset($this->conn)){
			print "Storage.id ERROR: you must connect to the database first.<br/>";
			die();
		}
		return $this->conn->lastInsertId();
	}

	//	transactions
	public function transaction($arr){
		//	pass an array of objects that you'd normally pass
		//	to fetch or execute.
		if(!isset($this->conn)){
			print "Storage.transaction ERROR: you must connect to the database first.<br/>";
			die();
		}

		$this->conn->beginTransaction();
		try {
			foreach($arr as $statement){
				$this->query($statement["sql"], $statement["params"]);
			}
			$this->conn->commit();
		} catch (Exception $ex){
			$this->conn->rollBack();
			print "Storage.transaction ERROR: " . $ex->getMessage() . "<br/>";
			return false;
		}
		return true;
	}
}
?>
