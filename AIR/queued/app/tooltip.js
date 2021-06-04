dojo.provide("qd.app.tooltip");

dojo.require("dojo.behavior");
dojo.require("qd.app");
dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.filter.lists");
dojo.require("dojox.dtl.tag.misc");

qd.app.tooltip = new (function(){
	var tooltipTemplate = null,
		tooltipTimer = null,
		tooltipNode = null,
		bestPosition = null,

		STAR_WIDTH = 18, // pixel width of a single rating star
		TOOLTIP_DELAY = 750; // milliseconds to wait before showing the tooltip

	function getTooltipTemplate(){
		//	summary:
		//		Returns the DTL template for the tooltip, creating it
		//		if necessary.
		if(!tooltipTemplate){
			tooltipTemplate = new dojox.dtl.HtmlTemplate("movieInfoTooltipContentNode");
		}
		return tooltipTemplate;
	}
	
	// borrowed/ported from dijit.Tooltip
	function orientTooltip(/* String */aroundCorner, /* String */tooltipCorner){
		//	summary:
		//		Set CSS to position the arrow based on which position the tooltip is in.
		var node = dojo.byId("movieInfoTooltipNode"),
			css = {
				"TR-TL": "top right",
				"BR-BL": "bottom right",
				"TL-TR": "top left",
				"BL-BR": "bottom left"
			},
			art = dojo.hasClass(node, "noArt") ? " noArt" : "";

		node.className = css[aroundCorner + "-" + tooltipCorner] + art;
	}

	// borrowed/ported from a inner function inside dijit._place
	function tryTooltipPosition(/* Object */choice){
		//	summary:
		//		Try a position for the tooltip by positioning it and checking
		//		the bounds against the viewport.
		//	choice:
		//		An object produced by the for loop in placeTooltip :-)
		//		It looks like, e.g., {aroundCorner:"TR", corner:"TL", pos:{x:0,y:0}}
		var node = dojo.byId("movieInfoTooltipNode"),
			corner = choice.corner,
			pos = choice.pos,
			view = dijit.getViewport();

		orientTooltip(choice.aroundCorner, corner);

		var mb = dojo.marginBox(node);

		// coordinates and size of node with specified corner placed at pos,
		// and clipped by viewport
		var startX = (corner.charAt(1) == 'L' ? pos.x : Math.max(view.l, pos.x - mb.w)),
			startY = (corner.charAt(0) == 'T' ? pos.y : Math.max(view.t, pos.y -  mb.h)),
			endX = (corner.charAt(1) == 'L' ? Math.min(view.l + view.w, startX + mb.w) : pos.x),
			endY = (corner.charAt(0) == 'T' ? Math.min(view.t + view.h, startY + mb.h) : pos.y),
			width = endX - startX,
			height = endY - startY,
			overflow = (mb.w - width) + (mb.h - height);

		if(bestPosition == null || overflow < bestPosition.overflow){
			bestPosition = {
				corner: corner,
				aroundCorner: choice.aroundCorner,
				x: startX,
				y: startY,
				w: width,
				h: height,
				overflow: overflow
			};
		}
		return !overflow;
	}

	// borrowed/ported from dijit._base.placeOnScreenAroundNode, ._placeOnScreenAroundRect,
	// and ._place because something about the AIR environment breaks dojo.marginBox for
	// objects with visibility="hidden", which is what dijit._place sets as part of the
	// coordinate calculations
	function placeTooltip(/* Node */aroundNode){
		//	summary:
		//		Position the tooltip in relation to aroundNode in such a
		//		way as to minimize any clipping by the viewport.
		//	aroundNode:
		//		The node for which to position the tooltip.
		var align = {TR:"TL", BR:"BL", TL:"TR", BL:"BR"},
			node = dojo.byId("movieInfoTooltipNode"),
			pos = dojo.coords(aroundNode, true),
			choices = [];

		for(var nodeCorner in align){
			choices.push( {
				aroundCorner: nodeCorner,
				corner: align[nodeCorner],
				pos: {
					x: pos.x + (nodeCorner.charAt(1) == 'L' ? 0 : pos.w),
					y: pos.y + (nodeCorner.charAt(0) == 'T' ? 0 : pos.h)
				}
			});
		}

		bestPosition = null;
		dojo.some(choices, tryTooltipPosition); // set bestPosition to the optimal choice
		dojo.style(node, {left:bestPosition.x+"px", top:bestPosition.y+"px"});
		orientTooltip(bestPosition.aroundCorner, bestPosition.corner);
	}

	function showTooltip(/* String */movieId, /* Node */aroundNode, /* Boolean? */showBoxArt){
		//	summary:
		//		Display a movie info tooltip for the given movie.
		//	movieId:
		//		Netflix API movie ID or title.
		//	aroundNode:
		//		DOM Node at which to anchor the tooltip.
		//	showBoxArt:
		//		Pass true to show box art, false otherwise. Defaults to false.
		if(!movieId){
			console.error("Couldn't find a movie ID!");
			return;
		}

		if(qd.app.authorized){
			qd.app.loadingIcon.show();
			var def = qd.app.movies.fetchTitle(movieId);
			def.addCallback(this, function(movie){
				if(aroundNode == tooltipNode){ // still on the original movie node?
					var node = dojo.byId("movieInfoTooltipNode"),
						r = movie.ratings,
						template = getTooltipTemplate(),
						context = new dojox.dtl.Context({
							movie: movie,
							castMember1: movie.cast.length ? movie.cast[0].title : "",
							castMember2: (movie.cast.length && movie.cast.length > 1) ? movie.cast[1].title : ""
						});
					dojo[(showBoxArt||false) ? "removeClass" : "addClass"](node, "noArt");
					dojo.style(node, {display:"block", opacity:0});
					template.render(context);
					dojo.query(".userRatingStars", node).style("width", (r.user * STAR_WIDTH)+"px");
					dojo.query(".predictedRatingStars", node).style("width", (r.predicted * STAR_WIDTH)+"px");
					dojo.query(".averageRatingStars", node).style("width", (r.average * STAR_WIDTH)+"px");
					placeTooltip(aroundNode);

					qd.app.loadingIcon.hide();
					dojo.fadeIn({node:node}).play();
				}
			}).addErrback(this, function(err){
				qd.app.errorTooltip.show(
					"No information available.", 
					"Could not find extended information for this title."
				);
			});
		}
	}

	function hideTooltip(){
		//	summary:
		//		Hide the movie info tooltip.
		dojo.style("movieInfoTooltipNode", "display", "none");
		if(tooltipTimer){
			clearTimeout(tooltipTimer);
			tooltipTimer = null;
			tooltipNode = null;
		}
	}

	function tooltipIsDisabled(){
		//	summary:
		//		Returns true if the tooltip is disabled, else false.
		return qd.app.isDragging();
	}

	function tooltipHandler(/* Boolean? */showBoxArt){
		//	summary:
		//		Create a handler for dojo.behavior to set up the tooltip.
		//	showBoxArt:
		//		Pass true to show box art, false otherwise. Defaults to false.
		return {
			onmouseover: function(evt){
				if(tooltipIsDisabled()){ return; }
				var node = evt.target;
				var movieId = qd.app.movies.getMovieIdByNode(node);
				if(movieId){
					if(tooltipTimer){ hideTooltip(); }
					tooltipTimer = setTimeout(function(){
						tooltipNode = node;
						showTooltip(movieId, node, showBoxArt);
					}, TOOLTIP_DELAY);
				}
			},
			onmouseout: function(evt){
				hideTooltip();
			},
			onmousewheel: function(evt){
				hideTooltip();
			}
		}
	}

	var tooltipCanceller = {
		onclick: function(evt){
			// cancel the tooltip if the user clicks somewhere
			hideTooltip();
		}
	};

	dojo.behavior.add({
		".listQueuedRow .title": dojo.mixin({}, tooltipCanceller, tooltipHandler(true)),
		"#artworkList .movie .boxArt img.gloss": tooltipHandler(false),

		"#artworkList .movie": tooltipCanceller
	});

})();

