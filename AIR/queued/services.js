dojo.provide("qd.services");

//	This file is primarily a package loader, and initializer.
dojo.require("qd.services.util");
dojo.require("qd.services.storage");
dojo.require("qd.services.data");
dojo.require("qd.services.network");
dojo.require("qd.services.parser");
dojo.require("qd.services.online");
dojo.require("qd.services.offline");
dojo.require("qd.services.authorization");

(function(){
	var storage = qd.services.storage,
		network = qd.services.network,
		db = "queued.db",
		dbProp = "OUhxbVZ1Mtmu4zx9LzS5cA==",
		pwd;

	dojo.connect(storage, "onClear", function(){
		//	push the database access info back into storage.  Basically if we don't have
		//	the password, probably we're at re-initializing everything.
		if(pwd){
			storage.item(dbProp, pwd);
		}
	});

	qd.services._forceCreate = false;
	qd.services.init = function(){
		//	summary:
		//		Initialize the Queued services.
		qd.app.splash("Getting database password");
		pwd = storage.item(dbProp);
		if(!pwd){
			qd.app.splash("Generating database password");
			//	generate a new password for the database service and store it.
			var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*~?0123456789-_abcdefghijklmnopqrstuvwxyz",
				key = "";
			for(var i=0; i<16; i++){
				key += tab.charAt(Math.round(Math.random()*tab.length));
			}
			pwd = storage.item(dbProp, key);
			qd.app.splash("Password generated (" + pwd.length + ")");
		}

		if(qd.app.airCheck){
			qd.app.splash("Initializing network monitor");
			qd.services.network.start();
			qd.app.splash("Initializing database services");
			qd.services.data.init(pwd, db, qd.services._forceCreate);
		} else {
			qd.app.splash("AIR runtime check failed");
		}
	};

	var registry = {}, titleRegistry = {};
	qd.services.item = function(/* String | Object */item){
		//	summary:
		//		Registry operations.  If item is a string,
		//		this acts as a getter.  If it is an object,
		//		it acts as a setter.  Note that this should
		//		work for *any* object in the system, not just
		//		titles.
		if(dojo.isString(item)){
			return registry[item] || null;	//	Object
		}

		//	assume it's an object.
		if(item && !item.guid){
			console.warn("qd.services.item: the passed item has no guid!", item);
			return null;	//	Object
		}

		var tmp = registry[item.guid];
		if(tmp){
			item = qd.services.util.mixin(tmp, item);
		}

		registry[item.guid] = item;
		if(item.title){
			titleRegistry[item.title] = item;
		}
		return item;	//	Object
	};

	qd.services.itemByTerm = function(/* String */term){
		//	summary:
		//		Find any objects in the registry based on a title.
		//		If found, return it.
		return titleRegistry[term];	//	Object
	};

	qd.services.clearItems = function(){
		//	summary:
		//		Clear out any in-memory items that have been cached.
		registry = {};
		titleRegistry = {};
	};
})();
