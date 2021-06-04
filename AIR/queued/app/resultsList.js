dojo.provide("qd.app.resultsList");

dojo.require("qd.app.recommendations");
dojo.require("qd.app.search");
dojo.require("dojo.behavior");
dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.filter.lists");
dojo.require("dojox.dtl.tag.logic");
dojo.require("dojox.dtl.tag.misc");

qd.app.resultsList = new (function(){

	var resultsTemplate = null,
	    fetchMoreTemplateNode = null,
	    resultsImpl = qd.app.search; // can be qd.app.recommendations or qd.app.search

	this.ITEMS_PER_FETCH = 20;
	this.HIDE_TIMER_DURATION = 150;

	this.results = [];
	this.sort = "Relevance";
	this.suggestion = null;
	this.autoSuggestTimer = null;
	this.sortTimer = null;


	this.setResultsType = function(/* String */type){
		//	summary:
		//		Set the results list to the given type.
		//	type:
		//		One of ("recommendations", "search") depending on the operation.
		switch(type){
			case "recommendations":
				resultsImpl = qd.app.recommendations;
				break;
			case "search":
			default:
				resultsImpl = qd.app.search;
		}
	};

	this.clearResults = function(/* Boolean */deleteFromMemory){
		//	summary:
		//		Clear the current search results.
		//	deleteFromMemory:
		//		Pass true to clear the current results from memory as well as the
		//		page, false to clear only the display itself. Defaults to true.
		var context = {results:null};
		if(typeof deleteFromMemory != "undefined" && !deleteFromMemory){
			context = dojo.mixin(context, resultsImpl.getClearContextData());
		}else{
			this.results = [];
		}
		this.renderResults(new dojox.dtl.Context(context));
		// normally I'd do dojo.query(...).orphan() here, but that throws an error
		dojo.query(".movie", "searchResultsList").forEach(function(node){
			node.parentNode.removeChild(node);
		});
	};

	this.postProcessResults = function(results){
		//	summary:
		//		Common code to finish up post-search/recommendations/sort

		// cache the results, build a guid list.
		var guids = [];
		if(results){
			for(var i=0; i<results.length; i++){
				this.results.push(results[i]);
				guids.push(results[i].guid);
			}
		}

		// put movie IDs into the DOM
		var qam = qd.app.movies, inQueue;
		dojo.query("#searchResults .movie").forEach(function(node){
			qam.setupMovieId(node);
			dojo.query(".addButton", node).forEach(function(n){
				inQueue = qd.app.queue.inQueue(qam.getMovieIdByNode(n), "queueList");
				dojo[inQueue ? "addClass" : "removeClass"](n, "inQueue");
			});
		});

		// funny bug: sometimes when repeating a search or fetching recommendations
		// twice in a row, our box art loses its src
		var qs = qd.services;
		dojo.query("#searchResults img[src=]").forEach(function(n){
			dojo.attr(n, "src", qs.item(qam.getMovieIdByNode(n)).art.large);
		});

		qd.app.underlay.hide();

		// build & activate any pending rating widgets
		qd.service.titles.rated({
			guids: guids,
			result: function(data){
				dojo.forEach(data, function(item){
					var nl = dojo.query("div[movie='" + item.guid + "'] .starRating", dojo.byId("searchResultsList"));
					if(nl){
						//	should be unique.
						var rating = 3, type = "average";
						if(item.ratings){
							if(item.ratings.user && item.ratings.user > 0){
								rating = item.ratings.user;
								type = "user";
							}
							else if(item.ratings.predicted && item.ratings.predicted > 0){
								rating = item.ratings.predicted;
								type = "predicted";
							}
							else if(item.ratings.average && item.ratings.average > 0){
								rating = item.ratings.average;
								type = "average";
							}
						}
						qd.app.ratings.buildRatingWidget(nl[0], type, rating);
					}
				});
			}
		}).addCallback(function(){
			qd.app.ratings.activateRatingWidgets();
		});
	};

	this.fetch = function(kwArgs){
		//	summary:
		//		Base method for running a search, fetching recommendations, etc.
		this.clearResults();
		resultsImpl.fetch(kwArgs).addCallback(this, "postProcessResults");
	};

	this.fetchMore = function(){
		//	summary:
		//		Pull in more results for the current batch and
		//		add them to the end of the existing results page.
		resultsImpl.fetchMore().addCallback(this, "postProcessResults");
	};

	this.renderResults = function(/* Object */context){
		//	summary:
		//		Render the data in the given context to the results template.
		//	context:
		//		A dojox.dtl.Context to pass to the "results" template.
		if(!resultsTemplate){
			resultsTemplate = new dojox.dtl.HtmlTemplate("searchResults");
		}
		resultsTemplate.render(context);
	};

	this.renderMoreResults = function(/* Object */context){
		//	summary:
		//		Append more results onto the current results template.
		//	context:
		//		A dojox.dtl.Context to pass to the "more results" template.
		var templateNode = dojo.clone(fetchMoreTemplateNode),
			template = new dojox.dtl.HtmlTemplate(templateNode);
		template.render(context);
		dojo.byId("searchResultsList").innerHTML += template.getRootNode().innerHTML;
	};

	this.sortResults = function(/* String */sortField){
		//	summary:
		//		Sort the current search results.
		//	sortField:
		//		The field to sort on, one of: "Title", "Year", "Genre", "Rating", "Relevance"
		//		(sorting on relevance just fetches the results all over again).
		this.clearResults(false);
		if(sortField.toLowerCase() == "relevance"){
			// just fetch them all over again, making sure to preserve the page we're on
			this.fetch({resultCount:this.results.length});
			return;
		}
		this.results.sort(function(a, b){
			var ratingsMap = ["G","TV G","TV Y","TV Y7","TV Y7 FV","PG","TV PG","PG-13","TV 14","R","TV MA","UR","NR","NC-17"];
			switch(sortField.toLowerCase()){
			case "title":
				return a.title < b.title ? -1 : 1;
			case "year":
				return a.releaseYear < b.releaseYear ? -1 : 1;
			case "genre":
				return a.categories[0] < b.categories[0] ? -1 : 1;
			case "rating":
				var ar = ratingsMap.indexOf(a.rating);
				var br = ratingsMap.indexOf(b.rating);
				if(ar == -1){ ar = 100; }
				if(br == -1){ br = 100; }
				return ar < br ? -1 : 1;
			default:
				console.log("Hmm, we're sorting by an unsupported field: " + sortField);
				return -1;
			}
		});
		var sc = resultsImpl.getSortContextData();
		this.renderResults(new dojox.dtl.Context(dojo.mixin({}, sc, {
			results: this.results,
			sort_by: sortField
		})));
		this.postProcessResults();
	};

	this.showPicker = function(/* String|Node */node, /* Function? */onEnd){
		//	summary:
		//		Show a menu/picker by animating it in.
		//	node:
		//		DOM node to reveal.
		//	onEnd:
		//		A callback to run after the reveal completes.
		var n = dojo.byId(node);
		if(dojo.style(n, "display") == "none"){
			dojo.style(n, {display:"block", height:"1px"});
			var anim = dojo.fx.wipeIn({node:n, duration:150});
			if(onEnd){
				var __ac = dojo.connect(anim, "onEnd", function(){
					dojo.disconnect(__ac);
					onEnd();
				});
			}
			anim.play();
		}
	};

	this.hidePicker = function(/* String|Node */node, /* Function? */onEnd){
		//	summary:
		//		Hide a picker/menu by animating it out.
		//	node:
		//		DOM node to hide.
		//	onEnd:
		//		A callback to run after the animation completes.
		var n = dojo.byId(node);
		if(dojo.style(n, "display") == "block"){
			var anim = dojo.fx.wipeOut({node:n, duration:75});
			var __ac = dojo.connect(anim, "onEnd", function(){
				dojo.disconnect(__ac);
				dojo.style(n, "display", "none");
				if(onEnd){ onEnd(); }
			});
			anim.play();
		}
	};

	var showSortPicker = dojo.hitch(this, function(){
		//	summary:
		//		Reveal the search result sort picker.
		if(!dojo.hasClass("searchResultsSortPickerSelection", "open")){
			this.showPicker("searchResultsSortPicker", function(){
				dojo.addClass("searchResultsSortPickerSelection", "open");
			});
		}
		if(this.sortTimer){ clearTimeout(this.sortTimer); }
	});

	var hideSortPicker = dojo.hitch(this, function(){
		//	summary:
		//		Hide the search result sort picker.
		this.sortTimer = setTimeout(dojo.hitch(this, function(){
			this.hidePicker("searchResultsSortPicker", function(){
				dojo.removeClass("searchResultsSortPickerSelection", "open");
			});
		}), this.HIDE_TIMER_DURATION);
	});

	dojo.behavior.add({
		"#searchResultsSortPickerSelection": {
			onmouseover: showSortPicker,
			onmouseout: hideSortPicker,
		},

		"#searchResultsSortPicker": {
			onmouseover: showSortPicker,
			onmouseout: hideSortPicker,
			onclick:dojo.hitch(this, function(e){
				var sortField = e.target.innerHTML;
				var sel = dojo.byId("searchResultsSortPickerSelection");
				sel.innerHTML = sortField;
				this.hidePicker("searchResultsSortPicker", function(){
					dojo.removeClass(sel, "open");
				});
				this.sortResults(sortField);
			})
		},

		"#searchResults .movie .addButton": {
			onclick:function(evt){
				var movieId = qd.app.movies.getMovieIdByNode(evt.target);
				if(movieId){
					qd.app.queue.addMovieById(movieId, evt.target);
				}
			}
		},

		".searchResultsMore": {
			onclick:dojo.hitch(this, function(){
				this.fetchMore();
			})
		},

		".recommendationsMore": {
			onclick:dojo.hitch(this, function(e){
				this.fetchMore();
			})
		}
	});

	// lazy create the results template and "more results" template node
	// when we visit Top Movies for the first time
	var sectionSwitchConnect = dojo.connect(qd.app, "switchPage", dojo.hitch(this, function(page){
		if(page == "topMovies" && fetchMoreTemplateNode == null){
			dojo.disconnect(sectionSwitchConnect);

			// set up the search and recommendations template and "more
			// results" template node
			var node = dojo.clone(dojo.byId("searchResultsList"));
			dojo.removeAttr(node, "id");
			fetchMoreTemplateNode = node;
		}
	}));


})();
