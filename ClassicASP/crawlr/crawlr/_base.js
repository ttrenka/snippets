<%
if(!context) var context=this;	//	let's see if this works for aliasing the host object or not.

// convert an ipaddress to a long int
function ip2long(ip){
	if(!ip){
		ip = String(Request.ServerVariables("HTTP_X_FORWARDED_FOR"));
		if(ip == "undefined"){
			ip = String(Request.ServerVariables("REMOTE_ADDR"));
		}
	}
	var p = ip.split('.');
	return (p[0]*256*256*256) + (p[1]*256*256) + (p[2]*256) + p[3];
}

//	generic serializer
if(!json){
	var json=new (function(){
		var esc=function(s, isKey){
			s = s.replace(/(["\\])/g, '\\$1').replace(/[\f]/g, "\\f").replace(/[\b]/g, "\\b").replace(/[\n]/g, "\\n").replace(/[\t]/g, "\\t").replace(/[\r]/g, "\\r");
			return isKey ? s : '"' + s + '"';
		};
		var indent="\t";
		this.parse=function(json){
			try{
				return eval("("+json+")");
			} catch(e){
				console.error("json.parse: there was an issue with the json string passed: ", e, json);
				return json;
			}
		};
		this.serialize=function(it, ind){
			//	note: the original this was pulled from (Dojo) had a "hidden" initiative/method
			//	that allowed you to define a specific serialization method; we do the same,
			//	but the name of the method should be "toJson".
			ind=ind||"";
			var nextIndent=ind+indent;
			var newLine="\n";
			var objtype=String(typeof(it)).toLowerCase();
			if(it===undefined) return "undefined";
			else if((objtype=="number")||(objtype=="boolean")) return it+"";
			else if(it===null) return "null";
			if(objtype=="date") return esc(String(it));
			if(objtype=="string") return esc(it);

			// recursions
			var recurse=arguments.callee;

			if(("toJson" in it) && typeof it.toJson=="function"){
				var obj=it.toJson();
				if(it!==obj) return recurse(obj, nextIndent);
			}

			//	errors
			if(it instanceof Error){
				return esc(it.description+" ("+(it.number&0xffff)+")");
			}

			// array
			if(it instanceof Array||typeof it=="array"){
				var res=[];
				for(var i=0; i<it.length; i++){
					var val=recurse(it[i], nextIndent);
					if(typeof(val)!="string"){
						val="undefined";
					}
					res.push(newLine+nextIndent+val);
				}
				return "["+res.join(", ")+newLine+ind+"]";
			}

			//	kill functions
			//	TODO: serialize a fucking function
			if(objtype=="function") return null;
			
			// generic object code path
			var output=[];
			for(var key in it){
				var keyStr, val;
				if(typeof(key)=="number") keyStr='"'+key+'"';
				else if(typeof(key)=="string") keyStr=esc(key, true);
				else continue;
				
				val=recurse(it[key], nextIndent);
				if(typeof(val)!="string") continue;
				output.push(newLine+nextIndent+keyStr+": "+val);
			}
			return "{"+output.join(", ")+newLine+ind+"}";
		};
	})();
}

//	utilities
if(!util){
	var util=new (function(){
		var trim=/^\s+|\s+$/g;
		this.trim=function(s){ return String(s).replace(trim, ""); };
		this.isEmpty=function(s){
			s=util.trim(s||"");
			return s.length==0||s==null;
		};
		this.toYesNo=function(s){
			return !s || s == "false" || s == "no" || s == "0" ? "No" : "Yes";
		};
		this.toYesNoAlreadyReceive=function(s){
			if(s && (s.toLowerCase() == "alreadyreceive" || s == "2")){
				return "Already receiving e-newsletter";
			}
			return !s || s == "false" || s == "no" || s == "0" ? "No" : "Yes";
		};
	})();
}

//	logging
if(!console){
	var console=new (function(){
		var log=[];
		var types=this.types={ LOG:"log", INFO:"info", DEBUG:"debug", WARN:"warn", ERROR:"error" };

		var logFormatted=function(args){
			var a=[];
			for(var i=0; i<args.length; i++){
				if(typeof(args[i])=="string"){
					a.push(args[i]);
				} else {
					a.push(json.serialize(args[i]));
				}
			}
			return a.join("");
		};
		
		this.log=function(){
			var m=logFormatted(arguments);
			log.push({ message:m, type:types.LOG });
			return m;
		};
		this.debug=function(){
			var m=logFormatted(arguments);
			log.push({ message:m, type:types.DEBUG });
			return m;
		};
		this.info=function(){
			var m=logFormatted(arguments);
			log.push({ message:m, type:types.INFO });
			return m;
		};
		this.warn=function(){
			var m=logFormatted(arguments);
			log.push({ message:m, type:types.WARN });
			return m;
		};
		this.error=function(){
			var m=logFormatted(arguments);
			log.push({ message:m, type:types.ERROR });
			return m;
		};
		this.dir=function(obj){
			log.push({ message: json.serialize(obj), type:types.INFO });
		};
		this.clear=this.flush=function(){
			log=[];
		};
		this.toString=function(){
			if(!crawlr.config.isDebug()){ return ""; }
			var s = '<div class="crawlr-console">' +
						'<div class="crawlr-log-header">Crawlr 1.0 Debugging Console</div>' +
						'<div class="crawlr-console-info">' +
							'<table class="crawlr-log"><tbody>';
			for(var i=0; i<log.length; i++){
				s += '<tr class="crawlr-log-' + (i%2==0?'odd':'even') + '">' +
						'<td class="crawlr-message crawlr-icon-' + log[i].type + '">' + log[i].message + '</td>' +
					'</tr>';
			}
			return s + '</tbody></table></div></div>';
		};
		this.toJson=function(){
			var out=[];
			if(crawlr.config.isDebug()){
				for(var i=0; i<log.length; i++){
					out.push({
						type:log[i].type,
						message:crawlr.jsonSafe(log[i].message)
					});
				}
			}
			return out;
		};
	})();
}

//	the engine itself.
if(!crawlr){
	var crawlr=new (function(){
		var resources={};
		var included={};
		var self=this;

		//	keep it in memory and let the ASP engine destroy it.
		var fso=Server.CreateObject("Scripting.FileSystemObject");
		this.fso=function(){ return fso; };
		
		/* detect ie version */
		var isIE = (function(){
			// FF2 [Mozilla/5.0 (Windows; U; Windows NT 5.2; en-US; rv:1.8.1.14) Gecko/20080404 Firefox/2.0.0.14]
			// IE7 [Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.2; .NET CLR 1.1.4322; .NET CLR 2.0.50727)] 
			var ua = String(Request.ServerVariables("http_user_agent"));
			if(/msie/ig.test(ua)){
				var v = ua.toLowerCase().split("msie ")[1].split(';')[0]-0;
				// console.log("Detected Internet Explorer version " + v + "... bummer");
				return v;
			}
			return 0;
		})();

		/*  METHODS */

		//	lang methods
		var _mixin=function(obj, props){
			var tobj={};
			for(var p in props){
				if(tobj[p]===undefined || tobj[p]!=props[p]){
					obj[p]=props[p];
				}
			}

			if(props){
				p=props.toString;
				if(typeof p=="function" && p!=obj.toString && p!=tobj.toString){
					obj.toString=props.toString;
				}
			}
			return obj;
		};
	
		this.mixin=function(obj /*, props... */){
			for(var i=1, l=arguments.length; i<l; i++){
				_mixin(obj, arguments[i]);
			}
			return obj;
		};
		this.extend=function(ctor /*, props... */){
			for(var i=1, l=arguments.length; i<l; i++){
				_mixin(ctor.prototype, arguments[i]);
			}
			return ctor;
		};

		this.clone=function(o){
			//	clone an object, keep it simple.
			if(o instanceof Array){
				var a=[];
				for(var i=0; i<o.length; i++) a.push(crawlr.clone(o[i]));
				return a;
			}
			else if(o instanceof Date){
				return new Date(o.getValue());
			}
			else if(o instanceof Object){
				var obj={};
				for(var p in o) obj[p]=crawlr.clone(o[p]);
				return obj;
			}
			else{
				return o;	//	assume by value
			}
		};

		this.config=new (function(){
			var root=String(Request.ServerVariables("APPL_PHYSICAL_PATH"));
			var script=String(Request.ServerVariables("PATH_INFO")).split("/").pop();
			var staticDomains=[];
			var staticDomainIdx=0;
			var command="get";
			var cn="";
			var title="Crawlr: a Web 2.0 CMS";
			var dir="content";	//	the directory root
			var index="_index.";
			var scriptFolder="_crawlr";
			var status="'P','L'";
			var builders=[];
			var useGifs=isIE && isIE < 7;
			var systemEmail="no-reply@skyline.com";
			var isRemoteSmtp=false;
			var smtpPort=24;
			var smtpConnectionTimeout=30;
			var isSmtpBasicAuth=true;
			var isSmtpNtAuth=false;
			var smtpServer="";
			var smtpUsername="";
			var smtpPassword="";
			var newline="\r\n";
			var tab="\t";
			var hrefChanged=false;
			var href="";
			var debugIPs=[];
			var isDebug=false;
			var bypassCache=false;

			//	we want to make sure we preserve the debug on the string, but not init.
			this.href=function(s){
				//	we want to make sure this will override anything
				if(s){
					href=s;
					hrefChanged=true;
				}
				return href;
			};
			this.useGifs=function(){
				return useGifs;
			};
			this.root=function(r){ 
				if(r) root=r;
				return root; 
			};
			this.debugIPs=function(d){
				if(d){
					debugIPs=[];
					for(var i=0,len=d.length; i<len; i++){
						try{
							debugIPs.push(ip2long(d[i]));
						}catch(e){}
					}
				}
				return debugIPs;
			};
			this.staticDomains=function(d){
				if(d) staticDomains=d;
				return staticDomains;
			};
			this.getStaticDomain=function(){
				var len=staticDomains.length;
				if(len){
					if(staticDomainIdx >= len){ staticDomainIdx = 0; }
					return (String(Request.ServerVariables("HTTPS")).indexOf("off") == -1 ? "https://" : "http://") + staticDomains[staticDomainIdx++];
				}
				return "";
			};
			this.script=function(s){
				if(s){
					script=s;
					if(!hrefChanged) href="/"+script+"?"+command+"=";
				}
				return script;
			};
			this.command=function(c){
				if(c){
					command=c;
					if(!hrefChanged) href="/"+script+"?"+command+"=";
				}
				return command;
			};
			this.connectionString=function(c){
				if(c) cn=c;
				return cn;
			};
			this.status=function(s){
				if(s) status=s;
				return status;
			};
			this.title=function(t){
				if(t) title=t;
				return title;
			};
			this.directory=function(d){
				if(d) dir=d;
				return this.root()+dir;
			};
			this.scriptFolder=function(f){
				if(f) scriptFolder=f;
				return scriptFolder;
			};
			this.index=function(i){
				if(i) index=i;
				return index;
			};
			this.isDebug=function(b){
				if(typeof(b)!="undefined") isDebug=b;
				// if we are not in debug mode, see if we should manually override it
				if(!isDebug && debugIPs && crawlr){
					var ip=ip2long();
					for(var i=0,len=debugIPs.length; i<len; i++){
						if(debugIPs[i] == ip){
							isDebug=true;
							break;
						}
					}
				}
				return isDebug;
			};
			this.builders=function(a){
				if(a) builders=a.slice(0);
				return builders;
			};
			this.builders.add=function(s){
				if(!s) return;
				builders.push(s);
			};
			this.newline=function(s){
				if(s) newline=s;
				return newline;
			};
			this.tab=function(s){
				if(s) tab=s;
				return tab;
			};
			this.bypassCache=function(b){
				if(typeof(b)!="undefined") bypassCache=b;
				return bypassCache; 
			};
			
			// email settings
			this.systemEmail=function(s){
				if(s) systemEmail=s;
				return systemEmail;
			};
			this.isRemoteSmtp=function(s){
				if(s) isRemoteSmtp=s;
				return isRemoteSmtp;
			};
			this.smtpPort=function(s){
				if(s) smtpPort=s;
				return smtpPort;
			};
			this.smtpConnectionTimeout=function(s){
				if(s) smtpConnectionTimeout=s;
				return smtpConnectionTimeout;
			};
			this.isSmtpBasicAuth=function(s){
				if(s) isSmtpBasicAuth=s;
				return isSmtpBasicAuth;
			};
			this.isSmtpNtAuth=function(s){
				if(s) isSmtpNtAuth=s;
				return isSmtpNtAuth;
			};
			this.smtpServer=function(s){
				if(s) smtpServer=s;
				return smtpServer;
			};
			this.smtpUsername=function(s){
				if(s) smtpUsername=s;
				return smtpUsername;
			};
			this.smtpPassword=function(s){
				if(s) smtpPassword=s;
				return smtpPassword;
			};

			//	generic methods
			this.get=function(key){
				if(this[key]){
					if(typeof(this[key]) == "function") return this[key]();
					else return this[key];
				}
				return null;
			};
			this.set=function(key, val){
				if(this[key] && typeof(this[key]) == "function") return this[key](val);
				else {
					this[key]=val;
					return val;
				}
				return null;
			};
		})();

		//	use the setter for defaults, otherwise just mix it in.
		this.setConfig=function(obj){
			for(var p in obj){
				if(this.config[p]){
					this.config[p](obj[p]);
				} else {
					this.config[p]=obj[p];
				}
			}
		};

		//	look for a default configuration object and load it immediately
		if(typeof(cwrConfig)!="undefined") this.setConfig(cwrConfig);

		//	module registration
		this.register=function(resource, path){
			//	keep it simple, if you do this more than once it will
			//	just change values.
			resources[resource]=path;
		};
		this.isRegistered=function(resource){
			return resources[resource]||null;
		};
		
		this.getDojoBuildDir=function(includeDojoDir){
			return '/' + this.config.get("dojoBuildDir") + (includeDojoDir ? '/' + this.config.get("dojoDir") : "");
		};
		
		this.getDojoBuildSkylineDir=function(includeDojoDir){
			return '/' + this.config.get("dojoBuildSkylineDir") + (includeDojoDir ? '/' + this.config.get("dojoDir") : "");
		};
		
		this.getDojoDateModified=function(){
			var f = this.getFile(this.config.root() + this.getDojoBuildDir(true).substring(1).replace(/\//g, "\\") + "\\dojo\\dojo.js");
			return f ? "?d=" + (new Date(f.dateModified)).getTime() : "";
		};
		
		this.getDojoAdminBuildDir=function(includeDojoDir){
			return '/' + this.config.get("dojoAdminBuildDir") + (includeDojoDir ? '/' + this.config.get("dojoAdminDir") : "");
		};
		
		this.getDojoAdminBuildSkylineDir=function(includeDojoDir){
			return '/' + this.config.get("dojoAdminBuildSkylineDir") + (includeDojoDir ? '/' + this.config.get("dojoAdminDir") : "");
		};
		
		this.getDojoAdminDateModified=function(){
			var f = this.getFile(this.config.root() + this.getDojoAdminBuildDir(true).substring(1).replace(/\//g, "\\") + "\\dojo\\dojo.js");
			return f ? "?d=" + (new Date(f.dateModified)).getTime() : "";
		};
		
		this.buildFaviconLink=function(){
			// we're going to assume IE8 doesn't suck
			if(isIE && isIE < 8){
				return '<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"/>';
			}
			return '<link rel="shortcut icon" href="/img/favicon.png" type="image/png"/>';
		};
		
		this.buildCanonicalLink=function(n){
			if(n){
				if(n.alias && n.alias.url){
					return '<link rel="canonical" href="' + crawlr.Request.buildDomain() + '/' + this.stripUrlSlashes(n.alias.url) + '"/>' + this.config.newline();
				}else if(n.canonicalUrl){
					return '<link rel="canonical" href="' + crawlr.Request.buildDomain() + '/' + this.stripUrlSlashes(n.canonicalUrl) + '"/>' + this.config.newline();
				}
			}
			return "";
		};

		this.buildChromeFrame=function(){
			var ua = String(Request.ServerVariables("HTTP_USER_AGENT")).toLowerCase(),
				isIE = parseFloat(ua.split("msie ")[1]) || false;
			return crawlr.config.get("enableChromeFrame") && isIE >= 6 && ua.indexOf("chromeframe") >= 0 ? '<meta http-equiv="X-UA-Compatible" content="chrome=1">\n' : '';
		};
		
		//	objects
		this.create=function(str, overwrite){
			//	take a string and make an object from it if it doesn't exist already.
			var parts=str.split("."), i=0; 
			overwrite=(overwrite!==undefined)?overwrite:false;

			//	do the very first one, so we avoid issues with everything else.
			var t=parts.shift();
			var o=context[t];
			if(o===undefined) o=eval(t+"={};");

			//	do the rest
			do{
				if(overwrite || o[parts[i]]===undefined){
					o[parts[i]]={};
				}
				o=o[parts[i++]];
			} while (i<parts.length);
			return o;
		};
		this.getObject=function(obj){
			//	note that this will also return anything that is the result
			//	of a method call that doesn't require params, i.e.
			//	foo.bar().baz
			var parts=obj.split("."), i=0, o=obj;
			do{
				if(parts[i].indexOf("()")>-1){
					var temp=parts[i++].split("()")[0];
					if(!(temp in o)){
						console.error("crawlr.getObject: method "+temp+" doesn't exist ("+resource+").");
						return null;
					}
					if(typeof(o[temp])!="function"){
						console.error("crawlr.getObject: property "+temp+" is not a function ("+resource+").");
						return null;
					}
					o=o[temp]();
					if(typeof(o)!="object"){
						console.error("crawlr.getObject: method "+temp+" did not return an object ("+resource+").");
						return null;
					}
				} else {
					o=o[parts[i++]];
				}
			} while (i<parts.length && o!=null);
			return o;
		};

		/****************************************************************************************
		 *	Module loading with crawlr.require
		 *	------------------------------------------------------------------------------------
		 *	Require (based on Dojo's require) will load files (either locally or remotely) and
		 *	evaluate them so that they can be used as part of the crawlr engine.  Files will 
		 *	only be loaded and executed once.
		 *
		 *	Like Dojo's system, you can register a module path (using crawlr.register, see above)
		 *	so that crawlr can find a path reference.  Note at all items "required" MUST be a
		 *	JScript file, and MUST end with the .js extension.
		 *
		 *	Examples:
		 *	crawlr.require("crawlr.Directory");		//	(root)/crawlr/Directory.js
		 *
		 *	crawlr.register("deptz", "http://blog.dept-z.com/dropbox/");
		 *	crawlr.require("deptz.test");			//	http://blog.dept-z.com/dropbox/test.js
		 ****************************************************************************************/
		this.require=function(resource){
			//var start = new Date();
			
			//	use this for resources that you only want included once.
			if(this.getObject(resource)) return;
			var res=resource;

			//	check first to see if this is a registered module.
			var path=this.config.root() + "..\\";
			for(var reg in resources){
				if(resource.indexOf(reg)>-1){
					path=resources[reg];
					res=res.replace(reg+".", "");	//	pop the registered module off.
					break;
				}
			}

			if(path.indexOf("http://")==0){
				//	allow for external resources.
				var url=path+(res.split(".").join("/"))+".js";
				console.log("Loading ", resource, " from ", url);
				this.xhrGet(url, function(response, io){
					try{
						self.create(resource);
						eval(response);
					} catch(e){
						throw console.error("crawlr.require: the request resource '", resource, "' failed to execute: ", e);
					}
				});
			} else {
				var fnPath=path+res.split(".").join("\\")+".js";
				var fn=this.read(fnPath);
				if(fn!=null){
					try{
						self.create(resource);
						eval(fn);
					} catch(e){
						throw console.error("crawlr.require: the request resource '", resource, "' failed to execute: ", e);
					}
				} else {
					throw console.error("crawlr.require: the request resource '"+resource+"' does not exist at path '"+path+"'.");
				}
			}
			
			//console.warn("crawlr.require(" + resource + ") load time: ", ((new Date()-start)/1000).toFixed(3), " seconds.");
		};
		
		/****************************************************************************************
		 *  Date Functions
		 ***************************************************************************************/
		this.formatDateTimeRange=function(d1, d2){
			// December 4, 2008 9:30 a.m. - 12:00 p.m.
			return this.formatDate(d1) + ' ' + this.formatTime(d1) + ' - ' + this.formatTime(d2);
		};
		
		this.formatDateTime=function(d, f){
			if(f == "YYYY-M-D H:M:S"){
				return this.formatDate(d, "YYYY-M-D") + ' ' + this.formatTime(d, "H:M:S");
			}
			if(f == "M/D/YYYY H:MM Z"){
				return this.formatDate(d, "M/D/YYYY") + ' ' + this.formatTime(d, "H:MM Z");
			}
			return this.formatDate(d) + ' ' + this.formatTime(d);
		};
		
		this.formatDate=function(d, f){
			if(f == "YYYY-M-D"){
				return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
			}
			if(f == "M/D/YYYY"){
				return (d.getMonth()+1) + '/' + d.getDate() + '/' + d.getFullYear();
			}
			var m=["January","February","March","April","May","June","July","August","September","October","November","December"];
			return m[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
		};
		
		this.formatTime=function(d, f){
			var h=d.getHours();
			if(f == "H:M:S"){
				return (h > 12 ? h-12 : (h == 0 ? "12" : h)) + ':' + d.getMinutes() + ':' + d.getSeconds();
			}
			var m="00"+d.getMinutes();
			if(f == "H:MM Z"){
				return (h > 12 ? h-12 : (h == 0 ? "12" : h)) + ':' + m.substring(m.length-2) + (h > 11 ? " PM" : " AM");
			}
			// H:MM z
			return (h > 12 ? h-12 : (h == 0 ? "12" : h)) + ':' + m.substring(m.length-2) + (h > 11 ? "pm" : "am");
		};
		
		this.daysInMonth=function(m,y){
			switch(m){
				case 2: return y % 4 == 0 ? 29 : 28;
				case 4: case 6: case 9: case 11: return 30;
			}
			return 31;
		};
		
		this.isValidDate=function(s){
			var d=/(\d?\d)[-/](\d?\d)[-/](\d\d(?:\d\d)?)/.exec(s);
			return (d && d.length == 3 && d[0]-0 >= 1 && d[0]-0 <= 12 && d[1]-0 >= 1 && d[1]-0 <= this.daysInMonth(d[0]-0, d[2]-0));
		};
		
		this.formatNumber=function(s){
			var x = (""+s).split('.'),
				x1 = x[0],
				x2 = x.length > 1 ? '.' + x[1] : '',
				r = /(\d+)(\d{3})/;
			while(r.test(x1)){
				x1 = x1.replace(r, '$1' + ',' + '$2');
			}
			return x1 + x2;
		};
		
		/****************************************************************************************
		 *	File Access API
		 *	The following methods provide basic file reading on the local system.
		 *
		 *	crawlr.read
		 *	------------------------------------------------------------------------------------
		 *	Reads in the file at [path] as text.  Returns either a string or null.
		 *
		 *	crawlr.make
		 *	------------------------------------------------------------------------------------
		 *	Will read the file at [path] and create a no-argument function based on it.  Will
		 *	always return a function, but if the read failed, the function will log a statement
		 *	and return.
		 ****************************************************************************************/
		this.read=function(path){
			//	local files, return as string
			if(fso.FileExists(path)){
				var ts=fso.GetFile(path).OpenAsTextStream(1,0);
				return (!ts.AtEndOfStream) ? String(ts.ReadAll()) : null;
			}
			return null;
		};

		this.write=function(path, contents, backup, append){
			if(fso.FileExists(path) && backup){
				var p=path.lastIndexOf('\\') + 1;
				var n=path.substring(0, p) + "__" + path.substring(p);
				if(fso.FileExists(n)){
					fso.DeleteFile(n);
				}
				fso.MoveFile(path, n);
			}
			var tf=(append!==true ? fso.createTextFile(path, true) : fso.openTextFile(path, 8, true));
			if(contents){
				tf.WriteLine(contents);
			}
			tf.Close();
		};
		
		this.fileExists=function(path){
			return fso.FileExists(path);
		}
		
		this.folderExists=function(path){
			return fso.FolderExists(path);
		}
		
		this.mkdir=function(path){
			if(!fso.FileExists(path)){
				fso.CreateFolder(path);
			}
		};

		this.rm=function(path){
			if(fso.FileExists(path)){
				fso.DeleteFile(path);
			}
		};
		
		this.rmdir=function(path){
			if(fso.FolderExists(path)){
				fso.DeleteFolder(path);
			}
		};
		
		this.mv=function(src,dest){
			if(fso.FileExists(src)){
				fso.MoveFile(src,dest);
			}
		};
		
		this.mvdir=function(src,dest){
			if(fso.FolderExists(src)){
				fso.MoveFolder(src,dest);
			}
		};
		
		this.cp=function(src,dest,overwrite){
			if(fso.FileExists(src)){
				fso.CopyFile(src,dest,overwrite);
			}
		};
		
		this.cpdir=function(src,dest,overwrite){
			if(fso.FolderExists(src)){
				fso.CopyFolder(src,dest,overwrite);
			}
		};
		
		this.getFolder=function(path){
			if(fso.FolderExists(path)){
				var tmp = fso.GetFolder(path);
				return {
					type: "folder",
					name: tmp.Name
				};
			}
			return null;
		};
		
		this.getFile=function(path){
			if(fso.FileExists(path)){
				var tmp = fso.GetFile(path);
				return {
					type: "file",
					name: tmp.Name,
					dateModified: tmp.DateLastModified
				};
			}
			return null;
		};
		
		this.stat=function(path){
			return this.getFolder(path) || this.getFile(path);
		};
		
		this.ls=function(path){
			var f=null;
			if(fso.FolderExists(path)){
				f={folders:[],files:[]};
				var folder=fso.GetFolder(path);
				var e=new Enumerator(folder.SubFolders);
				for(; !e.atEnd(); e.moveNext()){
					f.folders.push(e.item());
				}
				var e=new Enumerator(folder.Files);
				for(; !e.atEnd(); e.moveNext()){
					f.files.push(e.item());
				}
			}else{
				console.debug("crawlr.ls() - Path \"" + path + "\" does not exist, is not a folder, or access is denied.");
			}
			return f;
		};
		
		this.formatSize=function(size){
			var kb = 1024,
				mb = kb * 1024,
				gb = mb * 1024,
				suffix = "B";
			
			size = parseInt(size);
			
			if(size > gb){
				size /= gb;
				suffix = "GB";
			}else if(size > mb){
				size /= mb;
				suffix = "MB";
			}else if(size > kb){
				size /= kb;
				suffix = "KB";
			}
			return this.formatNumber(parseInt(size * 10) / 10) + suffix;
		};
		
		this.make=function(path){
			//	create a new function from a path
			var t=this.read(path);
			if(t!=null){
				return new Function(t);
			}
			return null;
		};

		var progId=null;	//	cache the correct id for later.
		var getXhr=function(){
			var progIds=['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
			var http=null;
			if(progId) http=Server.CreateObject(progId);
			else {
				for(var i=0; i<progIds.length; i++){
					try{
						http=Server.CreateObject(progIds[i]);
						progId=progIds[i];
						break;
					} catch(e){ /* swallow it */ }
				}
			}
			if(!http){
				console.error("crawlr[getXhr]: XMLHTTP is not available on this system.");
				return null;
			}
			return http;
		};

		// *** Utilities ************************************************************************

		/*
			Escaped characters for names sort of follow the XML entity spec:
			&a;			Asterisk		*
			&b;			Back slash		\
			&c;			Colon			:
			&d;			Dash			-
			&f;			Forward slash	/
			&g;			Greater than	>
			&l;			Less than		<
			&p;			Pipe			|
			&q;			Question		?
			&qu;		Double quote	"
		*/
		var rePathEntities={ 
			"-":/\&d\;/g, 
			"/":/\&f\;/g, 
			"\\":/\&b\;/g, 
			":":/\&c\;/g, 
			"*":/\&a\;/g, 
			'"':/\&qu\;/g, 
			"?":/\&q\;/g, 
			"<":/\&l\;/g, 
			">":/\&g\;/g, 
			"|":/\&p\;/g 
		};
		this.resolvePathEntities = function(str){
			var s = str || "";
			for(var p in rePathEntities){
				s=s.replace(rePathEntities[p], p);
			}
			return s;
		};

		var rePathEntityEncodings={ 
			"d":/\-/g, 
			"f":/\//g, 
			"b":/\\/g, 
			"c":/\:/g, 
			"a":/\*/g, 
			"qu":/"/g, 
			"q":/\?/g, 
			"l":/</g, 
			"g":/>/g, 
			"p":/\|/g 
		};
		this.encodePathEntities = function(str){
			var s = str || "";
			for(var p in rePathEntityEncodings){
				s=s.replace(rePathEntityEncodings[p], "&"+p+";");
			}
			return s;
		};
		
		var reInvalidChars=[
			["'",/\u2018/g],
			["'",/\u2019/g],
			['"',/\u201c/g],
			['"',/\u201d/g],
			['-',/\u2013/g],
			['-',/\u2014/g]
		];
		this.replaceInvalidChars = function(str){
			for(var i=0, len=reInvalidChars.length; i<len; i++){
				str = str.replace(reInvalidChars[i][1], reInvalidChars[i][0]);
			}
			return str;
		};

		var reGet=/(action|href)\="get\:([^"]*)"/g;
		this.fixLinks=function(str){
			//	will scan a string of text and replace any get: references with the
			//		proper linkage.
			return str.replace(reGet, '$1="'+crawlr.config.href()+'$2"');
		};
		
		var reImg=/(<img\s+.*?src\=["\'])(?!https?:\/\/)([^"\']*)/ig;
		var reLink=/(<a\s+.*?img\=["\'])(?!https?:\/\/)([^"\']*)/ig;
		this.applyStaticDomains=function(str){
			var _st = new Date();
			var parts = str.replace(reImg, "$1#SD#$2").replace(reLink, "$1#SD#$2").split("#SD#");
			var str = "";
			for(var i=0, len=parts.length; i<len; i++){
				str += (i ? this.config.getStaticDomain() : "") + parts[i];
			}
			console.warn("Static domain insertion: ", ((new Date()-_st)/1000).toFixed(3), " seconds.");
			return str;
		};
		
		this.generateUUID=function(n){
			n=n&&n>0?n:32;
			var s="",c="abcdefghijklmnopqrstuvwxyz0123456789";
			for(var i=0; i<n; i++){
				s+=c.charAt(Math.floor(Math.random()*c.length));
			}
			return s;
		};
		
		this.stripUrlSlashes=function(url){
			url = util.trim(url);
			if(url.length){
				if(url.charAt(0) == '/'){ url = url.substring(1); }
				if(url.charAt(url.length - 1) == '/'){ url = url.substring(0, url.length - 1); }
				return url.toLowerCase();
			}
			return "";
		};
		
		/****************************************************************************************
		 *	Net Access API
		 *	The following methods provide basic NET (HTTP) access via XHR.
		 *
		 *	crawlr.xhrGet
		 *	------------------------------------------------------------------------------------
		 *	Performs a synchronous GET request at [url].  Will fire [fn] callback on success,
		 *	& [err] callback on failure.
		 *
		 *	crawlr.xhrPost
		 *	------------------------------------------------------------------------------------
		 *	Performs a synchronous POST request at [url].  Will fire [fn] callback on success,
		 *	& [err] callback on failure.  Posts [data] AS IS, so make sure it is formatted
		 *	correctly (key/value pairs, & delimited, i.e. name=value&name=value)
		 ****************************************************************************************/
		this.ping=function(url){
			var http=getXhr();
			if(!http) return;
			http.open("GET", url, false);
			http.send();
		};
		this.xhrGet=function(url, fn, err, type){
			//	fetch an external resource using GET
			var http=getXhr();
			if(!http) return;
			
			err=err||function(response, http){
				console.error("crawlr.GET: an error occured in the course of the request (", url, "): HTTP code ", http.status);
			};
			type=type||"text";
			
			//	do the request.
			http.onreadystatechange=function(){
				if(http.readyState==4){
					var data=(type=="xml"?http.responseXML:http.responseText);
					if(http.status==200){
						fn(data, http); 
					} else {
						err(data, http);
					}
				}
			};
			http.open("GET", url, false);
			http.send();
		};
		this.xhrPost=function(url, data, fn, err, type){
			//	push and get to an external resource
			var http=getXhr();
			if(!http) return;
			
			err=err||function(response, http){
				console.error("crawlr.GET: an error occured in the course of the request (", url, "): HTTP code", http.status);
			};
			type=type||"text";
			
			//	do the request.
			http.onreadystatechange=function(){
				if(http.readyState==4){
					var ddata=(type=="xml"?http.responseXML:http.responseText);
					if(http.status==200){
						fn(ddata, http); 
					} else {
						err(ddata, http);
					}
				}
			};

			http.open("POST", url, false);
			http.send(data);
		};

		//	wrappers for include
		this.include=function(path){
			Server.Execute(path);
			included[path]=true;
		};
		this.includeOnce=function(path){
			if(!included[path]) Server.Execute(path);
			included[path]=true;
		};

		/****************************************************************************************
		 *	Data Access API
		 *	The following methods provide basic query-based data access.  Anything you can 
		 *	normally pass through basic ADO can be passed here as well.
		 *
		 *	crawlr.fetch
		 *	------------------------------------------------------------------------------------
		 *	Use when you are expecting a result set of some sort (i.e. SELECT queries).  Will
		 *	return an object of the following structure:
		 *
		 *	{ meta:[{ name, type, convert }...], items:[{ ... }...] }
		 *
		 *	where the meta property will give you basic information, in order, about the column
		 *	structure returned by the query, and the items property will contain the actual
		 *	items returned.
		 *
		 *	If you need a record count:  <set>.items.length
		 *
		 *	Note that each object in items will mirror the column structure with properties, with
		 *	values already cast to the proper basic JS data type (bool, date, number, string).
		 *	Note also that the properties ARE case-sensitive; it would be best to specify your
		 *	field list in your query, but if you use *, it will be exactly as the name of the 
		 *	field is defined in the database itself.
		 *
		 *	Last note: casting functions are based on MS SQL Server 2000/2005 ONLY.
		 *
		 *	crawlr.push
		 *	------------------------------------------------------------------------------------
		 *	Use when you are executing a query that does not require a resultset return (i.e.
		 *	UPDATE, INSERT, DELETE).  Returns true or false, based on whether the query was
		 *	successfully executed.
		 ****************************************************************************************/

		var db=[];
		db[16]=db[2]=db[3]=db[20]=
		db[17]=db[18]=db[19]=db[21]=
		db[4]=db[5]=db[6]=db[14]=
		db[131]=function(n){
			if(n==undefined) return null;
			return Number(n); 
		};
		
		db[11]=function(b){
			if(b==undefined) return null;
			return Boolean(b); 
		};
		
		db[7]=db[133]=db[134]=db[135]=function(s){
			return s==undefined ? null : new Date(Date.parse(s));
		};

		db[129]=db[200]=db[201]=
		db[130]=db[202]=db[203]=db[0]=function(s){
			if(s==undefined) return null;
			return String(s);
		};
		var convert=new (function(){
			this.get=function(type){
				if(db[type]){
					return db[type];
				}
				return db[0];
			};
		})();

		//	data type mapping
		var map=[];
		map[16]=map[2] =map[3] =map[20]=
		map[17]=map[18]=map[19]=map[21]=
		map[4] =map[5] =map[6] =map[14]=
		map[131]=Number;
		
		map[11]=Boolean;
		
		map[7]=map[133]=map[134]=map[135]=Date;

		map[129]=map[200]=map[201]=
		map[130]=map[202]=map[203]=map[0]=String;
		
		this.fetch=function(){
			// TODO: make sure of the type casting, particularly when it comes to things like currency.
			var q = "";
			for(var i=0, len=arguments.length; i<len; i++){
				q += (q.length ? ' \n' : '') + arguments[i];
			}
			
			var rSet={
				meta: {},
				items: []
			};
			
			var start = new Date();
			var cn=Server.CreateObject("ADODB.Connection");
			try{
				cn.Open(this.config.connectionString());
				var rs=cn.Execute(q);
				if(!rs.BOF&&!rs.EOF){
					rs.MoveFirst();
					var c=rs.Fields.Count;
					var fields=[];
					for(var i=0; i<c; i++){
						fields.push({
							name: rs.Fields.Item(i).Name,
							type: map[parseInt(rs.Fields.Item(i).Type)] || String,
							convert: convert.get(rs.Fields.Item(i).Type)
						});
					}
					rSet.meta=fields;
					
					while(!rs.EOF){
						var o={};
						for(var i=0, l=fields.length; i<l; i++){
							var f=fields[i];
							var n=f.name, fn=f.convert;
							o[n]=fn(rs.Fields(n).Value);
						}
						rSet.items.push(o);
						rs.MoveNext();
					}
				}
				rs.Close();
				cn.Close();
				console.info("<div>crawlr.fetch: Query returned " + rSet.items.length + " record" + (rSet.items.length != 1 ? 's' : '') + " in " + ((new Date()-start)/1000).toFixed(3) + " seconds</div><div><pre>" + q + "</pre></div>");
			} catch(e){
				throw console.error("<div>crawlr.fetch: the following query did not execute properly:</div><div><pre>" + q + "</pre></div><div>" + (typeof(e) == "String" ? e : e.message) + "</div>");
			}
			return rSet;
		};

		this.push=function(q, connect){
			//	when we don't need the results back
			connect=connect||this.config.connectionString();
			var cn=Server.CreateObject("ADODB.Connection");
			if(!connect){
				throw console.error("crawlr.push: there is no connection string for the query ", q);
			}

			try{
				cn.Open(connect);
				console.info("crawlr.push: executing " + q);
				cn.Execute(q);
				cn.Close();
			} catch(e){
				throw console.error("crawlr.push: the following query did not execute properly: ", q, e);
			}
		};
		
		this.renderResultSet=function(r){
			var s='<table border="1"><thead><tr>';
			for(var i=0,len=r.meta.length; i<len; i++){
				s+='<td>'+r.meta[i].name+'</td>';
			}
			s+='</tr></thead><tbody>';
			for(var i=0,len=r.items.length; i<len; i++){
				s+='<tr>';
				for(var j=0,len2=r.meta.length; j<len2; j++){
					s+='<td>'+r.items[i][r.meta[j].name]+'</td>';
				}
				s+='</tr>';
			}
			return s+'</tbody></table>';
		};
		
		this.sqlSafe=function(s, maxlength){
			// is utfDecoding a smart idea?
			s = s ? crawlr.utfDecode(util.trim(s).replace(/\'/g, "''")) : "";
			return maxlength ? s.substring(0, maxlength) : s;
		};
		
		this.cssNameSafe=function(s){
			return util.trim(s).replace(/[ \_]/g, '-').replace(/[^a-zA-Z0-9\-]*/g, "").toLowerCase();
		};

		this.fileSafe=function(s){
			return util.trim(s).replace(/[^a-zA-Z0-9 \-\_\.]*/g, "");
		};

		this.jsonSafe=function(s){
			return String(s).replace(/\"/g, "\\\"").replace(/\\\\\"/g, "\\\"").replace(/\n/g, "");
		};
		
		this.escapeJS=function(s){
			return String(s).replace(/"/g, "\\\"");
		};
		
		this.escapeHtml=function(s){
			var r = /\&([^a-zA-Z\#]+)/g;
			return s.replace(r, "&amp;$1").replace(r, "&amp;$1").replace(/\</g, "&lt;").replace(/\>/g, "&gt;").replace(/\"/g, "&quot;");
		};

		this.unescapeHtml=function(s){
			return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"");
		};
		
		this.escapeHtmlEntities=function(s){
			return String(s).replace(/"/g, "&quot;");
		};
		
		this.unescapeHtmlEntities=function(s){
			return String(s).replace(/\&quot\;/g, '"');
		};
		
		this.escapeRegex=function(s){
			return String(s).replace(/\//g, "\\/").replace(/\-/g, "\\-").replace(/\&/g, "\\&");
		};
		
		this.hasRights=function(a, r){
			for(var i=0, len=a.length; i<len; i++){
				if(a[i]==r){return true;}
			}
			return false;
		};
		
		this.utfDecode=function(utftext){
			var s = "",
				c = c1 = c2 = 0;

			for(var i=0; i<utftext.length;){
				c = utftext.charCodeAt(i);

				if(c < 128){
					s += String.fromCharCode(c);
					i++;
				}else if((c > 191) && (c < 224)){
					c2 = utftext.charCodeAt(i+1);
					s += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
					i += 2;
				}else{
					c2 = utftext.charCodeAt(i+1);
					c3 = utftext.charCodeAt(i+2);
					s += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
					i += 3;
				}
			}

			return s;
		};

		/****************************************************************************************
		 *	Mail API
		 *  Used for sending email (duh).
		 *
		 *  params (required*)
		 *  - from*					The email address the message is from
		 *  - to*					List of email addresses to send to the message to
		 *  - cc					List of email addresses to cc to the message to
		 *  - bcc					List of email addresses to bcc to the message to
		 *  - replyTo				The email address for recipients to reply to
		 *  - subject*				The email subject
		 *  - text*					The message in plain text
		 *  - html					An HTML version of the text
		 *  - attachemnts			Object with either a "file" or a "filename" and "content"
		 *  - smtpServer			SMTP server host/ip
		 *  - smtpPort				SMTP server port (i.e. 25)
		 *  - smtpConnectionTimeout	SMTP connection timeout
		 *  - isRemoteSmtp			Is this host local or remote?
		 *  - isSmtpBasicAuth		Use basic authentication?
		 *  - isSmtpNtAuth			Use NT authentication?
		 *  - smtpUsername			SMTP server username
		 *  - smtpPassword			SMTP server password
		 *
		 *  Check out the following links for more info about ASP's email functions:
		 *  - http://www.paulsadowski.com/WSH/cdo.htm
		 *  - http://andrewu.co.uk/clj/jscript_asp_library/
		 ****************************************************************************************/
		this.sendmail=function(params){
			params=params||{};
			
			var conf = Server.CreateObject('CDO.Configuration'),
				confSchema = "http://schemas.microsoft.com/cdo/configuration/",
				svr = params.smtpServer || this.config.smtpServer();
			if(svr.length){
				conf.Fields.Item(confSchema + "smtpserver")             = svr;
				conf.Fields.Item(confSchema + "smtpserverport")         = params.smtpPort||this.config.smtpPort();
				conf.Fields.Item(confSchema + "smtpconnectiontimeout")  = params.smtpConnectionTimeout||this.config.smtpConnectionTimeout();
				conf.Fields.Item(confSchema + "sendusing")              = (params.isRemoteSmtp||this.config.isRemoteSmtp()) ? 2 : 1;
				conf.Fields.Item(confSchema + "smtpauthenticate")       = (params.isSmtpBasicAuth||this.config.isSmtpBasicAuth()) ? 1 : ((params.isSmtpNtAuth||this.config.isSmtpNtAuth()) ? 2 : 0);
				if(this.config.smtpUsername().length > 0){
					conf.Fields.Item(confSchema + "sendusername")       = params.smtpUsername||this.config.smtpUsername();
				}
				if(this.config.smtpPassword().length > 0){
					conf.Fields.Item(confSchema + "sendpassword")       = params.smtpPassword||this.config.smtpPassword();
				}
				conf.Fields.Update();
			}

			var msg=Server.CreateObject('CDO.Message');
			msg.Configuration=conf;
			msg.From			= params.from;
			msg.To				= params.to;
			if((params.cc||"").length){
				msg.Cc			= params.cc;
			}
			if((params.bcc||"").length){
				msg.Bcc			= params.bcc;
			}
			if((params.replyTo||"").length){
				msg.ReplyTo		= params.replyTo;
			}
			msg.Subject			= params.subject;
			if((params.html||"").length){
				msg.HTMLBody	= params.html;
			}
			msg.TextBody		= params.text;
			
			if(params.attachments && (params.attachments instanceof Array || typeof params.attachments == "array")){
				for(var i=0,len=params.attachments; i<len; i++){
					if(params.attachments[i].file){
						msg.AddAttachment(params.attachments[i].file);
					}else if(params.attachments[i].filename && params.attachments[i].content){
						var attached = msg.Attachments.Add() ;
						attached.Fields.Item('urn:schemas:mailheader:content-type') = 'text/plain; name='+(params.attachments[i].filename || 'message.txt');
						attached.Fields.Item('urn:schemas:mailheader:content-transfer-encoding') = 'quoted-printable';
						attached.Fields.Update();
						var stream = attached.GetDecodedContentStream();
						stream.WriteText(params.attachments[i].content);
						stream.Flush();
					}
				}
			}

			msg.Send();
			return true;
		};
	})();
}
%>
