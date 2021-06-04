dojo.provide("qd.app.feeds");

dojo.require("dojo.behavior");
dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.filter.lists");
dojo.require("dojox.dtl.tag.logic");
dojo.require("dojox.dtl.tag.misc");

dojo.require("qd.app.queue");
dojo.require("qd.app.topMovies");

qd.app.feeds = new (function(){
	this.currentTop25Feed = null;
	var movieListTemplate = null,
		underlay = qd.app.underlay;

	this.setupTop25Picker = function(){
		//	summary:
		//		Create DOM structure and click handlers for the Genre picker
		//		on the Top Movies > Top 25 By Genre page.
		var feeds = qd.service.feeds.list(),
			gp = dojo.byId("genrePicker"),
			gpl = dojo.query("ul", gp)[0],
			__h = null;

		dojo.connect(gp, "onclick", function(){
			if(!dojo.hasClass(gp, "open")){
				dojo.addClass(gp, "open");
				underlay.show({loader:false, bodyOnly:false});
			}else{
				underlay.hide();
			}
			__h = dojo.connect(underlay, "hide", function(){
				dojo.removeClass(gp, "open");
				dojo.disconnect(__h);
			});
		});

		dojo.forEach(feeds, function(item){
			var li = document.createElement("li");
			li.innerHTML = item.term;
			dojo.connect(li, "onclick", dojo.hitch(this, function(evt){
				this.currentTop25Feed = item.feed;
				this.fetch({url:this.currentTop25Feed});
				dojo.query("li", gpl).removeClass("selected");
				dojo.addClass(evt.target, "selected");
				dojo.byId("genrePickerSelection").innerHTML = item.term;
				underlay.hide();
				dojo.stopEvent(evt);
			}));

			// the first time through, select the first genre
			if(item.feed == feeds[0].feed){ dojo.addClass(li, "selected"); }
			gpl.appendChild(li);
		}, this);

		// select the first genre
		dojo.byId("genrePickerSelection").innerHTML = feeds[0].term;
		this.currentTop25Feed = feeds[0].feed;
	}

	this.fetch = function(/* Object */feed){
		//	summary:
		//		Fetch one of the public Netflix RSS feeds and render the
		//		results to the page.
		//	feed:
		//		Object containing at least one of the following members:
		//		* feedName ("top100"|"newReleases")
		//		* url (URL to a specific feed)
		if(!movieListTemplate){
			movieListTemplate = new dojox.dtl.HtmlTemplate("artworkList");
		}
		underlay.show();
		qd.service.feeds.fetch({
			url: feed.url,
			result: function(data){
				dojo.forEach(data, function(m){
					m.inQueue = qd.app.queue.inQueueByTerm(m.title);
				});

				dojo.query("#artworkList .addButton").removeClass("inQueue");
				
				dojo.query(".contentTop", "topMoviesContainerNode").forEach(function(node){
					node.scrollTop = 0;
				});

				movieListTemplate.render(new dojox.dtl.Context({ catalog_titles: data }));
				underlay.hide();
				dojo.behavior.apply();

				dojo.query("#artworkList .movie").forEach(function(node){
					qd.app.movies.setupMovieId(node);
				});
			},
			error: function(err, title){
				console.warn("feeds.fetch ERROR: ", err);
				underlay.hide();
				qd.app.errorTooltip.show(
					"The " + (title || "feed") + " is not available.",
					"This feed will be available when Queued is back online."
				);
			}
		});
	}

	// lazy load the genre picker
	var switchConnect = dojo.connect(qd.app.topMovies, "switchPage", dojo.hitch(this, function(){
		dojo.disconnect(switchConnect);
		this.setupTop25Picker();
	}));
})();
