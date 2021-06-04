dojo.provide("qd.app");

dojo.require("dojo.behavior");
dojo.require("dojox.io.OAuth");

qd.app = new (function(){
	//	native application references
	var _app = air.NativeApplication.nativeApplication,
		self = this;

	//	BEGIN APPLICATION-SPECIFIC EVENTS
	_app.idleThreshold = 300;

	this.splash = function(msg){
		dojo.byId("splashMessage").innerHTML = msg + "...";
	};

	//	Application-specific information
	this.__defineGetter__("info", function(){
		//	summary:
		//		Get the application information and return
		//		it as a JSON object.
		var xml = new DOMParser().parseFromString(_app.applicationDescriptor, "text/xml"),
			root = xml.getElementsByTagName("application")[0],
			copy = root.getElementsByTagName("copyright")[0],
			ver = root.getElementsByTagName("version")[0];

		var o = {
			applicationId: _app.applicationID,
			publisherId: _app.publisherID,
			autoExit: _app.autoExit,
			idleThreshold: _app.idleThreshold,
			copyright: (copy && copy.firstChild && copy.firstChild.data) || null,
			version: (ver && ver.firstChild && ver.firstChild.data) || null
		};
		return o;	//	Object
	});
	this.__defineGetter__("version", function(){
		//	summary:
		//		Return a float version of the version of Queued.
		var info = this.info;
		if(info.version){
			return parseFloat(info.version, 10);	//	Float
		}
		return null;	//	Float
	});
	this.__defineGetter__("runtime", function(){
		//	summary:
		//		Return an object representing the current runtime version of AIR.
		var v = _app.runtimeVersion && _app.runtimeVersion.split(".") || [];
		var o = {
			major: v[0] !== undefined && parseInt(v[0], 10) || 0,
			minor: v[1] !== undefined && parseInt(v[1], 10) || 0,
			revision: v[2] !== undefined && parseInt(v[2], 10) || 0,
			build: v[3] !== undefined && parseInt(v[3], 10) || 0
		};
		return o;	//	Object
	});
	this.__defineGetter__("airCheck", function(){
		var o = this.runtime;
		return !(o.major < 1 || o.major==1 && o.minor < 5);
	});

	//	
	//	cleanup functions
	function onExit(evt){
		//	close all the windows and check to make sure they don't stop
		//	the event; if they don't, then go ahead and fire our own exiting
		//	event.
		//air.trace("CLOSURE EXIT")
		if(evt.isDefaultPrevented()){
			return;	//	don't do anything
		}
		self.onExit(evt);
		if(evt.isDefaultPrevented()){
			return;	//	don't do anything
		}
	}

//	since we are init, there should only be one open window.
	window.nativeWindow.addEventListener(air.Event.CLOSING, onExit);

	this.onExit = function(/* air.Event */evt){
		//	summary:
		//		Stub for handling any exiting events.
	};
	this.exit = function(){
		//	summary:
		//		Manually exit the application and call any finalizers.
		//		This *should* call our onExit handlers, above.
		var evt = new air.Event(air.Event.EXITING, false, true); 
		_app.dispatchEvent(evt); 
		if(!evt.isDefaultPrevented()){
			_app.exit(); 
		} 
	};

	//	user idle functions
	this.__defineGetter__("lastInput", function(){
		//	summary:
		//		The time, in seconds, since the last user input on the app.
		return _app.timeSinceLastUserInput;	 //	int
	});
	this.__defineGetter__("idleThreshold", function(){
		//	summary:
		//		Return how long the app will wait (in seconds) before firing the onIdle event.
		return _app.idleThreshold;	//	Integer
	});
	this.__defineSetter__("idleThreshold", function(/* Integer */n){
		//	summary:
		//		Set the idle threshold for the application.
		_app.idleThreshold = n;
	});

	function onIdle(evt){
		self.onIdle(evt);
	}
	function onPresent(evt){
		self.onPresent(evt);
	}
	_app.addEventListener(air.Event.USER_IDLE, onIdle);
	_app.addEventListener(air.Event.USER_PRESENT, onPresent);

	this.onIdle = function(/* air.Event */evt){
		//	summary:
		//		Stub for handling when the user is idle.
		console.log("qd.app.onIdle: FIRING");
	};
	this.onPresent = function(/* air.Event */evt){
		//	summary:
		//		Stub for handling when the user returns from being idle.
		console.log("qd.app.onPresent: FIRING");
	};

	//	checking to see if this is the first time running the app.
	this.onUpgrade = function(/* Float */oldVersion, /* Float */newVersion){
		//	summary:
		//		Stub for when the application is upgraded
		console.warn("Update detected!  Upgrading to version " + newVersion);
		this.splash("Upgrading Queued to version " + newVersion);
		var file = air.File.applicationDirectory.resolvePath("js/updates/commands.js");
		if(file.exists){
			var fs = new air.FileStream();
			fs.open(file, air.FileMode.READ);
			var js = fs.readUTFBytes(fs.bytesAvailable);
			fs.close();
			eval(js);
			if(Updater){
				Updater.invoke(oldVersion, newVersion);
			}
		}
	};
	this.onFirstRun = function(info){
		//	summary:
		//		Stub for when the application is run for the first time
		this.splash("Setting up Queued");
		console.log("qd.app.onFirstRun!");
		console.log(info);
	};

	(function(){
		//	look for the existence of a file.
		var info = self.info,
			version = parseFloat(info.version, 10),
			file = air.File.applicationStorageDirectory.resolvePath("preferences/version.txt"),
			doWrite = false;
		if(file.exists){
			//	check to see the version matches.
			var stream = new air.FileStream(); 
			stream.open(file, air.FileMode.READ); 
			var content = parseFloat(stream.readUTFBytes(stream.bytesAvailable), 10); 
			stream.close(); 
			if(content < version){
				//	we have an updated version.
				self.onUpgrade(content, version);
				doWrite = true;
			}
		} else {
			//	fire the onFirstRun event.
			self.onFirstRun(info);
			doWrite = true;
		}

		//	finally, write the new file if needed.
		if(doWrite){
			var stream = new air.FileStream(); 
			stream.open(file, air.FileMode.WRITE); 
			var content = stream.writeUTFBytes(version); 
			stream.close(); 
		}
	})();

	//	set up the application updater.
	var updater;
	dojo.addOnLoad(dojo.hitch(this, function(){
		this.splash("Setting up the auto-update check");
		try{
			updater = new runtime.air.update.ApplicationUpdaterUI();
			updater.configurationFile = new air.File("app:/updateConfig.xml");
			updater.addEventListener("initialized", function(evt){
				//	let the app finish it's thing first, then go hit for updates.
				setTimeout(function(){
					updater.checkNow();
				}, 15000);
			});
			updater.initialize();
		} catch(ex){
			this.splash("Auto-update setup failed");
			//	swallow this error; for some reason Linux doesn't like
			//	the application updater.
		}
	}));

	//	END APP EVENTS
	
	//	Authorization setup.
	/*=====
	qd.app.__TokenObject = function(key, secret){
		//	summary:
		//		A token object (key/secret pair) for use with OAuth-based services.
		//	key: String
		//		The public key assigned by the OAuth service.
		//	secret: String
		//		The private key assigned by the OAuth service.
		this.key = key;
		this.secret = secret;
	};

	qd.app.__AuthObject = function(consumer, token, userId, sig_method){
		//	summary:
		//		The token/authorization object used by Queued to make any
		//		requests to Netflix to access protected resources.
		//	consumer: qd.app.__TokenObject
		//		The key/secret pair assigned to Queued by Netflix.
		//	token: qd.app.__TokenObject?
		//		The key/secret pair assigned to the User by Netflix.  Will
		//		be null if the user has not completed the authorization process.
		//	userId: String?
		//		The ID of the user as assigned by Netflix.
		//	sig_method: String?
		//		The signature method to be used by the OAuth service. HMAC-SHA1 is 
		//		the default.
		this.consumer = consumer;
		this.token = token;
		this.userId = userId;
		this.sig_method = sig_method || "HMAC-SHA1";
	}
	=====*/
	var acl;
	this.__defineGetter__("authorization", function(){
		//	summary:
		//		Return the private authorization object for OAuth-based requests.
		if(!acl){
			acl = {
				consumer: {
					key:"6tuk26jpceh3z8d362suu2kd",
					secret:"pRM4YDTtqD"
				},
				sig_method: "HMAC-SHA1",
				token: null,
				userId: null
			};
			qd.services.storage.item("token", acl);
		}
		return acl;	//	qd.app.__AuthObject
	});

	this.__defineGetter__("authorized", function(){
		//	summary:
		//		Return whether or not the current user is actually authorized.
		//		Replaces isLoggedIn().
		var signer = this.authorization;
		return (signer.token !== null && signer.userId !== null);	//	Boolean
	});

	this.authorize = function(/* String */token, /* String */secret, /* String */userId){
		//	summary
		//		Set the user's tokens on the ACO.
		if(!token || !secret){
			throw new Error("qd.app.authorize: you must pass the authorization information.");
		}

		var o = this.authorization;

		//	set the token properties
		o.token = {
			key: token,
			secret: secret
		};

		//	set the userId
		o.userId = userId;

		//	drop it into storage.
		qd.services.storage.item("token", o);
		return o;	//	qd.app.__AuthObject
	};

	this.deauthorize = function(){
		//	summary:
		//		Remove the Netflix authorization tokens from the application's acl object.
		var o = this.authorization;
		o.token = null;
		o.userId = null;
		qd.services.storage.item("token", o);

		//	remove the user object from storage.
		qd.app.user(null);
		qd.service.titles.clear();
		qd.service.queues.clear();
		qd.services.clearItems();

		return o;	//	qd.app.__AuthObject
	};

	//	authorization initialization
	dojo.addOnLoad(function(){
		//	try to get the current token out of storage.
		try {
			self.splash("Getting user token");
			acl = qd.services.storage.item("token");
		} catch(ex){
			//	swallow it.
			self.splash("User token not found");
		}
	});

	//	User information
	var user;
	this.user = function(/* Object? */obj){
		//	summary:
		//		An object that represents in memory user information.
		//		If an object is passed, this acts as a setter; if not,
		//		it acts as a getter.  If there is no user object in
		//		memory and it is called as a getter, this will retrieve
		//		it from local storage, if it exists.
		if(obj!==undefined){
			user = obj;
			this.save();
			return user;	//	Object
		}
		if(user){
			return user;	//	Object
		}
		return user = qd.services.storage.item("user");	//	Object
	};

	this.save = function(){
		//	summary:
		//		Store the user object into encrypted local storage.
		var _s = new Date();
		qd.services.storage.item("user", user);
		console.warn("Time to save user info into storage: " + (new Date()-_s) + "ms.");
	};

	dojo.addOnLoad(function(){
		var user = qd.app.user();
		if(user){
			dojo.byId("topNavUser").innerHTML = "Welcome " + user.name.first + " " + user.name.last;
			dojo.byId("prefsUserName").innerHTML = user.name.first + " " + user.name.last;
		}
		else if(!user && qd.app.authorized){
			//	fetching the user information, since it seems to be missing.
			var h = dojo.connect(qd.services.network, "onChange", function(){
				dojo.disconnect(h);
				var dfd = qd.service.user.fetch();
				dfd.addCallback(function(obj){
					qd.app.user(obj);
					dojo.byId("topNavUser").innerHTML = "Welcome " + obj.name.first + " " + obj.name.last;
					dojo.byId("prefsUserName").innerHTML = obj.name.first + " " + obj.name.last;
				});
			});
		}

		if(qd.app.authorized){
			dojo.style("searchBar", "display", "block");
			dojo.removeClass(dojo.body(), "notLoggedIn");
		}
	});

	//	view the source code.
	this.source = function(){
		//	summary:
		//		Open the Adobe source code viewer so one can browse the source tree.
		try {
			var vs = air.SourceViewer.getDefault();
			//	Note that the following exclusions are aimed at a release, and not a debug session.
			vs.setup({ 
				exclude: [ '/lib', '/META-INF', 'mimetype', 'Queued.exe', 'Icon.icns' ],
				colorScheme: 'nightScape'	
			});
			vs.viewSource();
		} catch(ex){
			console.warn("You cannot run the source code viewer in debug mode.");
			console.dir(ex);
		}
	};

	/*=====
	 qd.app.underlay.__Args = function(loader, bodyOnly){
	 	//	summary:
		//		Keyword arguments object to be passed to qd.app.underlay.show.
		//	loader: Boolean?
		//		Specifies whether to show the loading/spinner box.  Defaults to true.
		//	bodyOnly: Boolean?
		//		Specifies whether or not to cover the page header with an underlay element,
		//		as opposed to just covering the body area. Defaults to true.
		this.loader = loader!==undefined? loader: true;
		this.bodyOnly = bodyOnly!==undefined? bodyOnly: true;
	 }
	=====*/ 
	this.underlay = new (function(){
		//	summary:
		//		A singleton object to handle UI blocking for calls that should not
		//		allow user interaction.
		var inc=0;
		this.show = function(/* qd.app.underlay.__Args */kwArgs){
			//	summary:
			//		Show the underlay based on the passed kwArgs.
			if(++inc){
				var u1 = dojo.byId("topMoviesUnderlay"),
					u2 = dojo.byId("queueUnderlay"),
					args = dojo.mixin({loader:true, bodyOnly:true}, kwArgs||{});
				if(u1){
					dojo.style(u1, {display:"block", height:u1.parentNode.scrollHeight});
				}
				if(u2){
					dojo.style(u2, {display:"block", height:u2.parentNode.scrollHeight});
				}
				if(!args.bodyOnly){
					dojo.style("headerUnderlay", "display", "block");
				}
				if(args.loader){
					var n = dojo.byId("loaderNode");
					dojo.style(n, {display:"block", opacity:0});
					dojo.fadeIn({node:n}).play();
				}
			}
		};
		this.hide = function(){
			//	summary:
			//		Hide the underlay.
			if(!--inc){
				var n = dojo.byId("loaderNode");
				if(dojo.style(n, "display") == "block"){
					var anim = dojo.fadeOut({node:n});
					var __ac = dojo.connect(anim, "onEnd", function(){
						dojo.disconnect(__ac);
						dojo.style(n, "display", "none");
					});
					anim.play();
				}
				dojo.style("headerUnderlay", "display", "none");
				dojo.style("topMoviesUnderlay", "display", "none");
				dojo.style("queueUnderlay", "display", "none");
			}
			if(inc < 0){ inc=0; } // handle excessive calls to hide()
		};
	})();

	this.loadingIcon = new (function(){
		//	summary:
		//		A singleton object that represents the loading icon at the top right.
		var showing = false, timer;
		this.__defineGetter__("showing", function(){
			//	summary:
			//		Returns whether or not the icon is currently visible.
			return showing;	//	Boolean
		});
		this.show = function(){
			//	summary:
			//		Show this icon.  If the error icon is visible, don't show it.
			if(qd.app.errorIcon.showing){ return; }
			if(showing){ return; }

			dojo.query(".loadingIndicator, .bgLoadingSpinner").forEach(function(item){
				dojo.style(item, {
					opacity: 1,
					display: "block"
				});
			});
			showing = true;

			//	force it to go away eventually.
			timer = setTimeout(dojo.hitch(this, function(){
				this.hide();
			}), 10000);
		};
		this.hide = function(){
			//	summary:
			//		Hide this icon.
			dojo.query(".loadingIndicator, .bgLoadingSpinner").forEach(function(item){
				item.style.display = "none";
			});
			showing = false;
			if(timer){ 
				clearTimeout(timer);
				timer = null;
			}
		};
	})();

	this.errorIcon = new (function(){
		//	summary:
		//		A singleton object that controls the alert/error icon at the top right.
		var showing = false;
		this.__defineGetter__("showing", function(){
			//	summary:
			//		Returns whether or not the icon is currently visible.
			return showing;	//	Boolean
		});
		this.show = function(){
			//	summary:
			//		Show the icon.
			if(showing){ return; }

			if(qd.app.loadingIcon.showing){
				qd.app.loadingIcon.hide();
			}

			dojo.query(".loadingIndicator, .offlineIndicator").forEach(function(item){
				dojo.style(item, {
					opacity: 1,
					display: "block"
				});
			});
			showing = true;
		};
		this.hide = function(){
			//	summary:
			//		Hide the icon.
			dojo.query(".loadingIndicator, .offlineIndicator").forEach(function(item){
				item.style.display = "none";
			});
			showing = false;
		};
	})();

	this.errorTooltip = new (function(){
		//	summary:
		//		A singleton object that controls the error tooltip, shown at the top right.
		var fader, timeout, delay = 5000, duration = 1600, endHandle;
		this.show = function(/* String */title, /* String */msg, /* Boolean? */persistIcon){
			//	summary:
			//		Show the indicator toolip with the given message parts.
			//	title: String
			//		The main message to show the user.
			//	msg: String
			//		The explanation for the user as to what happened.
			//	persistIcon: Boolean?
			//		Leave the icon showing if this is true.  Defaults to false.
			title = title || "An unknown error occured.";
			msg = msg || "A unknown error occured with your last action.";
			persistIcon = (persistIcon !== undefined) ? persistIcon : false;
			var n = dojo.byId("indicatorTooltip");

			if(timeout){
				clearTimeout(timeout);
			}

			//	stop the fader.
			if(fader){
				fader.stop();
				fader = null;
			}

			//	set the messages.
			dojo.query("h1,p", n).forEach(function(node){
				if(node.tagName.toLowerCase() == "h1"){
					node.innerHTML = title;
				} else {
					node.innerHTML = msg;
				}
			});

			//	show the error icon.
			qd.app.errorIcon.show();

			//	show the node.
			dojo.style(n, {
				opacity: 1,
				display: "block"
			});

			//	set up the fader
			setTimeout(function(){
				fader = dojo.fadeOut({ node: n, duration: duration });
				endHandle = dojo.connect(fader, "onEnd", function(){
					n.style.display = "none";
					dojo.disconnect(endHandle);
					endHandle = null;

					if(!persistIcon){
						setTimeout(function(){
							qd.app.errorIcon.hide();
						}, 1000);
					}
				});
				fader.play();
			}, delay);
		};

		this.hide = function(){
			//	summary:
			//		Force the tooltip to be hidden.
			qd.app.errorIcon.hide();

			var n = dojo.byId("indicatorTooltip");
			if(timeout){
				clearTimeout(timeout);
				timeout = null;
			}

			if(fader){
				fader.stop();
				fader = null;
			}

			if(endHandle){
				dojo.disconnect(endHandle);
				endHandle = null;
			}
			n.style.display = "none";
		};
	})();

	//	deal with the online / offline indicators.
	dojo.addOnLoad(function(){
		dojo.connect(qd.services.network, "onChange", function(state){
			if(state){
				//	we're online, hide the error stuff if needed.
				qd.app.errorTooltip.hide();
			} else {
				qd.app.errorTooltip.show(
					"Cannot reach the Netflix servers.",
					"Ratings and Queue changes will by synced to Netflix when a connection can be re-established.",
					true
				);
			}
		});
	});

	this.switchPage = function(/* String */page){
		//	summary:
		//		Change to another top-level application page.
		//	page:
		//		"yourQueue", "topMovies", "auth", "preferences
		var divId, menuId, bkClass;
		switch(page){
			case "yourQueue":
				divId = "queueContentNode";
				menuId = "bigNavYourQueue";
				bkClass = false;
				break;
			case "topMovies":
				divId = "topMoviesContainerNode";
				menuId = "bigNavTopMovies";
				bkClass = false;
				break;
			case "auth":
				divId = "authContentNode";
				menuId = "";
				bkClass = true;
				break;
			case "preferences":
				divId = "prefsContainerNode";
				menuId = "";
				bkClass = true;
				break;
		}

		dijit.byId("contentNode").selectChild(divId);	
		qd.app.selectNav(menuId, "bigNav");
		if(page == "topMovies"){
			qd.app.topMovies.checkForRefresh();	
		}
		
		// changes the background color of the app to
		// more closely match the current page. Helps hide
		// blemishes on window resize. 
		if(bkClass){
			dojo.addClass(dojo.body(), "blueBk");
		}else{
			dojo.removeClass(dojo.body(), "blueBk");
		}
	};
	
	this.selectNav = function(/* String */navItemId, /* String */navId){
		//	summary:
		//		Toggle selection styles for navigation items (just does
		//		the styling part; it doesn't actually set container node
		//		visibility or anything)
		//	navItemId:
		//		ID of the nav item to mark as selected
		//	navId:
		//		ID of the list in which the toggling is occurring
		dojo.query("#"+navId+" li").removeClass("selected");
		if (navItemId) {
			dojo.addClass(dojo.byId(navItemId), "selected");
		}
	};

	this.setTopRightNav = function(/* String */username){
		//	summary:
		//		Set up the navigation (username, prefs) on the top right of the screen.
		if(username){
			dojo.byId("topNavUser").innerHTML = "Welcome " + username;
			dojo.byId("prefsUserName").innerHTML = username;
		}
	};

	// single point of contact to determine when and/or whether some DnD is happening;
	var _isDragging = false;
	this.isDragging = function(){
		//	summary:
		//		Return whether or not something is being dragged.
		return _isDragging;	//	Boolean
	};
	this.startDragging = function(){
		//	summary:
		//		Set the isDragging flag
		_isDragging = true;
	}
	this.stopDragging = function(){
		//	summary:
		//		Unset the isDragging flag.
		_isDragging = false;
	}
	//	setup the dragging topics
	dojo.subscribe("/dnd/start", this, "startDragging");
	dojo.subscribe("/dnd/cancel", this, "stopDragging");
	dojo.subscribe("/dnd/drop", this, "stopDragging");

	//	set up the application-level behaviors
	dojo.behavior.add({
		// Top-level navigation
		"#bigNavTopMovies a": {
			onclick:dojo.hitch(this, function(){
				this.switchPage("topMovies");
				return false;
			})
		},
		
		// Top-level navigation
		"#bigNavYourQueue a": {
			onclick:dojo.hitch(this, function(){
				this.switchPage("yourQueue");
				return false;
			})
		}
	});
})();
