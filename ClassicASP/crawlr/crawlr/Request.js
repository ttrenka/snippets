crawlr.Request=new (function(r){
	var self=this;
	var secured=false;
	var d={}, v=r.ServerVariables;

	//	this one differs in that we create user friendly names for things.
	this.get=function(key){ return d[key]; };
	this.has=function(key){ return (d[key]!=null); };

	//	access to the original
	this.Key=function(idx){ return v.Key(idx); };
	this.Item=function(key){ return v.Item(key); };

	//	user-friendly names, don't bother with by index
	var t=String(v.Item("ALL_RAW")).split("\r\n");
	for(var i=0; i<t.length; i++){
		var item=t[i].split(": ");
		d[item[0]]=item[1];
	}
	
	//	other variables
	d["Authorization"]={
		Password: String(v("AUTH_PASSWORD")),
		Type: String(v("AUTH_TYPE")),
		User: String(v("AUTH_USER"))
	};
	d["Certificate"]={
		Cookie: String(v("CERT_COOKIE")),
		Flags: String(v("CERT_FLAGS")),
		Issuer: String(v("CERT_ISSUER")),
		KeySize: String(v("CERT_KEYSIZE")),
		SecretKeySize: String(v("CERT_SECRETKEYSIZE")),
		Serial: String(v("CERT_SERIALNUMBER")),
		Subject: String(v("CERT_SUBJECT"))
	};
	d["Content"]={
		Length: String(v("CONTENT_LENGTH")),
		Type: String(v("CONTENT_TYPE"))
	};
	
	d.Method=String(v("REQUEST_METHOD"));
	d.QueryString=String(v("QUERY_STRING"));
	d.UserAgent=String(v("HTTP_USER_AGENT"));
	if(String(v("HTTPS")).indexOf("off")==-1) secured=true;

	d["Path"]={
		Info: String(v("PATH_INFO")),
		Physical: String(v("PATH_TRANSLATED")),
		Application: String(v("APPL_PHYSICAL_PATH")),
		Url: String(v("URL")),
		Host: String(v("SERVER_NAME")).toLowerCase(),
		IP: String(v("LOCAL_ADDR")),
		Port: String(v("SERVER_PORT"))
	};
	
	d["Remote"]={
		Address: String(v("REMOTE_ADDR")),
		Host: String(v("REMOTE_HOST")),
		User: String(v("REMOTE_USER"))
	};
	
	this.buildDomain=function(){
		var p=d["Path"].Port;
		return (secured ? "https" : "http") + "://" + d["Path"].Host + (p != 80 && p != 443 ? ':' + p : '');
	};

	this.isSecured=function(){ return secured; };

	this.cookies=new (function(c){
		var d={};
		var a=[];

		this.get=function(key, sub){
			if(sub && d[key]) return d[key][sub];
			return d[key];
		};
		this.getByIndex=function(idx){
			if(a[idx]) return this.get(a[idx]);
			return null;
		};
		this.has=function(key){ return (d[key]!=null); };
		this.count=function(){ return a.length; };
		
		for(var i=1; i<=c.Count; i++){
			if(c.Item(c.Key(i)).HasKeys){
				var o=d[c.Key(i)]={};
				var t=String(c.Item(c.Key(i))).split("&");
				for(var j=0; j<t.length; j++){
					var p=t[j].split("=");
					o[p[0]]=p[1]||null;
				}
			} else {
				d[c.Key(i)]=String(c.Item(c.Key(i)));
			}
			a[i]=c.Key(i);
		}
	})(r.Cookies);

	this.POST=new (function(f){
		var d={};
		var a=[];

		this.get=function(key){ return d[key]; };
		this.getKeys=function(){ return a; };
		this.getByIndex=function(idx){ 
			if(a[idx]) return this.get(a[idx]);
			return null;
		}
		this.has=function(key){ return (d[key]!=null); };
		this.count=function(){ return a.length; };

		for(var i=1; i<=f.Count; i++){
			d[f.Key(i)]=String(f.Item(f.Key(i)));
			a.push(String(f.Key(i)));
		}
	})(r.Form);

	this.GET=new (function(q){
		var d={};
		var a=[];
		
		this.get=function(key){ return d[key]!=null ? d[key] : ""; };
		this.getByIndex=function(idx){ 
			if(a[idx]) return this.get(a[idx]);
			return null;
		};
		this.has=function(key){ return (d[key]!=null); };
		this.count=function(){ return a.length; };
		this.parse=function(r){
			r=crawlr.resolvePathEntities(r);
			while(r.length){
				var p=r.indexOf('=');
				if(p == -1){ return; }
				var k=r.substring(0,p), s=r.indexOf('=',p+1);
				while(s != -1){
					if(r.lastIndexOf('&',s) != -1){ break; }
					s=r.indexOf('=',s+1);
				}
				if(s == -1){
					d[k]=r.substring(p+1);
					r="";
				}else{
					var t=r.lastIndexOf('&',s);
					if(t == -1){
						// This should never happen...
						// No previous '&' found, assume the = was not escaped properly.
						// Just store the rest of the query string and call it done.
						d[k]=r.substring(p+1);
						r="";
					}else{
						d[k]=r.substring(p+1,t)
						r=r.substring(t+1);
					}
				}
				a.push(k);
			}
		};
		this.parse(q);
	})(d.QueryString);
})(Request);
