dojo.provide("qd.services.parser");
dojo.require("dojo.date.locale");

(function(){
 	//	summary:
	//		A set of objects used to parse any XML returned by the Netflix API.
	var util = qd.services.util;
	
	//	TITLES
	var baseTitle = {
		guid: null,
		rentalHistoryGuid: null,
		atHomeGuid: null,
		recommendationGuid: null,
		ratingGuid: null,
		type: null,
		title: null,
		art:{
			small: null,
			medium: null,
			large: null
		},
		releaseYear: null,
		runTime: null,
		rating: null,
		synopsis: null,
		ratings:{ average:null, predicted:null, user:null },
		categories: [],
		bonusMaterials: [],
		awards: {
			nominee:[],
			winner:[]
		},
		formats:{ },
		screenFormats: [],
		cast: [],
		directors: [],
		series: {},
		season: {},
		similars: [],
		audio: {},
		dates: {
			updated: null,
			availability: null
		},
		discs: [],
		episodes: [],
		fullDetail: false
	};
	
	//	Parse helpers.
	function parseAwards(nl){
		var ret = [];
		for(var i=0,l=nl.length; i<l; i++){
			var n = nl[i];
			var tmp = {
				year: n.getAttribute("year")
			};
			var c = n.childNodes;
			for(var j=0, jl=c.length; j<jl; j++){
				var cn = c[j];
				if(cn.nodeType==1){
					if(cn.tagName=="category"){
						tmp.scheme = cn.getAttribute("scheme");
						tmp.term = cn.getAttribute("term");
					}
					else if(cn.tagName=="link"){
						var guid = cn.getAttribute("href");
						tmp.person = {
							guid: guid,
							id: guid.substr(guid.lastIndexOf("/")+1),
							title: cn.getAttribute("title")
						};
					}
				}
			}
			ret.push(tmp);
		}
		return ret;
	}

	function parseFormats(nl){
		var ret = {};
		for(var i=0, l=nl.length; i<l; i++){
			var available = nl[i].getAttribute("available_from");
			var d = parseInt(available+"000", 10);
			var n = nl[i].getElementsByTagName("category")[0];
			if(n){
				ret[n.getAttribute("term")] = (available)?new Date(d):null;
			}
		}
		return ret;
	}

	function parseDate(tenDijitStr){
		return dojo.date.locale.format(new Date(Number(tenDijitStr+"000")), {selector:"date", datePattern:"MM/dd/yy"});
	}

	function parseScreenFormats(nl){
		var ret = [];
		for(var i=0, l=nl.length; i<l; i++){
			var categories = nl[i].getElementsByTagName("category"),
				info = { title:"", screen:"" };
			for(var j=0, jl=categories.length; j<jl; j++){
				var c = categories[j];
				if(c.getAttribute("scheme").indexOf("title")>-1){
					info.title = c.getAttribute("term");
				} else {
					info.screen = c.getAttribute("term");
				}
			}
			ret.push(info);
		}
		return ret;
	}

	function parseLinks(nl){
		var ret = [];
		for(var i=0, l=nl.length; i<l; i++){
			var guid = nl[i].getAttribute("href");
			ret.push({
				guid: guid,
				title: nl[i].getAttribute("title")
			});
		}
		return ret;
	}

	function parseAudio(nl){
		var ret = {};
		for(var i=0, l=nl.length; i<l; i++){
			var node = nl[i], tfnode;
			for(var j=0; j<node.childNodes.length; j++){
				if(node.childNodes[j].nodeType != 1){ continue; }
				tfnode = node.childNodes[j];
				break;
			}

			var tf = tfnode.getAttribute("term");
			ret[tf]={ };
			for(var j=0; j<tfnode.childNodes.length; j++){
				if(tfnode.childNodes[j].nodeType != 1){ continue; }
				var lnode = tfnode.childNodes[j], 
					tmp = [], 
					lang = tfnode.childNodes[j].getAttribute("term");

				for(var k=0; k<lnode.childNodes.length; k++){
					if(lnode.childNodes[k].nodeType != 1){ continue; }
					tmp.push(lnode.childNodes[k].getAttribute("term"));
				}
				ret[tf][lang] = tmp;
			}
		}
		return ret;
	}
	
	// public functions
	var p = qd.services.parser;
	p.titles = {
		//	summary:
		//		The XML parser for any title information (movie, TV show, etc.)
		fromRss: function(/* XmlNode */node, /* Object? */obj){
			//	summary:
			//		Parse basic movie information from the passed RSS element.
			var o = dojo.clone(baseTitle);
			for(var i=0, l=node.childNodes.length; i<l; i++){
				var n=node.childNodes[i];
				if(n.nodeType != 1){ continue; }	//	ignore non-elements
				switch(n.tagName){
					case "title":
						var pieces = dojo.trim(n.textContent).match(/^\d+-\s(.*)$/);
						o.title = pieces ? pieces[1]: dojo.trim(n.textContent);
						break;
					case "guid":
						/*
						//	TODO: TV series/seasons detection.
						var guid = dojo.trim(n.textContent);
						//	swap out their ID for the real one.
						o.id = guid.substr(guid.lastIndexOf("/")+1);
						o.guid = "http://api.netflix.com/catalog/titles/movies/" + o.id;
						*/
						break;
					case "description":
						var pieces = dojo.trim(n.textContent).match(/<img src="([^"]+)".*<br>([^$]*)/);
						if(pieces){
							o.art.small = pieces[1].replace("/small/", "/tiny/");
							o.art.medium = pieces[1];
							o.art.large = pieces[1].replace("/small/", "/large/");
							o.synopsis = util.clean(pieces[2]);
						}
						break;
				}
			}
			if(obj){
				o = util.mixin(obj, o);
			}
			return o;	//	Object
		},
		fromXml: function(/* XmlNode */node, /* Object?*/obj){
			//	summary:
			//		Parse the returned title information from the passed XmlNode.
			var o = dojo.clone(baseTitle);

			var links = node.ownerDocument.evaluate("./link", node),
				info = node.ownerDocument.evaluate("./*[name()!='link']", node),
				currentNode;
			
			while(currentNode = info.iterateNext()){
				switch(currentNode.tagName){
					case "id":
						//	need to fork this a little because of "other" ids that are
						//	possibly passed by Netflix.
						var test = currentNode.parentNode.tagName,
							value = dojo.trim(currentNode.textContent);
						if(test == "ratings_item"){
							o.ratingGuid = value;
						}
					   	else if(test == "rental_history_item"){
							o.rentalHistoryGuid = value;
						}
						else if(test == "at_home_item"){
							o.atHomeGuid = value;
						}
						else if(test == "recommendation"){
							o.recommendationGuid = value;
						}
						else {
							o.guid = value;
						}
						break;
					case "title":
						o.title = currentNode.getAttribute("regular");
						break;
					case "box_art":
						o.art = {
							small: currentNode.getAttribute("small"),
							medium: currentNode.getAttribute("medium"),
							large: currentNode.getAttribute("large")
						};
						break;
					case "release_year":
						o.releaseYear = dojo.trim(currentNode.textContent);
						break;
					case "runtime":
						o.runTime = parseInt(dojo.trim(currentNode.textContent), 10)/60;
						break;
					case "category":
						var scheme = currentNode.getAttribute("scheme");
						scheme = scheme.substr(scheme.lastIndexOf("/")+1);
						if(scheme == "mpaa_ratings" || scheme == "tv_ratings"){
							o.rating = currentNode.getAttribute("term");
						}
						else if (scheme == "genres"){
							o.categories.push(currentNode.getAttribute("term"));
						}
						break;
					case "user_rating":
						var val = currentNode.getAttribute("value");
						if(val == "not_interested"){
							o.ratings.user = val;
						}else{
							o.ratings.user = parseFloat(dojo.trim(currentNode.textContent), 10);
						}
						break;
					case "predicted_rating":
						o.ratings.predicted = parseFloat(dojo.trim(currentNode.textContent), 10);
						break;
					case "average_rating":
						o.ratings.average = parseFloat(dojo.trim(currentNode.textContent), 10);
						break;
					case "availability_date":
						o.dates.availability = parseDate(currentNode.textContent);
						break;
					case "updated":
						o.dates.updated = parseDate(currentNode.textContent);
						break;
				}
			}

			//	do the links now.
			while(currentNode = links.iterateNext()){
				var type = currentNode.getAttribute("title"),
					rel = currentNode.getAttribute("rel");
				switch(rel){
					case "http://schemas.netflix.com/catalog/titles/synopsis":
						o.synopsis = util.clean(dojo.trim(currentNode.textContent));
						break;
					case "http://schemas.netflix.com/catalog/titles/awards":
						o.awards.nominee=parseAwards(currentNode.getElementsByTagName("award_nominee"));
						o.awards.winner=parseAwards(currentNode.getElementsByTagName("award_winner"));
						break;
					case "http://schemas.netflix.com/catalog/titles/format_availability":
						var nodes = currentNode.getElementsByTagName("availability");
						if(nodes && nodes.length){
							o.formats = parseFormats(nodes);
						} 
						break;
					case "http://schemas.netflix.com/catalog/titles/screen_formats":
						o.screenFormats = parseScreenFormats(currentNode.getElementsByTagName("screen_format"));
						break;
					case "http://schemas.netflix.com/catalog/people.cast":
						o.cast = parseLinks(currentNode.getElementsByTagName("link"));
						break;
					case "http://schemas.netflix.com/catalog/people.directors":
						o.directors = parseLinks(currentNode.getElementsByTagName("link"));
						break;
					case "http://schemas.netflix.com/catalog/titles/languages_and_audio":
						o.audio = parseAudio(currentNode.getElementsByTagName("language_audio_format"));
						break;
					case "http://schemas.netflix.com/catalog/titles.similars":
						o.similars = parseLinks(currentNode.getElementsByTagName("link"));
						break;
					case "http://schemas.netflix.com/catalog/titles/bonus_materials":
						o.bonusMaterials = parseLinks(currentNode.getElementsByTagName("link"));
						break;
					case "http://schemas.netflix.com/catalog/titles/official_url":
						break;
					case "http://schemas.netflix.com/catalog/title":
						o.guid = currentNode.getAttribute("href");
						o.title = type;
						break;
					case "http://schemas.netflix.com/catalog/titles.series":
						o.series = {
							guid: currentNode.getAttribute("href"),
							title: type
						};
						break;
					case "http://schemas.netflix.com/catalog/titles.season":
						o.season = {
							guid: currentNode.getAttribute("href"),
							title: type
						};
						break;
					case "http://schemas.netflix.com/catalog/titles.discs":
						dojo.query("link", currentNode).forEach(function(disc){
							o.discs.push({
								guid: disc.getAttribute("href"),
								title: disc.getAttribute("title")
							});
						});
						break;
					case "http://schemas.netflix.com/catalog/titles.programs":
						dojo.query("link", currentNode).forEach(function(episode){
							o.episodes.push({
								guid: episode.getAttribute("href"),
								title: episode.getAttribute("title")
							});
						});
						break;
				}
			}

			if(obj){
				o = util.mixin(obj, o);
			}
			this.setType(o);
			o.fullDetail = true;	//	we have the full details now, so mark it as such.
			return o;	//	Object
		},
		
		setType: function(/* Object */o){
			//	summary:
			//		Post-process a parsed title to set a type on it.
			if(o.guid.indexOf("discs")>-1){
				o.type = "disc";
			}
			else if (o.guid.indexOf("programs")>-1){
				o.type = "episode";
			}
			else if (o.guid.indexOf("series")>-1){
				if(o.guid.indexOf("seasons")>-1){
					o.type = "season";
				} else {
					o.type = "series";
				}
			}
			else {
				o.type = "movie";	//	generic
			}
		}
	};

	p.queues = {
		//	summary:
		//		The XML parser for queue information (discs, instant, saved, rental history)
		fromXml: function(/* XmlNode */node, /* Object? */obj){
			//	summary:
			//		Parse the returned XML into an object to be used by the application.
			
			//	object representing a queue item.  Note that the title info is
			//	deliberately limited.
			var item = {
				queue: "/queues/disc",
				guid: null,
				id: null,
				position: null,
				availability: null,
				updated: null,
				shipped: null,
				watched: null,
				estimatedArrival: null,
				returned: null,
				viewed: null,
				format: null,
				title: {
					guid: null,
					title: null
				}
			};

			var info = node.ownerDocument.evaluate("./*", node), currentNode;
			while(currentNode = info.iterateNext()){
				switch(currentNode.tagName){
					case "id":
						item.guid = dojo.trim(currentNode.textContent);
						item.id = item.guid;
						var l = item.guid.split("/");
						l.pop();	//	pull the id off
						item.queue = l.slice(5).join("/");
						break;
					case "position":
						item.position = parseInt(currentNode.textContent, 10);
						break;
					case "category":
						var scheme = currentNode.getAttribute("scheme");
						if(scheme == "http://api.netflix.com/categories/queue_availability"){
							item.availability = dojo.trim(currentNode.textContent);
						}
						else if(scheme == "http://api.netflix.com/categories/title_formats"){
							item.format = currentNode.getAttribute("term");
						}
						break;
					case "updated":
						item.updated = parseDate(currentNode.textContent);
						break;
					case "shipped_date":
						item.shipped = parseDate(currentNode.textContent);
						break;
					case "watched_date":
						item.watched = parseDate(currentNode.textContent);
						break;
					case "estimated_arrival_date":
						item.estimatedArrival = parseDate(currentNode.textContent);
						break;
					case "returned_date":
						item.returned = parseDate(currentNode.textContent);
					case "viewed_time":
						item.viewed = currentNode.textContent;
						break;
					case "link":
						//	we only care about the title this represents.
						var rel = currentNode.getAttribute("rel");
						if(rel == "http://schemas.netflix.com/catalog/title"){
							//	use the title parser on the main node here for basic info.
							//	Note that it is up to the calling code to merge this title's
							//	info with any existing info.
							item.title = p.titles.fromXml(node);
						}
						else if(rel == "http://schemas.netflix.com/queues.available"){
							//	we do this here because for the available queues, Netflix embeds
							//	the position in the guid.
							var l = currentNode.getAttribute("href");
							//	redo the id
							item.id = l + "/" + item.guid.substr(item.guid.lastIndexOf("/")+1);
						}
						break;
				}
			}

			if(obj){
				item = util.mixin(obj, item);
			}
			return item;	//	Object
		}
	};

	p.users = {
		//	summary:
		//		The XML parser for any user information
		fromXml: function(/* XmlNode */node, /* Object? */obj){
			//	summary:
			//		Return a user object from the passed xml node.
			var user = {
				name: { first: null, last: null },
				userId: null,
				canInstantWatch: false,
				preferredFormats: []
			};

			//	ignore the links included for now.
			var info = node.ownerDocument.evaluate("./*[name()!='link']", node), currentNode;
			while(currentNode = info.iterateNext()){
				switch(currentNode.tagName){
					case "user_id":
						user.userId = dojo.trim(currentNode.textContent);
						break;
					case "first_name":
						user.name.first = dojo.trim(currentNode.textContent);
						break;
					case "last_name":
						user.name.last = dojo.trim(currentNode.textContent);
						break;
					case "can_instant_watch":
						user.canInstantWatch = dojo.trim(currentNode.textContent)=="true";
						break;
					case "preferred_formats":
						dojo.query("category", currentNode).forEach(function(item){
							user.preferredFormats.push(item.getAttribute("term"));
						});
						break;
				}
			}

			if(obj){
				obj = util.mixin(obj, user);
			}
			return user;	//	Object
		}
	};

	p.people = {
		//	summary:
		//		The XML parser for any information on a person (actors, directors, etc.)
		fromXml: function(/* XmlNode */node, /* Object? */obj){
			//	summary:
			//		Parse the information out of the passed XmlNode for people.
			var person = {
				id: null,
				name: null,
				bio: null,
				filmography: null
			};

			var info = node.ownerDocument.evaluate("./name()", node), currentNode;
			while(currentNode = info.iterateNext()){
				switch(currentNode.tagName){
					case "id":
					case "name":
					case "bio":
						person[currentNode.tagName] = util.clean(dojo.trim(currentNode.textContent));
						break;
					case "link":
						//	ignore the alternate link
						if(currentNode.getAttribute("rel") == "http://schemas.netflix.com/catalog/titles.filmography"){
							person.filmography = currentNode.getAttribute("href");
						}
						break;
				}
			}

			if(obj){
				person = util.mixin(obj, person);
			}
			return person;	//	Object
		}
	};

	p.status = {
		//	summary:
		//		The XML parser for any status-based updates (modifying a queue, ratings, etc.)
		fromXml: function(/* XmlNode */node){
			//	summary:
			//		Parse the status info out of the passed node.
			var obj = {};
			for(var i=0, l=node.childNodes.length; i<l; i++){
				var item = node.childNodes[i];
				if(item.nodeType == 1){
					switch(item.tagName){
						case "status_code":
							obj.code = dojo.trim(item.textContent);
							break;
						case "sub_code":
							obj.subcode = dojo.trim(item.textContent);
							break;
						case "message":
						case "etag":
							obj[item.tagName] = dojo.trim(item.textContent);
							break;
						case "resources_created":
							obj.created = dojo.query("queue_item", item).map(function(n){
								return p.queues.fromXml(n);
							});
							break;
						case "failed_title_refs":
							obj.failed = dojo.query("link", item).map(function(n){
								return {
									guid: n.getAttribute("href"),
									title: n.getAttribute("title")
								};
							});
							break;
						case "already_in_queue":
							obj.inQueue = dojo.query("link", item).map(function(n){
								return {
									guid: n.getAttribute("href"),
									title: n.getAttribute("title")
								};
							});
							break;
					}
				}
			}
			return obj;	//	Object
		}
	};
})();
