dojo.provide("qd.services.storage");
dojo.require("dojox.encoding.crypto.SimpleAES");

(function(){
	qd.services.storage = new (function(/* Boolean? */useCompression, /* Boolean? */useELS){
		//	summary:
		//		A singleton object that acts as the broker to the Encrypted Local Storage of AIR.
		var compress = useCompression || false;
		var _els = (useELS !== undefined) ? useELS : true;

		//	basic common functionality
		var withEls = function(){
			var els = air.EncryptedLocalStore,
				ba = air.ByteArray;

			return {
				item: function(/* String */key, /* Object? */value){
					//	summary:
					//		Provide a dojo-like interface for getting and
					//		setting items in the Store.
					if(key === null || key === undefined || !key.length){
						throw new Error("qd.services.storage.item: you cannot pass an undefined or empty string as a key.");
					}

					if(value !== undefined){
						//	setter branch
						var stream = new ba();
						stream.writeUTFBytes(dojo.toJson(value));
						if(compress){
							stream.compress();
						}

						els.setItem(key, stream);
						return value;	//	Object
					}

					//	getter branch
					var stream = els.getItem(key);
					if(!stream){
						return null;	//	Object
					}

					if(compress){
						try {
							stream.uncompress();
						} catch(ex){
							//	odds are we have an uncompressed thing here, so simply kill it and return null.
							els.removeItem(key);
							return null;	//	Object
						}
					}

					//	just in case, we make sure there's no "undefined" in the pulled JSON.
					var s = stream.readUTFBytes(stream.length).replace("undefined", "null");
					return dojo.fromJson(s);	//	Object
				},

				remove: function(/* String */key){
					//	summary:
					//		Remove the item at key from the Encrypted Local Storage.
					if(key === null || key === undefined || !key.length){
						throw new Error("qd.services.storage.remove: you cannot pass an undefined or empty string as a key.");
					}
					els.removeItem(key);
				},

				clear: function(){
					//	summary:
					//		Clear out anything in the Encryped Local Storage.
					els.reset();
					qd.services.storage.onClear();
				}
			};
		};

		var noEls = function(){
			//	great, this is busted.  redefine everything.  Note that this is kind of insecure, because
			//	the key is hardcoded here :(
			var storageKey = "Mtmu4zx9LzS5cA==",
				dir = air.File.applicationStorageDirectory,
				path = "queued-storage",
				aes = dojox.encoding.crypto.SimpleAES,
				store = {};

				//	initialize the store
				var file = dir.resolvePath(path),
					fs = new air.FileStream();

				fs.open(file, air.FileMode.UPDATE);
				if(fs.bytesAvailable){
					var a = fs.readUTF().split("\n");
					dojo.forEach(a, function(item){
						var tmp = item.split("="),
							key = aes.decrypt(tmp[0], storageKey),
							value = dojo.fromJson(aes.decrypt(tmp[1], storageKey));
						store[key] = value;
					});
				}
				fs.close();

				function save(){
					// save the file.
					var file = dir.resolvePath(path),
						fs = new air.FileStream();

					fs.open(file, air.FileMode.WRITE);
					var a = [];
					for(var key in store){
						a.push(aes.encrypt(key, storageKey) + "=" + aes.encrypt(dojo.toJson(store[key]), storageKey));
					}
					fs.writeUTF(a.join("\n"));
					fs.close();
				}

			return {
				item: function(key, value){
					if(value !== undefined){
						//	setter branch.
						store[key] = value;
						save();
						return value;
					}
					// getter branch.
					return store[key] || null;
				},
				remove: function(key){
					if(store[key] !== undefined){
						delete store[key];
						save();
					}
				},
				clear: function(){
					store = {};
					save();
					qd.services.storage.onClear();
				}
			};
		};

		this.onClear = function(){
			//	summary:
			//		Stub function to run anything when the storage is cleared.
		};

		//	test to make sure we have an ELS that's not busted, and if it is, hand-roll storage instead.
		if(_els){
			try {
				withEls.item("els-test", true);
				var test = withEls.item("els-test");
				if(test){
					dojo.mixin(this, withEls());
				}
				console.log("Using the EncryptedLocalStorage!");
			} catch(ex){
				dojo.mixin(this, noEls());
				console.log("Using the Handrolled Storage!");
			}
		} else {
			dojo.mixin(this, noEls());
			console.log("Using the Handrolled Storage!");
		}
	})();
 })();
