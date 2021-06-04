dojo.provide("qd.services.offline.user");

(function(){
 	dojo.mixin(qd.services.offline.user, {
		//	summary:
		//		Return the user information out of the cache.
		fetch: function(){
			//	summary:
			//		Return the cached user object if we are authorized.
			var dfd = new dojo.Deferred();
			var fn = function(){
				dfd.errback(new Error("qd.service.user.fetch: you must authorize the application to fetch user details."));
			};

			setTimeout(function(){
				dfd.callback(qd.app.user());
			}, 10);
			return dfd;	//	dojo.Deferred
		}
	});
})();
