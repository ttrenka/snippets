dojo.provide("qd.init");

dojo.require("dair.AIR");
dojo.require("dair.Window");
dojo.require("dair.Icon");

dojo.require("dojox.widget.Dialog");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.StackContainer");
dojo.require("dijit.layout.ContentPane");

dojo.require("dijit.form.Form");
dojo.require("dojo.behavior");
dojo.require("dojo.fx.easing");

dojo.require("qd.services");

dojo.require("qd.app");
dojo.require("qd.app.feeds");
dojo.require("qd.app.movies");
dojo.require("qd.app.topMovies");
dojo.require("qd.app.resultsList");
dojo.require("qd.app.search");
dojo.require("qd.app.recommendations");
dojo.require("qd.app.preferences");
dojo.require("qd.app.ratings");
dojo.require("qd.app.tooltip");
dojo.require("qd.app.sync");


dojo.require("qd.app.systray");
dojo.require("qd.app.queue");

// PATCH ===========================>
// For some reason, the Layout widget parent (top most layout item)
// doesn't get the window bounds, it measures itself. Strange. This 
// should be fixed in dijit.
dijit.layout._LayoutWidget.prototype._resize = dijit.layout._LayoutWidget.prototype.resize;
dijit.layout._LayoutWidget.prototype.resize = function(changeSize, resultSize){
	// in our case this is the parent, but _LayoutWidget
	//	would know if it were fixed in dijit
	if(this.id=="layoutNode"){ 
		changeSize = dijit.getViewport();
	}
	this._resize(changeSize, resultSize);
}
//<=============================PATCH

// PATCH ===========================>
/*
dojo.Deferred.prototype.addCallback = function(cb, cbfn){
	//	summary: 
	//		Add a single callback to the end of the callback sequence.
	var closure = dojo.hitch.apply(dojo, arguments);
	var h;
	var fn = cbfn;
	if(!cbfn){
		h = cb;
	}else{
		h = function(){
			var a = arguments
			setTimeout(
				dojo.hitch(cb, function(){
					try {
						closure.apply(null, a)
					}catch(err){
						console.error("App Error: "+ err.message)
						console.dir({ "Error origination:": fn.toString() });
					}
				}), 0);
		}	
	}
	return this.addCallbacks(h, null); // dojo.Deferred
};
*/
//<=============================PATCH

qd.init = qd.init || {};
(function(){
	//	setup the services getter
	qd.__defineGetter__("service", function(){
		//	summary:
		//		Return the proper service (qd.services.online, qd.services.offline)
		//		based on the current network status.
		var b = qd.services.network.available;
		return b ? qd.services.online : qd.services.offline;	//	Object
	});

	if(!qd.app.airCheck){
		//	redefine addOnLoad.
		dojo.addOnLoad(function(){
			// update confirmation dialog
			(new dojox.widget.Dialog({dimensions: [400,185], modal:true}, "updateNeededDialogNode")).startup();
			//dojo.byId("splashScreen").style.display="none";

			//	check if an update is needed.
			dojo.byId("airUpgradeLink").onclick = function(){
				//	summary: Open a link in the system browser.
				air.navigateToURL(new air.URLRequest(this.href));
				setTimeout(function(){ 
					qd.app.exit();
				}, 3000);
				return false;
			};
			
			dojo.byId("updateNeededVersion").innerHTML = air.NativeApplication.nativeApplication.runtimeVersion;
			dijit.byId("updateNeededDialogNode").show();
		});
	}

	dojo.addOnLoad(function(){
		qd.services.init();
	});

	function setupNavigation(){
		var __splash = dojo.connect(qd.app, "switchPage", function(){
			dojo.disconnect(__splash);
			var splash = dojo.byId("splashScreen"),
			    anim = dojo.fadeOut({node:splash}),
			    anim_h = dojo.connect(anim, "onEnd", function(){
					dojo.disconnect(anim_h);
					dojo.style(splash, "display", "none");
				});
			anim.play();
		});

		if(qd.app.authorized){
			var h = dojo.connect(qd.services.network, "onChange", function(){
				dojo.disconnect(h);
				qd.app.queue.gotoInitialPage();	
			});
		}else{
			qd.app.switchPage("auth");	
		}
		
		dojo.byId("searchBar").onsubmit = function(){ return false; };

		dojo.query("#topNavDelivered a").connect("onclick", function(){
			air.navigateToURL(new air.URLRequest("https://www.netflix.com/"));
		});

		//	view source link
		dojo.query("#viewSource").connect("onclick", function(evt){ 
			qd.app.source();
			dojo.stopEvent(evt);
			return false; 
		});

		//	authorization screen
		dojo.query("input.authorizeBtn").connect("onclick", function(){
			qd.services.authorization.request();
		});

		//	connect to auth and deauth.
		dojo.connect(qd.app, "authorize", function(){
			//	get the user information
			var dfd = qd.service.user.fetch();
			dfd.addCallback(function(obj){
				qd.app.user(obj);
				dojo.byId("topNavUser").innerHTML = "Welcome " + obj.name.first + " " + obj.name.last;
				dojo.byId("prefsUserName").innerHTML = obj.name.first + " " + obj.name.last;
			});
			qd.app.queue.gotoInitialPage();
			dojo.style("searchBar", "display", "block");
			dojo.removeClass(dojo.body(), "notLoggedIn");
		});

		dojo.connect(qd.app, "deauthorize", function(){
			qd.app.user(null);
			qd.app.switchPage("auth");
			dojo.style("searchBar", "display", "none");
			dojo.addClass(dojo.body(), "notLoggedIn");
		});

		//	the rest
		dojo.behavior.apply();
	}

	function setupLayout(){
		// The main layout
		//
		//	bc - all content, includes the header
		var bc = new dijit.layout.BorderContainer({gutters:false}, "layoutNode");
			//
			// sc - all content below the header
			var sc = new dijit.layout.StackContainer({region:"center", gutters:false}, "contentNode");
				//s
				//		single pages go in sc
				sc.addChild(new dijit.layout.ContentPane({region:"center"}, "prefsContainerNode"));
				//
				// cbc - top movies content
				var cbc = new dijit.layout.BorderContainer({gutters:false}, "topMoviesContainerNode");
				cbc.addChild(new dijit.layout.ContentPane({region:"top"}, "topMoviesSubNav"));
				cbc.addChild(new dijit.layout.ContentPane({region:"center"}, dojo.query(".contentTop","topMoviesContainerNode")[0]));
				sc.addChild(cbc);
				//
				// q - queued content with nav
				var q = new dijit.layout.BorderContainer({gutters:false}, "queueContentNode");
				q.addChild(new dijit.layout.ContentPane({region:"top"}, "queSubNav"));
				sc.addChild(q);
					//
					// qc - queued pages
					var qc = new dijit.layout.StackContainer({region:"center", gutters:false}, "queuePages");
					qc.addChild(new dijit.layout.ContentPane({region:"center"}, "queueContainerNode"));
					qc.addChild(new dijit.layout.ContentPane({region:"center"}, "instantContainerNode"));
					qc.addChild(new dijit.layout.ContentPane({region:"center"}, "historyContainerNode"));
					q.addChild(qc);
				//
				// a - auth content with nav
				var a = new dijit.layout.BorderContainer({gutters:false}, "authContentNode");
				a.addChild(new dijit.layout.ContentPane({region:"top"}, "authSubNav"));
				sc.addChild(a);
					//
					// au - auth pages 
					var au = new dijit.layout.StackContainer({region:"center", gutters:false}, "authPages");
					au.addChild(new dijit.layout.ContentPane({region:"center"}, "createAccountContainerNode"));
					a.addChild(au);
		
		bc.addChild(new dijit.layout.ContentPane({region:"top"}, "headerNode"));
		bc.startup();
		// done with main layout

		// generic underlay nodes; connect to underlay.show/hide for custom behavior
		// (closing a dialog, etc.); We use two underlay nodes, one for the header and
		// one for the content area; this makes it easier to nest DOM nodes inside the
		// content container(s)
		var underlays = [ ["topMoviesUnderlay", dojo.byId("genrePicker").parentNode],
		                  ["queueUnderlay", dojo.byId("queuePages")],
		                  ["headerUnderlay", dojo.body()] ];
		dojo.forEach(underlays, function(n){
			var u = document.createElement("div");
			dojo.connect(u, "onclick", qd.app.underlay, "hide");
			dojo.attr(u, "id", n[0]);
			dojo.place(u, n[1]);
		});

		// movie info dialog
		(new dojox.widget.Dialog({dimensions: [800,450]}, "movieInfoDialogNode")).startup();

		// sync confirmation dialog
		(new dojox.widget.Dialog({dimensions: [400,185], modal:true}, "syncConfirmDialogNode")).startup();
	}

	dojo.addOnLoad(setupLayout);
	dojo.addOnLoad(setupNavigation);
})();
