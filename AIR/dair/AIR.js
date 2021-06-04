dojo.provide("dair.AIR");
dojo.require("dair.Aliases"); 

(function(){
	// 	summary: 
	//	 	The AIR Helper package. Provides all necessary scripts to run an AIR 
	//		application; mainly AIRAliases, and AIRIntrospector, but also includes 
	//		Console, which extends AIRIntrospector, giving it Firebug-like features. 
	// 	description:
	//		Mostly a convenience class, by converting the AIR files into a dojo.require. 
	//		
	//		Include the djConfig first (and any AIR parameters - see Console), then the 
	//		dojo script tag, then dojo.require("dair.AIR") - then the rest of your 
	//		requires.
	// 		No public methods or properties.
	//	example:
	//		| dojo.require("dair.AIR");
	//
	var airscripts = {
		//this gets loaded twice, but needs to in order to work
		Aliases: dojo.moduleUrl("dair","Aliases.js"), 
		Introspector: dojo.moduleUrl("dair","AIRIntrospector.js"),
		Console: dojo.moduleUrl("dair","Console.js"),
		Log: dojo.moduleUrl("dair","Log.js"),
		Refresh: dojo.moduleUrl("dair","reloader.js")
	};
	
	var getScriptElement = function(){
		var newScript = document.createElement('script');
		newScript.type = 'text/javascript';
		var head = document.getElementsByTagName("head")[0];
		if(!head){
			head = document.getElementsByTagName("html")[0];
		}
		head.appendChild(newScript);
		return newScript;
	};
	
	var loadScript = function(url){
		var d = new dojo.Deferred();
		var onLoadScript = function(){
			d.callback(url);
		};
		var s = getScriptElement();
		s.src = url;
		s.onload=onLoadScript;
		s.onreadystatechange=onLoadScript;
		return d;
	};
	var userConfig = dojo.config.airConfig || {};
	
	var loadQueue = function(){
		// The 1.5 Introspector takes forever to load. Instead of doing
		// some sort of "onload", let's just queue the calls to it and send them
		// when it's good and ready. Should have done this in 1.0 to be safe anyway.
		var methods = ["log", "debug", "info", "warn", "dir", "dirxml", "error", "trace", "assert", "count", "time", "timeEnd", "group", "groupEnd", "profile", "profileEnd"];
		window.console = {};
		var queue = [];
		dojo.forEach(methods, function(m){
			console[m] = function(){
				queue.push({method:m, args:arguments});
			}
		});
		console.trace = function(_value){
			var stackAmt = _value || 3;
			var f = console.trace.caller; //function that called trace
			console.log(">>> console.trace(stack)");
			for(var i=0;i<stackAmt;i++){
				var func = f.toString();
				var args=[];
				for (var a = 0; a < f.arguments.length; a++) {
					args.push(f.arguments[a])
				}
				if(f.arguments.length){
					console.dir({"function":func, "arguments":args});	
				}else{
					console.dir({"function":func});
				}
				
				f = f.caller;
			}	
		};
		window.outputQueue = function(){
			dojo.forEach(queue, function(q){
				console[q.method].apply(console, q.args);
			});
		}
	}
	
	if (dojo.config.isDebug){
		loadQueue();
	}
				
				
	loadScript(airscripts.Aliases).addCallback(function(){
		if(dojo.config.isDebug){
			if(!userConfig.terminal){
				if (userConfig.file) {
					loadScript(airscripts.Log).addCallback(function(){
						loadScript(airscripts.Console);
					});
				} else {
					loadScript(airscripts.Introspector).addCallback(function(){
						loadScript(airscripts.Console);
					});
				}
			}else{
				loadScript(airscripts.Console);
			}
			// no dependency; just load
			if(userConfig.refresh){
				loadScript(airscripts.Refresh);
			}
		}
	});
	
})();