dojo.provide("qd.services.online.feeds");

(function(){
	var util = qd.services.util,
		ps = qd.services.parser,
		db = qd.services.data;

	var rssFeeds = {
		top25: [],
		top100: null,
		newReleases: null
	};
	var top25Feeds = [], top100Feed, newReleasesFeed;
	var feedlistInit = function(){
		db.fetch({
			sql: "SELECT id, term, lastUpdated, isInstant, feed, xml FROM GenreFeed ORDER BY term",
			result: function(data, result){
				dojo.forEach(data, function(item){
					if(item.feed.indexOf("Top100RSS")>-1){
						rssFeeds.top100 = item;
					} else if(item.feed.indexOf("NewReleasesRSS")>-1){
						rssFeeds.newReleases = item;
					} else {
						rssFeeds.top25.push(item);
					}
				});
			}
		});
	};
	if(db.initialized){
		feedlistInit();
	} else {
		var h = dojo.connect(db, "onInitialize", function(){
			dojo.disconnect(h);
			feedlistInit();
		});
	}

	function getFeedObject(url){
		if(url == rssFeeds.top100.feed){ return rssFeeds.top100; }
		if(url == rssFeeds.newReleases.feed){ return rssFeeds.newReleases; }
		for(var i=0; i<rssFeeds.top25.length; i++){
			if(url == rssFeeds.top25[i].feed){
				return rssFeeds.top25[i];
			}
		}
		return null;
	}

	dojo.mixin(qd.services.online.feeds, {
		//	summary:
		//		The online-based service for handling Netflix's public RSS feeds.
		list: function(){
			//	summary:
			//		Return the list of Top 25 RSS feeds.
			return rssFeeds.top25;	//	Object[]
		},
		top100: function(){
			//	summary:
			//		Return the top 100 feed object.
			return rssFeeds.top100;	//	Object
		},
		newReleases: function(){
			//	summary:
			//		Return the New Releases feed object.
			return rssFeeds.newReleases;	//	Object
		},
		/*=====
		qd.services.online.feeds.fetch.__FetchArgs = function(url, result, error){
			//	summary:
			//		Keyword object for getting the contents of an RSS feed.
			//	url: String
			//		The URL of the feed to fetch.
			//	result: Function?
			//		The callback to be fired when the RSS feed has been fetched and parsed.
			//	error: Function?
			//		The errback function to be fired if there is an error during the course of the fetch.
		}
		=====*/
		fetch: function(/* qd.services.online.feeds.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the feed at the url in the feed object, and
			//		store/cache the feed when returned.
			var dfd = util.prepare(kwArgs), feed=getFeedObject(kwArgs.url);
			dojo.xhrGet({
				url: kwArgs.url,
				handleAs: "xml",
				load: function(xml, ioArgs){
					var node, parsed = [], items = xml.evaluate("//channel/item", xml);
					while(node = items.iterateNext()){
						parsed.push(ps.titles.fromRss(node));
					}

					//	pre and post-process the results (image caching)
					qd.services.online.process(parsed, dfd);

					//	push the xml doc into the database
					var sql = "UPDATE GenreFeed SET LastUpdated = DATETIME(), xml=:xml WHERE id=:id ";
					db.execute({
						sql: sql,
						params:{
							id: feed.id,
							xml: new XMLSerializer().serializeToString(xml).replace(/'/g, "''")
						},
						result: function(data){
							//	console.log("Stored the feed ("+feed.term+")");
						}
					});
				},
				error: function(err, ioArgs){
					dfd.errback(new Error("qd.service.feeds.fetch: an error occurred when trying to get " + kwArgs.url));
				}
			});
			return dfd;	//	dojo.Deferred
		}
	});
})();
