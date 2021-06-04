<?php

$RPC_CONFIG = array(
	// Human-readable description of the project
	"appName" => "Sliqr RPC Services",

	// API endpoint
	"url" => "http://sliqr.local/rpc"
);

require("core/core.php");
require("core/Presence.php");
require("RequestBroker.php");

global $broker;
$broker->debugLevel(RequestBroker::LOG_DEBUG);
$broker->rpcDebugLevel(RequestBroker::LOG_DEBUG);
$broker->baseUrl("/rpc");
$broker->service_dir("services");
$broker->run();

?>
