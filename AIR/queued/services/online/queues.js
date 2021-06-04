dojo.provide("qd.services.online.queues");
dojo.require("dojo.date.locale");

(function(){
 	var ps = qd.services.parser,
		db = qd.services.data,
		util = qd.services.util,
		storage = qd.services.storage;

	var tags = {
		disc: null,
		instant: null
	};
	function etag(queue, tag){
		if(tag){
			tags[queue] = tag;
		}
		return tags[queue];
	}

	dojo.mixin(qd.services.online.queues, {
		//	summary:
		//		The online-based service for queue information and manipulation.
		paths: {
			GET: {
				"queues/disc/available"		:"//queue/queue_item",
				"queues/disc/saved"			:"//queue/queue_item",
				"at_home"					:"//at_home/at_home_item",
				"queues/instant/available"	:"//queue/queue_item",
				"rental_history/shipped"	:"//rental_history/rental_history_item",
				"rental_history/returned"	:"//rental_history/rental_history_item",
				"rental_history/watched"	:"//rental_history/rental_history_item"
			}
		},
		etag: function(/* String */queue, /* String? */tag){
			//	summary:
			//		Store or retreive the latest etag for the passed queue.
			return etag(queue, tag);	//	String
		},
		clear: function(){
			//	summary:
			//		Clear both the queue cache and the transaction queue from the database.
			db.execute({
				sql: "DELETE FROM QueueCache",
				result: function(data){
					//	don't do anything for now.
				}
			});
			db.execute({
				sql: "DELETE FROM TransactionQueue",
				result: function(data){
					//	don't do anything for now.
				}
			});
		},
		/*=====
		 qd.services.online.queues.fetch.__FetchArgs = function(url, lastUpdated, start, max, result, error){
			//	summary:
			//		Named arguments used for fetching the contents of a queue.
			//	url: String
			//		The partial URL to be used (ex. queues/disc, at_home)
			//	lastUpdated: String?
			//		A UNIX timestamp, in seconds, with when you want to check it from.  Useful for at home notifications.
			//	start: Number?
			//		The index at which to start the fetch.  Defaults to 0.
			//	max: Number?
			//		The maximum number of items to fetch.  Defaults to 500.
			//	result: Function?
			//		The callback function on successful retrieval.
			//	error: Function?
			//		The errback function on failure.
		 }
		 =====*/
		fetch: function(/* qd.services.online.queues.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the queue based on the passed partial URL string.
			var dfd = util.prepare(kwArgs),
				signer = qd.app.authorization;
			
			if(kwArgs.lastUpdated){
				//	convert from date to number.
				kwArgs.lastUpdated = Math.floor(kwArgs.lastUpdated.valueOf()/1000);
			}

			//	always get it from the server, but make sure you cache the queue on the user object
			dojo.xhrGet(dojox.io.OAuth.sign("GET", {
				url: "http://api.netflix.com/users/" + signer.userId + "/" + (kwArgs.url || "queues/disc/available")
					+ "?sort=queue_sequence"
					+ "&start_index=" + (kwArgs.start || 0)
					+ "&max_results=" + (kwArgs.max || 500)
					+ (kwArgs.lastUpdated ? "&updated_min=" + kwArgs.lastUpdated : "")
					+ "&expand=" + encodeURIComponent("discs,episodes,seasons,synopsis,formats"),
				handleAs: "xml",
				load: function(xml, ioArgs){
					var results = [], node, items = xml.evaluate(qd.services.online.queues.paths.GET[(kwArgs.url || "queues/disc/available")], xml);
					var test = xml.getElementsByTagName("etag"), tagq;
					if(test && test.length){
						if(kwArgs.url && kwArgs.url.indexOf("queues/disc")>-1){
							tagq = "disc";
						}
						else if(kwArgs.url && kwArgs.url.indexOf("queues/instant")>-1){
							tagq = "instant";
						}
						if(tagq){
							etag(tagq, test[0].textContent);
						}
					}

					while(node = items.iterateNext()){
						var q = ps.queues.fromXml(node);
						results.push(q);
						qd.services.item(q);
						qd.services.item(q.title);
					}

					//	fire the callback before these titles are pushed into the database.
					dfd.callback(results, ioArgs);
				},
				error: function(err, ioArgs){
					dfd.errback(err, ioArgs);
				}
			}, signer), false);
			return dfd;	//	dojo.Deferred
		},
		//	specific things
		atHome: function(/* qd.services.online.queues.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the user's At Home queue.
			kwArgs = kwArgs || {};
			kwArgs.url = "at_home";
			var dfd = this.fetch(kwArgs);
			dfd.addCallback(function(arr){
				//	cache the big and small images for this.
				dojo.forEach(arr, function(item){
					var art = item.title.art;
					art.large = util.image.url(art.large);
					if(art.large.indexOf("http://")>-1){
						util.image.store(art.large).addCallback(function(){
							art.large = util.image.url(art.large);
						});
					}

					art.small = util.image.url(art.small);
					if(art.small.indexOf("http://")>-1){
						util.image.store(art.small).addCallback(function(){
							art.small = util.image.url(art.small);
						});
					}
				});
			});
			return dfd;	//	dojo.Deferred
		},
		discs: function(/* qd.services.online.queues.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the user's disc queue.
			kwArgs = kwArgs || {};
			kwArgs.url = "queues/disc/available";
			var dfd = this.fetch(kwArgs);
			return dfd;	//	dojo.Deferred
		},
		saved: function(/* qd.services.online.queues.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the user's saved discs.
			kwArgs = kwArgs || {};
			kwArgs.url = "queues/disc/saved";
			var dfd = this.fetch(kwArgs);
			return dfd;	//	dojo.Deferred
		},
		instant: function(/* qd.services.online.queues.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the user's instant queue.
			kwArgs = kwArgs || {};
			kwArgs.url = "queues/instant/available";
			var dfd = this.fetch(kwArgs);
			return dfd;	//	dojo.Deferred
		},
		watched: function(/* qd.services.online.queues.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the user's instant watched queue.
			kwArgs = kwArgs || {};
			kwArgs.url = "rental_history/watched";
			var dfd = this.fetch(kwArgs);
			return dfd;	//	dojo.Deferred
		},
		shipped: function(/* qd.services.online.queues.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the user's shipped disc history.
			kwArgs = kwArgs || {};
			kwArgs.url = "rental_history/shipped";
			var dfd = this.fetch(kwArgs);
			return dfd;	//	dojo.Deferred
		},
		returned: function(/* qd.services.online.queues.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the user's returned disc history.
			kwArgs = kwArgs || {};
			kwArgs.url = "rental_history/returned";
			var dfd = this.fetch(kwArgs);
			return dfd;	//	dojo.Deferred
		},

		/*=====
		 qd.services.online.queues.modify.__ModifyArgs = function(url, guid, title, format, position, result, error){
			//	summary:
			//		Named arguments used for fetching the contents of a queue.
			//	url: String
			//		The partial url (see fetch) of the queue to be adding the item to.
			//	guid: String
			//		The full id of the queue item to be added or moved.
			//	title: String
			//		The title/name of the item being altered.
			//	format: String?
			//		The desired format of the item to be added.  Defaults to user's preferences.
			//	position: Number?
			//		The desired position of the item in the queue.  Do not pass if adding an item.
			//	result: Function?
			//		The callback function on successful retrieval.
			//	error: Function?
			//		The errback function on failure.
		 }
		 =====*/
		modify: function(/* qd.services.online.queues.add.__ModifyArgs */kwArgs){
			//	summary:
			//		Add or move an item in a queue.  Note that for the online
			//		version, we can ignore the passed title.
			var dfd = util.prepare(kwArgs),
				signer = qd.app.authorization;

			var tagq = kwArgs.url.indexOf("instant")>-1 ? "instant" : "disc";
			var content = {
				title_ref: kwArgs.guid,
				etag: etag(tagq)
			};
			if(kwArgs.format){ content.format = kwArgs.format; }
			if(kwArgs.position){ content.position = kwArgs.position; }

			//	build the query string and append it.
			var qs = [];
			for(var p in content){
				qs.push(p + "=" + encodeURIComponent(content[p]));
			}

			var args = dojox.io.OAuth.sign("POST", {
				url: "http://api.netflix.com/users/" + signer.userId + "/" + (kwArgs.url || "queues/disc")
					+ "?" + qs.join("&"),
				handleAs: "xml",
				load: function(xml, ioArgs){
					var o = ps.status.fromXml(xml.documentElement);
					if(o.etag){ etag(tagq, o.etag); }
					dfd.callback(o, ioArgs);
				},
				error: function(err, ioArgs){
					console.warn("qd.service.queues.modify: an error occurred.", err.status.results.message);
					dfd.errback(err, ioArgs);
				}
			}, signer);
			dojo.xhrPost(args);
			return dfd;	//	dojo.Deferred
		},
		/*=====
		 qd.services.online.queues.remove.__RemoveArgs = function(url, guid, title, result, error){
			//	summary:
			//		Named arguments used for fetching the contents of a queue.
			//	url: String
			//		The partial URL of the queue to be modified, i.e. queues/disc/available.
			//	guid: String
			//		The partial id (after the userId) of the queue item to be removed.
			//	title: String
			//		The title/name of the item being removed.
			//	result: Function?
			//		The callback function on successful retrieval.
			//	error: Function?
			//		The errback function on failure.
		 }
		 =====*/
		remove: function(/* qd.services.online.queues.remove.__RemoveArgs */kwArgs){
			//	summary:
			//		Remove an item from the queue.  We can ignore the title here,
			//		since we are online.
			// API NOTE:
			//		Remove by ID not GUID. EX: 404309
			var dfd = util.prepare(kwArgs),
				signer = qd.app.authorization;

			var tagq = kwArgs.url.indexOf("instant")>-1 ? "instant":"disc";
			dojo.xhrDelete(dojox.io.OAuth.sign("DELETE", {
				url: "http://api.netflix.com/users/" + signer.userId + "/" + kwArgs.url + "/" + kwArgs.guid + "?etag=" + etag(tagq),
				handleAs: "xml",
				load: function(xml, ioArgs){
					var o = ps.status.fromXml(xml.documentElement);
					if(o.etag){ etag(tagq, o.etag); }
					dfd.callback(o, ioArgs);

					//	go fetch a new etag
					qd.service.queues[tagq=="instant"?"instant":"discs"]({ max: 1 });
				},
				error: function(err, ioArgs){
					dfd.errback(err, ioArgs);
				}
			}, signer));
			return dfd;	//	dojo.Deferred
		},
		cache: function(/* String */queue, /* Array */list){
			//	summary:
			//		Cache the current state of the queue.
	//		if(queue == "history") { return; }
			var map = dojo.map(list, function(listItem){
				//	strip out the useless stuff.
				var item = dojo.clone(listItem.item);
				if("detailsStr" in item){ delete item.detailsStr; }
				if("genreStr" in item){ delete item.genreStr; }
				if("instantStr" in item){ delete item.instantStr; }
				if("returnedStr" in item){ delete item.returnedStr; }
				if("starRatingEnabledStr" in item){ delete item.starRatingEnabledStr; }
				return item;
			});
			setTimeout(function(){
				db.execute({
					sql: "REPLACE INTO QueueCache (queue, json, lastUpdated) VALUES (:queue, :json, DATETIME())",
					params: {
						queue: queue,
						json: dojo.toJson(map)
					}
				});
			}, 500);
		},
		//	stubs to prevent any kind of Function Not Defined errors.
		addMovieById: function(){ return; },
		addMovieByTerm: function(){ return; }
	});
})();
