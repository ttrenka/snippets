crawlr.FrontPage=new (function(){
	
	var debugged = false;
	
	this._build = function(siteId){
		var n = crawlr.config.newline(),
			components = crawlr.fetch(
				"SELECT	ComponentId, ComponentType, X, Y, Width, Height, Center, Visible",
				"FROM	frontPageComponents",
				"WHERE	SiteId = " + siteId,
				"ORDER BY SortOrder, CASE WHEN ComponentType = 'text' THEN 1 ELSE 0 END"
			).items,
			stageHeight = 475; // happy default
		
		for(var i=0, l=components.length; i<l; i++){
			if(components[i]["ComponentType"] == "stage"){
				stageHeight = components[i]["Height"] || stageHeight;
				break;
			}
		}

		var buffer = '<div class="stage" style="height:' + stageHeight + 'px;">' + n;
			buildStyle = function(i, s){
				var w = s && s.width ? s.width : components[i]["Width"],
					h = s && s.height ? s.height : components[i]["Height"];
				
				return ' style="' +
					(components[i]["X"] != null ? 'left:' + components[i]["X"] + 'px;' : "") +
					(components[i]["Y"] != null ? 'top:' + components[i]["Y"] + 'px;' : "") +
					(w != null ? 'width:' + w + 'px;' : "") +
					(h != null ? 'height:' + h + 'px;' : "") +
					'z-index:' + (i+1) + ';"';
			};
		
		for(var i=0, l=components.length; i<l; i++){
			var center = components[i]["Center"];
			
			switch(components[i]["ComponentType"]){
				case "media":
					var r = crawlr.fetch(
								"SELECT	MediaType, Label, MediaUrl, RotatorDelay, Width, Height",
								"FROM	frontPageMedia",
								"WHERE	ComponentId = " + components[i]["ComponentId"],
								"ORDER BY SortOrder"
							).items,
						k = r.length;
					
					if(k){
						switch(r[0]["MediaType"]){
							case "images":
								// if k > 1, then a rotator else an image
								if(k > 1){
									buffer +=
										'<script type="text/javascript">'+n+
										'dojo.require("dojox.widget.AutoRotator");'+n+
										'dojo.require("dojox.widget.rotator.FadeOut");'+n+
										'</script>'+n+
										'<div class="fpComp"' + buildStyle(i) + '>'+n+
											'<div dojoType="dojox.widget.AutoRotator" duration="3000" suspendOnHover="true" transition="dojox.widget.rotator.fadeOut">'+n;
									for (var z=0; z<k; z++) {
										buffer +=
												'<img src="' + crawlr.config.getStaticDomain() + r[z]["MediaUrl"] + '"'
												+ (r[z]["RotatorDelay"] ? ' duration="'
												+ r[z]["RotatorDelay"] + '"' : '')
												+ (z ? ' style="display:none;"' : '') + '/>'+n;
									}
									buffer +=
											'</div>'+n+
										'</div>'+n;
								}else{
									buffer +=
										'<div class="fpComp"' + buildStyle(i) + '>'+n+
											'<img src="' + r[0]["MediaUrl"] + '"' + ((r[0]["Label"] || "").length ? ' alt="' + r[0]["Label"] + '"' : "") + '/>'+n+
										'</div>'+n;
								}
								break;
							case "flash":
								// TODO: not supported yet
								break;
						}
					}
					break;
				
				case "primaryNav":
				case "text":
					var r = crawlr.fetch(
						"SELECT	Content, ColorCSSClass",
						"FROM	frontPageText",
						"WHERE	ComponentId = " + components[i]["ComponentId"]
					).items;
					
					if(r.length){
						buffer += '<div class="fpComp fpText' + (components[i]["Visible"] ? "" : " fpHidden") +
							(r[0]["ColorCSSClass"] ? " fpColor-" + r[0]["ColorCSSClass"] : "") +
							'"' + buildStyle(i) + '>' + n + r[0]["Content"] + n + '</div>' + n;
					}
					break;
					
				case "list":
					var r = crawlr.fetch(
								"SELECT	L.Caption, LI.Label, LI.Url, LI.OpenInWindow, LI.WindowWidth, LI.WindowHeight",
								"FROM	frontPageList L",
								"JOIN	frontPageListItems LI ON LI.ListId = L.ListId",
								"WHERE	L.ComponentId = " + components[i]["ComponentId"],
								"ORDER BY LI.SortOrder"
							).items,
						k = r.length;
					
					if(k){
						buffer += '<div class="fpComp fpList"' + buildStyle(i) + '>' + n +
							'\t<h2>' + r[0]["Caption"] + '</h2>' + n +
							'\t<nav>' + n +
								'\t<ul>' + n;
						for(var j=0; j<k; j++){
							buffer += '\t\t<li><a href="' + r[j]["Url"] + '"' +
								(r[j]["OpenInWindow"] ? ' class="openWindow"' +
									(r[j]["WindowWidth"] ? ' winwidth="' + r[j]["WindowWidth"] + '"': "") +
									(r[j]["WindowHeight"] ? ' winheight="' + r[j]["WindowHeight"] + '"' : "") : ""
								) +
								'>' + r[j]["Label"] + '</a></li>' + n;
						}
						buffer += '\t</ul>' + n + '</nav>' + n + '</div>' + n;
					}
					break;
			}
		}
		
		return buffer + n + '</div>' + n;
	};
	
	this.reload = function(siteId){
		var n = this._build(siteId);
		Application.Lock();
		Application.Contents("~~" + siteId + "~~") = n;
		Application.Unlock();
		return n;
	};
	
	this.render = function(siteId, bypassCache){
		var n = Application.Contents("~~" + siteId + "~~");
		
		if(crawlr.config.bypassCache() || bypassCache){
			console.info("crawlr.FrontPage.render: Bypassing cache!");
		}else if(n){
			if(!debugged){
				debugged = true;
				console.info("crawlr.FrontPage.render: Whoo! Front page is cached baby! " + n.length + " bytes");
			}
			return n;
		}else{
			console.debug("crawlr.FrontPage.render: Front page is not cached, loading from database...");
		}
		
		return this.reload(siteId);
	};

})();
