dojo.provide("qd.services.online");

dojo.require("dojox.io.OAuth");
dojo.require("qd.services.parser");
dojo.require("qd.services.online.feeds");
dojo.require("qd.services.online.titles");
dojo.require("qd.services.online.queues");
dojo.require("qd.services.online.user");

(function(){
 	var db = qd.services.data,
		network = qd.services.network;

	//////////////////////////////////////////////////////////////////////////////////////////////
	//	Synchronization functions
	//////////////////////////////////////////////////////////////////////////////////////////////
	var actions = [];

	//	wrapper functions around sync functionality...this is due to the application sandbox.
	var methods = {
		rate: function(args){
			return qd.service.titles.rate(args);
		},
		add: function(args){
			var dfd = new dojo.Deferred();
			qd.app.queue.addMovieById(args.movieId, null, args.queue);
			setTimeout(function(){
				dfd.callback();
			}, 250);
			return dfd;
		},
		termAdd: function(args){
			var dfd = new dojo.Deferred();
			var queue = args.queue;
			args.result = function(item){
				qd.app.queue.addMovieById(item.guid, null, queue);
				dfd.callback();
			};
			delete args.queue;
			qd.service.titles.fetch(args);
			return dfd;
		},
		modify: function(args){
			return qd.service.queues.modify(args);
		},
		remove: function(args){
			return qd.service.queues.remove(args);
		},
		discs: function(){
			return qd.service.queues.discs({ max: 1 });
		},
		instant: function(){
			return qd.service.queues.instant({ max: 1 });
		}
	};
	function getActions(){
		actions = [];
		db.execute({
			sql: "SELECT * FROM TransactionQueue ORDER BY dateAdded, id",
			result: function(data){
				//	pre-process what we have here into a queue of functions to execute.
				if(data && data.length){
					actions.push(function(){
						qd.services.online.onSyncItemStart("Fetching disc queue");
						methods.discs().addCallback(function(){
							qd.services.online.onSyncItemComplete();
						}).addErrback(function(err){
							console.warn(err);
							qd.services.online.onSyncItemComplete();
						});
					});
					actions.push(function(){
						qd.services.online.onSyncItemStart("Fetching instant queue");
						methods.instant().addCallback(function(){
							qd.services.online.onSyncItemComplete();
						}).addErrback(function(err){
							console.warn(err);
							qd.services.online.onSyncItemComplete();
						});
					});
					dojo.forEach(data, function(item){
						var method = item.method;
						actions.push(function(){
							if(methods[method]){
								try {
									qd.services.online.onSyncItemStart(item.prompt);
									methods[method](dojo.fromJson(item.args||"{}")).addCallback(function(){
										qd.services.online.onSyncItemComplete();
									}).addErrback(function(err){
										console.warn(err);
										qd.services.online.onSyncItemComplete();
									});
								} catch(ex){
									console.warn("sync: ", ex);
								}
							}
						});
					});
					qd.services.online.onSyncNeeded(actions.length);
				}
			}
		});
	}

	function execute(){
		//	note that the setTimeout is there to limit the number of
		//	things posted to Netflix to 4 a second.
		var fn = actions.shift();
		if(fn){
			setTimeout(function(){
				fn();
			}, 400);
		} else {
			//	we are done, so wipe the transaction queue.
			db.execute({
				sql: "DELETE FROM TransactionQueue"
			});
			qd.services.online.onSyncComplete();
		}
	}

	//	connect to the onChange event of the network.
	dojo.connect(network, "onChange", function(){
		if(network.available){
			//	check to see if there's anything stored in the transaction queue.
			getActions();
		}
	});

	//////////////////////////////////////////////////////////////////////////////////////////////

	dojo.mixin(qd.services.online, {
		process: function(titles, dfd){
			//	summary:
			//		Process a list of titles by both saving images, and
			//		saving the title itself into the database.
			//	titles: Array | Object
			//		The title(s) to be processed
			//	dfd: dojo.Deferred?
			//		An optional deferred to be fired during the processing.
			//	returns: void
			var util = qd.services.util,
				proc = titles;
			if(!(titles instanceof Array)){ proc = [ titles ]; }

			//	pre-process image urls.
			dojo.forEach(proc, function(item){
				item.art.large = util.image.url(item.art.large);
			});

			//	do the callback
			if(dfd){ dfd.callback(titles); }

			//	post-process with a timeout, let the UI finish rendering and try
			//	to let it finish pulling images, since it looks like when we do
			//	this, AIR saves it off the cache anyways.
			setTimeout(function(){
				dojo.forEach(proc, function(item){
					if(item.art.large && item.art.large.indexOf("http://")==0){
						var imageDfd = util.image.store(item.art.large);
						imageDfd.addCallback(function(u){
							item.art.large = u;
						});
					}
				});
			}, 2000);
		},
		onSyncNeeded: function(/* Integer */n){
			//	summary:
			//		stub for connecting to for the sync process.
		},
		synchronize: function(){
			//	summary:
			//		Start the synchronization process.
			execute();
		},
		onSyncComplete: function(){
			//	summary:
			//		Stub for when the synchronization process is complete.
		},
		onSyncItemStart: function(/* String */prompt){
			//	summary:
			//		Stub for when an item is about to be executed.
		},
		onSyncItemComplete: function(){
			//	summary:
			//		Stub for each item completion.
			execute();
		},
		discardSynchronizations: function(){
			//	summary:
			//		Throw out any stored sync.
			db.execute({
				sql: "DELETE FROM TransactionQueue",
				result: function(data){
					qd.services.online.onDiscardSync();
				}
			});
		},
		onDiscardSync: function(){
			//	summary:
			//		Stub for when sync actions are discarded.
		}
	});
})();
