dojo.provide("qd.services.offline.titles");

(function(){
	var ps = qd.services.parser,
		db = qd.services.data,
		util = qd.services.util;
	
	dojo.mixin(qd.services.offline.titles, {
		//	summary:
		//		The offline-based service to pull title information (movies, TV shows, etc.) out of the cache.
		save: function(/* Object */item){
			//	summary:
			//		Save the passed item.  Redundant but necessary to not break app code.
			qd.services.online.titles.save(item);
		},
		clear: function(){
			//	summary:
			//		Clear all of the titles out of the cache.
			qd.services.online.titles.clear();
		},
		find: function(/* qd.services.online.titles.find.__FindArgs */kwArgs){
			//	summary:
			//		Try to pull as many titles from the database as possible,
			//		based on the terms.
			var dfd = util.prepare(kwArgs);
			var sql = "SELECT t.title, t.json "
				+ "FROM Title t "
				+ "INNER JOIN (SELECT DISTINCT title FROM Title WHERE SUBSTR(title, 0, :length) = :term AND json IS NOT NULL) t1 "
				+ "ON t1.title = t.title "
				+ "INNER JOIN (SELECT DISTINCT title FROM Title WHERE title LIKE :like AND json IS NOT NULL) t2 "
				+ "ON t2.title = t.title "
				+ "ORDER BY t.title";
			//	+ " LIMIT " + Math.min((kwArgs.max || 25), 100) + "," + (kwArgs.start || 0);

			db.execute({
				sql: sql,
				params: {
					length: kwArgs.term.length,
					term: kwArgs.term,
					like: "%" + kwArgs.term + "%"
				},
				result: function(data, result){
					var o = {
						number_found: data && data.length || 0,
						search_term: kwArgs.term,
						results: [],
						sort_by: "Relevance"
					};
					if(data && data.length){
						for(var i=0; i<data.length; i++){
							var item = dojo.fromJson(data[i].json);
							item.art.large = util.image.url(item.art.large);
							o.results.push(item);
							qd.services.item(item);
						}
						dfd.callback(o);
					} else {
						console.warn("titles.find ERROR:", o);
						dfd.errback(o);
					}
				},
				error: function(result){
					console.warn("titles.find ERROR:", result);
					dfd.errback(result);
				}
			});
			return dfd;	//	dojo.Deferred
		},
		fetch: function(/* qd.services.online.titles.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch full title information out the cache and return it.
			var dfd = util.prepare(kwArgs);
			//	Check the cache first.

			var sql = "SELECT * FROM Title WHERE guid=:guid AND json IS NOT NULL",
				params = { guid: kwArgs.guid };
			if(kwArgs.term){
				sql = "SELECT * FROM Title WHERE title=:term AND json IS NOT NULL",
				params = { term: kwArgs.term };
			}

			db.fetch({
				sql: sql,
				params: params,
				result: function(data, result){
					var title;
					if(data && data.length){
						title = dojo.fromJson(data[0].json);
						title.art.large = util.image.url(title.art.large);
						qd.services.item(item);
					}
					setTimeout(function(){
						if(title){
							dfd.callback(title, result);
						} else {
							dfd.errback(new Error("qd.offline.service.fetch: the title '" + kwArgs.term + "' is unavailable."));
						}
					}, 10);
				}
			});
			return dfd;	//	dojo.Deferred
		},
		autosuggest: function(/* on.titles.autosuggest.__AutosuggestArgs */kwArgs){
			//	summary:
			//		Return up to 10 terms out of the cache that sort of match the passed string.
			var dfd = util.prepare(kwArgs);
			var sql = "SELECT 1 AS main, title FROM Title WHERE SUBSTR(title, 0, :length) = :term "
				+ "UNION SELECT 2 AS main, title FROM Title WHERE title LIKE :like "
				+ "ORDER BY main, title LIMIT 0,10";
			db.fetch({
				sql: sql,
				params: {
					length: kwArgs.term.length,
					term: kwArgs.term,
					like: "%" + kwArgs.term + "%"
				},
				result: function(data){
					var a = [];
					dojo.forEach(data, function(item){
						a.push(item.title);
					});
					setTimeout(function(){
						dfd.callback(a, null);
					}, 10);
				}
			});
			return dfd;	//	dojo.Deferred
		},
		rated: function(/* qd.services.online.titles.rated.__RatedArgs */kwArgs){
			//	summary:
			//		Return any cached ratings info based on the passed set of title guids.
			var dfd = new dojo.Deferred();

			db.execute({
				sql: "SELECT json FROM Title WHERE guid IN ('" + (kwArgs.guids || []).join("','") + "') ORDER BY title",
				result: function(data){
					if(data && data.length){
						var a = [];
						dojo.forEach(data, function(item){
							var tmp = dojo.fromJson(item.json);
							if(tmp.ratings && tmp.ratings.predicted){
								tmp.art.large = util.image.url(tmp.art.large);
								qd.services.item(tmp);
								a.push(tmp);
							}
						});
						if(a.length){
							kwArgs.result.call(kwArgs, a);
						}
					}
					//	no matter what happens, run the callback.
					dfd.callback(a);
				}
			});
			return dfd;	//	dojo.Deferred
		},
		rate: function(/* qd.services.online.titles.rate.__RateArgs */kwArgs){
			//	summary:
			//		Store the passed rating command in the transaction queue
			//		for synchronization purposes.
			var dfd = util.prepare(kwArgs),
				item = qd.services.item(kwArgs.guid);

			if(!item){
				setTimeout(function(){
					dfd.errback(new Error("qd.service.rate: cannot rate an item with a guid of " + kwArgs.guid));
				}, 10);
				return dfd;
			}
			
			var sql = "INSERT INTO TransactionQueue (method, args, prompt, dateAdded) "
				+ " VALUES (:method, :args, :prompt, DATETIME())";

			var params = {
				method: "rate",
				args: "{guid:'" + kwArgs.guid + "',rating:'" + kwArgs.rating + "'}",
				prompt: 'Setting the rating on "' + item.title + '" to ' + kwArgs.rating
			};

			db.execute({
				sql: sql,
				params: params,
				result: function(data){
					//	just do the callback.
					dfd.callback(kwArgs.rating);
				}
			});

			return dfd;	//	dojo.Deferred
		},
		recommendations: function(/* qd.services.titles.online.recommendations.__RecArgs */kwArgs){
			//	summary:
			//		Get any recommendations out of the cache and return them.
			var dfd = util.prepare(kwArgs),
				sql = "SELECT DISTINCT r.guid AS guid, r.title AS title, t.json AS json "
					+ "FROM Recommendation r "
					+ "INNER JOIN Title t "
					+ "ON t.guid = r.guid "
					+ "WHERE t.json IS NOT NULL "
					+ "ORDER BY r.title",
				max = kwArgs.max || 25,
				start = kwArgs.start || 0;
			sql += " LIMIT " + start + "," + max;

			db.execute({
				sql: sql,
				result: function(data){
					//	A note: we are not going to throw any errors if there's nothing
					//	in the database that's cached.
					var a = [];
					if(data && data.length){
						dojo.forEach(data, function(item){
							var title = dojo.fromJson(item.json);
							title.art.large = util.image.url(title.art.large);
							a.push(title);
							qd.services.item(title);
						});
					}
					dfd.callback(a);
				},
				error: function(data){
					dfd.errback(data);
				}
			});
			return dfd;	//	dojo.Deferred
		}		
	});
})();
