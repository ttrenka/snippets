<?php
/*	core.php
 *	Serves as a simple include to ensure the core
 *	classes are loaded.
 */

include_once(dirname(__FILE__)."/../config.php");
global $SLIQR_CONFIG;
if(!isset($SLIQR_CONFIG)){
	print "<strong>The configuration information necessary for the Sliqr core was not found.</strong><br/>";
	die();
}
//require_once("console.php");
require_once(dirname(__FILE__) . '/../ext/FirePHPCore/fb.php');
require_once("Storage.php");
require_once("User.php");
require_once(dirname(__FILE__) . "/../ext/phpMailer/class.phpmailer.php");

//	set debugging on or off.
$isDebug = false;
if(array_key_exists("isDebug", $SLIQR_CONFIG)){
	$isDebug = $SLIQR_CONFIG["isDebug"];
}
FB::setEnabled($isDebug);

//	Globals for use throughout the app.
global $storage; 
$storage = Storage::singleton($SLIQR_CONFIG);

// Global function for loading a system property from storage
function get_system_property($prop){
	global $SLIQR_CONFIG;
	$c = $SLIQR_CONFIG;
	$s = Storage::singleton($c);
	$sql = "SELECT `value` FROM system_properties WHERE `key` = :property_name";
	$result = $s->fetch($sql, array("property_name"=>$prop));
	return $result[0]["value"];
}

// Global function to set a system property
function set_system_property($prop, $val){
	global $SLIQR_CONFIG;
	$c = $SLIQR_CONFIG;
	$s = Storage::singleton($c);
	$sql = "UPDATE system_properties SET `value` = :value, `last_updated` = NOW() WHERE `key` = :property_name";
	$result = $s->execute($sql, array(
		"property_name"=>$prop,
		"value"=>$val)
	);
}

//	utility functions
function abbreviate($num){
	$n = $num;
	if($n > pow(10, 12)){
		$n = round($n/pow(10, 12), 1) . "T";
	}
	else if ($n > pow(10, 9)){
		$n = round($n/pow(10, 9), 1) . "G";
	}
	else if($n > pow(10, 6)){
		$n = round($n/pow(10, 6), 1) . "M";
	}
	else if ($n > pow(10,3)){
		$n = round($n/pow(10, 3), 1) . "k";
	}
	else {
		$n = round($n);
	}
	return $n;
}

function abbreviateTime($num){
	//	$num is in seconds, so basically we need to figure out the greatest
	//	unit, and convert the number to use it.
	if($num/60 < 1){
		//	show in seconds.
		return round($num, 1) . "sec";
	}
	else if($num/60/60 < 1){
		//	show in minutes
		return round($num/60, 1) . "min";
	}
	else if($num/60/60/24 < 1){
		//	show in hours
		return round($num/60/60, 1) . "hrs";
	}
	else if($num/60/60/24/(365/12) < 1){
		//	show in days
		return round($num/60/60/24, 1) . "days";
	}
	//	screw the rest, show it in months =)
	return round($num/60/60/24/(265/12), 1) . "months";
}
?>
