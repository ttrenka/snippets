dojo.provide("qd.app.topMovies");
dojo.require("dojo.behavior");

qd.app.topMovies = new (function(){
	this.switchPage = function(page){
		//	summary:
		//		Change to a Top Movies sub-page.
		//	page:
		//		"top100", "newReleases", "top25ByGenre"
		this.loggedIn = qd.app.authorized;
		var menuId, source, fetch=qd.app.feeds.fetch;
		switch(page){
			case "top100":
				menuId = "topMoviesTop100";
				source = {url: qd.service.feeds.top100().feed };
				break;
			case "newReleases":
				menuId = "topMoviesNewReleases";
				source = {url: qd.service.feeds.newReleases().feed };
				break;
			case "top25ByGenre":
				menuId = "topMoviesTop25ByGenre";
				source = {url: qd.app.feeds.currentTop25Feed};
				break;
			case "recommendations":
				menuId = "topMoviesRecommendations";
				qd.app.resultsList.setResultsType("recommendations");
				fetch = function(){ qd.app.resultsList.fetch(arguments); }
				break;
			case "search":
				menuId = "";
				qd.app.resultsList.setResultsType("search");
				fetch = null; // search does its own fetch
				break;
		}
		qd.app.selectNav(menuId, "topMoviesSubNav");
		if(fetch){ fetch(source); }

		this.currentPage = page;
		this.togglePageElements();

		qd.app.switchPage("topMovies");
		console.log("switched.");
	};
	
	this.togglePageElements = function(){
		//	summary:
		//		Show/hide certain elements of the content area according
		//		to the current page.
		var p = this.currentPage;
		dojo.style("genrePicker", "display", p=="top25ByGenre"?"inline":"none");
		dojo.style("top100Title", "display", p=="top100"?"block":"none");
		dojo.style("newReleasesTitle", "display", p=="newReleases"?"block":"none");

		dojo.style("artworkList", "display", (p=="search"||p=="recommendations")?"none":"block");
		dojo.style("searchResults", "display", (p=="search"||p=="recommendations")?"block":"none");
	}

	this.checkForRefresh = function(){
		//	summary:
		//		Make sure we are allowed to see the area requested.
		this.togglePageElements();
		if(this.loggedIn === undefined){
			return;
		}
		if(qd.app.authorized && this.loggedIn != qd.app.authorized){
			this.switchPage(this.currentPage);
			this.loggedIn = qd.app.authorized;
		}
		dojo.style("topMoviesRecommendations", "display", qd.app.authorized ? "block" : "none");
	};

	dojo.behavior.add({
		// Top Movies sub nav
		"#topMoviesTop100 a": {
			onclick:dojo.hitch(this, function(){
				this.switchPage("top100");
				return false;
			})
		},
		"#topMoviesNewReleases a": {
			onclick:dojo.hitch(this, function(){
				this.switchPage("newReleases");
				return false;
			})
		},
		"#topMoviesTop25ByGenre a": {
			onclick:dojo.hitch(this, function(){
				this.switchPage("top25ByGenre");
				return false;
			})
		},
		"#topMoviesRecommendations a": {
			onclick:dojo.hitch(this, function(){
				this.switchPage("recommendations");
				return false;
			})
		}
	});

	// lazy load the Top 100 feed when we visit Top Movies for the first time
	var sectionSwitchConnect = dojo.connect(qd.app, "switchPage", dojo.hitch(this, function(page){
		if(page == "topMovies" && !this.currentPage){
			dojo.disconnect(sectionSwitchConnect);
			this.switchPage("top100");
			this.loggedIn = qd.app.authorized;
		}
	}));
})();
