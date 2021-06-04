<?php
//	AddressFormatter
//	Version 1.0 TRT
//	2009-11-08
//
//	Loads a JSON data file that specifies address formatting for specific countries,
//	and returns an ordered array containing the correct ordering of address elements.

class AddressFormatter {
	private static $instance;
	private function __construct(){ 
	}

	//	the converted JSON data.
	private static $data = array();
	private static $def_format = '{{POSTALCODE}} {{CITY}}';

	public static function singleton($path){
		//	$path is the include path to the JSON data file.
		if(!isset(self::$instance)){
			$c = __CLASS__;
			self::$instance = new $c;
			$s = file_get_contents($path);
			if($s !== false){
				$data = json_decode($s, true);
				if($data){
					self::$data = $data;
				}
			}
		}
		return self::$instance;
	}

	//	public functions
	public function format($arr){
		//	will use the country property of the address
		$addr = array();
		$format = self::$def_format;
		$country = $arr["country"];
		if(array_key_exists("countries", self::$data)){
			//	go get the country
			if(array_key_exists($arr["country"], self::$data["countries"])){
				$c = self::$data["countries"][$arr["country"]];
			}
			if(isset($c)){
				if(array_key_exists("format", $c)){
					$format = $c["format"];
				}
				$country = $c["name"];
			}
		}

		//	do the actual address.
		$addr[] = $arr["address1"];
		if(isset($arr["address2"]) && strlen($arr["address2"])){
			$addr[] = $arr["address2"];
		}
		if(isset($arr["address3"]) && strlen($arr["address3"])){
			$addr[] = $arr["address3"];
		}

		//	now the format.
		$tmp = str_replace('{{CITY}}', $arr["city"], $format);
		$tmp = str_replace('{{REGION}}', $arr["region"], $tmp);
		$tmp = str_replace('{{POSTALCODE}}', $arr["postalcode"], $tmp);
		$tmp = explode('{{LF}}', $tmp);
		$addr = array_merge($addr, $tmp);
		$addr[] = $country;

		return $addr;
	}

	public function get_countries(){
		$arr = array();
		foreach(self::$data["countries"] as $key=>$value){
			$arr[$key] = $value["name"];
		}
		return $arr;
	}

	public function has_regions($country){
		if(array_key_exists("countries", self::$data)){
			$countries = self::$data["countries"];
			if(array_key_exists($country, $countries)){
				//	see if there's any regions listed.
				$c = $countries[$country];
				if(array_key_exists("regions", $c)){
					return true;
				}
			}
		}
		return false;
	}

	public function get_regions($country){
		//	get a list of states/provinces/wards if it's available in the passed country.
		//	country should be the ISO code (used for array indexing).
		if(array_key_exists("countries", self::$data)){
			$countries = self::$data["countries"];
			if(array_key_exists($country, $countries)){
				//	see if there's any regions listed.
				$c = $countries[$country];
				if(array_key_exists("regions", $c)){
					return $c["regions"];
				}
			}
			return array();	//	didn't find it.
		} else {
			throw new Exception("AddressFormatter data is missing.");
		}
	}
}
?>
