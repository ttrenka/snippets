<?php
$start = microtime(true);

include_once("../config.php");
include_once("../Storage.php");
include_once("../SPInvoicing.php");

include_once("../../invoice.inc");

//	try out the customers.
$s = Storage::singleton($CONFIG);

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

//	customers collection.
$customers = new Customers($s);
if($customers->length()){
	foreach($customers->get() as $customer){
		echo '<div>' . $customer->company() . ' (' . $customer->address()->address1() . ')</div>';
	}
} else {
	echo 'No customers are in the database as of yet.<br>';
}

//	try the load
$c1 = Customer::load(1, $s);
if($c1 != null){
	echo '<div>Customer from load: ' . $c1->company() . ' (' . $c1->address()->address1() . ')</div>';
} else {
	echo "Load failed.<br>";
}

//	add a fake product.
$p = new SupportProduct();
$p->set(array(
	"title" => "New Product",
	"description" => "You'll love it, it's a way of life!",
	"unit_price" => 3999,
	"units" => "Klobars",
	"response_time" => 1,
	"response_time_unit" => "DAY",
	"duration" => 1,
	"duration_unit" => "MONTH",
	"support_time" => 12,
	"support_time_unit" => "HOUR"
));
$p->save($s);

//	products
$products  = new Products($s);
if($products->length()){
	foreach($products->get() as $product){
		echo "<h2>" . $product->title() . "</h2>";
		echo "<div>Price pre unit: " . $product->unit_price() . " " . $product->units() . "</div>";
		if($product instanceof SupportProduct){
			echo "<div>Response time: " . $product->response_time() . " " . $product->response_time_unit() . "</div>";
		}
	}
}

//	ok, let's try out some invoices.
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
		"email"=>"dylan@sitepen.com"
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
$item1->product($products->item(1));
$i->add($item1);

///////////////////////////////////////////
//	IN ORDER TO GET AN INVOICE NUMBER AND
//	DATE, YOU *MUST* SAVE IT FIRST!
///////////////////////////////////////////
$i->save($s);

echo "Invoice #" . $i->id() . " (". $i->invoice_date_formatted() .") was created; total: " . $i->total() . "<br>";
echo get_invoice_html($i, "support", true);


$i1 = Invoice::load(4990, $s);
if($i1 != null){
	echo "<div>Loaded invoice #" . $i1->id() . " (". $i1->invoice_date_formatted() . "); total is " . $i1->total() . "</div>";
} else {
	echo "Invoice could not be loaded.<br><br>";
}

//	try from the hash.
$token = $i->token();
$test = Invoice::loadFromHash($token, $s);
if($test != null){
	$test->items($s, $products);
	echo get_invoice_html($test, "support", true);
	echo "<pre>" . get_invoice_text($test, "support", true) . "</pre>";
} else {
	echo "<div>Hash test failed.</div>";
}

echo "Test took " . round((microtime(true) - $start)*1000, 4) . " ms.<br>";
?>
