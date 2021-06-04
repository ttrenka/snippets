dojo.provide("qd.app.ratings");

dojo.require("qd.app");
dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.filter.lists");
dojo.require("dojox.dtl.tag.misc");
dojo.require("dojo.behavior");

qd.app.ratings = new (function(){
	var ratingTimeout = null;
	var ratingTimeoutNode = null;
	var ratingIsDisabled = false;

	function setRatingType(/* Node */node, /* String */type){
		//	summary:
		//		Simple method to normalize a widget's CSS classes.
		//	node:
		//		Widget's DOM node.
		//	type:
		//		"user", "predicted", "average"
		if(!dojo.hasClass(node, "starRating")){
			dojo.addClass(node, "starRating");
		}
		dojo.removeClass(node, "user");
		dojo.removeClass(node, "predicted");
		dojo.removeClass(node, "average");
		if(type=="user" || type=="predicted" || type=="average"){
			dojo.addClass(node, type);
		}
	}

	function buildRatingContext(/* Number|String */rating){
		//	summary:
		//		Build an object to pass to a DTL Context that describes
		//		a title's star rating.
		//	rating:
		//		Star rating value. 1-5, "not_interested", "no_opinion".
		if(rating == "not_interested" || rating == "no_opinion"){
			rating = 0;
		}
		for(var i=1, c={}; i<=5; i++){
			// the leading spaces are here for DTL convenience
			c[i] = (i <= rating) ? " full" : ((i-rating <= .5) ? " half" : " empty");
		}
		return c;
	}

	function setRatingStars(/* Node */node, /* Number|String */rating){
		//	summary:
		//		Show a particular star rating in a rating widget.
		//	node:
		//		Widget's DOM node (the one with the "starRating" CSS class).
		//	rating:
		//		Star rating value. 1-5, "not_interested", "no_opinion".
		var c=1, n=node.firstChild, starClasses=buildRatingContext(rating);
		while(n){
			if(dojo.hasClass(n, "star")){
				n.className = "star" + starClasses[c++];
			}
			n = n.nextSibling;
		}
	}

	function renderRatingWidget(/* Node */node, /* String */type, /* Number|String */rating){
		//	summary:
		//		Set up CSS classes to properly display a ratings widget.
		//	node:
		//		Widget's DOM node.
		//	type:
		//		"user", "predicted", "average".
		//	rating:
		//		Star rating value. 1-5, "not_interested", "no_opinion".
		var rating = rating || 0,
		    star = buildRatingContext(rating);
		node.innerHTML = '<span class="unrate"></span>'
		               + '<span class="star '+star[1]+'"></span>'
		               + '<span class="star '+star[2]+'"></span>'
		               + '<span class="star '+star[3]+'"></span>'
		               + '<span class="star '+star[4]+'"></span>'
		               + '<span class="star '+star[5]+'"></span>';
		setRatingType(node, type);
		dojo.attr(node, "rating", rating);
	}

	this.buildRatingWidget = function(/* Node */node, /* String? */type, /* Number?|String? */rating, /* Boolean? */activate){
		//	summary:
		//		Put together a star rating widget to show movie star
		//		ratings and allow users to rate movies. The node should
		//		be a descendent of a node having the "movie" attribute
		//		containing a Netflix title ID.
		//	node:
		//		DOM node to use for the widget. For the behaviors to work
		//		properly, the node should have the 'starRating' CSS class;
		//		if it doesn't, the class will be added.
		//	type:
		//		"user", "predicted", "average"; if this isn't specified,
		//		it will be looked up in the cache by traversing the DOM
		//		to find the "movie" attribute to provide a movie ID.
		//	rating:
		//		Star rating value. 1-5, "not_interested", "no_opinion"; if
		//		this isn't provided, it will be looked up in the cache
		//		similar to the "type" parameter above.
		//	activate:
		//		Determines whether to immediately activate the widget or
		//		not. Defaults to false.
		if(type && rating){
			renderRatingWidget(node, type, rating);
			if(activate){
				this.activateRatingWidgets();
			}
		}else{
			var movieId = qd.app.movies.getMovieIdByNode(node),
			    dfd = qd.app.movies.fetchTitle(movieId);
			dfd.addCallback(this, function(movie){
				var ratingType = (movie.ratings.user>0) ? "user" : ((movie.ratings.predicted>0) ? "predicted" : "average"),
				    rating = movie.ratings[ratingType];
				renderRatingWidget(node, ratingType, rating);
				if(activate){
					this.activateRatingWidgets();
				}
			});
		}
	}

	this.activateRatingWidgets = function(){
		//	summary:
		//		Apply event handlers to any rating widgets on the page.
		dojo.behavior.apply();
	};

	function rebuildRatingWidgets(/* String */titleGuid){
		//	summary:
		//		Rebuilt star rating widget(s) for the title having the guid provided.
		//	titleGuid:
		//		The guid of the Netflix title in question.
		var qar = qd.app.ratings;
		dojo.query("[movie]").forEach(function(movieNode){
			// This function can just shortcut item fetches and go straight to the
			// qd.services.item() function because by definition, ratings widgets
			// only exist when an item has been fetched.
			var movieId = dojo.attr(movieNode, "movie");
			if(movieId.indexOf("http://") != 0){ return; } // skip feed entries
			if(movieId.indexOf("queues")>-1 || movieId.indexOf("rental_history")>-1 || movieId.indexOf("at_home")>-1){
				movieId = qd.services.item(movieId).title.guid;
			}
			var item = qd.services.item(movieId);
			if(item.guid == titleGuid){
				dojo.query(".starRating", movieNode).forEach(function(starRatingNode){
					var type = item.ratings.user ? "user" : "predicted",
						rating = type=="user" ? item.ratings.user : item.ratings.predicted;
					qar.buildRatingWidget(starRatingNode, type, rating);
				});
			}
		});
		qar.activateRatingWidgets();
	}

	function disableRatings(){
		ratingIsDisabled = true;
	}
	function enableRatings(){
		// Janky timer! Give it a brief moment to try and pass
		// any click events through to nodes that might trigger
		// a rating, THEN reenable it.
		setTimeout(function(){
			ratingIsDisabled = false;
		}, 150);
	}

	var ratingWidgetHandler = {
		widget: {
			onmouseover: function(evt){
				if(ratingIsDisabled){ return; }
				var node = evt.target;
				if(dojo.hasClass(node, "starRating") && !dojo.hasClass(node, "hovering")){
					dojo.addClass(node, "hovering");
				}
				if(ratingTimeout && ratingTimeoutNode==node){ clearTimeout(ratingTimeout); }
			},
			onmouseout: function(evt){
				if(ratingIsDisabled){ return; }
				var node = dojo.hasClass(evt.target, "starRating") ? evt.target : evt.target.parentNode;
				ratingTimeoutNode = node;
				ratingTimeout = setTimeout(function(){
					dojo.removeClass(node, "hovering");
					setRatingStars(node, dojo.attr(node, "rating"));
				}, 50);
			}
		},
		stars: {
			onmousemove: function(evt){
				if(ratingIsDisabled){ return; }
				var node = evt.target, n = node;
				while(n = n.previousSibling){ if(dojo.hasClass(n, "star")){ n.className = "star full"; } }
				n = node;
				while(n = n.nextSibling){ if(dojo.hasClass(n, "star")){ n.className = "star empty"; } }
				node.className = "star full";
				dojo.addClass(node.parentNode, "hovering");
			},
			onclick: function(evt){
				if(ratingIsDisabled){ return; }
				var node = evt.target, n = node, p = node.parentNode, rating = 1;
				var movieId = qd.app.movies.getMovieIdByNode(node);

				while(n = n.previousSibling){ if(dojo.hasClass(n, "star")){ rating++; } }
				dojo.removeClass(p, "average");
				dojo.removeClass(p, "predicted");
				dojo.addClass(p, "user");
				dojo.attr(p, "rating", rating);
				qd.service.titles.rate({
					guid: movieId,
					rating: rating
				}).addCallback(function(){
					rebuildRatingWidgets(movieId);
				});
			}
		},
		unrate: {
			onmouseover: function(evt){
				if(ratingIsDisabled){ return; }
				var node = evt.target,
				    p = node.parentNode,
				    movieId = qd.app.movies.getMovieIdByNode(node),
				    dfd = qd.app.movies.fetchTitle(movieId);
				dfd.addCallback(function(){
					var fallbackRatingType = (movie.ratings && movie.ratings.predicted > 0) ? "predicted" : "average",
					    rating = movie.ratings[fallbackRatingType];
					dojo.removeClass(p, "hovering");
					setRatingStars(p, rating);
				});
			},
			onclick: function(evt){
				if(ratingIsDisabled){ return; }
				var node = evt.target,
					p = node.parentNode,
					isUserRating = dojo.hasClass(p, "user"),
					rating = isUserRating ? "no_opinion" : "not_interested",
					movieId = qd.app.movies.getMovieIdByNode(node),
					dfd = qd.app.movies.fetchTitle(movieId);
				dfd.addCallback(function(){
					var newRatingType = (movie.ratings.predicted > 0) ? "predicted" : "average",
					    newRating = movie.ratings[newRatingType];
					qd.service.titles.rate({
						guid: movieId,
						rating: rating
					});
					dojo.removeClass(p, "user");
					dojo.addClass(p, newRatingType);
					dojo.attr(p, "rating", newRating);
					setRatingStars(p, newRating);
					console.log("Removing rating from " + movieId + "; reverting to the " + newRatingType + " value of " + newRating);
				});
			}
		}
	};

	dojo.behavior.add({
		".starRating.enabled": ratingWidgetHandler.widget,
		".starRating.enabled .star": ratingWidgetHandler.stars
		// TODO: disabled for now
		//".starRating.enabled .unrate": ratingWidgetHandler.unrate
	});

	dojo.connect(qd.app, "startDragging", disableRatings);
	dojo.connect(qd.app, "stopDragging", enableRatings);
})();
