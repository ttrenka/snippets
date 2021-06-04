dojo.provide("qd.app.queueList");
dojo.require("dojo.fx");
dojo.require("dojo.fx.easing");
dojo.require("dojox.fx._base");
dojo.require("dojo.dnd.Source");

(function(){

	var REMOVAL_CONFIRMATION_TIMER_DURATION = 5000; // milliseconds to show the keep/remove button

	var create = function(tagName, text, _class, parent){
		//	summary:
		//		Development helper to create nodes.

		var node = dojo.doc.createElement(tagName);

		if (text) 			{ node.innerHTML = text		};
		if (_class) 		{ node.className = _class	};
		if (tagName =="a")	{ node.href = "#"			};
		if (parent)			{ parent.appendChild(node) 	};

		return node;
	}

	var _reg = new RegExp(/\$\{.*?\}/gi);

	var makeTemplate = function(/* String */str, /* Object */item){
		//	summary:
		//		Build a queue DOM template from the given string, using
		//		simple ${variable} substitution.
		//	item:
		//		Netflix item to use for template variables, which should be
		//		named properties on the object.
		var tpl = "";
		var props = [];
		dojo.forEach(str.match(_reg), function(p){
			props.push(dojo.trim(p.substring(2,p.length-1)));
		});
		var frags = str.split(_reg);
		for(var i=0;i<frags.length;i++){
			tpl += frags[i];
			if(i<frags.length-1){
				tpl += item[props[i]] || dojo.getObject(props[i], false, item);
			}
		}
		return tpl;
	}


	var tpls = {
		queue: 		'<tr class="listQueuedRow" movie="${guid}">'
						+ '<td class="index dojoDndHandle"><div><input dojoAttachPoint="textbox" dojoAttachEvent="keyup:onTextKeyUp,blur:onTextBlur" type="text" value="" /></div></td>'
						+ '<td class="top dojoDndHandle" dojoAttachEvent="click:onTopClick"></td>'
						+ '<td class="title dojoDndHandle" dojoAttachEvent="click:onTitleClick">${title.title}</td>'
						+ '<td class="instant">${instantStr}</td>'
						+ '<td class="stars dojoDndHandle"><span class="starRating${starRatingEnabledStr}" style="visibility:hidden;" dojoAttachPoint="ratingNode"></span></td>'
						+ '<td class="genre dojoDndHandle">${genreStr}</td>'
						+ '<td class="format dojoDndHandle">${format}</td>'
						+ '<td class="remove"><div>'
							+ '<span dojoAttachPoint="removeButtonNode" class="button" dojoAttachEvent="click:onRemClick"></span>'
							+ '<span dojoAttachPoint="confirmButtonNode" class="confirm">'
								+ '<span class="confirmRemove" dojoAttachEvent="click:onConfirmRemoveClick"></span>'
								+ '<span class="keep" dojoAttachEvent="click:onKeepClick"></span>'
							+ '</span>'
						+ '</div></td>'
					+ '</tr>',

		at_home:	'<tr class="listQueuedRow" id="${guid}" movie="${guid}">'
						+ '<td class="title" dojoAttachEvent="click:onTitleClick, mouseover:onTitleOver, mouseout:onTitleOut">${title.title}</td>'
						+ '<td class="instant">${instantStr}</td>'
						+ '<td class="stars dojoDndHandle"><span class="starRating${starRatingEnabledStr}" style="visibility:hidden;" dojoAttachPoint="ratingNode"></span></td>'
						+ '<td class="shipped">${shipped}</td>'
						+ '<td class="arrive">${estimatedArrival}</td>'
						+ '<td class="problem"><a href="#" dojoAttachEvent="click:onProblemClick">Report a problem</a></td>'
					+ '</tr>',



		/// hmmm.. This is the same as 'queue'. May need to change how we fetch templates - with a function
		instant:	'<tr class="listQueuedRow" movie="${guid}">'
						+ '<td class="index dojoDndHandle"><div><input dojoAttachPoint="textbox" dojoAttachEvent="keyup:onTextKeyUp,blur:onTextBlur" type="text" value="" /></div></td>'
						+ '<td class="top dojoDndHandle" dojoAttachEvent="click:onTopClick"></td>'
						+ '<td class="title dojoDndHandle" dojoAttachEvent="click:onTitleClick">${title.title}</td>'
						+ '<td class="instant">${instantStr}</td>'
						+ '<td class="stars dojoDndHandle"><span class="starRating${starRatingEnabledStr}" style="visibility:hidden;" dojoAttachPoint="ratingNode"></span></td>'
						+ '<td class="genre dojoDndHandle">${genreStr}</td>'
						+ '<td class="remove"><div>'
							+ '<span dojoAttachPoint="removeButtonNode" class="button" dojoAttachEvent="click:onRemClick"></span>'
							+ '<span dojoAttachPoint="confirmButtonNode" class="confirm">'
								+ '<span class="confirmRemove" dojoAttachEvent="click:onConfirmRemoveClick"></span>'
								+ '<span class="keep" dojoAttachEvent="click:onKeepClick"></span>'
							+ '</span>'
						+ '</div></td>'
					+ '</tr>',

		watched:	'<tr class="listQueuedRow" movie="${guid}">'
						+'<td class="viewed">${watched}</td>'
						+ '<td class="title" dojoAttachEvent="click:onTitleClick">${title.title}</td>'
						+ '<td class="instant">${instantStr}</td>'
						+ '<td class="stars dojoDndHandle"><span class="starRating${starRatingEnabledStr}" style="visibility:hidden;" dojoAttachPoint="ratingNode"></span></td>'
						+ '<td class="genre">&nbsp;</td>'
						+ '<td class="details">&nbsp;</td>'
					+ '</tr>',

		history:	'<tr class="listQueuedRow" movie="${guid}">'
						+ '<td class="title" dojoAttachEvent="click:onTitleClick">${title.title}</td>'
						+ '<td class="stars dojoDndHandle"><span class="starRating${starRatingEnabledStr}" style="visibility:hidden;" dojoAttachPoint="ratingNode"></span></td>'
						+ '<td class="shipped">${shipped}</td>'
						+ '<td class="returned">${returnedStr}</td>'
						+ '<td class="details">${detailsStr}</td>'
					+ '</tr>',

		saved:	'<tr class="listQueuedRow" movie="${guid}">'
						+ '<td class="title" dojoAttachEvent="click:onTitleClick">${title.title}</td>'
						+ '<td class="stars dojoDndHandle"><span class="starRating${starRatingEnabledStr}" style="visibility:hidden;" dojoAttachPoint="ratingNode"></span></td>'
						+ '<td class="genre">${genreStr}</td>'
						+ '<td class="availability">${title.dates.availability}</td>'
						+ '<td class="remove"><div>'
							+ '<span dojoAttachPoint="removeButtonNode" class="button" dojoAttachEvent="click:onRemClick"></span>'
							+ '<span dojoAttachPoint="confirmButtonNode" class="confirm">'
								+ '<span class="confirmRemove" dojoAttachEvent="click:onConfirmRemoveClick"></span>'
								+ '<span class="keep" dojoAttachEvent="click:onKeepClick"></span>'
							+ '</span>'
						+ '</div></td>'
					+ '</tr>',

		noItems: '<tr class="listQueuedRow noItems">'
							+ '<td colspan="${colspan}">There are no items in this list.</td>'
						+ '</tr>'
	};

	qd.app.nonItem = function(){
		//	summary:
		//		Initialize a queue to show the "No items found" display rather
		//		than a table full of items.
		this.item = {};
		this.constructor = function(options, parentNode){
			dojo.mixin(this, options);
			this.item.colspan = (this.type=="queue"||this.type=="instant") ? "8" : "6";
			this.type = "noItems";
			var tpl = makeTemplate(tpls[this.type], this.item);
			var div = dojo.doc.createElement("div");
			div.innerHTML = tpl;
			this.domNode = div.firstChild;
			parentNode.appendChild(this.domNode);
		};
		this.destroy = function(){
			dojo._destroyElement(this.domNode);
			delete this;
		};
		this.constructor.apply(this, arguments);
	};

	qd.app.queueItem = function(){
		this.id = "";
		this.item = {};
		this._connects = [];
		this.type = "";
		this.parent = null;
		this.resetFormat = "";

		this.__defineGetter__("position", function() {
			return this.item.position;
		});

		this.__defineSetter__("position", function(pos) {
			if (this.textbox) {
				this.item.position = pos;
				this.textbox.value = pos;
			}
		});

		this.constructor = function(/* Object */options, /* Node */parentNode){
			//	summary:
			//		Build up a queue item (one row in the display), instantiate
			//		the item in the DOM, etc.
			//	options:
			//		Property bag to use as a mixin on this queue item.
			//	parentNode:
			//		Node in which to insert this queue item into the DOM.
			dojo.mixin(this, options);

			this.id = this.item.id;
			this.guid = this.item.guid;
			this.item.genreStr = this.item.title.categories[0];
			// play button
			this.item.instantStr = (
				this.type=="instant"
				|| this.type=="watched"
				|| ("instant"||"Instant") in this.item.title.formats
				|| this.item.format=="Instant"
				|| this.type=="watchedList") ? '<a href="#" dojoAttachEvent="click:onPlayClick">PLAY</a>' : '&nbsp';
			if(this.item.title.dates){
				this.item.estimatedArrival = this.item.estimatedArrival || "";
				this.item.shipped = this.item.shipped || "Shipping Now";
			}
			this.item.detailsStr = this.item.returned ? '&nbsp;' : '<a href="#" dojoAttachEvent="click:onProblemClick">Report a problem</a>';
			this.item.returnedStr = this.item.returned || '--';
			this.item.title.dates.availability = this.item.title.dates.availability || "--";
			if(this.item.guid) {
				this.item.starRatingEnabledStr = (!this.item.title.guid.match(/titles\/discs\//) || this.item.title.title.match(/Disc 1$/)) ? " enabled" : " nonFirst";
			}
			//this.item.starRatingEnabledStr
			var tpl = makeTemplate(tpls[this.type], this.item);
			var div = dojo.doc.createElement("div");
			div.innerHTML = tpl;
			var node = div.firstChild;
			parentNode.appendChild(node);
			this.attachEvents(node);
			this.postDom();
		};

		this.postDom = function(){
			//	summary:
			//		Trigger function to execute after the queue item's DOM
			//		representation is added to the page. Sets up the textbox
			//		containing the item's position and registers the key
			//		handlers for it.
			if (this.textbox) {
				this.textbox.value = this.position;
				this.textbox.maxLength = 3;
				this._connects.push(dojo.connect(this.textbox, "keypress", this, function(evt){
					if(evt.keyIdentifier){
						return true;
					}
					var k = evt.keyCode;
					if (k > 31 && (k < 48 || k > 57)) {
						dojo.stopEvent(evt);
						return false;
					}
					return true;
				}));
			}
		};

		this.setRatingData = function(/* Number */user, /* Number */pred, /* Number */avg){
			//	summary:
			//		Create the star rating widget for this queue item.
			//	user:
			//		The user rating value (1-5, "not_interested", "no_opinion").
			//	pred:
			//		The predicted rating value (1-5, "not_interested", "no_opinion").
			//	avg:
			//		The member average rating value (1-5, "not_interested", "no_opinion").
			var node=this.ratingNode, type="average", rating=0;
			if(node) {
				if(user > 0){
					rating = user;
					type = "user";
				}else if(pred > 0){
					rating = pred;
					type = "predicted";
				}else if(avg > 0){
					rating = avg;
					type = "average";
				}
				qd.app.ratings.buildRatingWidget(node, type, rating);
				dojo.style(this.ratingNode, "visibility", "visible");
			}
		};

		this.attachEvents = function(/* Node */node){
			//	summary:
			//		Register event connections defined in the queue item's template.
			//	node:
			//		The item's DOM node.
			this.domNode = node;
			var nodes = this.domNode.getElementsByTagName("*");
			dojo.forEach(nodes, function(n){
				var att = n.getAttribute("dojoAttachEvent");
				if (att) {
					dojo.forEach(att.split(","), function(pr){
						this._connects.push(dojo.connect(n, pr.split(":")[0], this, pr.split(":")[1]));
					}, this);
				}
				var att = n.getAttribute("dojoAttachPoint");
				if (att) {
					this[att] = n;
				}
			}, this);
		};

		this.destroy = function(){
			//	summary: Tear down the queue item.
			dojo.forEach(this._connects, dojo.disconnect, dojo);
			dojo._destroyElement(this.domNode);
			delete this;
		};

		this.update = function(/* Object */newItem){
			// summary:
			//		New item returned from server (usually just the new position).
			this.item = newItem;
		};

		this.reset = function(){
			// summary:
			//		If the server call is unsuccessful, do any resetting here.
			this.textbox.value = this.position;
			if(this.resetFormat){
				setTimeout(dojo.hitch(this, function(){
					this.item.preferredFormatStr = this.resetFormat;
					this.resetFormat = "";
					this.selFormat.value =this.selFormat.selected = this.item.preferredFormatStr;
				}), 500)
			}
		};

		function toggleRemoveButtonState(/* Node */outNode, /* Node */inNode, /* Number? */duration){
			//	summary:
			//		Animated toggle to switch back and forth between the
			//		"(-)" (delete) and "Remove | Keep" queue item buttons.
			//	outNode:
			//		Button node to fade out.
			//	inNode:
			//		Button node to fade in.
			//	duration:
			//		Optional duration in milliseconds. Default 200.
			dojo.style(inNode, {display:"inline-block",opacity:0});
			var anim = dojo.fx.combine([
					dojo.fadeOut({node:outNode, duration:duration || 200}),
					dojo.fadeIn({node:inNode, duration:duration || 200})
				]),
				__h = dojo.connect(anim, "onEnd", function(){
					dojo.disconnect(__h);
					dojo.style(outNode, "display", "none");
				});
			anim.play();
		}

		this.cancelRemoveButtonTimer = function(){
			//	summary:
			//		Turn off the Remove button timer, which resets the
			//		"Remove | Keep" button back to "(-)" (delete) after
			//		a few seconds of inactivity.
			clearTimeout(this.confirmationTimer);
			this.confirmationTimer = null;
		}

		this.onFormatChange = function(evt){
			//	summary:
			//		Handle resetting the item's format.
			if(evt.target.value!=this.item.preferredFormatStr){
				this.resetFormat = this.item.preferredFormatStr;
				this.item.preferredFormatStr=evt.target.value;
				this.parent.changeFormat(this);
			}
		};

		this.onRemClick = function(){
			//	summary: Show the "Remove | Keep" button for a few seconds.
			toggleRemoveButtonState(this.removeButtonNode, this.confirmButtonNode);
			// FIXME: this if() shouldn't be necessary, but since this method gets called
			//        twice per click, this ensures that the toggle only happens once
			if(!this.confirmationTimer){
				this.confirmationTimer = setTimeout(
					dojo.hitch(this, function(){
						toggleRemoveButtonState(this.confirmButtonNode, this.removeButtonNode, 500);
					}),
					REMOVAL_CONFIRMATION_TIMER_DURATION
				);
			}
		};

		this.onKeepClick = function(){
			//	summary: Cancel the item deletion process; keep the item.
			this.cancelRemoveButtonTimer();
			toggleRemoveButtonState(this.confirmButtonNode, this.removeButtonNode);
		};

		this.onConfirmRemoveClick = function(){
			//	summary: Remove an item from the queue.
			this.cancelRemoveButtonTimer();
			this.parent.remove(this);
		};

		this.onProblemClick = function(){
			//	summmary: Show the netflix.com page for reporting problems with discs.
			air.navigateToURL(new air.URLRequest("https://www.netflix.com/DiscProblems"));
		};
		this.onPlayClick = function(){
			//	summary: Development helper to try and play Instant Watch titles in AIR.

			//	test: try to open up a new AIR window using the url stuff from Netflix's api
			var href = "http://www.netflix.com/CommunityAPIPlay?devKey="
					+ qd.app.authorization.consumer.key
					+ "&movieid="
					+ encodeURIComponent(this.item.guid)
					+ "&nbb=y";
			console.log("PLAY: " + href);
			air.navigateToURL(new air.URLRequest(href));
		};

		this.onTitleClick = function(){
			//	summary: Show the movie info detail dialog for this item.
			qd.app.movies.showInfo(this.item.guid);
		};

		this.onTitleOver = function(){};

		this.onTitleOut = function(){};

		this.onTopClick = function(){
			//	summary: Move this queue item to the top of the queue (position 1)
			if(this.position>1){
				this.parent.reorder(this, 1);
			}
		};

		this.onTextKeyUp = function(evt){
			//	summary:
			//		Monitor key events in the item's position textbox, and on
			//		Enter, reorder the queue accordingly.
			var k = evt.keyCode;
			if(k == 13){
				this.parent.reorder(this, this.textbox.value);
			}
		};

		this.onTextBlur = function(evt){
			//	summary:
			//		Reorder the queue if the user changed the value of the
			//		item's position textbox.
			if(this.textbox.value != this.position){
				this.textbox.value = this.position;
			}
		};

		this.constructor.apply(this, arguments);
	}


	qd.app.queueList = function(){
		this.recentWatchedAmount = 5;
		this.type = "";
		this.result = {};
		this.list = [];
		this.domNode = null;
		this.registry = {};
		this.dndSource = null;

		this.constructor = function(/* Object */options, /* Node */parentNode){
			//	summary:
			//		Initialize a queue by setting up drag and drop, etc.
			//	options:
			//		Property bag to use as a mixin on this queue.
			//	parentNode:
			//		Node in which to insert this queue item into the DOM.
			dojo.mixin(this, options);
			if(this.type=="watched"){
				this.result.items = dojo.filter(this.result.items, function(m, i){ if(i<this.recentWatchedAmount){ return m; }}, this);
			}
			this.domNode = dojo.byId(parentNode);
			this.dndSource = new dojo.dnd.Source(this.domNode, {
				accept: options.type || "movie",
				skipForm: true,
				withHandles: true,
				isSource: options.canDrag || false,
				singular: true,
				creator: dojo.hitch(this, this.createItem)
			});
			if(options.canDrag){
				dojo.connect(this.dndSource, "onDropInternal", this, "onDrop");
				dojo.connect(this.dndSource, "onDndCancel", this, "onDragCancel");
			}
			this.dndSource._legalMouseDown = function(e){
				// hack! only allow left-click dragging
				if(e.button){ return false; }
				return dojo.dnd.Source.prototype._legalMouseDown.call(this, e);
			};
			this.dndSource.insertNodes(false, dojo.filter(this.result.items, function(i){
				// in English: for "queue" and "instant", skip when position==null
				return i.position || (this.type!="queue" && this.type!="instant");
			}, this));

			this.noItemCheck();
			this.onLoad();
		};

		this.onLoad = function(){
			//	summary: Hook for code to run when the queue's data is loaded.
			setTimeout(dojo.hitch(qd.app.queue, "onLoad", this), 100);
		};
		this.onChange = function(/*String*/typeOfChange){
			//	summary: Hook for code to run when the queue's data changes.
			qd.app.queue.onChange(this, typeOfChange);
		};

		this.inQueue = function(/* String */movieId){
			//	summary:
			//		Check whether an item is in this queue.
			//	movieId:
			//		Netflix item guid to check.
			var b = dojo.some(this.list, function(listItem){
				var guid = listItem.item.title.guid;
				return (guid == movieId);
			}, this);
			return b; //	Boolean
		};

		this.inQueueByTerm = function(/* String */term){
			//	summary:
			//		Check whether an item is in this queue, by item title.
			//	movieId:
			//		Netflix item title to check.
			return dojo.some(this.list, function(listItem){
				return listItem.item.title.title == term;
			}, this);
		};

		this.noItemCheck = function(){
			//	summary:
			//		Check to see if this queue is empty, and if so,
			//		initialize the "no item" display.
			if ((this.list.length == 0 && !this.noResultItem) || (this.list.length == 1 && !this.list[0])) {
				this.noResultItem = new qd.app.nonItem({
					type: this.type
				}, this.domNode);
			}else if(this.noResultItem){
				this.noResultItem.destroy();
				this.noResultItem = null;
			}
		};

		this.destroy = function(){
			//	summary: Tear down this queue object.
			this.dndSource.destroy();
			dojo.forEach(this.list, function(m){
				m.destroy();
			});
			if (this.noResultItem) {
				this.noResultItem.destroy();
			}
			delete this;
			// concerned that a user will logout in the middle
			//	of a server call, which may cause a temporary
			//	closure.
			this.destroyed = true;
		};

		this.createItem = function(/* Object */item, /* String? */hint){
			//	summary:
			//		Turns the movie item provided into an object the
			//		DnD system can handle, or creates an avatar for a
			//		dragged item.
			//	item:
			//		A movie object on create, and a listItem on drag.
			//	hint:
			//		When set to "avatar", indicates that we only need
			//		to create a drag avatar; otherwise, go ahead and
			//		create a full queueItem object.
			if(hint == "avatar"){
				// creating an avatar; just build a simple node
				var node = dojo.doc.createElement("div");
				node.className = "movieDragAvatar";
				node.innerHTML = item.item.title.title;
				// ref to orginial node. Having trouble getting it
				//	onCancel without this ref.
				this.draggingitem = item;
				dojo.style(this.draggingitem.domNode, "visibility", "hidden");
				dojo.style(this.draggingitem.ratingNode, "visibility", "hidden");
				return {
					node: node,
					data: item,
					type: this.type
				}
			}

			// creating a full item; instantiate a queueItem
			var listItem = new qd.app.queueItem({
					item: item,
					type: this.type,
					parent: this
				}, this.domNode);
			this.list.push(listItem);
			this.registry[item.id] = listItem;
			return {
				node: listItem.domNode,
				data: listItem,
				type: this.type
			}
		};

		this.onDrop = function(/* Node[] */nodes){
			//	summary:
			//		Handle drop events coming from the DnD system; typically
			//		this means reordering the queue.
			//	nodes:
			//		An array of the DOM nodes selected and being dropped; we
			//		currently only allow single-selection, so this is hard-coded
			//		to only ever look at the first node.
			var node = nodes[0];
			dojo.style(this.draggingitem.domNode, "visibility", "visible");
			dojo.style(this.draggingitem.ratingNode, "visibility", "visible");
			this.dndSource.getAllNodes().forEach(function(n, i){
				var listItem = this.dndSource.getItem(n.id).data;
				if(n.id == node.id){
					this.reorder(listItem, i+1, false);

					// save the declared style (dojo.style gets computed style)
					var col = n.style.backgroundColor;
					dojo.style(n, "background-color", "#fff");
					var anim = dojox.fx.highlight({
						node: n,
						duration: 1500,
						easing: dojo.fx.easing.cubicIn
					});
					var __h = dojo.connect(anim, "onEnd", function(){
						dojo.disconnect(__h);
						dojo.style(n, "background-color", col);
					});
					anim.play();
				}
				listItem.position = i+1;
			}, this);
			this.draggingitem = null;
		};

		this.onDragCancel = function(){
			//	summary: Clean up after an aborted drag operation.
			if(this.draggingitem){
				dojo.style(this.draggingitem.domNode, "visibility", "visible");
				dojo.style(this.draggingitem.ratingNode, "visibility", "visible");
				this.draggingitem = null;
			}
		};

		this.highlight = function(/* String */movieId){
			//	summary:
			//		Run an animation to briefly highlight a dropped queue item.
			//	movieId:
			//		Netflix item guid to highlight.
			var listItem = (movieId.indexOf("catalog")>-1) ? this.byTitle(movieId): this.byId(movieId);
			if(listItem){
				dijit.scrollIntoView(listItem.domNode);
				var anim = dojo.animateProperty({
					node: listItem.domNode,
					duration: 1000,
					properties: { backgroundColor: { start: "#ffff00", end: "#ffffff" } },
					onEnd: function(){
						dojo.style(listItem.domNode, "backgroundColor", "transparent");
					}
				}).play();
			}
		};

		this.addMovie = function(/* Object */item){
			//	summary:
			//		Adds movie to the list.
			//	description:
			//		Called from qd.app.queue
			//	note:
			//		The API allows for item to be added
			//		a certain position. Currently not
			//		supported by our UI.
			var options = {
				guid: item.guid,
				title: item.title,
				//format:"DVD",
				url: (this.type == "instant") ? "queues/instant" : "queues/disc",
			};

			qd.app.loadingIcon.show();
			var def = qd.service.queues.modify(options);
			def.addCallback(this, function(data){
				qd.app.loadingIcon.hide();
				if(this.destroyed){ delete this; return; }
				var item = data.created[0];
				qd.services.item(item);

				this.noItemCheck();
				var listItem = this.dndSource.insertNodes(false, [item]);
				dojo.forEach(this.list, function(m, i){
					m.position = i + 1;
				});
				//this.highlight(listItem.id);

				qd.app.queue.getRatings([item], dojo.hitch(this, function(ratings){
					this.setRatingData(ratings);
				}));

				this.onChange("add");
			});
			def.addErrback(this, function(err){
				qd.app.loadingIcon.hide();
				console.warn("Error on ADD MOVIE status:", err.status.results.message);
			});

		};

		this.setRatingData = function(/* Object */ratings){
			//	summary:
			//		For each passed ratings chunk, find the list item through
			//		the title it represents, and set the ratings data.
			dojo.forEach(ratings, function(m){
				var title = this.byTitle(m.guid);
				if(title){
					title.setRatingData(m.ratings.user, m.ratings.predicted, m.ratings.average);
				}
			}, this);
			qd.app.ratings.activateRatingWidgets();
		};

		this.remove = function(/* Object */listItem){
			//	summary:
			//		Triggered by the delete icon in an item
			var url=(this.type == "queue")?"queues/disc/available":(this.type=="instant")?"queues/instant/available":"queues/disc/saved";

			var movieId = listItem.id;
			qd.app.loadingIcon.show();
			qd.service.queues.remove({
				url: url,
				guid: listItem.guid.substring(listItem.guid.lastIndexOf("/")+1, listItem.guid.length),
				title: listItem.item.title.title
			}).addCallback(this, function(res){
				qd.app.loadingIcon.hide();
				if(this.destroyed){
			   		delete this;
					return;
				}
				this.removeDisplayItem(listItem);
				qd.app.movies.queueMovieChange(movieId, this.type);
				// needs to be done after anim -> this.noItemCheck();
			}).addErrback(this, function(err){
				qd.app.loadingIcon.hide();
				if(this.destroyed){
			   		delete this;
					return;
				}
				console.warn("Error on remove status:", err.status.results.message);
				//listItem.reset();
			});
		};

		this.removeDisplayItem = function(/* Object*/listItem){
			//	summary:
			//		The visual, animated part of removing an item
			dojo.style(listItem.domNode, "backgroundColor", "#ff0000");
			dojo.fadeOut({node:listItem.domNode, onEnd:dojo.hitch(this, function(){
				var a = dojo.fx.wipeOut({
					node: listItem.domNode,
					duration: 500,
					onEnd: dojo.hitch(this, function(){
						this._removeListItem(listItem);
					})
				}).play();
			})}).play();
		};

		this._removeListItem = function(/* Object */listItem){
			//	summary:
			//		After server call and animaton, finally
			//		remove domNode and reorder list.
			var i = this.getIndex(listItem.id);
			this.dndSource.delItem(listItem.domNode.id);
			listItem.destroy();
			this.list.splice(i, 1);
			dojo.forEach(this.list, function(m, i){
				m.position = i+1;
			});
			this.noItemCheck();
			this.onChange("remove");
		};

		this.renumber = function(/* Object*/listItem){
			//	summary: Renumber (internally; don't update the display) the queue's items.
			//	note: Be careful; position is one-based, while index is zero-based.
			var i = this.getIndex(listItem.id);
			this.list.splice(i, 1);
			this.list.splice(listItem.position - 1, 0, listItem);
			dojo.forEach(this.list, function(m, i){
				m.position = i + 1;
			});
		};

		this.reorder = function(/* Object */listItem, /* Number */pos, /* Boolean? */animate){
			//	summary:
			//		Reorder the queue after a position textbox change or a drag
			//		and drop operation (but not clicking the "top" button).
			//	listItem:
			//		Queue list item just changed.
			//	pos:
			//		Item's new position.
			//	animate:
			//		Optional flag (default true) to indicate to animate the change.
			if(typeof animate == "undefined"){ animate = true; }

			var options = {
				guid:listItem.item.guid,
				position:pos,
				title: listItem.item.title.title,
				url:(this.type == "queue")?"queues/disc":"queues/instant"
			};

			qd.app.loadingIcon.show();
			qd.service.queues.modify(options).addCallback(this, function(res){
				qd.app.loadingIcon.hide();
				if(this.destroyed){ delete this; return; }
				if(res.code=="201" || res.code=="200"){
					listItem.update(res.created[0]);
					qd.services.item(res.created[0]);
					if(animate){
						this.reorderDisplay(listItem);
					}
					this.onChange("reorder");
				}else{
					console.warn("reorder, bad status:", res)
				}
			}).addErrback(this, function(err){
				qd.app.loadingIcon.hide();
				console.warn("Error on reorder status:", err.status.results.message);
				listItem.reset();
			});
		};

		this.reorderDisplay = function(/* Object*/listItem){
			//	summary:
			//		Run an animation to show the queue order changing.
			this.renumber(listItem);
			// 	animate old row to red
			//	move old row to new position
			// 	animate new row from yellow to white to transparent

			var self = this;
			dojo.animateProperty({
				node: listItem.domNode,
				duration: 500,
				properties: { backgroundColor: { start: "#ffffff", end: "#ff0000" }, },
				onEnd:function(){
					var refNode = listItem.domNode.parentNode;
					var node = listItem.domNode.parentNode.removeChild(listItem.domNode);
					dojo.place(node, refNode, listItem.position-1	);
					self.highlight(listItem.id);
				}
			}).play();
		};

		this.attachEvents = function(){
			//	summary:
			//		Register event connections defined in the queue's template.
			//	node:
			//		The queue's DOM node.
			dojo.query(".listQueuedRow", this.domNode).forEach(function(node, i){
				this.list[i].attachEvents(node);
				this.list[i].postDom();
			}, this);
		};

		this.byId = function(/* String */id){
			//	summary:
			//		Return the list item based on the queue item id.
			return this.registry[id];	// Object
		};

		this.byTitle = function(/* String */guid){
			//	summary:
			//		Return the list item based on the guid of the title it represents.
			for(var i=0, l=this.list.length, li; i<l; i++){
				li = this.list[i];
				if(li.item.title.guid == guid){
					return li;
				}
			}
			return null;
		};

		this.byTerm = function(/* String */term){
			//	summary:
			//		Return the list item based on the string title it represents.
			for(var i=0, l=this.list.length, li; i<l; i++){
				li = this.list[i];
				if(li.item.title.title == term){
					return li;
				}
			}
			return null;
		};

		this.getIndex = function(/* String */id){
			//	summary:
			//		Return the internal array index of the list item having the given ID.
			var index = -1;
			dojo.some(this.list, function(m, i){
				if(m.id==id){ index=i; return true;}
			}, this);
			return index; // Number
		};

		this.constructor.apply(this, arguments)
	};
})();
