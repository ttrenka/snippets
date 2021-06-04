<?php
include_once("../config.php");
include_once("../Storage.php");
include_once("../SPSupportSetup.php");

//	a test to make sure the redmine plugin is working.
$s = Storage::singleton($CONFIG);

$sp = new SPSupportSetup($CONFIG["redmineUrl"], $CONFIG["redmineKey"]);
$data = array(
	"name" => "Test again Revised database",
	"name_first" => "Thomas",
	"name_last" => "Trenka",
	"email" => "ttrenka24@sitepen.com",
	"password" => "foobarbaz",
	"support_time" => 24,
	"support_plan" => "Boost",
	"support_start" => '2009-10-20',
	"support_end" => '2009-11-20'	
);

/*
$sp->mail_check_url($CONFIG["redmineMailCheckUrl"]);
$sp->mail_check_key($CONFIG["redmineMailCheckKey"]);
 */
$sp->mail_check_url("https://support-test.sitepen.com/support_staging/external_mail_check.php");
$sp->mail_check_key("staging");

$test = $sp->mail_exists("kkk@adss.com");
echo $test;
exit();


$result = $sp->create($data);

/*
echo "<pre>";
echo var_dump($result);
echo "</pre>";
//	*/

if(!array_key_exists("errors", $result)){
	//	just for the purposes of this test, hard-code the invoice number.
	$invoice = 4991;

	//	ok, store it in the db.
	$sql = "INSERT INTO invoice_supportproject (invoice, project_id, project_name, created_on, updated_on, project_url) "
		. "VALUES (:invoice, :id, :name, :created, :updated, :url)";
	$params = array(
		"invoice" => $invoice,
		"id"=>$result["member"]["project"]["id"],
		"name"=>$result["member"]["project"]["name"],
		"created"=>$result["member"]["project"]["created_on"],
		"updated"=>$result["member"]["project"]["updated_on"],
		"url"=>$result["url"]
	);
	$s->execute($sql, $params);

	//	for shit's and giggles, let's see if the update works.
	$data["project_id"] = $result["member"]["project"]["id"];
	$data["description"] = "This is a description for the updated project.";
	$data["support_time"] = 16;	//	cut the hours.

	$result = $sp->update($data);
	//	NOTE that we don't care about the return at this point, outside of trying to detect errors.
//*
echo "<pre>";
echo var_dump($result);
echo "</pre>";
//	*/

} else {
	//	display the error(s).
	echo '<h2>There were errors creating the Redmine project:</h2>';
	foreach($result["errors"] as $e){
		echo '<div>'.$e.'</div>';
	}
}
?>
