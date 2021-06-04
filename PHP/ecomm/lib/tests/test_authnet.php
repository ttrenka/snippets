<?php
$start = microtime(true);

include_once("../config.php");
include_once("../Storage.php");
include_once("../SPInvoicing.php");
include_once("../AuthorizeNet.php");

echo<<<EOM
<html>
<head>
<title>Auth.net test</title>
</head>
<body>
EOM;

//	we are going to post a fake transaction to Auth.net and inspect the results with this.
$s = storage::singleton($CONFIG);

//	create a customer.
$c = new Customer();
$c->set(array(
	"company"=>"SitePen, Inc.",
	"password"=>"foobarbaz",
	"address"=>array(
		"address1"=>"530 Lytton Avenue",
		"address2"=>"2nd Floor",
		"city"=>"Palo Alto",
		"region"=>"CA",
		"country"=>"US",
		"postalcode"=>"94301"	
	),
	"contact"=> array(
		"name_first"=>"Dylan",
		"name_last"=>"Schiemann",
		"phone"=>"(650) 968-8787 x110",
		"email"=>"dylan@sitepen.com"
	)
));
$c->save($s);
$products  = new Products($s);

$i = new Invoice();
$i->set(array(
	"customer"=>1,
	"company"=>"SitePen, Inc.",
	"address"=>array(
		"address1"=>"530 Lytton Avenue",
		"address2"=>"2nd Floor",
		"city"=>"Palo Alto",
		"region"=>"CA",
		"country"=>"US",
		"postalcode"=>"94301"	
	),
	"contact"=> array(
		"name_first"=>"Dylan",
		"name_last"=>"Schiemann",
		"phone"=>"(650) 968-8787 x110",
		"email"=>"ttrenka@sitepen.com"
	),
	"billing_address"=>array(
		"address1"=>"530 Lytton Avenue",
		"address2"=>"2nd Floor",
		"city"=>"Palo Alto",
		"region"=>"CA",
		"country"=>"US",
		"postalcode"=>"94301"	
	)
));
$item1 = new InvoiceSupportItem();
$item1->product($products->item(0));
$i->add($item1);
$i->save($s);

$credit_card = new CreditCard("4007000000027", "112010", "VISA");
$authnet = new AuthorizeNetTransaction($CONFIG["authNetUser"], $CONFIG["authNetTransKey"]);

//	the following URL is for testing against a developer account.
$authnet->url("https://test.authorize.net/gateway/transact.dll");

//	the following URL gives you a variable dump back from authorize.net.
//	$authnet->url("https://developer.authorize.net/param_dump.asp");

$success = $authnet->process($i, $credit_card);
echo "The transaction was successful? " . $success . "<br><br>";

//	always save the result.
$res = $authnet->result();
$res->save($s);
if($success){
	$i->transaction_id($res->transaction_id());
	$i->transaction_state("SUCCESS");
	$i->save($s);
}

echo<<<EOM
</body>
</html>
EOM;
?>
