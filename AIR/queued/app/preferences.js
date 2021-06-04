dojo.provide("qd.app.preferences");

dojo.require("dojo.behavior");

(function(){
	
	function handleExternalLink(evt){
		//	summary: Open a link in the system browser.
		air.navigateToURL(new air.URLRequest(evt.target.href));
		return false;
	}
	
	function onClickRunBackground(/*Event*/evt){
		//	summary: Toggle "run in background" mode.
		var checkbox = evt.target;
		console.log(dojo.attr(checkbox, "checked"));
		var u = qd.app.user();
		if(u){
			u.runInBackground = dojo.attr(checkbox, "checked");
			qd.app.save(u);
		}
	}
	
	function onClickReceiveNotifications(/*Event*/evt){
		//	summary: Toggle receiving of notifications.
		var checkbox = evt.target;
		console.log(dojo.attr(checkbox, "checked"));
		var u = qd.app.user();
		if(u){
			u.receiveNotifications = dojo.attr(checkbox, "checked");
			qd.app.save(u);
		}
	}

	function init(){
		//	summary: Startup code for the Preferences system.

		// first, make links in the Preferences pane open in the system default
		// browser; we can't use dojo.behavior for this because we need to
		// override the actual onclick handler (so we can make it return false)
		// and dojo.behavior just dojo.connect()s
		dojo.query("a.extern", dojo.byId("prefsContainerNode")).forEach(function(n){
			n.onclick = handleExternalLink;
		});

		dojo.query(".prefsAbout .prefsTitle").connect("onclick", function(evt){
			if(evt.shiftKey){
				air.navigateToURL(new air.URLRequest("http://www.youtube.com/watch?v=gWOzUzJd6wM"));
			}
		});

		// next, behavior setup(s)
		dojo.behavior.add({
			"#deauth": {
				onclick:function(){
					dojo.style(dojo.byId("deauthConfirm"), "display", "block");
					//qd.app.deauthorize();
					return false;
				}
			},
			"#deauthConfirmDelete": {
				onclick:function(){
					qd.app.deauthorize();
					return false;
				}
			},
			"#deauthConfirmKeep": {
				onclick:function(){
					dojo.style(dojo.byId("deauthConfirm"), "display", "none");
					return false;
				}
			},
			"#topNavPreferences a": {
				onclick:function(){
					qd.app.switchPage("preferences");
					return false;
				}
			},
			"#runInBackground": {
				onclick:function(evt){
					onClickRunBackground(evt);
					return false;
				}
			},
			"#receiveNotifications": {
				onclick:function(evt){
					onClickReceiveNotifications(evt);
					return false;
				}
			}
		});
		dojo.behavior.apply();

		// set checkboxes according to user prefs
		var u = qd.app.user(),
		    receiveNotifications = u && u.receiveNotifications !== undefined && u.receiveNotifications || false,
		    runInBackground = u && u.runInBackground !== undefined && u.runInBackground || false;
		dojo.attr(dojo.byId("receiveNotifications"), "checked", receiveNotifications);
		dojo.attr(dojo.byId("runInBackground"), "checked", runInBackground);
	}
	dojo.addOnLoad(init);
})();
