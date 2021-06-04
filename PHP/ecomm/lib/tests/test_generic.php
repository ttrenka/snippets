<?php
	$shipping_name = "THOMAS R TRENKA";
	$name_first = substr($shipping_name, 0, strrpos($shipping_name, " "));
	$name_last = substr($shipping_name, strrpos($shipping_name, " ")+1);
	
	echo "<div>" . $shipping_name . "</div>";
	echo "<div>'" . $name_first . "'</div>";
	echo "<div>'" . $name_last . "'</div>";
?>
