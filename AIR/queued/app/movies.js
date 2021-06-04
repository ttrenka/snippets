dojo.provide("qd.app.movies");

dojo.require("dojo.behavior");
dojo.require("qd.app");
dojo.require("qd.app.ratings");
dojo.require("qd.app.queue");
dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.filter.lists");
dojo.require("dojox.dtl.tag.misc");

qd.app.movies = new (function(){
	var infoTemplate = null;
	var dialogIsDisabled = false;

	function getInfoDialogTemplate(){
		//	summary:
		//		Returns the DTL template for the info dialog, creating it
		//		if necessary.
		if(!infoTemplate){
			infoTemplate = new dojox.dtl.HtmlTemplate("movieInfoTemplateNode");
		}
		return infoTemplate;
	}

	function populateDialog(/* Object */movie){
		//	summary:
		//		Render the given movie data to the info dialog template.
		//	movie:
		//		Movie to render.
		var template = getInfoDialogTemplate(),
		    context = new dojox.dtl.Context({
		    	movie: movie,
		    	isLoggedIn: qd.app.authorized
		    });
		template.render(context);

		// For some reason, attempting to set the button classes in DTL doesn't
		// seem to be reliable, like it's caching them. So let's just post-process
		// the DOM instead.
		dojo.query("#movieInfoDialogNode .addButton").forEach(function(n){
			var queue = dojo.hasClass(n, "instant") ? "instantList" : "queueList",
			    isQueued = qd.app.queue.inQueue(movie.guid, queue),
			    addOrRemoveClass = isQueued ? "addClass" : "removeClass";
			dojo[addOrRemoveClass](n, "inQueue");
		});

		dojo.behavior.apply();
		
		console.log("DIALOG MOVIE:", movie, template);
	}

	this.setupMovieId = function(/* Node */node, /* String? */movieId){
		//	summary:
		//		Sets the "movie" attribute on the given node to the	Netflix
		//		movie ID encoded within. There should be a node with the CSS
		//		class "movie_id" somewhere inside the node's DOM; this will
		//		be removed and its contents used as the value of the new
		//		attribute. If the "movie_id" node doesn't exist, nothing
		//		happens.
		//	node:
		//		The node (typically one with class="movie") to mark with
		//		the "movie" attribute.
		//	movieId:
		//		Movie ID to use as an override, skipping the DOM traversal.
		var id=0;
		if(movieId){
			id = movieId;
		}else{
			var movieIdNode = dojo.query(".movie_id", node);
			if(movieIdNode && movieIdNode.length){
				id = movieIdNode[0].innerHTML;
				movieIdNode[0].parentNode.removeChild(movieIdNode[0]);
			}else{
				id = dojo.attr(node, "movie");
			}
		}
		dojo.attr(node, "movie", id);
	};
	
	this.nodesByMovieId = function(/* String */movieId){
		// summary:
		//		Find all nodes in the topMoviesContainerNode
		//
		//	movieId: String
		//		The id of the movie
		//
		var nodes;
		nodes = dojo.query(".movie", "topMoviesContainerNode");
		if(!nodes.length){
			nodes = dojo.query(".thumb", "topMoviesContainerNode");	
		}
		return nodes; // dojo.NodeList
		
	};
	
	this.queueMovieChange = function(/* String */movieId, /* String */type, /* Boolean */addingTo){
		// summary:
		//		Changes the button of a movie node to be "In Queue" or 
		//		"not". 
		//	type: String
		//		The queue in which the item is being changed: "queue", "instant", etc...
		//		Defaults to "queue" (the regular DVD queue).
		//	addingTo: Boolean
		//		Adding to the queue. This will add the "inQueue" class
		//		to the button. false or null will remove that class.
		//		Note that the usual case will be to remove from queue,
		//		as adding to queue, it is generally known which button
		//		to change, because that button triggered the action.
		var type = type || "queue";
		this.nodesByMovieId(movieId).forEach(function(n){
			if(dojo.attr(n, "movie")==movieId){
				dojo.query(".addButton", n).forEach(function(b){
					if(type=="instant" && !dojo.hasClass(b, "instant")){ return; }
					if(addingTo){
						dojo.addClass(b, "inQueue");
					}else{
						dojo.removeClass(b, "inQueue");	
					}
				});	
			}
		});	
	};
	
	this.getMovieIdByNode = function(/* Node */node){
		//	summary:
		//		Attempt to recover the movie ID from what's encoded
		//		in the DOM around a given node.
		//	node:
		//		A node which has an attribute called "movie", or a
		//		descendant of such a node.
		//	returns:
		//		The Netflix movie ID (which might be the title if there's
		//		no GUID found, which happens in the case of items in the
		//		RSS feeds), or 0 if not found.
		while(node){
			if(dojo.hasAttr(node, "movie")){
				var guid = dojo.attr(node, "movie");
				//	test to see what this actually is.
				if(guid.indexOf("api.netflix.com")==-1){
					//	this is a title.
					return guid;
				}
				else if(
					guid.indexOf("at_home")>-1
					|| guid.indexOf("queues")>-1
					|| guid.indexOf("rental_history")>-1
				){
					//	this is one of our queue things, dive into the item.
					var item = qd.services.item(guid);
					return (item && item.title && item.title.guid) || 0;
				}
				else {
					return guid;
				}
			}
			node = node.parentNode;
		}
		return 0;
	};

	this.fetchTitle = dojo.hitch(this, function(/* String */movieId){
		//	summary:
		//		Display a movie info dialog for the given movie.
		//	movieId:
		//		Netflix API item ID or title. If it starts with "http://",
		//		then it is assumed to be a GUID; otherwise it's taken to
		//		be a movie title or search term.
		var arg = {};
		arg[(movieId && movieId.indexOf("http://") == 0) ? "guid" : "term"] = movieId;
		return qd.service.titles.fetch(arg);
	});

	this.showInfo = dojo.hitch(this, function(/* String */movieId){
		//	summary:
		//		Display a movie info dialog for the given movie.
		//	movieId:
		//		Netflix API item ID or title.
		console.log("showing the info with movieId: " + movieId);
		if(dialogIsDisabled){
			console.log("Skipping the movie info dialog because it's disabled at the moment.");
			return;
		}
		if(!movieId){
			console.error("Couldn't find a movie ID!");
			return;
		}

		if(qd.app.authorized){
			// logged in; show full details
			qd.app.underlay.show();
			if(movieId.indexOf("queues")>-1
				|| movieId.indexOf("rental_history")>-1
				|| movieId.indexOf("at_home")>-1
			){
				//	get the real movie
				movieId = qd.services.item(movieId).title.guid;
			} 
			var def = this.fetchTitle(movieId);
			def.addCallback(this, function(movie){
				qd.app.underlay.hide();
				movie.allDirectors = dojo.map(movie.directors, function(d){ return d.title; }).join(", ");
				populateDialog(movie);
				dojo.query(".movie", infoTemplate.getRootNode()).forEach(dojo.hitch(this, function(n){
					this.setupMovieId(n, movie.guid);
				}));
				var ratingType = (movie.ratings.user>0) ? "user"
				           : ((movie.ratings.predicted>0) ? "predicted"
				           : "average");
				dojo.query("#movieInfoTemplateNode .starRating").forEach(dojo.hitch(this, function(n){
					var first = (!movie.guid.match(/titles\/discs\//) || movie.title.match(/Disc 1$/)) ? true : false;
					dojo[first?"addClass":"removeClass"](n, "enabled");
					dojo[first?"removeClass":"addClass"](n, "nonFirst");
					qd.app.ratings.buildRatingWidget(n, ratingType, movie.ratings[ratingType], true);
				}));
				dijit.byId("movieInfoDialogNode").show();
			});
			def.addErrback(this, function(err){
				qd.app.underlay.hide();
				qd.app.errorTooltip.show(
					"No information available.", 
					"There is no extended information available for this title."
				);
			});
		}else{
			// not logged in; show abbreviated info, which we should
			// have because the very fact we're displaying a list of
			// movies for the user to click means we've at least
			// parsed one of the RSS feeds.
			var movie = qd.services.item(movieId);
			if(!movie){
				console.error("Couldn't find movie data in the registry for title " + movieId + ".");
				return;
			}
			populateDialog(movie);
			dijit.byId("movieInfoDialogNode").show();
		}
	});

	function disableInfoDialog(){
		//	summary:
		//		Disable showing the info dialog if the app attempts to do
		//		so (e.g., during a drag event).
		dialogIsDisabled = true;
	}
	function enableInfoDialog(){
		//	summary:
		//		Enable showing the info dialog if the app attempts to do so.

		// Janky timer! Give it a brief moment to try and pass
		// any click events through to nodes that might trigger
		// the dialog, THEN reenable it.
		setTimeout(function(){
			dialogIsDisabled = false;
		}, 150);
	}

	// connect to this to listen for items being added to the queue from the info dialog
	this.onTitleAddedFromDialog = function(){};

	var movieInfoHandler = {
		onclick: dojo.hitch(this, function(evt){
			var movieId = null,
			    movieNode = evt.target;
			while(!movieId){
				movieNode = movieNode.parentNode;
				movieId = dojo.attr(movieNode, "movie");
			}
			if(movieId){
				// change the Add/In Q button state if the item gets added
				// while the dialog is open
				var __h = dojo.connect(this, "onTitleAddedFromDialog", function(){
					dojo.disconnect(__h);
					dojo.query(".addButton", movieNode).forEach(function(n){
						var queue = dojo.hasClass(n, "instant") ? "instantList" : "queueList",
						    isQueued = qd.app.queue.inQueue(dojo.attr(movieNode, "movie"), queue);
						dojo.addClass(n, "inQueue");
					});
				});

				// show the dialog
				this.showInfo(movieId);
			}
		})
	};

	var movieAddHandler = {
		onclick: function(evt){
			var movieId = qd.app.movies.getMovieIdByNode(evt.target);
			if(movieId){
				if(movieId.indexOf("http")==0){
					qd.app.queue.addMovieById(movieId, evt.target);
				} else {
					qd.app.queue.addMovieByTerm(movieId, evt.target);
				}
			}
		}
	};
	
	var movieDialogAddHandler = {
		onclick: dojo.hitch(this, function(evt){
			var movieId = qd.app.movies.getMovieIdByNode(evt.target);
			if(movieId){
				dijit.byId("movieInfoDialogNode").hide();
				var queue = dojo.hasClass(evt.target, "instant") ? "instant" : "queue";
				if(movieId.indexOf("http")==0){
					qd.app.queue.addMovieById(movieId, evt.target, queue);
				} else {
					qd.app.queue.addMovieByTerm(movieId, evt.target, queue);
				}
				this.onTitleAddedFromDialog();
			}
		})
	};
	
	dojo.behavior.add({
		// Public feed results interactions
		"#artworkList .movie span.title": movieInfoHandler,
		"#artworkList .movie span.boxArt": movieInfoHandler,
		"#artworkList .movie span.addButton": movieAddHandler,
		"#movieInfoTemplateNode .movie span.addButton": movieDialogAddHandler,
		// Search results
		"#searchResultsList .movie span.title": movieInfoHandler,
		"#searchResultsList .movie span.boxArt": movieInfoHandler
	});

	dojo.connect(qd.app, "startDragging", disableInfoDialog);
	dojo.connect(qd.app, "stopDragging", enableInfoDialog);

})();

