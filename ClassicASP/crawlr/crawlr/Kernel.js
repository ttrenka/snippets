crawlr.Kernel = new (function(){
	var c=crawlr;
	var current=null;
	var builders=[];

	//	keep track of reinitialization
	var initAttempts=0;
	var reinit=false;
	var initLimit=5;	//	arbitrary

	function getBuilders(a){
		if(a){
			for(var i=0, l=a.length; i<l; i++){
				var t = c.read(crawlr.config.directory() + a[i]) || "",
					fn = new Function("node", t);
				fn.path=a[i];
				builders.push(fn);
			}
		}
	}

	this.initialize=function(url){
		reinit=true;
		initAttempts++;

		//	clear everything out.
		current = null;
		builders = [];

		// check the url for debug or bypassCache settings
		var d = crawlr.Request.GET.get("debug"), bc = crawlr.Request.GET.get("bypassCache");
		if(d && d=="1"){ crawlr.config.isDebug(true); }
		if(bc && bc=="1"){ crawlr.config.bypassCache(true); }
		
		//	get the current node based on the passed URL, the actual URL, or default to the index page.
		url = crawlr.stripUrlSlashes(url || c.Request.GET.get("get") || "");
		console.debug("crawlr.Kernel.initialize: url [" + url + "]");
		
		current = c.Directory.byUrl(url);
		console.log("crawlr.initialize: The current node is ", current.url, " (", current.type, "::", current.name||"", ").");
		
		getBuilders(current.alias ? current.alias.builders : current.builders);
	};

	this.current=function(n){
		//	can use this to swap the current node
		if(n){
			current = n;
			builders = [];
			var a=[], b=c.config.builders();
			for(var i=0, l=b.length; i<l; i++){
				if(current.builder(b[i])) a.push(current.builder(b[i]));
			}
			getBuilders(a);
		}
		return current;
	};
	
	this.ignoreBuilder=function(idx){
		if(idx>=0 && idx<builders.length){
			builders[idx] = function(node){};
		}
	};

	var start;
	this.invoke=function(){
		console.log("crawlr.Kernel.invoke: Builder invocation BEGIN. " + builders.length + " builders");

		//	wipe anything sitting in the response buffers.
		c.Response.clearHeaders().clear();
		
		start = start || new Date(); // preserve start if reinit-ing
		
		// are we doing a redirect
		if(current.type == "redirect"){
		
			console.info("crawlr.Kernel.invoke: " + (current.redirect||301) + " redirecting to " + current.alias);
			crawlr.Response.redirect(current.alias, current.redirect);
		
		}else{
		
			for(var i=0; i<builders.length; i++){
				if(reinit){
					reinit=false;
					if(initAttempts==1){
						//	do nothing
					} else if(initAttempts<initLimit){
						return this.invoke();	//	re-call ourselves to start over
					} else {
						console.warn("crawlr.Kernel.invoke: too many attempts at re-initialization were made.");
					}
				}
				
				try{
					console.debug("crawlr.Kernel.invoke: Invoking builder " + builders[i].path);
					builders[i](current);
				} catch(e){
					console.error("crawlr.Kernel.invoke: function ", builders[i].path, " failed to execute: ", e);
				}
			}
			
		}

		//	if we got to this point, we are finally at the full end of an init/invocation chain.
		console.log("crawlr.Kernel.invoke:: builder invocation END; invocation time: ", ((new Date()-start)/1000).toFixed(3), " s.");
	};
})();
