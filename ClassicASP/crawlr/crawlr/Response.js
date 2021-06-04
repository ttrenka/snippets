crawlr.Response=new (function(r){
	var self=this;
	
	var buffer="";
	var buffers={};

	var token=":!::#::!:";
	var allowDups=false;

	//	markers, for non-linear writing
	this.allowDuplicateMarkers=function(b){
		if(typeof(b)!="undefined") allowDups=b;
		return allowDups;
	};
	this.addMarker=function(key){
		//	create a new buffer and insert a token when it belongs in the main buffer
		if(buffers[key]){
			if(allowDups){
				buffer+=token.replace("#", key);
			}
		} else {
			buffers[key]="";
			buffer+=token.replace("#", key);
		}
		return this;
	};
	this.dropMarker=function(key){
		var mark=token.replace("#", key), flags=(allowDups)?"gi":"i";
		var re=new RegExp(mark, flags);
		buffer=buffer.replace(re, "");
		delete buffers[key];
		return this;
	};
	this.hasMarker=function(key){
		return (buffers[key] != undefined);
	};
	this.getMarkers=function(){
		var a=[];
		for(var key in buffers) a.push(key);
		return a;
	};
	this.getBuffers=function(){
		return crawlr.mixin({}, buffers);
	};

	/*********************************************************************
	 *	Actual response methods
	 *
	 *	Note that this is designed to shoot the entire response out at
	 *	the end, and not do any kind of incremental flush.  The idea
	 *	is that instead of dealing with the usual header rules, plus other
	 *	things, you can set things at any time during the page build,
	 *	and always call crawlr.Response.end() to flush everything out.
	 *
	 *	Without a call to crawlr.Response.end(), you will NOT get any
	 *	data back.
	 *********************************************************************/
	this.write=function(s, key){
		//	can't check for the string here, JScript returns false if string.length==0
		if(buffers[key]!=undefined){
			buffers[key]+=s;
		}else{
			buffer+=s;
		}
		return this;
	};
	
	this.includeBuilder=function(builder, node){
		// only builders in the content/_crawlr dir are supported
		var s=crawlr.read(crawlr.config.directory() + "_crawlr\\" + builder + ".crawlr");
		if(s.length){
			var fn=new Function("node", s);
			fn(node);
		}
		return this;
	};

	this.flush=function(key){
		if(key){
			//	just flushing the specified buffer
			var mark=token.replace("#", key), flags=(allowDups)?"gi":"i";
			var re=new RegExp(mark, flags);
			buffer=buffer.replace(re, buffers[key]);
			buffers[key]="";
		} else {
			//	flush all the custom buffers first
			for(var key in buffers){
				var mark=token.replace("#", key), flags=(allowDups)?"gi":"i";
				var re=new RegExp(mark, flags);
				buffer=buffer.replace(re, buffers[key]);
				buffers[key]="";
			}
			
			r.Write(buffer);
			if(r.Buffer) r.Flush();
			buffer="";
		}
		return this;
	};

	this.end=function(){
		//	set any custom headers
		if(contentType.length>0) r.ContentType=contentType;
		if(charSet.length>0) r.Charset=charSet;
		if(expires>-1) r.Expires=expires;
		for(var key in headers){
			r.addHeader(key, headers[key]);
		}
		
		this.flush();
		r.End();
		return this;
	};

	this.clear=function(){
		buffer="";
		buffers={};
		r.Clear();
		return this;
	};

	//	other response method wrappers
	this.redirect=function(url, status){
		Response.Status = status || 301;
		Response.addHeader("location", url);
		Response.End();
	};

	var headers={};
	var contentType="";
	var charSet="";
	var expires=-1;
	this.addHeader=function(key, val){
		//	note that unlike ASP, this DOES swap values.
		if(key=="Content-Type"){
			contentType=val;
		} else if (key=="charset"){
			charSet=val;
		} else if (key=="expires"){
			expires=val;
		} else {
			headers[key]=val;
		}
	};

	this.clearHeaders=function(){
		headers={};
		contentType="";
		charSet="";
		expires=-1;
		return this;
	};

	//	cookie handling; just wrap the response ones for now.
	this.cookies=r.Cookies;

	//	finally, set the defaults on the Response object
	r.Buffer=true;
	r.CacheControl="Public";
})(Response);
