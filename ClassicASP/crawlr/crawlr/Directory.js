crawlr.Directory=new (function(){

	var self = this,
		debugged = false,
		site = crawlr.Site.current();
	
	// uncomment to disable the console for this file
	// var console = { info:function(){}, debug:function(){}, log:function(){} };
	
	this.extensions = {
		CONTENT:"html",
		TEMPLATE:"template",
		META:"meta",
		FUNC:"crawlr",
		FOLDER:"folder",
		FILE:"file",
		DB:"db",
		REF:"ref",

		html:"html",
		template:"template",
		meta:"meta"
	};
	
	var basepath = crawlr.config.directory();
	if(basepath.lastIndexOf("\\") != basepath.length-1){ basepath += "\\"; }
	
	this.cacheInfo = function(){
		var count = 0,
			size = 0,
			app = Application.Contents(),
			s = '<br/><table border="1"><thead><tr><th>Key</th><th>Size</th><th>Value</th></tr></thead><tbody>';
		
		for(var i=1, len=app.Count+1; i<len; i++){
			var key = app.Key(i);
			if(key.indexOf("__") == 0){
				var v = app.Item(i);
				if(v){
					s += '<tr><td>' + key + '</td><td>' + v.length + '</td><td>' + crawlr.escapeHtml(v) + '</td></tr>';
					count++;
					size += v.length;
				}
			}
		}
		s += '</tbody></table>';
		
		return "Cache Info: " + count + " page" + (count != 1 ? 's' : '') + " cached using " + crawlr.formatNumber(size) + " bytes" + (count ? s : "");
	};
	
	this.byUrl = function(url, skipAllCaching, refreshCache, siteId){
		url = url.toLowerCase();
		console.info("crawlr.Directory.byUrl: url[" + url + "] siteId[" + siteId + "]");

		if(!siteId && site && site.siteId != null){
			siteId = site.siteId;
			console.info("crawlr.Directory.byUrl: no siteId passed in, setting to [" + siteId + "]");
		}
		if(siteId == null){ return null; }
		
		var n = Application.Contents("__" + siteId + "_" + url + "__");
		if(refreshCache || skipAllCaching || crawlr.config.bypassCache()){
			console.info("crawlr.Directory.byUrl: Bypassing caching!");
		}else if(n){
			if(!debugged){
				debugged = true;
				console.info("crawlr.Directory.byUrl: Whoo! " + url + " is cached baby!<div>" + crawlr.escapeHtml(n) + "</div>" + n.length + " bytes");
			}
			var node = json.parse(n);
			if(node.alias && node.type == "alias"){
				node.alias = getNode(node.alias, skipAllCaching, refreshCache, siteId);
			}
			return getNode(node, skipAllCaching, refreshCache, siteId);
		}else{
			console.info("crawlr.Directory.byUrl: Didn't find node \"" + url + "\" in cache");
		}

		n = loadNode(url, siteId);

		if(n){
			if(n.type == "alias"){
				console.debug("crawlr.Directory.byUrl: This node is an alias for [" + n.alias + "]");
				n.alias = self.byUrl(n.alias, skipAllCaching, refreshCache, siteId);
			}
			
			if(refreshCache && n.doNotCache && (n.url == "404" || n.url == "error")){
				var key = "__" + siteId + "_" + url + "__";
				console.debug("crawlr.Directory.byUrl: Refreshing a node that is causing a 404... flushing cache [" + key + "]");
				Application.Lock();
				Application.Contents(key) = null;
				Application.Unlock();
			}else if(skipAllCaching || n.doNotCache){
				console.debug("crawlr.Directory.byUrl: This node does not want to be cached, so skipping...");
			}else{
				cacheUrl(siteId, n.url, n);
			}
			return getNode(n, skipAllCaching, refreshCache, siteId);
		}
		
		return null;
	};
	
	function getNode(n, skipAllCaching, refreshCache, siteId){
		if(n.type == "ref"){
			console.debug("crawlr.Directory.getNode: This node is referencing [" + n.ref + "]");
			var ref = Application.Contents(n.ref);
			console.info("crawlr.Directory.getNode: Reference loaded:<div>" + crawlr.escapeHtml(ref) + "</div>" + ref.length + " bytes");
			return ref ? new Node(json.parse(ref)) : null;
		}
		return new Node(n);
	}
	
	function cacheUrl(siteId, url, obj){
		url = url.toLowerCase();
		var key = "__" + siteId + "_" + url + "__",
			s = json.serialize(obj),
			t = s.replace(/\t|\n\r|\n/g, "");

		console.debug('crawlr.Directory.cacheUrl: Saving node into cache [' + key + '] [' + t.length + ' bytes]<pre>' + crawlr.escapeHtml(s) + '</pre>');

		Application.Lock();
		Application.Contents(key) = t;
		Application.Unlock();
		return key;
	}
	
	function Node(args){
		if(args){
			crawlr.mixin(this, args);
		}
		
		this.pageTitle=function(s){
			if(this.alias){
				return this.alias.pageTitle(s);
			}
			if(s != null){ this.title = s; }
			if(this.title != null){
				return this.title;
			}
			var n=this.name||"", reExp=/\[\[([\u0001-\uFFFF]*?)\]\]/g;
			if(n.match(reExp)){
				var k=n.match(reExp)[0].replace("[[","").replace("]]","");
				var v=this.get(k);
				n=n.replace(n.match(reExp)[0], v);
			}
			return n;
		};
		
		this.windowTitle=function(){
			var site = crawlr.Site.current(),
				suffix = site ? (site.suffix.length ? site.suffix + " - " : "") + site.name : "",
				t = this.pageTitle(),
				label = this.get("pageSuffix");
			
			// don't show "home" in the window title for the front page
			if(this.url == "" && t.toLowerCase() == "home"){
				t = "";
			}
			
			if(this.leaf){
				t = this.parent().pageTitle() + " - " + t;
			}else if(label && label.toLowerCase() != t.toLowerCase()){
				t += (t.length ? " - " : "") + label;
			}
			return suffix.length && suffix != t ? t + (t.length ? " - " : "") + suffix : t;
		};
		
		this.bodyId=function(){
			var id = (this.rawUrl || this.url).split("/");
			if(util.trim(id[0])==""){ id.shift(); }
			while(util.trim(id[id.length-1]) == "" || id[id.length-1].indexOf("[[") != -1) id.pop();
			return this._bodyId = id.join("-").toLowerCase();
		};
		
		this.parent=function(){
			var n = this;
			//console.debug("Node::parent() 1 - url[" + n.url + "] type[" + n.type + "]");
			if(!n.url.length) return null;
			var parts = n.url.split('/');
			parts.pop();
			var url = parts.join('/');
			//console.debug("Node::parent() 2 - url[" + url + "]");
			return self.byUrl(url);
		};
		
		//	values access
		var values=args.values||{};
		this.has=function(key){ return values[key]!=null; };
		this.get=function(key){
			key=key||"__value__";
			return values[key];
		};
		this.getValues=function(){ return values; };
		this.set=function(key, value){
			key=key||"__value__";
			values[key]=value;
		};
	}

	var builderRegex = new RegExp("^.*\\." + self.extensions.FUNC + "$", "i");
	
	function getBuildersMap(path){
		console.debug("crawlr.Directory.getBuildersMap: Getting builders in " + basepath + path + crawlr.config.scriptFolder());
		var r = {};
		var dir = crawlr.ls(basepath + path + crawlr.config.scriptFolder());
		if(dir){
			for(var j=0, len2=dir.files.length; j<len2; j++){
				if(builderRegex.test(dir.files[j].Name)){
					var name = dir.files[j].Name;
					r[name.substring(0, name.lastIndexOf('.'))] = path + crawlr.config.scriptFolder() + "\\" + name;
				}
			}
		}else{
			console.error("Unable to get directory listing for " + basepath + path + crawlr.config.scriptFolder());
		}
		return r;
	}
	
	function getFile(path){
		var f = crawlr.getFile(path + ".template");
		if(f){
			f.type = "template";
			return f;
		}
		f = crawlr.getFile(path + ".html");
		if(f){ f.type = "html"; }
		return f;
	}
	
	function loadMeta(file){
		var s = crawlr.read(file) || "";
		return s.length ? json.parse(s) : null;
	}
	
	function assembleNode(obj, url, path, map, isFolder){
		console.debug("crawlr.Directory.assembleNode: Checking for a meta file: " + basepath + path + "index.meta");
		var meta = loadMeta(basepath + path + "index.meta") || {};
		var builderList = meta.builders || crawlr.config.builders();
		var builders = [];

		for(var i=0, len=builderList.length; i<len; i++){
			if(map[builderList[i]]){
				builders.push(map[builderList[i]]);
			}
		}
		
		crawlr.mixin(obj, {
			url:				url,
			path:				path,
			leaf:				isFolder ? false : true,
			builders:			builders
		});

		return obj;
	}
	
	function loadContent(siteId, url){
		siteId = siteId || 0;
		
		console.debug("crawlr.Directory.loadContent: Checking if url is in the database for site " + siteId);
		
		// check if the page is in the database
		var rs = crawlr.fetch(
			"SELECT	TOP 1 P.PageId, P.SiteId, P.Url, P.Alias, P.Redirect, P.OverrideMenuUrls, P.OverrideBreadcrumbs, P.Title, P.MetaDescription, P.MetaKeywords, P.SideBarType,",
			"		P.FeatureType, P.ShowSnippetRegion, P.ShowShareButton, P.FormId, P.FormRedirectUrl, P.OmniturePageName,",
			"		P.OmnitureChannel, P.OmnitureEventId, P.Builders, C.ContentId, C.Content, P2.Url AS CanonicalUrl",
			"FROM	sitePages P",
			"LEFT JOIN sitePages P2 ON P2.PageId = P.CanonicalPageId",
			"LEFT JOIN siteContent C ON C.SiteId = P.SiteId AND C.PageId = P.PageId AND C.Published = 1",
			"WHERE	P.Url = '" + url + "' AND P.SiteId = " + siteId + (site && site.siteId != 1 && siteId == 1 ? " AND P.AllowOnDealerSites = 1" : "")
		).items;
		
		if(rs.length){
			// whoo! we found the url in the database
			console.debug("crawlr.Directory.loadContent: Found url in the database!");
			var item = rs[0],
				obj = {
					pageId:	item["PageId"],
					siteId:	item["SiteId"],
					url:	item["Url"]
				};
			
			if(siteId == 1){
				crawlr.mixin(obj, {
					omniturePageName:	item["OmniturePageName"],
					omnitureChannel:	item["OmnitureChannel"],
					omnitureEventId:	item["OmnitureEventId"]
				});
			}
			
			// check if we have an alias
			if(item["Alias"]){
				obj.alias = item["Alias"];
				obj.redirect = item["Redirect"];
				obj.overrideMenuUrls = item["OverrideMenuUrls"];
				obj.overrideBreadcrumbs = item["OverrideBreadcrumbs"];
				
				var p = obj.alias.indexOf('/');
				if(obj.alias.toLowerCase().indexOf("http") == 0 || p == 0){
					// redirect remote url or local file
					obj.type = "redirect";
				}else if(obj.redirect){
					// redirect local page
					obj.type = "redirect";
					if(p != 0){
						obj.alias = '/' + obj.alias;
					}
				}else{
					// inline local page
					obj.type = "alias";
					obj.alias = crawlr.stripUrlSlashes(obj.alias);
				}
				return obj;
			}
			
			crawlr.mixin(obj, {
				canonicalUrl:		item["CanonicalUrl"],
				title:				item["Title"],
				metaDescription:	item["MetaDescription"],
				metaKeywords:		item["MetaKeywords"],
				sideBarType:		item["SideBarType"],
				featureType:		item["FeatureType"],
				showSnippetRegion:	item["ShowSnippetRegion"],
				showShareButton:	item["ShowShareButton"],
				formId:				item["FormId"],
				formRedirectUrl:	item["FormRedirectUrl"]
			});
			
			if(item["ContentId"]){
				// and the content is in the database too!
				console.debug("crawlr.Directory.loadContent: Page's content is in the database too!");

				obj.type		= "db";
				obj.content		= item["Content"],
				obj.builders	= item["Builders"] ? eval(item["Builders"]) : [
									"_crawlr\\preprocess.crawlr",
									"_crawlr\\pageInit.crawlr",
									"_crawlr\\shell.crawlr",
									"_crawlr\\header.crawlr",
									"_crawlr\\primaryNav.crawlr",
									"_crawlr\\breadcrumbs.crawlr",
									"_crawlr\\contentSide.crawlr",
									"_crawlr\\sideInfo.crawlr",
									"_crawlr\\socialLinks.crawlr",
									"_crawlr\\shareButton.crawlr",
									"_crawlr\\snippetRegionStart.crawlr",
									"_crawlr\\contentFeature.crawlr",
									"_crawlr\\contentBody.crawlr",
									"_crawlr\\industry.crawlr",
									"_crawlr\\form.crawlr",
									"_crawlr\\snippets.crawlr",
									"_crawlr\\offers.crawlr",
									"_crawlr\\footer.crawlr",
									"_crawlr\\analytics.crawlr"
								];
				
				// check if we need to create a reference
				if(site && siteId != obj.siteId){
					// we need to return a reference
					console.debug("crawlr.Directory.loadContent: Returning reference for site " + siteId + "'s content to site " + site.siteId);
					return {
						type: "ref",
						url: url,
						ref: cacheUrl(siteId, obj.url, obj)
					};
				}
				
				// this isn't a reference, so just return the obj
				return obj;
			}
			
			console.debug("crawlr.Directory.loadContent: Page's content is NOT in the database, checking file system");
			crawlr.mixin(obj, loadFile(url, siteId));
			return obj;
		}
		
		return null;
	}
	
	function checkFileAgainstDb(obj, url, siteId){
		// the only file based page that the dealer can override is the front page, so only do the siteId if url == ''
		var rs = crawlr.fetch(
			"SELECT	TOP 1 PageId, Url, Title, Alias, Redirect, MetaDescription, MetaKeywords, SideBarType, FeatureType,",
			"		ShowSnippetRegion, ShowShareButton, FormId, FormRedirectUrl, OmniturePageName, OmnitureChannel, OmnitureEventId",
			"FROM	sitePages",
			"WHERE	Url = '" + url + "'" + (url.length ? "" : " AND SiteId = " + siteId)
		).items;
		
		if(rs.length){
			var item = rs[0];
			return crawlr.mixin(obj, {
				pageId:				item["PageId"],
				url:				item["Url"],
				title:				item["Title"],
				alias:				item["Alias"],
				redirect:			item["Redirect"],
				metaDescription:	item["MetaDescription"],
				metaKeywords:		item["MetaKeywords"],
				sideBarType:		item["SideBarType"],
				featureType:		item["FeatureType"],
				showSnippetRegion:	item["ShowSnippetRegion"],
				showShareButton:	item["ShowShareButton"],
				formId:				item["FormId"],
				formRedirectUrl:	item["FormRedirectUrl"],
				omniturePageName:	item["OmniturePageName"],
				omnitureChannel:	item["OmnitureChannel"],
				omnitureEventId:	item["OmnitureEventId"]
			});
		}
		
		return obj;
	}

	function loadFile(url, siteId){
		var path = "",
			parts = url.split("/"),
			buildersMap = {},
			reExp = /\[\[([\u0001-\uFFFF]*?)\]\]/g,
			rawUrl = [];
		
		console.debug("crawlr.Directory.loadFile: " + parts.length + " parts: [" + parts.join("], [") + "]");
		
		for(var i=0, len=parts.length; i<len; i++){
			console.debug("crawlr.Directory.loadFile: Working on part " + (i+1) + "/" + len + " [" + parts[i] + "] path=" + path);
			crawlr.mixin(buildersMap, getBuildersMap(path));
			
			if(len == 1 && !parts[0].length){
				// root node: this should ALWAYS exist
				console.debug("crawlr.Directory.loadFile: Loading root node");
				return assembleNode(checkFileAgainstDb(getFile(basepath + path + parts[i] + "\\index"), "", siteId), "", path, buildersMap, true);
			}else{
				console.debug("crawlr.Directory.loadFile: Finding " + basepath + path + parts[i]);
				var f = crawlr.getFolder(basepath + path + parts[i]);
				
				if(f){
					console.debug("crawlr.Directory.loadFile: Found folder " + basepath + path + parts[i]);
					rawUrl.push(parts[i]);
					if(i+1 == len){
						console.debug("crawlr.Directory.loadFile: We are on the last part, looking for an index file");
						f = getFile(basepath + path + parts[i] + "\\index");
						if(f){
							console.debug("crawlr.Directory.loadFile: Found the index file!  Type = " + f.type);
							path += parts[i] + "\\";
							crawlr.mixin(buildersMap, getBuildersMap(path));
							return assembleNode(checkFileAgainstDb(f, url), url, path, buildersMap, true);
						}else{
							console.debug("crawlr.Directory.loadFile: No index file, maybe '" + parts[i] + "' was a file?");
							f = getFile(basepath + path + parts[i]);
							if(f){
								console.debug("crawlr.Directory.loadFile: Yup, it was a file");
								return assembleNode(checkFileAgainstDb(f, url), url, path, buildersMap);
							}else{
								console.debug("crawlr.Directory.loadFile: We probably have a bad node... shoot them to the 404 page");
							}
						}
					}
				}else{
					f = getFile(basepath + path + parts[i]);
					if(f){
						console.debug("crawlr.Directory.loadFile: Found file " + basepath + path + f.name);
						return assembleNode(checkFileAgainstDb(f, url), url, path, buildersMap);
					}else{
						console.debug("crawlr.Directory.loadFile: Checking if node is dynamic in " + basepath + path);
						var dir = crawlr.ls(basepath + path);
						if(dir){
							for(var j=0, len2=dir.folders.length; j<len2; j++){
								var matches = reExp.exec(dir.folders[j].Name);
								if(matches && matches.length > 1){
									path += matches[0] + "\\";
									console.debug("crawlr.Directory.loadFile: Found dynamic node with '" + matches[1] + "' = '" + parts[i] + "' path=" + path);
									rawUrl.push(matches[0]);
									f = getFile(basepath + path + "\\index");
									if(f){
										f.values = {};
										f.values[matches[1]] = parts[parts.length-1];
										var ru = rawUrl.join('/');
										f.rawUrl = '/' + ru.substring(0, ru.lastIndexOf('/')) + '/' + matches[0] + '/';
										if(i + 1 < len){
											console.debug("crawlr.Directory.loadFile: We're not done yet... we have " + (len - (i + 1)) + " parts left");
											break;
										}else{
											crawlr.mixin(buildersMap, getBuildersMap(path));
											return assembleNode(checkFileAgainstDb(f, url), url, path, buildersMap, true);
										}
									}
								}
							}
							// if we found a dynamic node, then skip adding the part to the path below
							if(f){ continue; }
						}
					}
				}
				
				if(!f){ break; }

				path += parts[i] + "\\";
			}
		}
		
		// end of the road
		console.debug("crawlr.Directory.loadFile: File not found, returning 404");
		path = "404\\";
		crawlr.mixin(buildersMap, getBuildersMap(path));
		return assembleNode(crawlr.mixin(getFile(basepath + path + "index"), { doNotCache:true, title:"Page Not Found" }), "404", path, buildersMap, true);
	}
	
	function loadNode(url, siteId){
		var sid = siteId || (site && site.siteId ? site.siteId : null),
			obj = null;
		
		if (sid != 1 && !crawlr.config.get("enableDealerLookupForDealerSites") && url.split('/')[0] == "dealers") {
		
			console.debug("Dealers module is turned off for dealer sites... going to 404 page");
			obj = loadFile("404");
		
		} else {
		
			console.debug("crawlr.Directory.loadNode: Loading content from database...");
			obj = loadContent(sid, url);
			
			// check if skyline.com has the content
			if(!obj && sid != 1){
				console.debug("crawlr.Directory.loadNode: No content for this dealer, checking if skyline.com in the database...");
				obj = loadContent(1, url);
			}
			
			if(!obj){
				console.debug("crawlr.Directory.loadNode: Page not in the database, checking the file system...");
				obj = loadFile(url);
			}
		}
		
		return obj;
	}
})();
