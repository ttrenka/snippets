define(
	["dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/throttle", "dojo/topic", "d3-plugins/sankey/sankey"],
	function(declare, lang, listen, throttle, topic){
	/*	Sankey chart
		Tom Trenka/Adam Schmid
		v1
		20190501

		Constructor to create reusable line area charts capable of displaying 2 Y-axis.
	*/
	var idCount = 1,
		updateTopic = "Sankey/update",
		setDataTopic = "Sankey/setData";

	//	Constructor definition
	return declare([], {
		_id: null,
		id: null,
		margin: { top: 48, right: 16, bottom: 32, left: 16 },
		_rawData: null,
		data: {
			nodes: [],
			links: []
		},
		card: null,
		cardNode: null,
		domNode: null,
		svgNode: null,
		groupNode: null,
		groups: {},
		gradients: {},
		width: 2400,	//	this is arbitrary
		height: 300,	//	this is arbitrary
		theme: null,
		variation: null,
		sankey: null,
		sankeyDefs: {
			nodeWidth: 96,
			nodeHeight: 20,
			nodePadding: 24
		},
		transition: {
			duration: 500,
			ease: "cubic-out"
		},
		cssPrefix: "",
		dataDelimiter: "^*^",
		isSetup: false,
		isUpdated: true,
		formatter: function(val){ return d3.format(",")(val); },
		defaultFormatter: function(val){ return d3.format(",")(val); },

		constructor: function(params, node){
			this._id = "trk-sankey-" + idCount++;
			this.id = ("id" in params) ? params.id : this._id;
			this.domNode = node;
			this.card = params.card;
			this.cardNode = params.card.domNode;
			this.formatter = params.formatter || this.defaultFormatter;
			this.theme = params.theme;
			this.variation = this.theme[Themes.getTheme().id || "default"];

			//	optional params
			this._rawData = ("data" in params) ? params.data : [];
			this.cssPrefix = params.segmentPrefix || this.cssPrefix;
			this.transition =  ("transition" in params) ? lang.mixin(lang.clone(this.transition), params.transition) : lang.clone(this.transition);
			this.margin = ("margin" in params) ? lang.mixin(lang.clone(this.margin), params.margin) : lang.clone(this.margin);
			this.groups = { steps: null, links: null, nodes: null };
			this.gradients = {};

			this.sankeyDefs = {
				nodeWidth: ("nodeWidth" in params) ? params.nodeWidth : this.sankeyDefs.nodeWidth,
				nodeHeight: ("nodeHeight" in params) ? params.nodeHeight : this.sankeyDefs.nodeHeight,
				nodePadding: ("nodePadding" in params) ? params.nodePadding: this.sankeyDefs.nodePadding
			};
			this.svgNode = null;

			//	measurements
			//	TODO: We will need the height for sure but not the width. We'll need to adjust the width based
			//	on the number of steps we actually get. MAKE SURE WE CAN CHANGE THIS ON THE FLY!
			if("width" in params){
				this.width = params.width;
				this.height = ("height" in params) ? params.height : (Math.floor((this.width*9)/16) - 48);
			} else {
				var style = this.cardNode.ownerDocument.defaultView.getComputedStyle(this.cardNode, null);
				this.width = parseInt(style["width"], 10);
				this.height = parseInt(style["height"], 10);
			}

			this.setup();
		},
		getData: function(){
			//	Get the raw data fed to the chart
			return this._rawData;
		},
		setData: function(data){
			//	Set the data for this chart and update.
			this._rawData = data;

			this.data = this.process(data);
			this.update(this.data);
		},
		resetFormatter: function(){ this.formatter = this.defaultFormatter; },
		setFormatter: function(fn){ this.formatter = fn; },
		skin: function(variation){
			//	intended to update the chart based on either theme change or before.
			var self = this;
			self.variation = self.theme[variation || "default"];
			//	var src = self.variation.source;
			if(this.isSetup){
				//	TODO: find out if our skin is actually going to change or not!
			}
			if(this.isUpdated){
				//	TODO: see the note above
				//	we should have data, so change the things that need to be changed.
			}
		},
		setup: function(){
			//	Set up the basics of this chart; leave the general update pattern to the update method.
			var self = this;
			var src = self.variation.source;

			/*
			//	set up the internal sankey data resource
			self.sankey = d3.sankey()
				.nodeWidth(self.sankeyDefs.nodeWidth)
				.nodePadding(self.sankeyDefs.nodePadding)
				.size([self.width, self.height]);
			*/

			var svg = this.svgNode = d3.select(this.domNode).append("svg")
				.attr("width", (self.width + self.margin.left + self.margin.right))
				.attr("height", (self.height + self.margin.top + self.margin.bottom))
				.attr("id", self.id);
			var defs = self.defs = svg.append("defs").attr("class", "trk-sankey__defs");
			for(var gradient in src.gradients){
				var item = src.gradients[gradient];
				var o = self.gradients[gradient] = defs.append("linearGradient")
					.attr("id", self._id + "__gradient-" + gradient)
					.attr(item.gradientDirection);
				for(var i=0, l=item.stops.length; i<l; i++){
					o.append("stop").attr(item.stops[i]);
				}
			}

			//	Do the steps structure
			self.groups.steps = svg.append("g").attr("class", "trk-sankey-steps");
			/*
			var num = 40, gutter = ((self.width - self.margin.left) - (self.sankeyDefs.nodeWidth * num)) / (num - 1);
			var steps = self.groups.steps = svg.append("g").attr("class", "trk-sankey-steps"), x = self.margin.left;
			for(var i=0; i<num; i++){
				x += (i > 0) ? self.sankeyDefs.nodeWidth + gutter : 0;
				var g = steps.append("g")
					.attr("transform", "translate(" + x + ",0)");
				var step = g.append("rect")
					.attr("class", "trk-sankey-step")
					.attr("x", "0")
					.attr("y", "0")
					.attr("width", self.sankeyDefs.nodeWidth)
					.attr("height", "100%");
				g.append("foreignObject")
						.attr("y", 0)
						.attr("width", self.sankeyDefs.nodeWidth)
						.attr("height", "32")
					.append("xhtml:div")
						.attr("class", "trk-sankey-step__text")
						.html("Step " + (i+1));
			}
			*/

			//	Do the rest
			var g = self.groupNode = svg.append("g")
				.attr("class", "trk-sankey-plot")
				.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
			self.groups.links = self.groupNode.append("g").attr("class", "trk-sankey-links");
			self.groups.nodes = self.groupNode.append("g").attr("class", "trk-sankey-nodes");

			topic.subscribe("Themes/setTheme", function(data){
				self.skin(data.current.id);
			});

			this.isSetup = true;
		},
		process: function(data){
			//	Take our raw dataset, and create nodes and links out of it.
			/*	We need to get to this:
			 *		node: { name }
			 *		link: { source, target, value }
			 *
			 * 	Will be getting this from the server:
			 * 		{ datasource, datatarget, datavalue }
			 *
			 * 	Note that datasource and datatarget will be unique values, and when
			 * 	a node name is to be displayed, you MUST do this to it first:
			 *
			 * 	var name = name.split(this.dataDelimiter)[0];
			 *
			 */

			var nodes = [], links = [], self = this, highStep = 0, stepTotals = {}; //	eventually set to our actual data
			//	prep the data
			data.filter(function(item){
				return item.datatarget.indexOf(self.dataDelimiter + "-1") == -1;
			}).forEach(function(item){
				var step = +item.datatarget.split(self.dataDelimiter)[1];
					stepTest = +item.datasource.split(self.dataDelimiter)[1];
				if(step != stepTest){
					nodes.push({ name: item.datasource, step: +item.datasource.split(self.dataDelimiter)[1] });
					nodes.push({ name: item.datatarget, step: +item.datatarget.split(self.dataDelimiter)[1] });
					links.push({
						source: item.datasource,
						target: item.datatarget,
						value: +item.datavalue,
						sourceStep: +step,
						targetStep: +item.datatarget.split(self.dataDelimiter)[1]
					});

					//	Test for the first step
					if(!(stepTest in stepTotals)){ stepTotals[stepTest] = 0; }
					if(!(step in stepTotals)){ stepTotals[step] = 0; }
					if(+stepTest == 1){ stepTotals[stepTest] += +item.datavalue || 0; }
					stepTotals[step] += +item.datavalue || 0;
				}
			});

			//	create an array of just the names of the nodes, and make them unique
			nodes.sort(function(a, b){
				return a.step < b.step && a.name.split(self.dataDelimiter)[0] > b.name.split(self.dataDelimiter)[0];
			});
			nodes = d3.keys(d3.nest().key(function(d){ return d.name; }).map(nodes));
			//	console.log(nodes);
			//	console.log(stepTotals);

			//	remap the links to point at indices instead of strings
			links.forEach(function(item, idx){
				links[idx].source = nodes.indexOf(links[idx].source);
				links[idx].target = nodes.indexOf(links[idx].target);
			});

			//	fix the nodes to be objects, and fix the name at the same time
			nodes.forEach(function(item, idx){
				nodes[idx] = {
					name: item.split(self.dataDelimiter)[0],
					step: +item.split(self.dataDelimiter)[1]
				};
				highStep = Math.max(highStep, +item.split(self.dataDelimiter)[1]);
			});
			//	console.log(links);
			console.log("The highest step returned is ", highStep);

			//	the final return
			var ret = { nodes: nodes, links: links, highStep: highStep, stepTotals: stepTotals };
			return ret;
		},
		update: function(data){
			//	the main rendering function.  Any changes to a property should
			//	call this function when completed.
			//	NB: Data submitted should already be pre-calcuated and take the following form:
			//	{ nodes, links }
			if(!this.isSetup) this.setup();
			this.isUpdated = false;

			var self = this;
			data = data || self.data;
			if(Array.isArray(data)){
				self._rawData = data.slice(0);
				data = self.data = self.process(data);
			}
			if(!data.links.length || !data.nodes.length){
				//	check first to see if this is a raw link array
				console.warn("We must have data before updating chart " + self.id);
				return;
			}

			//	Deal with the width of the actual SVG first based on data.highStep
			var num = Math.min(data.highStep, 40), 
				//	gutter = ((self.width - self.margin.left) - (self.sankeyDefs.nodeWidth * num)) / (num - 1),
				gutter = 120,
				steps = self.groups.steps,
				x = self.margin.left;
			steps.selectAll(".trk-sankey-step__group").remove();
			for(var i=0; i<num; i++){
				var total = data.stepTotals[("" + (i+1))];		
				x += (i > 0) ? self.sankeyDefs.nodeWidth + gutter : 0;
				var g = steps.append("g")
					.attr("class", "trk-sankey-step__group")
					.attr("transform", "translate(" + x + ",0)");
				var step = g.append("rect")
					.attr("class", "trk-sankey-step")
					.attr("x", "0")
					.attr("y", "0")
					.attr("width", self.sankeyDefs.nodeWidth)
					.attr("height", "100%");
				g.append("foreignObject")
						.attr("y", 0)
						.attr("width", self.sankeyDefs.nodeWidth)
						.attr("height", "32")
					.append("xhtml:div")
						.attr("class", "trk-sankey-step__text")
						.html("Step " + (i+1))
					.append("xhtml:div")
						.attr("class", "trk-sankey-step__total")
						.html(d3.format(",")(total));
			}
			x += self.sankeyDefs.nodeWidth;
			self.svgNode.attr("width", x);			

			var src = self.variation.source;

			//	set up the internal sankey data resource
			self.sankey = d3.sankey()
				.nodeWidth(self.sankeyDefs.nodeWidth)
				.nodePadding(self.sankeyDefs.nodePadding)
				.size([x, (self.height - self.margin.top - self.margin.bottom)]);
	//			.size([(self.width - self.margin.left), (self.height - self.margin.top - self.margin.bottom)]);

			//	Testing
			self.sankey.nodes([]).links([]);

			self.sankey.nodes(data.nodes)
				.links(data.links)
				.layout(100/* data.nodes.length */);	//	might need to increase this number
			var path = self.sankey.link();

			self.groups.links.selectAll(".trk-sankey-link").remove();
			var links = self.groups.links.selectAll(".trk-sankey-link").data(data.links);
			links.enter().append("path")
				.attr("class", "trk-sankey-link")
				.attr("d", path)
				.style("stroke-width", function(d, i){
					//	 if(i < 4) console.log(d);
					return Math.max(1, d.dy);
				})
				.attr("stroke", function(d, i){
					var mod = 15, index = (+d.sourceStep-1) % mod, id = "#" +  self._id + "__gradient-link";
					if(index <= Math.floor(mod/2)){
						id += index;
					} else {
						id += mod - index;
					}
					return "url(" + id + ")";
				})
				.sort(function(a, b){ return b.dy - a.dy; });

			self.groups.nodes.selectAll(".trk-sankey-node").remove();
			var nodes = self.groups.nodes.selectAll(".trk-sankey-node").data(data.nodes);
			nodes.enter().append("g")
				.attr("class", function(d, i){
					var s = "trk-sankey-node";
					// if(i < 20) console.log(d);
					var mod = 15, index = (+d.step-1) % mod, id = 0;
					if(index > Math.floor(mod/2)){
						id = mod - index;
					} else {
						id = index;
					}
					s += " trk-sankey-node__step-" + (id + 1);
					return s;
				})
				.attr("data-value", function(d){ return d.name + "-" + d.step; })
				.attr("transform", function(d){ return "translate(" + d.x + "," + d.y + ")"; });

			/*
				trk-sankey-node__step-<n>
					.call(d3.behavior.drag()
						.origin(function(d) { return d; })
						.on("dragstart", function() { this.parentNode.appendChild(this); })
						.on("drag", function(d){
							d3.select(this)
								.attr("transform", "translate(" + d.dx + "," +
									+ (d.y = Math.max(0, Math.min(self.height - d.dy, d3.event.y)))
								+ ")")
							self.sankey.relayout();
							links.attr("d", path);
						})
					);
			*/

			nodes.append("foreignObject")
					.attr("y", 0)
					.attr("height", function(d){
						// console.log(d);
						//	return Math.max(self.sankeyDefs.nodeHeight, d.dy);
						return d.dy;
					})
					.attr("width", self.sankey.nodeWidth())
					.attr("transform", null)
				.append("xhtml:div")
					.attr("class", function(d){
						return "trk-sankey-node__info" + (d.name == "Lead" ? " trk-sankey-node__lead":"");
					})
					.html(function(d){
						var name = d.name, step = d.step, value = d.value, total = data.stepTotals[d.step];
						//	var html = '<div class="trk-sankey-node__info-name">' + name + ' (' + step + ')</div>'
						var html = '<div class="trk-sankey-node__info-name">' + name + '</div>'
							+ '<div class="trk-sankey-node__info-percent">' + (total > 0 ? d3.format(".2f")((value/total)*100) : 0) + '%</div>'
							+ '<div class="trk-sankey-node__info-value">(' + d3.format(",")(value) + ')</div>';
						if(d.name == "Lead"){
							//	html = '<i class="material-icons">stars</i>' + html;
							html += '<i class="material-icons">stars</i>';
						}
						return html;
					});
			//	TODO: path highlighting.
			self.isUpdated = true;
		}
	});
});

