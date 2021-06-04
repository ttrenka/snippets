/*****************************************************************
 *	core.js
 *	TRT 20160714
 *	v.1.0.0
 *
 *	A set of helper/wrapper functions to help with any Windows
 *	Script Host jobs that require database access, net access
 *	and emails.
 *
 *	Based on the crawlr _base library.
 *****************************************************************/ 

var Core = (function(){
	var c = {};

	var fso = WScript.CreateObject("Scripting.FileSystemObject");
	var progId = null;
	var getXhr = function(){
		var progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
		var http = null;
		if(progId) http = WScript.CreateObject(progId);
		else {
			for(var i=0; i<progIds.length; i++){
				try{
					http = WScript.CreateObject(progIds[i]);
					progId = progIds[i];
					break;
				} catch(e){ /* swallow it */ }
			}
		}
		return http || null;
	};
	var objectToQuery = function(map){
		var enc = encodeURIComponent, pairs = [];
		for(var name in map){
			var value = map[name];
			var assign = enc(name) + "=";
			if(value instanceof Array){
				for(var i = 0, l = value.length; i < l; ++i){
					pairs.push(assign + enc(value[i]));
				}
			}else{
				pairs.push(assign + enc(value));
			}
		}
		return pairs.join("&");
	};

	//	Language helpers
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
	c.mixin=function(obj /*, props... */){
		for(var i=1, l=arguments.length; i<l; i++){
			_mixin(obj, arguments[i]);
		}
		return obj;
	};

	var reTrim = /^\s+|\s+$/g;
	c.trim = function(s){ return String(s).replace(reTrim, ""); };

	c.each=function(a, fn, o){
		var i=0, l=a && a.length || 0;
		if(o){
			for(; i<l; i++) fn.call(o, a[i], i, a);
		} else {
			for(; i<l; i++) fn(a[i], i, a);
		}
	};
	c.map=function(a, fn, o){
		var i=0, l=a && a.length || 0, out = new Array(l);
		if(o){
			for(; i<l; i++) out[i] = fn.call(o, a[i], i, a);
		} else {
			for(; i<l; i++) out[i] = fn(a[i], i, a);
		}
		return out;
	};

	c.getObject=function(obj, prop){
		//	note that this will also return anything that is the result
		//	of a method call that doesn't require params, i.e.
		//	foo.bar().baz
		var parts=prop.split("."), i=0, o=obj;
		if(obj == null) return null;
		do{
			if(parts[i].indexOf("()")>-1){
				var temp=parts[i++].split("()")[0];
				if(!(temp in o)){
					return null;
				}
				if(typeof(o[temp])!="function"){
					return null;
				}
				o=o[temp]();
				if(typeof(o)!="object"){
					return null;
				}
			} else {
				o=o[parts[i++]];
			}
		} while (i<parts.length && o!=null);
		return o;
	};

	c.format = {
		num: function(data, places){
			// round the number first based on the places.
			if(places){
				data = Math.round(data * Math.pow(10, places)) / Math.pow(10, places);
			}

			var tmp = ("" + Math.floor(Math.abs(data))).split(""),
				neg = data < 0,
				ret = [];
			if(tmp.length > 3){
				tmp.reverse();
				for(var i=0, l=tmp.length; i<l; i++){
					if(i && i%3==0){ ret.push(","); }
					ret.push(tmp[i]);
				}
				ret.reverse();
				tmp = ret;
			}
			var part = tmp.join("");
			if(places){
				var num = Number(data).toFixed(places).split(".");
				part += "." + (num[1] ? num[1] : "00");
			}
			return (neg ? "-" : "") + part;
		},
		date: function(dt, tz, isUTC){
			var utc = isUTC ? "UTC" : "";
			var isPM = false, ret = (dt["get" + utc + "Month"]() + 1) + "/" + dt["get" + utc + "Date"]() + "/" + dt["get" + utc + "FullYear"]();
			var h = dt["get" + utc + "Hours"](),
				m = "00" + dt["get" + utc + "Minutes"](),
				s = "00" + dt["get" + utc + "Seconds"]();
			if(dt["get" + utc + "Hours"]() >= 12){
				isPM = true;
				h = (dt["get" + utc + "Hours"]() - 12);
			}
			if(h == 0) h = 12;
			ret += " " + h + ":" + m.slice(-2) + ":" + s.slice(-2) + (isPM?" PM ":" AM ") + (tz?tz:"");
			return ret;
		}
	};

	//	Logging
	c.enableLogging = false;	//	override this in individual files when developing.
	c.log = function(path){
		//	Path should be the absolute directory on the server where the log will be stored, plus the 
		//	beginning of the filename to be used.  For example:
		//
		//	var log = new c.log("c:\\logs\\MarchexAlerts");
		var fullPath = path + "_" + new Date().valueOf() + ".log", messages = [];
		this.log = function(s){
			messages.push("[LOG] " + new Date().toString() + " " + s);
		};
		this.warn = function(s){
			messages.push("[WARN] " + new Date().toString() + " " + s);
		};
		this.error = function(s){
			messages.push("[ERROR] " + new Date().toString() + " " + s);
		};
		this.flush = function(){
			if(c.enableLogging){
				c.write(fullPath, messages.join("\n"));
			}
		};
	};

	//	JSON handling.
	c.json = new (function(){
		var esc=function(s, isKey){
			s = s.replace(/(["\\])/g, '\\$1').replace(/\x00/g, "").replace(/[\f]/g, "\\f").replace(/[\b]/g, "\\b").replace(/[\n]/g, "\\n").replace(/[\t]/g, "\\t").replace(/[\r]/g, "\\r");
			return isKey ? s : '"' + s + '"';
		};
		var indent="\t";
		this.parse=function(json){
			return eval("("+json+")");
		};
		this.serialize=function(it, ind){
			//	note: the original this was pulled from (Dojo) had a "hidden" initiative/method
			//	that allowed you to define a specific serialization method; we do the same,
			//	but the name of the method should be "toJson".
			ind=ind||"";
			var indentify = ind.length;
			var nextIndent=(indentify?ind+indent:"");
			var newLine="\n";
			var objtype=String(typeof(it)).toLowerCase();
			if(it===undefined) return "undefined";
			if(it instanceof Date){
				//	UTC date
				return '"{FullYear}-{Month+}-{Date}T{Hours}:{Minutes}:{Seconds}Z"'.replace(/\{(\w+)(\+)?\}/g, function(t, prop, plus){
					var num = it["getUTC" + prop]() + (plus ? 1 : 0);
					return num < 10 ? "0" + num : num;
				});
			}
			else if((objtype=="number")||(objtype=="boolean")) return it+"";
			else if(it===null) return "null";
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
					res.push((indentify?newLine+nextIndent:"")+val);
				}
				return "["+res.join(", ")+(indentify?newLine+ind:"")+"]";
			}

			//	kill functions
			if(objtype=="function") return null;
			
			// generic object code path
			var output=[];
			for(var key in it){
				var keyStr, val;
				if(typeof(key)=="number") keyStr='"'+key+'"';
				else if(typeof(key)=="string") keyStr='"' + esc(key, true) + '"';
				else continue;
				
				val=recurse(it[key], nextIndent);
				if(typeof(val)!="string") continue;
				output.push((indentify?newLine+nextIndent:"")+keyStr+": "+val);
			}
			return "{"+output.join(", ")+(indentify?newLine+ind:"")+"}";
		};
	})();

	//	File system functionality
	
	//	Switch for writing unicode or not. Set with the actual script using the core.
	c.writeUnicode = true;

	c.read = function(path){
		//	local files, return as string
		if(fso.FileExists(path)){
			var ts = fso.GetFile(path).OpenAsTextStream(1,0);
			return (!ts.AtEndOfStream) ? String(ts.ReadAll()) : null;
		}
		return null;
	};

	c.write = function(path, contents, backup, append){
		if(fso.FileExists(path) && backup){
			var p = path.lastIndexOf('\\') + 1;
			var n = path.substring(0, p) + "__" + path.substring(p);
			if(fso.FileExists(n)){
				fso.DeleteFile(n);
			}
			fso.MoveFile(path, n);
		}
		var tf = (append !== true ? fso.CreateTextFile(path, true, c.writeUnicode) : fso.OpenTextFile(path, 8, c.writeUnicode));
		if(contents){
			tf.WriteLine(contents);
		}
		tf.Close();
	};
	
	//	Net functionality (XHR)
	c.request = function(verb, args){
		var http = getXhr();
		if(!http) throw new Error("XMLHTTP is not available.");

		//	keep going.
		var fn = args.load || function(){ };
		var err = args["error"] || function(e, response, http){
			throw new Error("request: an error occured in the course of the request (", url, "): HTTP code ", e.message, http.status);
		};
		var type = args.handleAs || "text";

		http.onreadystatechange = function(){
			if(http.readyState == 4){
				var data = (type == "xml" ? http.responseXML : http.responseText);
				if(type == "json"){
					data = c.json.parse(data);
				}
				if(http.status == 200){
					try {
						fn(data, http);
					} catch(e){
						err(e, data, http);
					}
				} else {
					err(new Error("request (" + url + ") returned HTTP status ", + http.status), data, http);
				}
			}
		};

		var url = args.url;
		if(args.content){
			url += "?" + objectToQuery(args.content);
		}

		//	if a post
		var data = args.post ? objectToQuery(args.post) : (args.data ? args.data : "");

		http.open(verb.toUpperCase(), url, false, args.user || undefined, args.password || undefined);

		//	if there are headers to be included
		if(args.headers){
			for(var p in args.headers){
				http.setRequestHeader(p, args.headers[p]);
			}
		}

		//	assemble the request
		http.send(data || undefined);
	};

	//	Data Access API
	var db={};
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
	var map={};
	map[16]=map[2] =map[3] =map[20]=
	map[17]=map[18]=map[19]=map[21]=
	map[4] =map[5] =map[6] =map[14]=
	map[131]=Number;

	map[11]=Boolean;

	map[7]=map[133]=map[134]=map[135]=Date;

	map[129]=map[200]=map[201]=
	map[130]=map[202]=map[203]=map[0]=String;

	//	utility functions, mostly to make sure we're not vunerable to SQL injections.
	function utfDecode(utftext){
		var s = "", c = c1 = c2 = 0;
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
	}
	function sqlSafe(s, maxlength){
		s = s ? utfDecode(c.trim(s).replace(/\'/g, "''")) : "";
		return maxlength ? s.substring(0, maxlength) : s;
	}

	function jsonSafe(s){
		return String(s).replace(/\"/g, "\\\"").replace(/\\\\\"/g, "\\\"").replace(/\n/g, "");
	};

	function dateToSql(dt){
		var m = "00" + (dt.getMonth() + 1),
			d = "00" + dt.getDate(),
			h = "00" + dt.getHours(),
			M = "00" + dt.getMinutes(),
			s = "00" + dt.getSeconds();
		return dt.getFullYear() + "-"
			+ m.substring(m.length - 2) + "-"
			+ d.substring(d.length - 2)
			+ " "
			+ h.substring(h.length - 2) + ":"
			+ M.substring(M.length - 2) + ":"
			+ s.substring(s.length - 2);
	};

	function parameterize(query, params){
		//	take any query with a params object and fill it out safely.
		for(var p in params){
			if(params[p] instanceof Date){
				//	convert dates to SQL format
				var dt = dateToSql(params[p]);
				query = query.replace(new RegExp(":" + p, "g"), "'" + dt + "'");
			}
			else if(params[p] instanceof Array){
				//	Make a list out of it, like for an IN filter.
				//	For now we are going to assume that the type of the initial value is
				//	the same type as all of the rest of the parameters.
				var arr = params[p].slice(0), type = typeof(arr[0]);
				for(var i=0, l=arr.length; i<l; i++){
					if(type == "string"){
						arr[i] = "'" + sqlSafe(arr[i]) + "'";
					}
				}
				query = query.replace(new RegExp(":" + p, "g"), arr.join());
			}
			else if(typeof(params[p]) == "number"){
				query = query.replace(new RegExp(":" + p, "g"), parseFloat(params[p],10));
			}
			else if(typeof(params[p]) == "string"){
				//	make sure we've surrounded our param in single quotes.
				query = query.replace(new RegExp(":" + p, "g"), "'" + sqlSafe(params[p]) + "'");
			} 
			else if(typeof(params[p] == "object")){
				//	JSON-ify it
				query = query.replace(new RegExp(":" + p, "g"), "'" + sqlSafe(jsonSafe(c.json.serialize(params[p]))) + "'");
			}
			else {
				//	just pass it through
				query = query.replace(new RegExp(":" + p, "g"), sqlSafe(params[p]));
			}
		}
		return query;
	};

	//	OK, now for the two main functions. One for SELECT statements, one for everything else.
	c.fetch = function(query, params, connect){
		query = parameterize(query, params);

		var rSet = { items: [] };
		if(!connect) throw new Error("function fetch requires a valid connection string.");

		var cn = WScript.CreateObject("ADODB.Connection"), err;
		try{
			cn.CommandTimeout = 0;
			cn.connectionTimeout = 0;
			cn.Open(connect);
			var rs = cn.Execute(query);
			if(!rs.BOF && !rs.EOF){
				rs.MoveFirst();
				var c = rs.Fields.Count;
				var fields=[];
				for(var i=0; i<c; i++){
					fields.push({
						name: rs.Fields.Item(i).Name,
						type: map[parseInt(rs.Fields.Item(i).Type)] || String,
						convert: convert.get(rs.Fields.Item(i).Type)
					});
				}
				
				while(!rs.EOF){
					var o = {};
					for(var i=0, l=fields.length; i<l; i++){
						var f = fields[i];
						var n = f.name, fn = f.convert;
						o[n] = fn(rs.Fields(n).Value);
					}
					rSet.items.push(o);
					rs.MoveNext();
				}
			}
			rs.Close();
		} catch(e){
			err = e;
		}
		
		//	Make sure the connection is closed.
		cn.Close();

		if(err) throw err;
		return rSet;
	};

	c.push = function(query, params, connect){
		query = parameterize(query, params);
		var cn = WScript.CreateObject("ADODB.Connection"), ret = "", err;
		try{
			cn.Open(connect);
			cn.Execute(query);
			cn.Close();
			/*
			if(query.toLowerCase().indexOf("insert") == 0){
				//	assume this was an auto-increment field, and try to return the new id.
				try {
					var rs = cn.Execute("SELECT SCOPE_IDENTITY() AS new_id");
					if(!rs.BOF && !rs.EOF){
						rs.MoveFirst();
						while(!rs.EOF){
							//	should only be one.
							ret = rs.Fields("new_id").Value;
							rs.MoveNext();
						}
					}
				} catch(id_e){ }
			}
			*/
		} catch(e){
			err = e;
		}
		
		//	Make sure the connection is closed.
		if(err){
			cn.Close();
			throw err;
		}
		return ret;
	};

	//	Emails
	//
	//	Required in the params object:
	//		from
	//		to
	//		subject
	//		text
	//
	//	Optional:
	//		cc
	//		bcc
	//		replyTo
	//		html
	//		attachments
	//			An Array of text-based files, each of which should have the following structure:
	//				filename
	//				content
	c.mail = function(params, config){
		if(!("to" in params)){
			throw new Error("function mail requires an object containing at least From, To, Subject and Text/HTML properties.");
		}

		var conf = WScript.CreateObject('CDO.Configuration'),
			confSchema = "http://schemas.microsoft.com/cdo/configuration/",
			svr = config.smtpServer;
		if(svr.length){
			conf.Fields.Item(confSchema + "smtpserver")             = svr;
			conf.Fields.Item(confSchema + "smtpserverport")         = config.smtpPort;
			conf.Fields.Item(confSchema + "smtpconnectiontimeout")  = config.smtpConnectionTimeout;
			conf.Fields.Item(confSchema + "sendusing")              = 2;	//	cdoSendUsingPort
			/*
			conf.Fields.Item(confSchema + "smtpauthenticate")       = (config.isSmtpBasicAuth) ? 1 : ((config.isSmtpNtAuth) ? 2 : 0);
			if("smtpUsername" in config){
				conf.Fields.Item(confSchema + "sendusername")       = config.smtpUsername;
			}
			if("smtpPassword" in config){
				conf.Fields.Item(confSchema + "sendpassword")       = config.smtpPassword;
			}
			*/
			conf.Fields.Update();
		}

		var msg = WScript.CreateObject('CDO.Message');
		msg.Configuration=conf;
		msg.From			= params.from;
		if((params.to || "").length){
			msg.To				= params.to;
		}
		if((params.cc || "").length){
			msg.Cc			= params.cc;
		}
		if((params.bcc || "").length){
			msg.Bcc			= params.bcc;
		}
		if((params.replyTo || "").length){
			msg.ReplyTo		= params.replyTo;
		}
		msg.Subject			= params.subject;
		if((params.html || "").length){
			msg.HTMLBody	= params.html;
		}
		if((params.text || "").length){
			msg.TextBody		= params.text;
		}

		if(params.attachments && (params.attachments instanceof Array || typeof params.attachments == "array")){
			for(var i=0,len=params.attachments; i<len; i++){
				if(params.attachments[i].file){
					msg.AddAttachment(params.attachments[i].file);
				} 
				else if(params.attachments[i].filename && params.attachments[i].content){
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

	//	Wrap the Echo out functionality, just in case we need to pull something like buffers
	c.print = function(s){
		WScript.Echo(s);
		return this;
	};

	//	template fill-in
	var reVars = /\$\{([^\s\}]+)?\}/g;
	var reSingleInclude = /\!\{([^\s\}]+)?\}/g;
	var reLoopedInclude =/\@\{([^\s\}]+)?\}/g;
	var reIncludes = /[\!\@]+\{([^\s\}]+)?\}/g;
	var templateCache = {}, rendered = {};
	c.templateCache = templateCache; 	//	temporary debug
	c.templates = {
		load: function(path, templatePath){
			//	given the filename of the template, go load it up using FSO
			//	and search for any nested templates, and load them up.
			//	Templates will be cached in the templateCache object.
			//
			//	Templates MUST have the following extension: .tmpl
			//	This will automatically be appended to the end of any path passed
			//	to this function.

			//	There's going to be some recursion going on here, because we
			//	need to load and cache any other templates (but not render)
			//	that may be referenced.  Syntax:
			//
			//	Single include (pass an object to fill out): !{template}
			//	Looped include (pass an array of objects): @{template}

			var tmpl;
			path = c.trim(path);
			if(path in templateCache){
				tmpl = templateCache[path];
				return tmpl;
			} else {
				try {
					tmpl = c.read(templatePath + path.replace("/", "\\") + ".tmpl");
					c.print(c.json.serialize(tmpl.match(reIncludes), "\t"));
				} catch(e){
					c.print("The following template did not load: " + templatePath + path.replace("/", "\\") + ".tmpl");
					c.print(c.json.serialize(e, "\t"));
					throw e;
				}
				if(tmpl !== null){
					//	we're good, cache it.
					templateCache[path] = tmpl;
					if(path == "MarchexAlerts/AlertGroup"){
						c.print("MarchexAlerts/AlertGroup" + "\n" + tmpl);
					}

					//	go look for nested templates and cache them too.
					var result, count = 0;
					while((result = reIncludes.exec(tmpl)) !== null){
						if(path == "MarchexAlerts/AlertGroup"){
							c.print(json.serialize(result, "\t"));
						}
						setTimeout(function(){
							c.print("Attempting to load " + result[1]);
							var tmp = c.templates.load(result[1], templatePath);
						}, 100);
						count++;
					}
					if(path == "MarchexAlerts/AlertGroup"){
						c.print("MarchexAlerts/AlertGroup had " + count + " matches.");
					}
				} else throw new Error("Core.templates.load: template " + path + ".tmpl does not exist.");
			}


			return tmpl;
		},
		replace: function(tmpl, obj){
			//	look for any ${property.property} in the template and replace it
			//	with the corresponding value in the passed object.
			return tmpl.replace(reVars, function(match, key){
				var value = getObject(obj, key);
				return (value).toString();
			});
		},
		each: function(tmpl, arr){
			//	given an ordered array of objects, loop through the array
			//	and output a replaced copy of the template for each item
			//	in the array.
			var out = [];
			for(var i=0, l=arr.length; i<l; i++){
				out.push(c.templates.replace(tmpl, arr[i]));
			}
			return out.join("");
		},
		render: function(tmpl, args, type){
			//	The function to be called when something finally needs to be 
			//	rendered to an output/string.
			//
			//	A MAJOR NOTE
			//	The args object has to contain ALL of the data to be rendered
			//	by ALL templates referenced.  For ANY nested templates (including
			//	templates nested by other nested templates), there MUST be a 
			//	property in the args object (nested, if needed) that is the 
			//	name of the template that will be used to fill out data.
			//
			//	For example, if we have a template that looks something like this:
			//
			//	<table><thead><tr>...</tr></thead><tbody>@{AlertRow}</tbody></table>
			//
			//	...then the args object MUST contain a property called "AlertRow",
			//	and it should be an array (most likely a resultset from an SQL
			//	query).

			//	debugging purposes.
			var tmp = {};
			for(var p in templateCache){
				tmp[p] = p;
			}

			if(!type){ rendered = {} }	//	reset the rendered hashtable. All
										//	nested templates should have a type.
			type = type || "single";	//	the type of template, we use this to 
										//	determine if we need to run a loop
										//	or not.

			//	First things first.  Go get and render all nested templates.
			var result, template = tmpl; //	use a copy and don't touch the original
			while((result = reSingleInclude.exec(template)) !== null){
				var ref = result[1];
				var nested = templateCache[ref];
				if(ref in rendered) continue;
				rendered[ref] = c.templates.render(templateCache[ref], (args && args[ref]) || {}, "single");
			}
			while((result = reLoopedInclude.exec(template)) !== null){
				var ref = result[1];
				var nested = templateCache[ref];
				if(ref in rendered) continue;
				rendered[ref] = c.templates.render(templateCache[ref], (args && args[ref]) || {}, "looped");
			}

			//c.print("The final rendered template set: " + c.json.serialize(rendered, "\t"));

			//	Now do any variable replacement in the template called.
			if(type == "single"){
				while((result = reVars.exec(template)) !== null){
					var ref = result[1], repl = result[0];
					template = template.replace(repl, "" + args[ref]);
				}
			} else {
				//	this is a looped template, which means the property should be an array.
				var newTemplate = "", loopedTemplate = template;
				for(var i=0, l=args.length; i<l; i++){
					while((result = reVars.exec(template)) !== null){
						var ref = result[1], repl = result[0];
						loopedTemplate = loopedTemplate.replace(repl, ""+args[i][ref]);
					}
					newTemplate += loopedTemplate;
					loopedTemplate = template;
				}
				template = newTemplate;
			}

			//	finally, assemble all of the templates together and return the result.
			while((result = reSingleInclude.exec(template)) !== null){
				var ref = result[1], repl = result[0];
				template = template.replace(repl, rendered[ref]);
			}
			while((result = reLoopedInclude.exec(template)) !== null){
				var ref = result[1], repl = result[0];
				template = template.replace(repl, rendered[ref]);
			}

			return template;
		}
	};

	//	math functions
	c.math = {
		variance: function(a){
			var mean=0, squares=0;
			for(var i=0, l=a.length; i<l; i++){
				mean += a[i];
				squares += Math.pow(a[i], 2);
			}
			return (squares/a.length) - Math.pow(mean/a.length, 2);
		},
		sd: function(a){
			return Math.sqrt(this.variance(a));
		},
		average: function(a){
			var t=0;
			for(var i=0, l=a.length; i<l; i++){ t += a[i]; }
			return t/Math.max(a.length, 1);
		},
		bestFit: function(a, xProp, yProp){
			xProp = xProp || "x", yProp = yProp || "y"; 
			var ac = a.slice(0);	//	clone the array, we don't want to alter it directly
			if(ac[0] !== undefined && typeof(ac[0]) == "number"){
				//	this is an array of numbers, so use the index as x.
				ac = c.map(ac, function(item, idx){
					var o = {};
					o[xProp] = idx;
					o[yProp] = item;
					return o;
					// return { x: idx, y: item };
				});
			}

			var sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, stt = 0, sts = 0, n = ac.length, t;
			for(var i=0; i<n; i++){
				sx += ac[i][xProp];
				sy += ac[i][yProp];
				sxx += Math.pow(ac[i][xProp], 2);
				syy += Math.pow(ac[i][yProp], 2);
				sxy += ac[i][xProp] * ac[i][yProp];
			}

			//	we use the following because it's more efficient and accurate for determining the slope.
			for(i=0; i<n; i++){
				t = ac[i][xProp] - sx/n;
				stt += t*t;
				sts += t*ac[i][yProp];
			}
			var slope = sts/(stt||1);	//	prevent divide by zero.

			//	get Pearson's R
			var d = Math.sqrt((sxx - Math.pow(sx,2)/n) * (syy - Math.pow(sy,2)/n));
			if(d === 0){
				//	This is server-side, don't want to be throwing actual errors here.  Return the slope
				//	and intercept and indicate the R/R2 values are not valid.
				return {
					slope: slope,
					intercept: (sy-sx*slope)/(n||1),
					r: -1,	//	TODO: need a better way of indicating this
					r2: -1
				};
			}

			var r = (sxy-(sx*sy/n)) / d;
			var r2 = Math.pow(r, 2);
			if(slope < 0){
				r = -r;
			}

			//	to use:  y = slope*x + intercept;
			return {
				slope: slope,
				intercept: (sy - sx*slope)/(n||1),
				r: r,
				r2: r2
			};
		},
		forecast: function(a, x, xProp, yProp){
			//	Using the bestFit algorithm above, find y for the given x.
			var fit = this.bestFit(a, xProp, yProp);
			return (fit.slope * x) + fit.intercept;
		},
		approx: function(a, pos){
			//	Returns a linearly approximated value from an array using
			//	a normalized float position value.
			var p = pos * (a.length - 1), t = Math.ceil(p), f = t - 1;
			if(f < 0){ return a[0]; }
			if(t >= a.length){ return a[a.length - 1]; }
			return a[f] * (t - p) + a[t] * (p - f);
		},
		summary: function(a, alreadySorted){
			//	Returns a non-parametric collection of summary statistics:
			//	the classic five-number summary extended to the Bowley's
			//	seven-figure summary.
			var ac = a.slice(0);
			if(!alreadySorted){ ac.sort(function(a, b){ return a - b; }); }

			var	l = this.approx,
				result = {
					// the five-number summary
					min:	ac[0],				// minimum
					p25:	l(ac, 0.25),		// lower quartile
					med:	l(ac, 0.5),			// median
					p75:	l(ac, 0.75),		// upper quartile
					max:	ac[ac.length - 1],	// maximum
					// extended to the Bowley's seven-figure summary
					p10:	l(ac, 0.1),			// first decile
					p90:	l(ac, 0.9)			// last decile
				};
			return result;
		}
	};

	return c;
})();
