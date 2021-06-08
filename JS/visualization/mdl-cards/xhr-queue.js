define(["dojo/_base/lang", "dojo/Deferred", "dojo/dom", "dojo/query", "put-selector/put", "dojo/topic"],
function(lang, Deferred, dom, query, put, topic){
	/*
	 *	AiRTK4 xhr-queue
	 *	V0.9.0
	 *	20170906
	 *	TRT
	 *
	 *	Singleton object to handle any kind of XHR request firing. The basic idea is instead
	 *	of multiple XHR requests stepping on each other in no particular order, you
	 *	"enqueue" an XHR request; as soon as something is enqueued, passed callbacks fire
	 *	in order (this may change to firing N requests per round).
	 *
	 *	Once the request resolves, a topic will be published containing the name passed for
	 *	the enqueued item, in case anything else wants to subscribe and act upon the completion.
	 *
	 *	NOTE that this will NOT account for post-resolve actions (such as animations that happen
	 *	once a request is filled).
	 */

	//	static variables
	var queue = [],
		cache = [],
		low_queue = [],
		checklist = {},
		inProgress = false,
		numToExecute = 1,
		timeout = 20,
		low_timeout = 2000,
		completeTopic = "xhr-queue/complete",
		elementCompleteTopic = "xhr-queue/element-complete";

	function execute(){
		//	the main function that fires off the next N requests.
		//	fire off the next N functions.
		var data = [];
		for(var i=0, l=numToExecute; i<l; i++){
			var o = queue.shift();
			if(o){
				var name = o.name,
					fn = o.func;
				data.push(name);
				var promise = fn(function(data){
					//	console.log("Got here", data);
				});
				if(promise && ("then" in promise)){
					promise.then(function(data){
						//	console.log("Checking the queue...", queue);
						if(queue.length > 0) execute();
						else {
							topic.publish(completeTopic, { complete: true, completed: o });
						}
					});
				}
			} else {
				var o = low_queue.shift();
				if(o){
					var name = o.name,
						fn = o.func;
					data.push(name);
					setTimeout(function(){
						var promise = fn(function(data){
							if(low_queue.length > 0) execute();
						});
					}, low_timeout);
				}
			}
		}
	}

	//	subscribe to a couple of topics to try to trigger a page refresh inline.
	function refresh(data){
		if(cache.length){
			queue = cache.slice(0);
		}
		query(".trk-card__empty-data").forEach(function(node){
			if(!node.classList.contains("trk-card__data-hide")){
				node.classList.add("trk-card__data-hide");
			}
		});
		XhrQueue.preloader(query(".trk-card__xhr"), true);
		execute();
	}

	//	when a tab is clicked on, try to clear the cache before things get queued.
	var saved = [], tabMap = {}, tabOrder = [], newTab = false, currentTab = null;
	function rebuildCache(data){
		//	data = data || { section: currentTab || "__default__" };
		if(!data) return;

		//	trying a hack
		currentTab = data.section;

		//	definitely an uglier hack
		//	Get the tab count.
		//	var nodes = query(".trk-subnav-tabs a.mdl-layout__tab");
		//	console.log("Available tabs", nodes);
		//	if(!nodes.length) return;

		if(tabOrder.length == 1){
			tabMap[tabOrder[0]] = cache.slice(0);
			cache = [];
		}
		if(!tabOrder.length) tabOrder.push(currentTab);
		
		/*
		if(!(currentTab in tabMap)){
			tabMap[currentTab] = [];
			newTab = true;
			saved = cache.slice(0);
			cache = [];
		}
		*/

		//	remove any existing references to this section; in theory the given section should only exist once or not at all
		var idx = -1;
		for(var i=0, l=tabOrder.length; i<l; i++){
			if(tabOrder[i] == currentTab){
				idx = i;
				break;
			}
		}
		//	we found it, kill it.
		if(idx > -1){ tabOrder.splice(idx, 1); }

		//	push the section to the front of the array
		tabOrder.unshift(currentTab);

		//	finally, rebuild the cache
		cache = [];
		tabOrder.forEach(function(section){
			//console.log(tabMap[section]);
			//tabMap[section] && tabMap[section].forEach(function(cmd){
			tabMap[section].forEach(function(cmd){
				cache.push(cmd);
			});
		});
	}

	topic.subscribe("ClientPicker/selectProgram", function(data){
		//	refresh();
		/*
		if(rebuildCache != undefined){
			rebuildCache({ section: currentTab });
		}
		setTimeout(refresh, 150);
		*/
		setTimeout(function(){
			if(rebuildCache != undefined){
				rebuildCache({ section: currentTab });
			}
			refresh();
		}, 500);
	});
	topic.subscribe("DatePicker/datesChanged", function(data){
		//	make sure our formValues are set
		var src = data.source,
			data = data.data;
		formValues.dateRange = data.range;
		formValues.dateRangeType = (data.range != "cr") ? "r" : "d";
		formValues.sqlDateStart = data.dates.start;
		formValues.sqlDateEnd = data.dates.end;
		//	refresh();
		//	if(rebuildCache != undefined){
		//		rebuildCache({ section: currentTab });
		//	}
		//	setTimeout(refresh, 150);
		setTimeout(function(){
			if(rebuildCache != undefined){
				rebuildCache({ section: currentTab });
			}
			refresh();
		}, 500);
	});

	topic.subscribe("subnav/tab-shown", function(data){
		currentTab = data.section;
		setTimeout(function(){
			if(rebuildCache != undefined){
				rebuildCache(data);
			}
		}, 7000);
	});
	topic.subscribe(completeTopic, function(data){
		if(newTab){
			cache = cache.concat(saved);
			saved = [];
			newTab = false;
		}
	});

	var XhrQueue = new (function(){
		this.enqueue = function(name, fn, low){
			//	console.log(window.currentTab);

			//	make sure this hasn't already been queued
			if(!(name in checklist)){
				checklist[name] = true;
			//	if(low != true){
					queue.push({ name: name, func: fn });
			//		cache.push({ name: name, func: fn });
			//	} else {
			//		low_queue.push({ name: name, func: fn });
			//	}
				
				if(window.currentTab){
					if(!(window.currentTab in tabMap)){
						tabMap[window.currentTab] = [];
					}
					tabMap[window.currentTab].push({ name: name, func: fn });
			//	} else {
			//		cache.push({ name: name, func: fn });
				}
			}

			//	Make sure we have at least a client id
			var clientId = +this.formValues()["c"];
			if(clientId > 0){
				execute();
			}
		};
		this.inProgress = function(){ return inProgress; };
		this.inspect = function(){
			console.log("xhr-queue, currentTab: ", currentTab);
			console.log("xhr-queue, checklist: ", checklist);
			console.log("xhr-queue, cache: ", cache);
			console.log("xhr-queue, saved: ", saved);
			console.log("xhr-queue, tabMap: ", tabMap);
			console.log("xhr-queue, tabOrder: ", tabOrder);
			return "";
		};

		//	Note that the next two methods are here only because we _know_ (for the most part)
		//	that this module will be included with most cards.
		this.formValues = function(){
			var o = {}, f = formValues, v = valuesMap;
			o[v.clientId] = f.clientId;
			o[v.programId] = f.programId;
			o[v.groupId] = f.groupId;
			o[v.selectionType] = f.selectionType;
			o[v.sqlDateStart] = f.sqlDateStart;
			o[v.sqlDateEnd] = f.sqlDateEnd;
			if(__xkcd__){
				o.f = __xkcd__;
			}
			return o;
		};
		this.inActiveTab = function(node){
			//	given a node, find out if we are living inside a tab, and whether or not
			//	that tab is active.
			var in_tab = false, is_active = false;
			while(node.parentNode != null){
				if(node.classList.contains("mdl-tabs__panel")){
					in_tab = true;
					if(node.classList.contains("is-active")){
						is_active = true;
					}
					break;
				}
				if(node.classList.contains("mdl-layout__tab-panel")){
					in_tab = true;
					//	console.log("inActiveTab", node);
					if(node.classList.contains("is-active")){
						is_active = true;
					}
					break;
				}
				node = node.parentNode;
			}
			return {
				in_tab: in_tab,
				is_active: is_active
			};
		};
		this.isMobile = function(){
			return (typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1);
		};
		this.preloader = function(nodes, show){
			if(!nodes) return;
			if(!(nodes instanceof Array)){ nodes = [nodes]; }
			for(var i=0, l=nodes.length; i<l; i++){
				var node = nodes[i],
					preload = query(".preloader", node),
					data = query(".trk-card__data", node);
				if(!data.length) continue;
				if(show){
					if(!preload.length){
						//	insert it back into the card
						preload = put(node, "div.preloader.preloader--xl.preloader--color-accent.preloader--show");
						preload.innerHTML = '<svg viewBox="25 25 50 50"><circle cx="50" cy="50" r="20" /></svg>';
					} else {
						preload.forEach(function(n){
							if(!n.classList.contains("preloader--show")){ n.classList.add("preloader--show"); }
						});
					}
					data.forEach(function(n){
						if(!n.classList.contains("trk-card__data-hide")){ n.classList.add("trk-card__data-hide"); }
					});
				} else {
					preload.forEach(function(n){ put(n, "!"); });
					query(".trk-card__data", node).forEach(function(n){
						n.classList.remove("trk-card__data-hide");
					});
				}
			}
		};
	})();
	//	global for testing.
	xq = XhrQueue;
	return XhrQueue;
});
