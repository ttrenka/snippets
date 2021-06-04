dojo.provide("qd.services.authorization");
dojo.require("dojox.io.OAuth");

(function(){
	var auth = qd.services.authorization;
	
	auth.request = function(){
		//	summary:
		//		In the event of a new user, we need to request a user's access token.  This is
		//		done through a non-standard handshake process. Based on Mike Wilcox's original 
		//		oauth handshake.

		var dfd = new dojo.Deferred(),
			token = qd.app.authorization;

		var kwArgs = {
			url: "http://api.netflix.com/oauth/request_token",
			handleAs: "text",
			error: function(err, ioArgs){
				dfd.errback("auth", ioArgs.xhr.responseText);
			},
			load: function(response, ioArgs){
				//	this should force us to open the window for the Netflix auth handshake.
				var a = response.split("&"),
					o = {};
				dojo.forEach(a, function(item){
					var pair = item.split("=");
					o[pair[0]] = unescape(pair[1]);
				});

				var url = "http://api-user.netflix.com/oauth/login?"
					+ "application_name=" + o.application_name
					+ "&oauth_consumer_key=" + token.consumer.key
					+ "&oauth_token=" + o.oauth_token;

				//	temporarily set the token for the second part of the handshake.
				token.token = {
					key: o.oauth_token,
					secret: o.oauth_token_secret
				};

				//	open up the new window for authorization
				var win1 = new dair.Window({
					size: { h: 525, w: 350, t: 100, l: 100 },
					href: url,
					resizable: false,
					alwaysInFront: true,
					maximizable: true,
					minimixeable: false
				});

				//	add event listeners on the window.
				var seenOnce = false;
				var v = setInterval(function(){
					var wurl = win1._window.location;
					if(wurl != url){
						if(!seenOnce && wurl=="https://api-user.netflix.com/oauth/login"){
							seenOnce = true;
							return;
						} 
						else if(wurl=="http://www.netflix.com/TermsOfUse"){
							//looking at the terms of use. Don't know how to get them back.
							return;
						}
						else if(wurl.indexOf("Failed")>0){
							//	TODO: fire off the errback and kill the timer?
							return;
						}
						clearInterval(v);
						v = null;
						win1.close();
					}
				}, 1000);
				var c2 = dojo.connect(win1, "onClose", function(){
					if(v){
						dfd.errback("user");
						clearInterval(v);
						dojo.disconnect(c2);
						return;
					}

					//	we're good to go, so go get the access token
					dojo.xhrGet(dojox.io.OAuth.sign("GET", {
						url: "http://api.netflix.com/oauth/access_token",
						handleAs: "text",
						error: function(err, ioArgs){
							dfd.errback("auth");
						},
						load: function(response, ioArgs){
							var a = response.split("&"), o = {};
							dojo.forEach(a, function(item){
								var p = item.split("=");
								o[p[0]] = unescape(p[1]);
							});
							qd.app.authorize(o.oauth_token, o.oauth_token_secret, o.user_id);
							dfd.callback(o.user_id);	//	original used the username, should see if we can grab that.
						}
					}, token), false);
				});
			}
		};

		dojo.xhrGet(dojox.io.OAuth.sign("GET", kwArgs, token), false);
		return dfd;		//	dojo.Deferred
	};
})();
