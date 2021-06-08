define(["dojo/dom", "dojo/query", "dojo/topic", "dojo/cookie"/*, "dojo/domReady!"*/],
function(dom, query, topic, cookie){
	var themes = {},
		currentTheme;

	//	fill out our private information
	query('link[data-type="theme"]').forEach(function(theme){
		if(document.body.classList.contains(theme.id)){
			document.body.classList.remove(theme.id);
		}
		if(!(theme.id in themes)){
			themes[theme.id] = {
				id: theme.id,
				title: theme.getAttribute("title"),
				lum: theme.getAttribute("data-lum")
			};
		}
		if(!theme.disabled){
			currentTheme = themes[theme.id];
			document.body.classList.add(theme.id);
		}
	});

	return new (function(){
		this.loaded = true;
		this.getTheme = function(){
			return currentTheme;
		};
		this.getThemes = function(){
			return themes;
		};
		this.setTheme = function(id){
			var node = dom.byId(id);
			query('link[data-type="theme"]').forEach(function(theme){
				if(document.body.classList.contains(theme.id)){
					document.body.classList.remove(theme.id);
				}
				theme.disabled = !(theme == node);
				if(!theme.disabled) currentTheme = themes[theme.id];
			});
			document.body.classList.add(currentTheme.id);
			cookie("t", currentTheme.id, { expires: 365 });
			//	find out if we're on the default logo or not
			var test = query(".drawer__logo img.aitrk-index-logo");
			if(test.length){
				if(id == "style-dark"){
					test[0].src = "img/aitrk-logo-white.svg";
				} else {
					test[0].src = "img/aitrk-logo-dark.svg";
				}
			}

			topic.publish("Themes/setTheme", { current: currentTheme, isDark: currentTheme.lum == "dark" });
			return currentTheme;
		};
		this.isLight = function(id){
			id = id || currentTheme.id;
			var t = themes[id];
			return t && t.lum == "light";
		};
		this.isDark = function(id){
			id = id || currentTheme.id;
			var t = themes[id];
			return t && t.lum == "dark";
		};
	})();
});
