crawlr.Site=new (function(){

	var v = Request.ServerVariables,
		p = String(v("SERVER_PORT")),
		hostname = String(v("SERVER_NAME")) + (p != "80" && p != "443" ? "," + p : "").toLowerCase(),
		debugged = false,
		rebuilt = false;

	this.reload = function(){
		this.current("", true);
	};
	
	this.current = function(hn, bypassCache){
		hn = (hn || hostname).toLowerCase();
		
		var n = Application.Contents("::" + hn + "::"),
			secureHostName = crawlr.config.get("secureHostName");

		if(!rebuilt && (crawlr.config.bypassCache() || bypassCache || crawlr.Request.GET.get("bypassCache"))){
			console.info("crawlr.Site.current: Bypassing cache!");
		}else if(n){
			// if the host is known to be invalid, just return null
			if(n == "NULL"){
				return null;
			}
			var site = json.parse(n);
			if(!debugged){
				debugged = true;
				console.info("crawlr.Site.current: Whoo! " + hostname + " is cached baby!<div>" + n + "</div>" + n.length + " bytes");
			}
			return site;
		}else{
			console.debug("crawlr.Site.current: Site not cached, loading sites from database...");
		}
		
		rebuilt = true;

		if(secureHostName && hn == secureHostName.toLowerCase()){
			// we know this host name exists
			return this._loadSites();
		}
		
		// check if the current host name is valid in the database
		var r = crawlr.fetch(
				"SELECT H.HostNameId",
				"FROM	sites S",
				"JOIN	distMaster M ON M.Id = S.DealerId AND M.Status IN (" + crawlr.config.status() + ")",
				"JOIN	siteHostNames H ON H.SiteId = S.SiteId AND H.HostName = '" + crawlr.sqlSafe(hn) + "'",
				"WHERE	S.Status = 1"
			).items;
	
		if(r.length){
			return this._loadSites();
		}
		
		console.debug("crawlr.Site.current: Host name \"" + hn + "\" not found in the database, flagging as null.");
		Application.Contents("::" + hn + "::") = "NULL";
	};
	
	this._loadSites = function(){
		// we have a valid hostname
		var r = crawlr.fetch(
				"SELECT	S.SiteId, S.DealerId, S.Name, S.Suffix, S.ContactInfo, S.LogoDealerName, S.AboutPageId, ISNULL(P.Url, '') AS AboutUrl,",
				"		ISNULL(P.Title, '') AS AboutTitle, S.MetaDescription, S.MetaKeywords, S.AddThisAccountId, S.FormFromAddress, S.FormToAddress, S.FormCcAddress,",
				"		S.GWebmasterVerifyName, S.GWebmasterVerifyContent, S.StatCounterProjectId, S.StatCounterPartitionId, S.StatCounterSecurityKey,",
				"		S.EnableStoreBanner, S.StoreBannerUrl, S.FacebookUrl, S.TwitterUrl, S.YouTubeUrl, S.LinkedInUrl, S.VimeoUrl, S.SlideShareUrl, S.FooterScriptBlock,",
				"		H.HostName, H.Description, H.GoogleSearchKey, H.GoogleMapsKey, H.GoogleAnalyticsKey, ISNULL(H2.HostName, H.HostName) AS PrimaryHostName",
				"FROM	sites S",
				"JOIN	distMaster M ON M.Id = S.DealerId AND M.Status IN (" + crawlr.config.status() + ")",
				"JOIN	siteHostNames H ON H.SiteId = S.SiteId",
				"LEFT JOIN siteHostNames H2 ON H2.SiteId = S.SiteId AND H2.IsPrimary = 1",
				"LEFT JOIN sitePages P ON P.SiteId = S.SiteId AND S.AboutPageId >= 0 AND P.PageId = S.AboutPageId",
				"WHERE	S.Status = 1"
			).items,
			len = r.length,
			site = null;

		console.debug("crawlr.Site.current: Rebuilding entire site cache with " + len + " sites + host names");
	
		Application.Lock();
		
		// kill all the existing keys in cache
		var app = Application.Contents();
		for(var i=1; i<=app.Count; i++){
			var key = app.Key(i);
			if(key.indexOf("::") == 0){
				Application.Contents.Remove(key);
				i = 0;
			}
		}
		
		// force the secure domain to be loaded
		var secureHostName = crawlr.config.get("secureHostName");
		if(secureHostName){
			secureHostName = secureHostName.toLowerCase();
			var obj = {
				siteId: 0,
				hostName: secureHostName || "",
				gMapsKey: crawlr.config.get("secureGoogleMapKey") || "",
				primaryHostName: secureHostName
			};
			Application.Contents("::" + secureHostName + "::") = json.serialize(obj).replace(/\t|\n\r|\n/g, "");
			if(secureHostName == hostname){
				site = obj;
			}
		}
		
		for(var i=0; i<len; i++){
			var h = r[i]["HostName"].toLowerCase(),
				obj = {
					siteId: r[i]["SiteId"],
					dealerId: r[i]["DealerId"],
					name: r[i]["Name"] || "",
					suffix: r[i]["Suffix"] || "",
					contactInfo: r[i]["ContactInfo"] || "",
					logoDealerName: r[i]["LogoDealerName"] || "",
					aboutUrl: r[i]["AboutUrl"] || "",
					aboutTitle: r[i]["AboutTitle"] || "",
					metaDescription: r[i]["MetaDescription"] || "",
					metaKeywords: r[i]["MetaKeywords"] || "",
					addThisAccountId: r[i]["AddThisAccountId"] || "",
					formFromAddress: r[i]["FormFromAddress"] || "",
					formToAddress: r[i]["FormToAddress"] || "",
					formCcAddress: r[i]["FormCcAddress"] || "",
					gwtVerifyName: r[i]["GWebmasterVerifyName"] || "",
					gwtVerifyContent: r[i]["GWebmasterVerifyContent"] || "",
					statCounterProjectId: r[i]["StatCounterProjectId"] || "",
					statCounterPartitionId: r[i]["StatCounterPartitionId"] || "",
					statCounterSecurityKey: r[i]["StatCounterSecurityKey"] || "",
					enableStoreBanner: r[i]["EnableStoreBanner"] || 0,
					storeBannerUrl: r[i]["StoreBannerUrl"] || "",
					facebookUrl: r[i]["FacebookUrl"] || "",
					twitterUrl: r[i]["TwitterUrl"] || "",
					youtubeUrl: r[i]["YouTubeUrl"] || "",
					linkedinUrl: r[i]["LinkedInUrl"] || "",
					vimeoUrl: r[i]["VimeoUrl"] || "",
					slideshareUrl: r[i]["SlideShareUrl"] || "",
					footerScriptBlock: r[i]["FooterScriptBlock"] || "",
					hostName: h || "",
					description: r[i]["Description"] || "",
					gSearchKey: r[i]["GoogleSearchKey"] || "",
					gMapsKey: r[i]["GoogleMapsKey"] || "",
					gAnalyticsKey: r[i]["GoogleAnalyticsKey"] || "",
					logoPath: "/logos/1.gif",
					primaryHostName: r[i]["PrimaryHostName"]
				},
				logoDir = crawlr.ls(crawlr.config.root() + "logos").files;
			
			for(var j=0; j<logoDir.length; j++){
				if(logoDir[j].name.indexOf(obj.siteId + '.') == 0){
					obj.logoPath = "/logos/" + logoDir[j].name;
					break;
				}
			}
			
			Application.Contents("::" + h + "::") = json.serialize(obj).replace(/\t|\n\r|\n/g, "");
			
			if(h == hostname){
				site = obj;
				console.debug("crawlr.Site.current: Loaded and cached site \"" + hostname + "\" \"" + site.description + "\"");
			}
		}
		
		Application.Unlock();
		
		return site;
	};

})();
