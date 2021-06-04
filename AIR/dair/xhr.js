dojo.provide("dair.xhr");

dojo.mixin(dair.xhr, {

	send: function(url){
		console.log("SEND XHR: ", url);
		
		var def = new dojo.Deferred();
		//var url = "http://api.netflix.com/oauth/request_token?oauth_consumer_key=6tuk26jpceh3z8d362suu2kd&oauth_nonce=57426757877692584&oauth_signature=SH1U8DAPsD0BoEwCT4fn5hcWdIM%3D&oauth_signature_method=HMAC-SHA1&oauth_timestamp=1228322557"
		
		var req = new air.URLRequest(url);
		req.method = "GET";
		
		var xhr = new air.URLLoader();
		
		xhr.addEventListener(air.IOErrorEvent, dojo.hitch(this, function(data){
			console.log("IOErrorEvent:", data)
		}));
		
		xhr.addEventListener(air.SecurityErrorEvent, dojo.hitch(this, function(data){
			console.log("SecurityErrorEvent:", data)
		}));
		
		xhr.addEventListener(air.HTTPStatusEvent.HTTP_RESPONSE_STATUS, dojo.hitch(this, function(data){
			console.log("HTTPStatusEvent:", data)
		}));
		
		xhr.addEventListener(air.Event.COMPLETE, dojo.hitch(this, function(event){
			console.log("COMPLETE:", event);
			console.log("data " + event.target.data);
			def.callback(event.target.data);
			delete def;
		}));
		
		xhr.load(req);
		
		return def;
		
		dojo.connect(xhr, air.Event.COMPLETE, this, function(data){
			console.log("COMPLETE:", data)
		});
		
		dojo.connect(xhr, air.HTTPStatusEvent, this, function(data){
			console.log("HTTPStatusEvent:", data)
		});
		
		dojo.connect(xhr, air.SecurityErrorEvent, this, function(data){
			console.log("SecurityErrorEvent:", data)
		});
		
		//console.log("air.HTTPStatusEvent:", air.HTTPStatusEvent)
		//console.log("air.SecurityErrorEvent:", air.SecurityErrorEvent)
		//console.log("air.Event:", air.Event)
		
		
		//
	}
});