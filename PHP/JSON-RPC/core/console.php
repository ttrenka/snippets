<?php
include_once(dirname(__FILE__)."/../config.php");

class console {
	//	LOG, INFO, WARN, DEBUG, ERROR
	private static $the_log = array();
	private static $instance;
	private function __construct(){ }

	public static function singleton(){
        if(!isset(self::$instance)) {
            $c = __CLASS__;
			self::$instance = new $c;
        }
        return self::$instance;
	}

	private static function add($type, $args){
		//	the private function that does the actual logging.
		$a = array();
		foreach($args as $value){
			$a[] = json_encode($value);
		}
		self::$the_log[] = $type . ':' . implode(',', $a);
	}

	//	public functions
	public static function log(){
		$args = func_get_args();
		self::add("log", $args);
	}
	public static function info(){
		$args = func_get_args();
		self::add("info", $args);
	}
	public static function warn(){
		$args = func_get_args();
		self::add("warn", $args);
	}
	public static function debug(){
		$args = func_get_args();
		self::add("debug", $args);
	}
	public static function error(){
		$args = func_get_args();
		self::add("error", $args);
	}

	public static function clear(){
		self::$the_log = array();
	}

	public static function render(){
		global $SLIQR_CONFIG;
		if(array_key_exists("isDebug", $SLIQR_CONFIG) && $SLIQR_CONFIG["isDebug"]){
			$s = '<script type="text/javascript">'."\n"
				. "console.warn('--- BEGIN PHP CONSOLE MESSAGES ------------');\n";
			foreach(self::$the_log as $value){
				$s .= 'console.' . substr($value, 0, strpos($value, ":")) . '(' . substr($value, strpos($value, ":")+1) . ");\n";
			}
			$s .= "console.warn('--- END PHP CONSOLE MESSAGES ------------');\n"
				. "</script>\n";
			print $s;
		}
	}
}
?>
