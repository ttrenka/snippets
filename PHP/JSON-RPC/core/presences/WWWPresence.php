<?php

require_once(dirname(__FILE__)."/../Presence.php");
require_once(dirname(__FILE__)."/../OAuthService.php");

//	helper functions
function _cmp_entries($a, $b){
	if($a["year"] == $b["year"]){
		if($a["month"] == $b["month"]){
			return 0;
		}
		return ($a["month"] > $b["month"]) ? 1 : -1;
	}
	return ($a["year"] > $b["year"]) ? 1 : -1;
}
function _hostname_map($entry){
	return $entry["hostname"];
}


class WWWPresence extends Presence {
	private $base_url = "https://www.google.com";
	private $request_token_url = '/accounts/OAuthGetRequestToken';
	private $authorize_url = '/accounts/OAuthAuthorizeToken';
	private $access_token_url = '/accounts/OAuthGetAccessToken';

	private $scope = 'https://www.google.com/analytics/feeds/';
	private $profiles = 'https://www.google.com/analytics/feeds/accounts/default/';
	private $feed = 'https://www.google.com/analytics/feeds/data';
	private $fbProperty = "FeedburnerURL";
	private $fb_base_url = "http://feeds.feedburner.com/";
	private $fb_url = "https://feedburner.google.com/api/awareness/1.0/GetFeedData";

	private $fb_errors = array(																			//	FeedBurner error codes.
		"An unknown error occured.  Please try again later.",														// 0 (doesn't exist.)
		"FeedBurner could not find your feed.",																		// 1
		"The FeedBurner feed you have added to this presence does not have the Awareness API enabled.",				// 2
		"Could not find the requested item in the FeedBurner feed.",												// 3
		"Apparently the data asked for is restricted, and you need to have a FeedBurner Pro Account to access it.",	// 4
		"The URL for the FeedBurner feed asked for was not found.",													// 5
		"The date range parameter(s) asked for is malformed."														// 6
	);

	public function generate_exception($info){
		//	take the execption object passed and generate something sliqr-friendly.
		//	$info should be the ioArgs returned from OAuth.
		if(array_key_exists("error", $info["raw"])){
			$code = PresenceExceptionCodes::CANT_AUTHENTICATE;
		} else {
			switch($info["status"]){
				case "401":{
					$code = PresenceExceptionCodes::CANT_AUTHENTICATE;
					break;
				}
				case "500":
				case "501":
				case "502": {
					$code = PresenceExceptionCodes::SERVER_DOWN;
					break;
				}
				case "503": 
				case "403":
				case "400": {
					$code = PresenceExceptionCodes::API_LIMIT_REACHED;
					break;
				}
				default: {
					$code = PresenceExceptionCodes::ERROR_UNKNOWN;
				}
			}
		}

		$desc = str_replace("<service>", $this->name(), PresenceExceptionCodes::$descriptions[$code]);
		if($code == PresenceExceptionCodes::CANT_AUTHENTICATE){
			$url = $this->get_auth_url();
			$desc = str_replace("edit your settings", '<a href="' . $url . '">re-authorize ' . $this->name() . ' </a>', $desc);
		}
		return new Exception($desc, $code);
	}

	public function __construct($u, $set = null){
		$this->service = 4;
		parent::__construct($u, $set);
	}

	//	override some of the parent class methods.
	public function get_indexed_stats(){
		$arr = array();
		foreach($this->stats as $stat){
			if($stat->indexed()){
				//	the following is hardcoded to deal with Feedburner.
				if($stat->name() == "Subscribers"){
					//	check for the Feedburner URL in our properties.
					$prop = $this->get_properties();
					if(array_key_exists($this->fbProperty, $prop)){
						//	if this exists it means the user entered a Feedburner URL and the stat should be enabled.
						$arr[] = $stat;
					}
				} else {
					$arr[] = $stat;
				}
			}
		}
		return $arr;
	}

	public function has_feedburner(){
		return array_key_exists($this->fbProperty, $this->properties);
	}

	public function get_feedburner_text(){
		//	define it here and not in presence.php.
		$str =<<<EOM
<div id="feedburnerLinkPrompt">
	<strong style="font-weight:bold;">Add a <img src="/img/feedburner.png" alt="FeedBurner" /><a id="feedburnerShowLink" href="#">FeedBurner feed</a> to this presence...</strong>
	<div id="feedburnerForm" style="display:none;">
		<table>
			<tr>
				<td valign="top" style="padding-top:0.3em; padding-left:0;">http://feeds.feedburner.com/</td>
				<td valign="top">
					<input type="text" id="feedburnerUrlInput" value="" />
					<div class="feedburnerHelpText">
						Please make sure you've enabled the <a href="http://feedburner.google.com/fb/a/myfeeds" class="extern">Awareness API</a> and your feed domain matches your Google Analytics domain.
					</div>
				</td>
				<td valign="top" style="font-size:0.85em;padding-top:0.35em;padding-left:0.5em;" nowrap="true">
					<div id="feedburnerActions">
						<a id="btnAddFeedburnerFeed" href="#">Add Feed</a>
						&#8226;
						<a id="btnCancelFeedburnerFeed" href="#">Cancel</a>
					</div>
					<div id="feedburnerLoader" style="display:none;">
						<img src="/img/loader_sm.gif" border="0" />
					</div>
				</td>
			</tr>
		</table>
		<div style="padding-left:1em;padding-top:1em;font-weight:bold;">
			To sign up for FeedBurner or set up your account, <a href="http://feedburner.com" class="extern">click here</a>.
		</div>
	</div>
</div>
<script type="text/javascript">
	dojo.addOnLoad(function(){
		var opened = false;
		var toggle = function(){
			if(!opened){
				dojo.byId("feedburnerForm").style.display = "block";
				opened = true;
			} else {
				dojo.byId("feedburnerForm").style.display = "none";
				dojo.byId("feedburnerUrlInput").value = "";
				var t = dojo.byId("feedburnerErrorBox");
				if(t){ t.parentNode.removeChild(t); }
				opened = false;
			}
		};
		dojo.byId("feedburnerShowLink").onclick = function(){
			toggle();
			return false;
		};

		dojo.byId("btnCancelFeedburnerFeed").onclick = function(){
			toggle();
			return false;
		};


		//	the real work.
		var doFeedAdd = function(){
			dojo.byId("feedburnerActions").style.display = "none";
			dojo.byId("feedburnerLoader").style.display = "block";

			//	checking and adding the feedburner feed!
			var url = dojo.byId("feedburnerUrlInput").value;
			rpc.users.addFeedburner(url).addCallback(function(ret){
				var id = '{$this->full_id()}';
				rpc.users.updatePresence(id).addCallbacks(
					function(result){
						dojo.byId("feedburnerActions").style.display = "block";
						dojo.byId("feedburnerLoader").style.display = "none";

						//	kill any error box
						var t = dojo.byId("feedburnerErrorBox");
						if(t){
							dojo.destroy(t);
						}

						var row = dojo.byId("feedburnerRow");
						//	row.style.display = "none";
						var nl = dojo.query("td div.feedburnerPrompt", row);
						if(nl.length){
							var div = nl[0];
							div.innerHTML = '<strong style="font-weight:bold;">Current feed data via <img src="/img/feedburner.png" alt="FeedBurner" />FeedBurner</strong>';
						}

						var n = row.nextSibling;
						while(n && n.nodeType != 1){ n = n.nextSibling; }
						n.style.display = "";

						//	TODO: allow for using either the score delta or the index delta
						var n = sliqr.app.directory.presenceById(id);
						if(n && result.score && result.score.delta !== undefined){
							//	set the delta
							n.delta(result.score.delta);
						}

						//	check to see if we're on a presence page; if so, update the scores.
						var nl = dojo.query(".presencePage");
						if(nl.length){
							//	get the id on the body tag.
							var pageId = dojo.attr(dojo.body(), "id");
							if(id.toLowerCase().indexOf(pageId) > -1){
								sliqr.app.updateScores(result);
								sliqr.app.refreshStats(id);
							}
						}
					},
					function(error){
						//	don't care for now.
						console.warn(error);
						dojo.byId("feedburnerActions").style.display = "block";
						dojo.byId("feedburnerLoader").style.display = "none";
					}
				);
			}).addErrback(function(err){
				console.warn("Feedburner feed error: ", err);

				//	set up the error box within the main div here.
				//	hide the loader anyways.
				dojo.byId("feedburnerActions").style.display = "block";
				dojo.byId("feedburnerLoader").style.display = "none";

				var row = dojo.byId("feedburnerRow");
				//	row.style.display = "none";
				var nl = dojo.query("td div.feedburnerPrompt", row);
				if(nl.length){
					var td = nl[0].parentNode;

					var t = dojo.byId("feedburnerErrorBox");
					if(!t){
						var div = document.createElement("div");
						div.id = "feedburnerErrorBox";
						div.innerHTML = err.message;
						div.className = "error";
						div.style.marginTop = "1.5em";

						//	insert the error box
						dojo.place(div, td, "first");
					} else {
						t.innerHTML = err.message;
					}
				}
				dojo.byId("feedburnerUrlInput").value = "";
			});
			return false;
		};
		dojo.byId("btnAddFeedburnerFeed").onclick = doFeedAdd;
		dojo.connect(dojo.byId("feedburnerUrlInput"), "onkeydown", function(e){
			if(e.keyCode == dojo.keys.ENTER){
				doFeedAdd();
			}
		});
	});
</script>
EOM;
		return $str;
	}

	public function check_feedburner_domain($url){
		//	get the feedburner feed given, check the domain against the host list.
		$http = new HttpService();
		$r = $http->GET($this->fb_base_url . $url);

		$matches = array();
		preg_match('/\<link\>([^<]*)\<\/link\>/', $r["response"], $matches);
		$host = "";
		if(count($matches)){
			$host = trim(preg_replace("/http(s)?:\/\//", "", $matches[1]));
		}

		if(strlen($host)){
			//	get our list of hosts
			$hosts = explode(",", $this->get_property("hosts"));
			return in_array($host, $hosts);
		}
		return false;
	}

	public function set_feedburner_url($url){
		$this->set_property($this->fbProperty, $url);
	}

	private function parse_entries($response){
		$d = new DOMDocument();
		$d->loadXML($response);

		$xpath = new DOMXPath($d);
		$xpath->registerNamespace("atom", "http://www.w3.org/2005/Atom"); 
		$xpath->registerNamespace("openSearch", "http://a9.com/-/spec/opensearchrss/1.0/"); 
		$xpath->registerNamespace("dxp", "http://schemas.google.com/analytics/2009"); 
		$xpath->registerNamespace("gd", "http://schemas.google.com/g/2005"); 
		$entries = $xpath->query('//atom:feed/atom:entry');

		$ret = array();
		foreach($entries as $entry){
			$nodes = $entry->getElementsByTagName("*");
			$obj = array();
			foreach($nodes as $node){
				switch($node->tagName){
					case "dxp:property":
					case "dxp:dimension":{
						$obj[str_replace("ga:", "", $node->getAttribute("name"))] = $node->getAttribute("value");
						break;
					}
				case "dxp:metric":{
						$value = $node->getAttribute("value");
						$type = $node->getAttribute("type");
						if($type == "integer" || $type == "time"){
							$value += 0;	//	ugly-casting.
						}
						$obj[str_replace("ga:", "", $node->getAttribute("name"))] = $value;
						break;
					}
					case "dxp:tableId":{
						$obj["tableId"] = $node->nodeValue;
						break;
					}
					case "link":{ break; }
					default:{
						$obj[$node->tagName] = $node->nodeValue;
						break;
					}
				}
			}
			$ret[] = $obj;
		}
		return $ret;
	}

	private function parse_awareness($str){
		$d = new DOMDocument();
		$d->loadXML($str);

		$xpath = new DOMXPath($d);
		$entries = $xpath->query("//feed/entry");
		if($entries->length){
			$arr = array();
			foreach($entries as $entry){
				$obj = array();
				$obj["date"] = $entry->getAttribute("date");
				$obj["subscribers"] = 0 + $entry->getAttribute("circulation");
				$obj["hits"] = 0 + $entry->getAttribute("hits");
				$obj["reach"] = 0 + $entry->getAttribute("reach");

				//	parse out the date.
				$tmp = explode("-", $entry->getAttribute("date"));
				$obj["year"] = 0 + $tmp[0];
				$obj["month"] = 0 + $tmp[1];
				$obj["day"] = 0 + $tmp[2];

				$arr[] = $obj;
			}
			usort($arr, "_cmp_entries");
			return $arr;
		} else {
			//	check to make sure the stat is ok.
			$stat = $d->documentElement->getAttribute("stat");
			if($stat != "ok"){
				//	grab the error code and the message
				$errs = $xpath->query("//err");
				$ret = array();
				foreach($errs as $err){
					$ret[] = array(
						"code"=>$err->getAttribute("code"),
						"message"=>$err->getAttribute("msg")
					);
				}
				return $ret;
			} else {
				return array();	//	empty
			}
		}
	}

	public function get_profiles(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;

		$oauth = new OAuthService(
			$c["google"]["key"], 
			$c["google"]["secret"],
			$this->authorization->key,
			$this->authorization->secret
		);

		$r = $oauth->GET($this->profiles);
		return $this->parse_entries($r["response"]);
	}

	public function set_profile($profile){
		$this->set_properties(array(
			"uid"=>$profile["tableId"],
			"screen_name"=>str_replace("google.com/", "", $profile["title"]),
			"url"=>$profile["id"]
		));

		//	always update when setting a profile.
		$this->update();
	}

	public function update(){
		//	TODO: error handling in the case of an OAuth token not being accepted.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$s = Storage::singleton($c);

		if(time() < strtotime($this->last_fetch_stamp) + $c["refreshLimit"]){
			$code = PresenceExceptionCodes::UPDATE_TOO_SOON;
			throw new Exception(str_replace("<service>", $this->name, PresenceExceptionCodes::$descriptions[$code]), $code);
		}

		//	get the current date info so we can both store and deal with data.
		$sql = "SELECT DAY(NOW()) as day_, MONTH(NOW()) as month_, YEAR(NOW()) as year_, DAY(LAST_DAY(NOW())) as days_in_month";
		$res = $s->fetch($sql);
		$year = $res[0]["year_"];
		$month = $res[0]["month_"];

		$day = $res[0]["day_"];
		if($day == 0) $day = 1;	//	just in case.
		$days_in_month = $res[0]["days_in_month"];
		$factor = $days_in_month / $day;

		//	proper date formats for GETs
		$fixed_month = (strlen($month) == 1) ? "0" . $month : $month;
		$fixed_day = (strlen($day) == 1) ? "0" . $day : $day;
		$start_month = ($month + 1 > 12) ? 1 : $month + 1;
		$start_year = ($month + 1 > 12) ? $year : $year - 1;
		$start = $start_year . "-" . $start_month . "-01";
		$end = $year . "-" . $fixed_month . "-" . $fixed_day;

		//	start fetching the stuff.  We do two fetches: one to get a current list of hostnames, and the other for the actual stats.
		$uid = $this->get_property("uid");	//	tableId.

		$oauth = new OAuthService(
			$c["google"]["key"], 
			$c["google"]["secret"],
			$this->authorization->key,
			$this->authorization->secret
		);

		//	do the domain names first.
		$r = $oauth->GET($this->feed, array(
			"ids"=>$uid,
			"dimensions"=>"ga:year,ga:month,ga:hostname",
			"metrics"=>"ga:pageviews",
			"start-date"=>$start,
			"end-date"=>$end
		));

		//	get something we can easily use.
		$entries = $this->parse_entries($r["response"]);
		usort($entries, "_cmp_entries");

		//	add our host list to our properties
		$hosts = array_unique(array_map("_hostname_map", $entries));
		$this->set_property("hosts", implode(",", $hosts));

		//	todo: run a feedburner check?
		
		//	go get the metrics
		$r = $oauth->GET($this->feed, array(
			"ids"=>$uid,
			"dimensions"=>"ga:year,ga:month",
			"metrics"=>"ga:pageviews,ga:timeOnSite,ga:visits,ga:visitors",
			"start-date"=>$start,
			"end-date"=>$end
		));
		$entries = $this->parse_entries($r["response"]);
		usort($entries, "_cmp_entries");

		//	calculate the stuff.
		$counter = 0;
		$pageViews = 0;
		$timeOnSite = 0;
		$visits = 0;
		$visitors = 0;
		$has_values = false;

		//	Note that we are discounting any months in which there were no visits; it's likely that the tracking hadn't been
		//	set up at that time, and we are looking for a decent way of comparing moving averages.
		foreach($entries as $entry){
			if(!$has_values && $entry["visits"] == 0){ 
				continue;
			} else {
				$has_values = true;
			}
			$counter += 1;
			$visits_fixed = ($entry["visits"] > 0) ? $entry["visits"] : 1;
			if($entry["month"] == $fixed_month && $entry["year"] == $year){
				//	this is the current month, do the basic forecasting.
				$pageViews += ($entry["pageviews"] * $factor);
				$timeOnSite += (($entry["timeOnSite"]/$visits_fixed) * $factor);
				$visits += ($entry["visits"] * $factor);
				$visitors += ($entry["visitors"] * $factor);
			} else {
				//	this is a full month
				$pageViews += $entry["pageviews"];
				$timeOnSite += $entry["timeOnSite"]/$visits_fixed;
				$visits += $entry["visits"];
				$visitors += $entry["visitors"];
			}
		}
		$pageViews /= $counter;
		$timeOnSite /= $counter;
		$visits /= $counter;
		$visitors /= $counter;

		//	check feedburner.
		if(array_key_exists($this->fbProperty, $this->properties)){
			//	go get the feedburner feed.
			$http = new HttpService();
			$r = $http->GET($this->fb_url, null, array(
				"uri"=>$this->get_property($this->fbProperty),
				"dates"=>$start . "," . $end
			));

			//	parse the result.
			$awareness = $this->parse_awareness($r["response"]);
			$ay = 0;
			$am = 0;
			$ad = 0;
			$items = array();
			$sum = 0;
			foreach($awareness as $item){
				if($item["month"] != $am || $item["year"] != $ay){
					//	push the sum into the items array
					$old_ay = $ay;
					$old_am = $am;
					$ay = $item["year"];
					$am = $item["month"];
					if($old_ay != 0){
						$items[$ay . "-" . $am] = $sum;
						$sum = 0;
					}
				}
				$ad = $item["day"];
				$sum += $item["subscribers"];
			}

			//	trailing stuff here.
			if($ad < $days_in_month){
				$sum *= $factor;
			}
			$items[$ay . "-" . $am] = $sum;

			//	now that we've tallied by year/month, get the average.
			$subscribers = 0;
			foreach($items as $item){
				$subscribers += $item;
			}
			$subscribers /= count($items);
		}

		//	now we can do our stat filling in.
		foreach($this->stats as $stat){
			$tmp = 0;
			switch($stat->name()){
				case "Visitors":
					$tmp = $visitors;
					break;
				case "Visits":
					$tmp = $visits;
					break;
				case "Pageviews":
					$tmp = $pageViews;
					break;
				case "Time/Visit":
					//	TODO: this is in SECONDS, and need to figure out a formatter for it.
					$tmp = $timeOnSite;
					break;
				case "Subscribers":
					if(isset($subscribers)){
						$tmp = $subscribers;
					} else {
						$tmp = null;
					}
					break;
			}
			if($tmp != null){
				$stat->raw_score($tmp);
			}
		}

		$this->last_fetch(time());
		$this->save();
	}

	public function get_auth_url(){
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		$oauth = new OAuthService(
			$c["google"]["key"], 
			$c["google"]["secret"]
		);

		$t = $oauth->get_request_token($this->base_url . $this->request_token_url, array( "scope"=>$this->scope ));
		if(session_id()){
			$_SESSION["google_oauth_key"] = $t->key;
			$_SESSION["google_oauth_secret"] = $t->secret;
		} else {
			throw new Exception('WWWPresence->get_auth_url: No session exists to temporarily store the request tokens.');
		}
		return $this->base_url . $this->authorize_url . "?oauth_token=" . $t->key . "&oauth_callback=" . urlencode($c["baseUrl"] . 'addpresence/www');
	}

	public function get_token(){
		//	call this when the user is returning from Google.
		global $SLIQR_CONFIG;
		$c = $SLIQR_CONFIG;
		if(session_id() && array_key_exists("google_oauth_key", $_SESSION)){
			$oauth = new OAuthService(
				$c["google"]["key"], 
				$c["google"]["secret"],
				$_SESSION["google_oauth_key"],
				$_SESSION["google_oauth_secret"]
			);
			$_SESSION["google_oauth_key"] = NULL;
			$_SESSION["google_oauth_secret"] = NULL;
			unset($_SESSION["google_oauth_key"]);
			unset($_SESSION["google_oauth_secret"]);

			//	go get the access token.
			$t = $oauth->get_access_token($this->base_url . $this->access_token_url);
			if($t){
				$this->authorization($t);
				$this->create();
			}
		}
	}

	public function get_home_link(){
		//	TODO
		$lnk = $this->get_property("screen_name");
		return "<a class=\"extern\" href=\"http://{$lnk}\">{$lnk}</a>";
	}
}
?>
