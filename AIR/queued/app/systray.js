dojo.provide("qd.app.systray");
dojo.require("dair.fx");
dojo.require("dojo.fx.easing");

(function(){
	var di = dair.Icon;
	var popWidth = 410;
	var popMinHeight = 90;
	var popRowHeight = 72;
	
	var qIcon = [		
		'img/icon/AIRApp_128.png',
		'img/icon/AIRApp_48.png',
		'img/icon/AIRApp_32.png',
		'img/icon/AIRApp_16.png'
	];
	
	var getViewport = function(){
		// summary: Mixin screen resolutions into viewport sniffing code
		return dojo.mixin(dijit.getViewport(), { 
			sx: air.Capabilities.screenResolutionX, 
			sy: air.Capabilities.screenResolutionY
		}); //Object
	};
	var buildWin = function(){
		//	summary: Build the mini At Home queue window.
		var v = getViewport();
		var w = popWidth;
		var mr = 0;
		var mb = 100;
		return new dair.Window({
			size:{
				h:v.sy, w:w, t:0, l:v.sx - w - mr,
			},
			href:"Mini.html",
			transparent:true,
			resizable: false,
			minimizable: false,
			maximizable: false,
			type:"utility",
			systemChrome:"none",
			alwaysInFront:true
		});	// dair.Window
	};
	
	var getItems = function(/*String*/type){
		//	summary: Pull in the notifications or the At Home items.
		if (type) {
			return qd.app.queue.getNotifications(type);
		} else { 
			var a = qd.app.queue.getItems.call(qd.app.queue, "atHomeList"); // Array
			//	make SURE we have the right image urls.
			dojo.forEach(a, function(item){
				item.title.art.large = qd.services.util.image.url(item.title.art.large);
				item.title.art.small = qd.services.util.image.url(item.title.art.small);
			});
			return a;
 		}
	};
	
	qd.app.systray = new (function(){
		// summary:
		//		Handles functionality that involves the taskbar icon
		//		and the mini window that opens when the app is in the
		//		background.
		//	NOTE: 
		//		Consistently using the term "systray" as in the 
		//		Lower right system tray used in Windows. However, this
		//		handles the Mac Dock and Dock Icon in a similar manner.
		//
		this.allowExit = false;
		this.showing = true;
		this.winshowing = false;
		this.miniDisplaying = "";
		
		this.init = function(){
			// summary: 
			// 		Initialize. Set the icon in the systray,
			//		set menu for icon, and set up connections.	
			if(!di.initialized){
				dojo.connect(di, "onReady", this, "init");
				return;
			}
			
			di.setIcon(qIcon);

			this.setMenu();
			this._doConnect();
			//this.win = buildWin();
		};
		
		this.showApp = function(){
			// summary: Show main window
			if(!this.showing){
				window.nativeWindow.visible = true;
	      		this.showing = true;
				this.allowExit = false;
			}
			window.nativeWindow.orderToFront();
		};
		
		this.hideApp = function(){
			// summary: Hide main window
			if(this.showing){
				window.nativeWindow.visible = false;
				this.showing = false;
				this.allowExit = true;
			}
			
		};
		
		this.doSearch = function(/*String*/value){
			//	summary:
			// 		Called from mini when user inserts
			//		a search term and hits enter
			console.log("VALUE", value);
			value = dojo.trim(value);
			if(value){
				this.showApp();
				// timeout needed here or mini doesn't close
				setTimeout(dojo.hitch(this, "hideMini"), 100);
				qd.app.search.search(value);
			}
		};

		this.showMini = function(){
			//	summary: Open the mini At Home window.
			if(!this.winshowing && this.nativeWindow){
				this.nativeWindow.animate("open");
				this.winshowing = true;
			}
			
		};
		
		this.hideMini = function(){
			// summary:
			//		Hides mini.
			if(this.nativeWindow && this.winshowing){
				this.nativeWindow.animate("close");
				this.winshowing = false;
			}
		};
		this.isReady = function(){
			// summary:
			//		Checks if Mini window has been built yet.
			//		If so, returns true. If false, builds the
			//		window and then retriggers original request.
			if(this.nativeWindow){ return true;}
			this.win = buildWin();
			var callback = this.isReady.caller;
			var args = this.isReady.caller.arguments;
			var c = dojo.connect(this, "onWinLoad", this, function(){
				dojo.disconnect(c);
				callback.apply(this, args);		
			});
			return false;
		}
		
		this.showAtHome = function(){
			//	summary: Show the At Home queue.
			if(!this.isReady()){ return false; }
			this.miniDisplaying = "atHome";
			this.nativeWindow.atHome(getItems());
			this.showMini();
		};
		this.showShipped = function(/*Array*/shipped){
			//	summary: Show shipped titles.
			if(!this.isReady()){ return; }
			this.miniDisplaying = "shipped";
			this.nativeWindow.shipped(shipped || getItems("shipped"));
			this.showMini();
		};
		this.showReceived = function(/*Array*/receieved){
			//	summary: Show received titles.
			if(!this.isReady()){ return; }
			this.miniDisplaying = "receieved";
			this.nativeWindow.received(receieved ||getItems("received"));
			this.showMini();
		};
		this.showShippedAndReceived = function(/*Array*/shipped, /*Array*/receieved){
			//	summary: Show both shipped and received titles.
			console.log("systray.showShippedAndReceived", shipped, receieved)
			if(!this.isReady()){ return; }
			console.log("systray.showShippedAndReceived GO!", shipped, receieved)
			this.miniDisplaying = "shippedAndReceived";
			this.nativeWindow.shippedAndReceived(shipped || getItems("shipped"), receieved ||getItems("received"));
			this.showMini();
		};
		
		this.devShipped = function(){
			qd.app.queue.polling.dev(true);
			qd.app.queue.polling.devS = true;
		};
		this.devReceived = function(){
			qd.app.queue.polling.dev(true);
			qd.app.queue.polling.devR = true;
		};
		this.devShippedAndReceived = function(){
			qd.app.queue.polling.dev(true);
			qd.app.queue.polling.devSR = true;
		};
		
		this.onListChange = function(list){
			// just changes the atHome list. does not show the window.
			if(this.nativeWindow && list && list.type=="at_home" && this.miniDisplaying == "atHome"){
				console.info("UPDATE AT_HOME LIST", getItems().length);
				this.nativeWindow.atHome(getItems());
			}
		};
		
		this.onWinLoad = function(w){
			console.info("MINI WINDOW LOADED", w);
			this.nativeWindow = w;
		};
		
		this.onClick = function(){
			// summary:
			//		Called when systray icon is clicked
			//		AND the app is not showing. If app is
			//		showing, this is not triggered.
			//		NOTE: No event, due to Mac compatibility.
			this.showAtHome();
		};
		
		this.setMenu = function(){
			// 	summary:
			//		Sets the right-click menu for the systray icon
			//		Called multiple times, and changes menu according
			//		to app state - like if the user is logged in.
			var items = {
				"Top 100 Movies": dojo.hitch(this, function(){
					this.showApp();
					qd.app.switchPage("topMovies");
					qd.app.selectNav("", "topMoviesSubNav");
				}),
				"divider":true,
				"Quit Queued": dojo.hitch(this, function(){
					this.allowExit = true;
					qd.app.exit();
				})
			};

			if(qd.app.authorized){
				items = {
					"At Home Mini-Queue": dojo.hitch(this, function(){
						this.showAtHome();
					}),
					"Your Queue": dojo.hitch(this, function(){
						this.showApp();
						qd.app.queue.switchPage("queue");
					}),
					"Top 100 Movies": dojo.hitch(this, function(){
						this.showApp();
						qd.app.switchPage("topMovies");
						qd.app.selectNav("", "topMoviesSubNav");
					}),
					"Preferences": dojo.hitch(this, function(){
						this.showApp();
						qd.app.switchPage("preferences");
					}),	
					"divider":true,
					"Quit Queued": dojo.hitch(this, function(){
						this.allowExit = true;
						qd.app.exit();
					})
				};
			}
			di.setMenu(items);
		};
		
		this._doConnect = function(){
			//	summary: 
			//		Building connections
			// When the app is minimized, clicking the icon should
			//	show the Mini popup. 
			if(di.isTray){
				// windows. supports icon click.
				dojo.connect(di, "onClick", this, function(){
					if(!this.showing && !this.winshowing){ this.onClick(); }
				});
			}else{
				// Mac does not support icon click.
				// the next best thing is to catch onFocus
				//	This will work but you'll need to blur first
				//	So: minimizing the app and immediately clicking
				//	on the button will NOT work.
				dojo.connect(di, "onFocus", this, function(){
					if(!this.showing && !this.winshowing){ this.onClick(); }
				});
			}
			
			// some crazy handlers to allow and disallow 
			//	the app to exit or move to the system tray
			dojo.connect(window, "keypress", this, function(evt){
				// if the console is open, allow keyboard exit
				//	else the app foobars
				if(dojo.config.isDebug){
					this.allowExit = true;	
				}
			});
			dojo.connect(window, "keyup", this, function(evt){
				this.allowExit = false;
			});
			dojo.connect(window, "blur", this, function(evt){
				// if the main window doesn't have focus and it is
				//	open don't block exit. It's most likely
				//	in debug mode and the console is in focus.
				if(this.showing){
					this.allowExit = true;	
				}
			});
			dojo.connect(window, "focus", this, function(evt){
				this.allowExit = false;
			});
			
			// connecting changes to the AtHome that would show
			//	in the mini
			dojo.connect(qd.app.queue, "onLoad", this, "onListChange");
			dojo.connect(qd.app.queue, "onChange", this, "onListChange");
		};

		//	connect the menu setting with authorization.
		dojo.connect(qd.app, "authorize", dojo.hitch(this, function(){
			this.setMenu();
		}));
		dojo.connect(qd.app, "deauthorize", dojo.hitch(this, function(){
			this.setMenu();
		}));
	})();
	
	var doLoad = function (){
		console.log('do load ')
		qd.app.systray.init();
	} 
	
	function onExit(evt){	
		if(!qd.app.systray.allowExit && dojo.attr(dojo.byId("runInBackground"), "checked")){
			evt.preventDefault();
			qd.app.systray.hideApp();
		}
	}
	window.nativeWindow.addEventListener(air.Event.CLOSING, onExit);
	
	// dev --->
	var c1, c2;
	var devShow = function(){ return;
		setTimeout(function(){
			//qd.app.systray.showAtHome();
			qd.app.systray.showShippedAndReceived();	
			dojo.disconnect(c1);
			dojo.disconnect(c2);
		}, 1000);
		
	}
	c1 = dojo.connect(qd.app, "switchPage", function(page){
		if(page=="auth"){ devShow(); }	
	});
	c2 = dojo.connect(qd.app, "hideBgLoader", function(){
		devShow();
	});
	//
	var onWin = function(evt){
		//console.warn("CHANGED!", evt.type)
	}
	// these events all work. Keeping here for a while for reference	
	window.nativeWindow.addEventListener(air.NativeWindowBoundsEvent.RESIZE,onWin);
	window.nativeWindow.addEventListener(air.NativeWindowBoundsEvent.RESIZING,onWin);
	window.nativeWindow.addEventListener(air.NativeWindowBoundsEvent.MOVING, onWin);
	window.nativeWindow.addEventListener(air.NativeWindowDisplayStateEvent.DISPLAY_STATE_CHANGING, onWin);
	window.nativeWindow.addEventListener(air.NativeWindowDisplayStateEvent.DISPLAY_STATE_CHANGE, onWin);
	// <-------- dev
	
	dojo.addOnLoad(doLoad);
	
})();

	/*
	 * 
	 * for reference. would like to ani the main window.
				 Can't animate window
				 because of minWidths/heights
				 Need to implement a dummy window
				 
				 this.restoreProps = {
					x:window.nativeWindow.x,
					y:window.nativeWindow.y,
					w:window.nativeWindow.width,
					h:window.nativeWindow.height
				}
				console.dir(this.getViewport())
				
				var self = this;
				dair.fx.animateWindow({
					pane: window.nativeWindow,
					y:500,//dair.getViewport().sy -100,
					height: 100,
				//	easing: dojo.fx.easing.backOut,
					duration:1000,
					onEnd: function(){
						window.nativeWindow.visible = false;
					}
				}).play();
				*/
