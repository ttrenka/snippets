dojo.provide("qd.services.util");

(function(){
	var reHexEntity=/&#x([^;]+);/g,
		reDecEntity=/&#([^;]+);/g;

	dojo.mixin(qd.services.util, {
		//	summary:
		//		A set of utility methods used throughout the Queued service layers.
		prepare: function(/* Object */args, /* dojo.Deferred? */d){
			//	summary:
			//		Prepare any deferred (or create a new one) and set
			//		up the callback/errback pair on it.  args.result
			//		is the callback, args.error is the errback.  Used
			//		primarily by the communication services (online/offline).
			var dfd = d || new dojo.Deferred();
			if(args.result){
				dfd.addCallback(function(data, ioArgs){
					args.result.call(args, data, ioArgs);
				});
			}
			if(args.error){
				dfd.addErrback(function(evt, ioArgs){
					args.error.call(args, evt, ioArgs);
				});
			}
			return dfd;	//	dojo.Deferred
		},

		mixin: function(/* Object */dest, /* Object */override){
			//	summary:
			//		Custom mixin function that is considered "additive", as
			//		opposed to simply overriding.
			//	description:
			// 		Custom mixin function to stamp the properties from override
			// 		onto dest without clobbering member objects as you would in
			// 		a shallow copy like dojo.mixin does; this isn't particularly
			// 		robust or fast, but it works for our title and queue item objects.
			//
			// 		The basic property handling rules are:
			// 			- null doesn't overwrite anything, ever
			// 			- scalars get overwritten by anything, including new scalars
			// 			- arrays get overwritten by longer arrays or by objects
			// 			- objects get merged by recursively calling mixin()
			for(k in override){
				if(override[k] === null || override[k] === undefined){ continue; }
				if(dojo.isArray(override[k])){
					if(dojo.isArray(dest[k])){ // the longest array wins!
						if(override[k].length > dest[k].length){
							dest[k] = override[k].slice(0);	//	make a copy of the override.
						}
					} else {
						if(!dojo.isObject(dest[k])){
							dest[k] = override[k].slice(0);
						}
					}
				}
				else if(dojo.isObject(override[k])){
					if(dest[k] !== null && dojo.isObject(dest[k])){
						dest[k] = qd.services.util.mixin(dest[k], override[k]);
					}else{
						dest[k] = qd.services.util.mixin({}, override[k]);
					}
				}
				else{
					if(dest[k] === null || (!dojo.isArray(dest[k]) && !dojo.isObject(dest[k]))){
						if(!dest[k]){
							dest[k] = override[k];
						} else if (dest[k] && override[k] && dest[k] != override[k]){
							dest[k] = override[k];
						}
					}
				}
			}
			return dest;	//	Object
		},
		clean: function(/* String */str){
			//	summary:
			//		Pull out any HTML tags and replace any HTML entities with the
			//		proper characters.  Used primarily for the description/synopsis
			//		of a title coming from one of the Netflix public RSS feeds.
			return str.replace(reHexEntity, function(){		//	String
					return String.fromCharCode(parseInt(arguments[1],16));
				})
				.replace(reDecEntity, function(){
					return String.fromCharCode(parseInt(arguments[1],10));
				})
				.replace(/\&quot\;/g, '"')
				.replace(/\&apos\;/g, "'")
				.replace(/\&amp\;/g, "&")
				.replace(/<[^>]*>/g, "");
		},
		image: {
			//	summary:
			//		Helper functions for caching images for offline.
			url: function(url){
				//	summary:
				//		Return the best url for the image.
				//	url: String
				//		The Netflix URL to check against the local cache.
				var file = air.File.applicationStorageDirectory.resolvePath(url.replace("http://", ""));
				if(file.exists){
					return file.url;
				}
				return url;	//	String
			},
			store: function(url){
				//	summary:
				//		Return the best url for the image.
				//	url: String
				//		The Netflix URL to store to the local cache.
				var l = new air.URLLoader(), u = new air.URLRequest(url);
				var dfd = new dojo.Deferred();
				l.dataFormat = air.URLLoaderDataFormat.BINARY;

				//	save the data once it has completed loading.
				l.addEventListener(air.Event.COMPLETE, function(evt){
					//	make sure the cache directory is created
					var tmpUrl = url.replace("http://", "");
					var file = air.File.applicationStorageDirectory.resolvePath(tmpUrl);

					//	this branch shouldn't happen but just in case...
					if(file.exists){
						file.deleteFile();
					}

					//	open up the file object for writing.
					var fs = new air.FileStream();
					fs.open(file, air.FileMode.WRITE);
					fs.writeBytes(l.data, 0, l.data.length);
					fs.close();

					//	fire the callback
					dfd.callback(file.url, url);
				});

				//	do something about an error
				l.addEventListener(air.IOErrorEvent.IO_ERROR, function(evt){
					dfd.errback(url, evt);
				});

				//	just in case a security error is thrown.
				l.addEventListener(air.SecurityErrorEvent.SECURITY_ERROR, function(evt){
					dfd.errback(url, evt);
				});

				//	load the URL.
				l.load(u);
				return dfd;	//	dojo.Deferred
			}
		}
	});
})();
