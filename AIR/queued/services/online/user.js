dojo.provide("qd.services.online.user");

(function(){
	var ps = qd.services.parser;
	dojo.mixin(qd.services.online.user, {
		//	summary:
		//		The online-based service to fetch user information (user name, prefs, etc.)

		/*=====
		qd.services.onilne.user.fetch.__FetchArgs = function(result, error){
			//	summary:
			//		The keyword arguments object passed to fetch.
			//	result: Function?
			//		The callback to be fired on success.
			//	error: Function?
			//		The errback to be fired in case of an error.
		}
		=====*/
		fetch: function(/* qd.services.online.user.fetch.__FetchArgs */kwArgs){
			//	summary:
			//		Fetch the current user's information from the Netflix servers.
			var dfd = new dojo.Deferred(),
				signer = qd.app.authorization;

			dojo.xhrGet(dojox.io.OAuth.sign("GET", {
				url: "http://api.netflix.com/users/" + signer.userId,
				handleAs: "xml",
				load: function(xml, ioArgs){
					var o = ps.users.fromXml(xml.documentElement);
					dfd.callback(o, ioArgs);
				},
				error: function(err, ioArgs){
					console.error("qd.services.online.user.fetch: ", err);
					dfd.errback(err);
				}
			}, signer), false);
			return dfd;	//	dojo.Deferred
		}
	});
})();
