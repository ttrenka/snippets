dojo.provide("qd.services.online.titles");

(function(){
	var ps = qd.services.parser,
		db = qd.services.data,
		util = qd.services.util;

	var some = encodeURIComponent("discs,episodes,seasons,synopsis,formats, screen formats"),
		expand = encodeURIComponent("awards,cast,directors,discs,episodes,formats,languages and audio,screen formats,seasons,synopsis");	//	similars

	function saveTitle(item){
		var param = {
			guid: item.guid,
			link: item.guid,
			title: item.title,
			synopsis: item.synopsis,
			rating: item.rating,
			item: dojo.toJson(item)
		};

		db.execute({
			sql: "SELECT json FROM Title WHERE guid=:guid",
			params: {
				guid: item.guid
			},
			result: function(data){
				if(data && data.length){
					//	mix-in the passed json with the stored one.
					item = util.mixin(dojo.fromJson(data[0].json), item);
					param.item = dojo.toJson(item);
				}
				db.execute({
					sql:  "REPLACE INTO Title (guid, link, title, lastUpdated, synopsis, rating, json)"
						+ " VALUES(:guid, :link, :title, DATETIME(), :synopsis, :rating, :item)",
					params: param,
					result: function(data){
						//	don't need this, keeping it for logging purposes.
					},
					error: function(err){
						console.warn("titles.save: ERROR!", error);
					}
				});
			}
		});
	}

	function fetchItem(url, dfd, term){
		var signer = qd.app.authorization;
		dojo.xhrGet(dojox.io.OAuth.sign("GET", {
			url: url,
			handleAs: "xml",
			load: function(xml, ioArgs){
				//	get the right node, parse it, cache it, and callback it.
				var node, items = xml.evaluate((term!==undefined?"//catalog_title":"//ratings/ratings_item"), xml), ob;

				while(node = items.iterateNext()){
					if(term !== undefined){
						var test = node.getElementsByTagName("title");
						if(test.length && test[0].getAttribute("regular") == util.clean(term)){
							ob = ps.titles.fromXml(node);
							break;
						}
					} else {
						ob = ps.titles.fromXml(node);
						break;
					}
				}

				if(ob){
					if(term !== undefined){
						//	hit it again, this time with a guid (so we can get some ratings)
						url = "http://api.netflix.com/users/" + signer.userId + "/ratings/title"
							+ "?title_refs=" + ob.guid
							+ "&expand=" + expand;
						fetchItem(url, dfd);
					} else {
						//	fire off the callback, passing it the returned object.
						qd.services.item(ob);
						qd.services.online.process(ob, dfd);
						saveTitle(ob);
					}
				} else {
					//	in case we don't get an exact term match back from Netflix.
					var e = new Error("No term match from Netflix for " + term);
					e.xml = xml;
					dfd.errback(e, ioArgs);
				}
			},
			error: function(err, ioArgs){
				//	TODO: modify for an invalid signature check.
				var e = new Error(err);
				e.xml = ioArgs.xhr.responseXML;
				dfd.errback(e, ioArgs);
			}
		}, signer), false);
	}

	function batchRatingsFetch(titles, args, ratings){
		//	summary:
		//		Private function to do actual ratings calls.
		var signer = qd.app.authorization,
			refs= [];
		for(var p in titles){
			refs.push(p);
		}

		var url = "http://api.netflix.com/users/" + signer.userId + "/ratings/title"
			+ "?title_refs=" + refs.join(",");
		
		var signedArgs = dojox.io.OAuth.sign("GET", {
			url: url,
			handleAs: "xml",
			load: function(xml, ioArgs){
				//	parse the info, merge and save
				var node, items = xml.evaluate("//ratings/ratings_item", xml), a = [], toSave = [];
				while(node = items.iterateNext()){
					var tmp = ps.titles.fromXml(node), r, title;
					if(!dojo.isString(tmp)){
						r = tmp.ratings,
						title = titles[tmp.guid];
					}
					if(title === undefined || !title || dojo.isString(title)){
						//	for some reason we only have a string.
						title = tmp;
					} else {
						if(r.predicted !== null){ title.ratings.predicted = r.predicted; }
						if(r.user !== null){ title.ratings.user = r.user; }
					}
					a.push(title);
					qd.services.item(title);
					toSave.push(title);
					ratings.push(title);
				}

				args.result.call(args, a, ioArgs);

				dojo.forEach(toSave, function(item){
					saveTitle(item);
				});
			},
			error: function(err, ioArgs){
				console.warn("Batch ratings fetch: ", err);
			}
		}, signer);
		return dojo.xhrGet(signedArgs);
	}

	function encode(s){
		if(!s){ return ""; }
		return encodeURIComponent(s)
			.replace(/\!/g, "%2521")
			.replace(/\*/g, "%252A")
			.replace(/\'/g, "%2527")
			.replace(/\(/g, "%2528")
			.replace(/\)/g, "%2529");
	}

	dojo.mixin(qd.services.online.titles, {
		//	summary:
		//		The online-based service to get any title information, including
		//		ratings and recommendations.
		save: function(/* Object */item){
			//	summary:
			//		Save the passed title to the database.
			saveTitle(item);
		},
		clear: function(){
			//	summary:
			//		Clear all titles out of the database.
			db.execute({
				sql: "DELETE FROM Title",
				result: function(data){
					//	don't do anything for now.
				}
			});
		},
		/*=====
		qd.services.online.titles.find.__FindArgs = function(term, start, max, result, error){
			//	summary:
			//		Arguments object for doing a title search
			//	term: String
			//		The partial title to be looking for.
			//	start: Number?
			//		The page index to start on.  Default is 0.
			//	max: Number?
			//		The maximum number of results to find.  Default is 25 (supplied by Netflix).
			//	result: Function?
			//		The callback function that will be executed when a result is
			//		fetched.
			//	error: Function?
			//		The callback function to be executed if there is an error in fetching.
		}
		=====*/
		find: function(/* qd.services.online.titles.find.__FindArgs */kwArgs){
			//	summary:
			//		Use the Netflix API directly, and try to cache any results as they come.
			var dfd = util.prepare(kwArgs),
				signer = qd.app.authorization;

			var t = encodeURIComponent(util.clean(kwArgs.term));
			if(t.match(/!|\*|\'|\(|\)/g)){
				t = encode(t);
			}
			dojo.xhrGet(dojox.io.OAuth.sign("GET", {
				url: "http://api.netflix.com/catalog/titles?"
					+ "term=" + t
					+ (kwArgs.start && kwArgs.start > 1 ? "&start_index=" + kwArgs.start : "")
					+ (kwArgs.max ? "&max_results=" + kwArgs.max : "")
					+ "&expand=" + some,
				handleAs: "xml",
				load: function(response, ioArgs){
					//	assemble the results and return as an object.
					var n = response.evaluate("/catalog_titles/number_of_results", response).iterateNext(),
						o = {
							number_found: n ? parseInt(dojo.trim(n.textContent), 10) : 0,
							search_term: kwArgs.term,
							results: [],
							sort_by: "Relevance"
						};

					//	parse the movie results.
					var items = response.evaluate("/catalog_titles/catalog_title", response), node, sqls=[];
					while(node = items.iterateNext()){
						var item = ps.titles.fromXml(node);
						item.art.large = util.image.url(item.art.large);
						o.results.push(item);
						qd.services.item(item);
						sqls.push(item);
					}

					//	fire the callback before these titles are pushed into the database.
					dfd.callback(o, ioArgs);

					//	go and execute the saved SQL in the background
					dojo.forEach(sqls, function(item){
						saveTitle(item);
						if(item.art.large && item.art.large.indexOf("http://")>-1){
							util.image.store(item.art.large).addCallback(function(u){
								item.art.large = u;
							});
						}
					});
				},
				error: function(err, ioArgs){
					//	TODO: modify for an invalid signature check.
					var e = new Error(err);
					e.xml = ioArgs.xhr.responseXML;
					dfd.errback(e, ioArgs);
				}
			}, signer));
			return dfd;		//	dojo.Deferred
		},

		/*=====
		qd.services.online.titles.fetch.__FetchArgs = function(term, title, result, error){
			//	summary:
			//		Arguments object for fetching movie details
			//	term: String?
			//		The full title of the Netflix title in question, as provided by the 
			//		Netflix RSS feeds.
			//	guid: String?
			//		The guid of the title in question as passed back by the Netflix servers.
			//	result: Function?
			//		The callback function that will be executed when a result is
			//		fetched.
			//	error: Function?
			//		The callback function to be executed if there is an error in fetching.
		}
		=====*/
		fetch: function(/* qd.services.online.titles.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Retrieve title details from the Netflix API.
			if(!kwArgs.guid && !kwArgs.term){
				throw new Error("qd.services.online.titles.fetch: you must pass either a guid or a term.");
			}

			var dfd = util.prepare(kwArgs);

			//	look to see if the object is in memory first.
			var test;
			if(kwArgs.term){
				test = qd.services.itemByTerm(kwArgs.term);
			} else {
				test = qd.services.item(kwArgs.guid);
			}
			if(test && test.ratings.user !== null && test.synopsis){
				setTimeout(function(){
					dfd.callback(test);
				}, 10);
				return dfd;
			}

			//	Check the cache second.
			var sql = "SELECT * FROM Title WHERE guid=:guid AND json IS NOT NULL";
			var params = { guid: kwArgs.guid };
			if(kwArgs.term){
				sql = "SELECT * FROM Title WHERE title=:term AND json IS NOT NULL";
				params = { term: kwArgs.term };
			}

			var url;
			if(kwArgs.term){
				var t = encodeURIComponent(util.clean(kwArgs.term));
				if(t.match(/!|\*|\'|\(|\)/g)){
					t = encode(t);
				}
				url = "http://api.netflix.com/catalog/titles?"
					+ "term=" + t
					+ "&expand=" + some
					+ "&max_results=24";	//	hardcoded, we want this to be as fast as possible
			} else {
				url = "http://api.netflix.com/users/" + qd.app.authorization.userId + "/ratings/title"
					+ "?title_refs=" + kwArgs.guid
					+ "&expand=" + expand;
			}
			
			db.execute({
				sql: sql,
				params: params,
				result: function(data, result){
					if(data && data.length){
						var title = dojo.fromJson(data[0].json);
						if(title.ratings.user !== null && title.synopsis){
							qd.services.item(title);
							setTimeout(function(){
								dfd.callback(title, result);
							}, 10);
						} else {
							//	get it from Netflix
							fetchItem(url, dfd, kwArgs.term);
						}
					} else {
						//	get it from Netflix
						fetchItem(url, dfd, kwArgs.term);
					}
				}
			});
			return dfd;	//	dojo.Deferred
		},

		/*=====
		qd.services.online.titles.autosuggest.__AutosuggestArgs = function(term, result, error){
			//	summary:
			//		Arguments object for fetching movie details
			//	term: String?
			//		The partial string that an autocomplete should match.
			//	result: Function?
			//		The callback function that will be executed when a result is
			//		fetched.
			//	error: Function?
			//		The callback function to be executed if there is an error in fetching.
		}
		=====*/
		autosuggest: function(/* qd.services.online.titles.autosuggest.__AutosuggestArgs */kwArgs){
			//	summary:
			//		Get the autocomplete terms from Netflix, given the right term.
			var dfd = util.prepare(kwArgs),
				signer = qd.app.authorization;

			dojo.xhrGet(dojox.io.OAuth.sign("GET", {
				url: "http://api.netflix.com/catalog/titles/autocomplete"
					+ "?term=" + encode(kwArgs.term),
				handleAs: "xml",
				load: function(xml, ioArgs){
					var a = [], node, items = xml.evaluate("//@short", xml);
					while(node = items.iterateNext()){
						a.push(node.nodeValue);
					}
					dfd.callback(a, ioArgs);
				},
				error: function(err, ioArgs){
					dfd.errback(err, ioArgs);
				}
			}, signer));

			return dfd;	//	dojo.Deferred
		},

		/*=====
		 qd.services.online.titles.rated.__RatedArgs = function(guids, result, error){
			//	summary:
			//		Named arguments used for fetching the contents of a queue.
			//	guids: Array
			//		The list of guids to get ratings for.
			//	result: Function?
			//		The callback function on successful retrieval.
			//	error: Function?
			//		The errback function on failure.
		 }
		 =====*/
		rated: function(/* qd.services.online.titles.rated.__RatedArgs */kwArgs){
			//	summary:
			//		Fetch ratings info for all of the guids passed in the kwArgs.
			//		Try to do most of this as local as possible, by doing the following:
			//			1. get all the titles from the database.
			//			2. check which ones already have the predicted and actual ratings.
			//			3. assemble a list of titles without that information.
			//			4. fetch those titles from Netflix, and merge with the existing ones.
			//			5. save the titles with new ratings info.
			var dfd = new dojo.Deferred();
			var ratings = [];

			db.fetch({
				sql: "SELECT json FROM Title WHERE guid IN ('" + (kwArgs.guids || []).join("','") + "') ORDER BY title",
				result: function(data){
					var good = [], missing = [], item, tested = {};
					if(data){
						//	run through the data results and see what we really need to go get from Netflix.
						for(var i=0; i<data.length; i++){
							item = dojo.fromJson(data[i].json);
							if(item && item.ratings && item.ratings.user !== null){
								good.push(item);
							} else {
								missing.push(item);
							}
							if(item){
								tested[item.guid] = true;
							}
						}
					} else {
						missing = kwArgs.guids.slice(0);
					}

					//	now double check and make sure that any *not* tested guids are pushed into missing.
					dojo.forEach(kwArgs.guids, function(guid){
						if(!tested[guid]){
							missing.push(guid);
						}
					});

					if(good.length){
						dojo.forEach(good, function(item){
							qd.services.item(item);
						});
						kwArgs.result.call(kwArgs, good);
						ratings = ratings.concat(good);
					}

					if(missing.length){
						//	we have at least one missing title, so let's go get that info from Netflix.
						var chunks = [], limit = 24, position = 0;
						while(position < missing.length){
							var n = Math.min(limit, missing.length - position);
							chunks.push(missing.slice(position, position + n));
							position += n;
						}

						//	start the missing fetches.
						var pos = 0, timer;
						timer = setInterval(function(){
							var chunk = chunks[pos++];
							if(chunk){
								//	pre-process and call the internal function.
								var o = {};
								dojo.forEach(chunk, function(item){
									if(dojo.isString(item)){
										o[item] = item;
									} else {
										o[item.guid] = item;
									}
								});
								batchRatingsFetch(o, kwArgs, ratings);
							} else {
								clearInterval(timer);
								dfd.callback(ratings);
							}
						}, 250);
					} else {
						dfd.callback(ratings);
					}
				}
			});
			return dfd;	//	dojo.Deferred
		},
		/*=====
		qd.services.online.titles.rate.__RateArgs = function(guid, rating, result, error){
			//	summary:
			//		Named arguments object for handling rating a movie.
			//	guid: String
			//		The id of the title to be updated.
			//	rating: String
			//		The new rating for the movie
			//	result: Function?
			//		The callback fired when the rating is completed.
			//	error: Function?
			//		The errback fired in case of an error.
		}
		=====*/
		rate: function(/* qd.services.online.titles.rate.__RateArgs */kwArgs){
			//	summary:
			//		Rate the title as referenced by kwArgs.guid.
			var dfd = util.prepare(kwArgs),
				signer = qd.app.authorization;

			var item = qd.services.item(kwArgs.guid);
			if(!item){
				setTimeout(function(){
					dfd.errback(new Error("qd.service.rate: cannot rate an item with a guid of " + kwArgs.guid));
				}, 10);
				return dfd;	//	dojo.Deferred
			}
			
			//	check to see if this is an update
			var url = "http://api.netflix.com/users/" + signer.userId + "/ratings/title/actual";
			if(item.ratings.user){
				//	this is an update, make sure there's a rating id.
				var args = {
					url: url + "/" + item.guid.substr(item.guid.lastIndexOf("/")+1),
					content: {
						rating: kwArgs.rating,
						method: "PUT"
					},
					handleAs: "xml",
					load: function(xml, ioArgs){
						var s = ps.status.fromXml(xml.documentElement);
						if(s.code == "200"){
							if(kwArgs.rating == "not_interested" || kwArgs.rating == "no_opinion"){
								item.ratings.user = null;
							}else{
								item.ratings.user = kwArgs.rating;
							}
							qd.services.item(item);
							saveTitle(item);
							dfd.callback(kwArgs.rating, ioArgs);
						} else {
							dfd.errback(s);
						}
					},
					error: function(err, ioArgs){
						dfd.errback(err, ioArgs);
					}
				};
				args = dojox.io.OAuth.sign("GET", args, signer);
				dojo.xhrGet(args);
			} else {
				//	this is a new rating.
				var args = {
					url: url
						+ "?title_ref=" + encodeURIComponent(kwArgs.guid)
						+ "&rating=" + kwArgs.rating,
					handleAs: "xml",
					load: function(xml, ioArgs){
						var s = ps.status.fromXml(xml.documentElement);
						if(s.code == "201"){
							if(kwArgs.rating == "not_interested" || kwArgs.rating == "no_opinion"){
								item.ratings.user = null;
							}else{
								item.ratings.user = kwArgs.rating;
							}
							qd.services.item(item);
							saveTitle(item);
							dfd.callback(kwArgs.rating, ioArgs);
						} else {
							dfd.errback(s);
						}
					},
					error: function(err, ioArgs){
						dfd.errback(err, ioArgs);
					}
				};
				args = dojox.io.OAuth.sign("POST", args, signer);
				dojo.xhrPost(args);
			}
			return dfd;	//	dojo.Deferred
		},
		/*=====
		qd.services.titles.online.recommendations.__RecArgs = function(start, max, result, error){
			//	summary:
			//		Keyword arguments to be fed to the recommendations method.
			//	start: Integer?
			//		The starting index to fetch.  Defaults to the Netflix default (0).
			//	max: Integer?
			//		The max number of results to fetch.  Defaults to the Netflix default (25).
			//	result: Function?
			//		The callback to be run when results are returned.
			//	error: Function?
			//		The callback to be run if an error occurs.
		}
		=====*/
		recommendations: function(/* qd.services.titles.online.recommendations.__RecArgs */kwArgs){
			//	summary:
			//		Fetch user recommendations from Netflix.
			var dfd = util.prepare(kwArgs),
				signer = qd.app.authorization;
			
			//	when online, always get this from the servers.
			var qs = [];
			if(kwArgs.start){ qs.push("start_index=" + kwArgs.start); }
			if(kwArgs.max){ qs.push("max_results=" + kwArgs.max); }
			var url = "http://api.netflix.com/users/" + signer.userId + "/recommendations" 
				+ "?expand=" + some
				+ (qs.length ? "&" + qs.join("&") : "");

			dojo.xhrGet(dojox.io.OAuth.sign("GET", {
				url: url,
				handleAs: "xml",
				load: function(xml, ioArgs){
					var node, 
						items = xml.evaluate("recommendations/recommendation", xml), 
						results = [], sqls = []; 
					while(node = items.iterateNext()){
						var item = ps.titles.fromXml(node);
						results.push(item);
						sqls.push(item);
						saveTitle(item);
						qd.services.item(item);
					}

					//	do the callback
					qd.services.online.process(results, dfd);

					//	push it into the database.
					setTimeout(function(){
						var sql = "REPLACE INTO Recommendation(guid, title, lastUpdated) "
							+ " VALUES (:guid, :title, DATETIME())";
						dojo.forEach(sqls, function(item){
							db.execute({
								sql: sql,
								params: {
									guid: item.guid,
									title: item.title
								},
								result: function(data){
									//console.warn("Recommended title '" + item.title + "' saved.");
								}
							});
						});
					}, 500);
				},
				error: function(err, ioArgs){
					dfd.errback(err, ioArgs);
				}
			}, signer));
			return dfd;	//	dojo.Deferred
		}
	});
})();
