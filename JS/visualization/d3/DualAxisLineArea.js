define(
	["dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/throttle", "dojo/topic", "dojo/dom-style"],
	function(declare, lang, listen, throttle, topic, style){
	/*	Dual Axis Line Area chart
		Tom Trenka/Adam Schmid
		v1
		20190309

		Constructor to create reusable line area charts capable of displaying 2 Y-axis.
	*/
	var idCount = 1,
		markerCounter = 0,
		updateTopic = "DualAxisLineArea/update",
		setDataTopic = "DualAxisLineArea/setData",
		format = d3.time.format("%Y%m%d"),
		parse = d3.time.format("%Y-%m-%d").parse;

	//	Constructor definition
	return declare([], {
		_id: null,
		id: null,
		data: [],
		chartData: [],
		margin: { top: 16, right: 8, bottom: 36, left: 8 },
		maxDistanceFromPoint: 32,
		card: null,
		cardNode: null,
		domNode: null,
		svgNode: null,
		width: 0,
		height: 0,
		theme: null,
		variation: null,
		transition: {
			duration: 500,
			ease: "cubic-out"
		},
		gradientNodes: {},
		groups: {},
		voronoi: {},
		cssPrefix: "",
		isSetup: false,
		isUpdated: true,
		formatter: function(val){ return d3.format(",")(val); },
		defaultFormatter: function(val){ return d3.format(",")(val); },

		constructor: function(params, node){
			this._id = "trk-dualaxislinearea-" + idCount++;
			this.id = ("id" in params) ? params.id : this._id;
			this.domNode = node;
			this.card = params.card;
			this.cardNode = params.card.domNode;
			this.formatter = params.formatter || this.defaultFormatter;
			this.theme = params.theme;
			this.variation = this.theme[Themes.getTheme().id || "default"];

			//	optional params
			this.data = ("data" in params) ? params.data : [];
			this.cssPrefix = params.segmentPrefix || this.cssPrefix;

			this.gradientNodes = { value: null, compare: null };
			this.groups = { value: null, compare: null, hitAreas: null };
			this.voronoi = { value: null, compare: null };
			this.transition =  ("transition" in params) ? lang.mixin(lang.clone(this.transition), params.transition) : lang.clone(this.transition);
			this.margin = ("margin" in params) ? lang.mixin(lang.clone(this.margin), params.margin) : lang.clone(this.margin);

			this.chartData = [];
			this.svgNode = null;
			this.min = Number.POSITIVE_INFINITY;
			this.max = Number.NEGATIVE_INFINITY;

			//	measurements
			if("width" in params){
				this.width = params.width;
				this.height = ("height" in params) ? params.height : (Math.floor((this.width*9)/16) - 48);
			} else {
				this.width = style.get(this.cardNode, "width");
				this.height = style.get(this.domNode, "height") - this.margin.bottom - this.margin.top;
			}

			this.setup();
		},
		getData: function(){
			//	Get the raw data fed to the chart
			return this.data;
		},
		setData: function(data){
			//	Set the data for this chart and update.
			this.data = data;
			this.update(data);
		},
		resetFormatter: function(){ this.formatter = this.defaultFormatter; },
		setFormatter: function(fn){ this.formatter = fn; },
		skin: function(variation){
			//	intended to update the chart based on either theme change or before.
			var self = this;
			self.variation = self.theme[variation || "default"];
			var src = self.variation.source;
			if(this.isSetup){ 
				//	change the things we need in our set up function: axis, filters and gradients.
				//	Axes
				self.xAxisNode.selectAll("text").style(src.axis["x-axis"].style);
				self.yValueAxisNode.selectAll("text").style(src.axis["y-axis-value"].style);
				self.yCompareAxisNode.selectAll("text").style(src.axis["y-axis-compare"].style);

				//	Filters.
				for(var filter in src.filters){
					var f = self.svgNode.select("#" + self.id + "__" + filter);
					if(f){
						var e = src.filters[filter].elements;
						for(var element in e){
							f.select(element).attr(e[element].attr);
						}
					}
				}

				//	gradients
				for(var gradient in src.gradients){
					var g = self.gradientNodes[gradient],
						v = src.gradients[gradient];
					if(g){
						g.attr(v.gradientDirection);
						g.selectAll("stop").remove();
						for(var i=0, l=v.stops.length; i<l; i++){
							var stop = g.append("stop").attr(v.stops[i]);
						}
					}
				}
			}
			if(this.isUpdated){
				//	we should have data, so change the things that need to be changed.
				self.groups.compare.selectAll(".trk-dualaxislinearea-series__compare-line")
					.attr(src.compareLine.attr)
					.style(src.compareLine.style);
				self.groups.value.selectAll(".trk-dualaxislinearea-series__value-line")
					.attr(src.valueLine.attr)
					.style(src.valueLine.style);
			}
		},
		setup: function(){
			//	Set up the basics of this chart; leave the general update pattern to the update method.
			var self = this;
			var src = self.variation.source;

			//	setup the window resize event
			///*
			listen(window, "resize", throttle(function(e){
				self.resize();
			}, 1000));
			// */

			//	Our axes
			var x = this.x = d3.time.scale().range([0, this.width]);
			var y = this.y = d3.scale.linear().range([this.height, 0]).nice();
			var y2 = this.y2 = d3.scale.linear().range([this.height, 0]).nice();
			this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
			this.yValueAxis = d3.svg.axis().scale(this.y).orient("right").ticks(5);
			this.yCompareAxis = d3.svg.axis().scale(this.y2).orient("left").ticks(5);

			//	Our series plots
			this.valueArea = d3.svg.area()
				.interpolate("monotone")
				.x(function(d, i){ return self.x(d.date); })
				.y0(function(d, i){ return self.y(0); })
				.y1(function(d, i){ return self.y(d.value); });
			this.valueLine = d3.svg.line()
				.interpolate("monotone")
				.x(function(d, i){ return self.x(d.date); })
				.y(function(d, i){ return self.y(d.value); });

			this.compareArea = d3.svg.area()
				.interpolate("monotone")
				.x(function(d, i){ return self.x(d.date); })
				.y0(function(d, i){ return self.y2(0); })
				.y1(function(d, i){ return self.y2(d.compare); });
			this.compareLine = d3.svg.line()
				.interpolate("monotone")
				.x(function(d, i){ return self.x(d.date); })
				.y(function(d, i){ return self.y2(d.compare); });

			//	Voronoi for the hit areas
			this.voronoi.value = d3.geom.voronoi()
				.x(function(d, i){ return self.x(d.date); })
				.y(function(d, i){ return self.y(d.value); })
				.clipExtent([[0, 0], [self.width, self.height]]);
			this.voronoi.compare = d3.geom.voronoi()
				.x(function(d, i){ return self.x(d.date); })
				.y(function(d, i){ return self.y2(d.compare); })
				.clipExtent([[0, 0], [self.width, self.height]]);
			
			var svg = this.svgNode = d3.select(this.domNode).append("svg")
	//			.attr("width", "100%")
	//			.attr("height", "100%")
	//			.attr("viewBox", "0 0 " + (this.width) + " " + (this.height))
				.attr("width", this.width)
				.attr("height", (this.height + this.margin.bottom + this.margin.top))
				.attr("id", this.id);
			var defs = this.defs = svg.append("defs").attr("class", "trk-dualaxislinearea__defs");
			var g = this.groupNode = svg.append("g")
				.attr("class", "trk-dualaxislinearea-plot")
				.attr("transform", "translate(0," + this.margin.top + ")");

			//	TRT: the following is taken from the vizualy alterations
			this.plotClipPath = defs.append("clipPath")
					.attr("id", this.id + "__plotClipPath")
				.append("rect");

			var o = src.filters.lineDropShadow;
			defs.append("filter")
					.attr("id", this.id + "__lineDropShadow")
					.attr(o.attr)
				.append("feDropShadow")
					.attr("class", "trk-dualaxislinearea-defs__line-shadow")
					.attr(o.elements.feDropShadow.attr);

			var o = src.filters.TooltipDropShadow;
			defs.append("filter")
					.attr("id", this.id + "__TooltipDropShadow")
					.attr(o.attr)
				.append("feDropShadow")
					.attr(o.elements.feDropShadow.attr);

			var o = src.gradients.value;
			var valueGradient = this.gradientNodes.value = defs.append("linearGradient")
				.attr("id", this.id + "__gradient-value")
				.attr(o.gradientDirection);
			for(var i=0, l=o.stops.length; i<l; i++){
				valueGradient.append("stop")
					.attr(o.stops[i]);
			}

			var o = src.gradients.compare;
			var compareGradient = this.gradientNodes.compare = defs.append("linearGradient")
				.attr("id", this.id + "__gradient-compare")
				.attr(o.gradientDirection);
			for(var i=0, l=o.stops.length; i<l; i++){
				compareGradient.append("stop")
					.attr(o.stops[i]);
			}

			this.seriesNode = g.append("g").attr("class", "trk-dualaxislinearea-series");

			/*
			var zoom = this.zoom = d3.behavior.zoom()
				.x(x)
				.scaleExtent([1, 10]);
			this.seriesNode.call(zoom);
			*/

			var gs = this.groups;
			this.groups.value = this.seriesNode.append("g").attr("class", "trk-dualaxislinearea-series__value");
			this.groups.compare = this.seriesNode.append("g").attr("class", "trk-dualaxislinearea-series__compare");
			this.groups.hitAreas = this.seriesNode.append("g").attr("class", "trk-trendschart-series__hitAreas");

			var axisPadding = 0;
			this.xAxisNode = g.append("g")
				.attr("class", "trk-dualaxislinearea-x__axis")
				.attr("transform", "translate(0, " + (this.height + 11) + ")");
			this.yValueAxisNode = g.append("g")
				.attr("class", "trk-dualaxislinearea-yValue__axis")
				.attr("transform", "translate(" + (this.margin.left + axisPadding) + ", 0)");
			this.yCompareAxisNode = g.append("g")
				.attr("class", "trk-dualaxislinearea-yCompare__axis")
				.attr("transform", "translate(" + (this.width - this.margin.right - axisPadding) + ", 0)");

			topic.subscribe("Themes/setTheme", function(data){
				self.skin(data.current.id);
			});

			this.isSetup = true;
		},
		resize: function(){
			//	attach to the window.resize event; re-measures the domNode and updates.
			var self = this;
			self.width = style.get(self.cardNode, "width");
			self.height = style.get(self.domNode, "height") - self.margin.bottom - self.margin.top;

			self.x.range([0, self.width]);
			self.y.range([self.height, 0]).nice();
			self.y2.range([self.height, 0]).nice();
			self.xAxis.scale(self.x);
			self.yValueAxis.scale(self.y);
			self.yCompareAxis.scale(self.y2);
			self.voronoi.value.clipExtent([[0, 0], [self.width, self.height]]);
			self.voronoi.compare.clipExtent([[0, 0], [self.width, self.height]]);
			self.svgNode
				.attr("width", self.width)
				.attr("height", self.height + self.margin.bottom + self.margin.top);
			self.xAxisNode.attr("transform", "translate(0, " + (self.height + 11) + ")");
			self.yCompareAxisNode.attr("transform", "translate(" + (self.width - self.margin.right) + ", 0)");
			return self.update();
		},
		update: function(data){
			//	the main rendering function.  Any changes to a property should
			//	call this function when completed.
			//	NB: Data submitted should already be pre-calcuated and take the following form:
			//	{ date, min, max, ma, value }
			if(!this.isSetup) this.setup();
			this.isUpdated = false;

			var self = this;
			data = data || self.data;
			if(!data.length){
				console.warn("We must have data before updating chart " + self.id);
				return;
			}
			self.data = lang.clone(data);
			var src = self.variation.source;

			//	check to see if we're doing one or two series
			var isCompare = ("compare" in data[0]);

			//	set up our tick formatters
			this.yValueAxis.tickFormat(data[0].formatters.value || d3.format(","));
			if(isCompare){
				this.yCompareAxis.tickFormat(data[0].formatters.compare || d3.format(","));
			}

			//	Set up our domains
			this.x.domain(d3.extent(data, function(d){ return d.date; }));
			this.y.domain([0, Math.max(1, d3.max(data, function(d){ return d.value * 1.42; }))]);
			if(isCompare){
				this.y2.domain([0, Math.max(1, d3.max(data, function(d){ return d.compare * 1.42; }))]);
			}

			var g = this.groupNode;

			//	update our axes
			this.xAxisNode.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.call(self.xAxis);
			this.yValueAxisNode.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.call(self.yValueAxis);

			if(isCompare){
				this.yCompareAxisNode.style("display", "");
				this.yCompareAxisNode.transition()
					.duration(self.transition.duration)
					.ease(self.transition.ease)
					.call(self.yCompareAxis);
			} else {
				this.yCompareAxisNode.style("display", "none");
			}
			self.xAxisNode.selectAll("text").style(src.axis["x-axis"].style);
			self.yValueAxisNode.selectAll("text").style(src.axis["y-axis-value"].style);
			self.yCompareAxisNode.selectAll("text").style(src.axis["y-axis-compare"].style);


			//	do our plotting. Compare is always first (behind the value) TODO Ask Adam
			if(!isCompare){
				data.forEach(function(item){ item.compare = 0; });
			} else {
				this.groups.compare.style("display", "");
			}
			var compareArea = this.groups.compare.selectAll(".trk-dualaxislinearea-series__compare-area").data([data]);
			compareArea.enter()
				.append("path")
				.attr("class", "trk-dualaxislinearea-series__compare-area")
				.style("fill", "url(#" + this.id + "__gradient-compare)");
			compareArea.exit().remove();
			compareArea.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.compareArea(d); });

			var compareLine = this.groups.compare.selectAll(".trk-dualaxislinearea-series__compare-line").data([data]),
				o = src.compareLine;
			compareLine.enter()
				.append("path")
				.attr("class", "trk-dualaxislinearea-series__compare-line")
				.attr(o.attr)
				.style(o.style)
				.attr("filter", "url(#" + self.id + "__lineDropShadow)");
			compareLine.exit().remove();
			compareLine.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.compareLine(d); });
			if(!isCompare){
				setTimeout(function(){
					self.groups.compare.style("display", "none");
				}, self.transition.duration + 50);
			}

			var valueArea = this.groups.value.selectAll(".trk-dualaxislinearea-series__value-area").data([data]);
			valueArea.enter()
				.append("path")
				.attr("class", "trk-dualaxislinearea-series__value-area")
				.style("fill", "url(#" + this.id + "__gradient-value)");
			valueArea.exit().remove();
			valueArea.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.valueArea(d); });

			var valueLine = this.groups.value.selectAll(".trk-dualaxislinearea-series__value-line").data([data]),
				o = src.valueLine;
			valueLine.enter()
				.append("path")
				.attr("class", "trk-dualaxislinearea-series__value-line")
				.attr(o.attr)
				.style(o.style)
				.attr("filter", "url(#" + self.id + "__lineDropShadow)");
			valueLine.exit().remove();
			valueLine.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.valueLine(d); });

			//	markers
			var markerRadius = 6, now = new Date(), o = src.hitAreas;
			//	finally, the voronoi
			var voronoi = isCompare ? self.voronoi.compare : self.voronoi.value;
			var vd = voronoi(data), maxDistanceFromPoint = o.maxDistanceFromPoint;
			var clips = self.defs.selectAll(".clip")
				.data(vd);
			clips.exit().remove();
			clips.attr("id", function(d){ return self.id + "__clip-" + format(d.point.date); });
			clips.selectAll("path.clip-path-circle").remove();
			clips.enter().append("clipPath")
				.attr("class", "clip")
				.attr("id", function(d){ return self.id + "__clip-" + format(d.point.date); });
			var path = clips.append("path")
				.attr("class", "clip-path-circle");
			path.transition()
					.duration(self.transition.duration)
					.ease(self.transition.ease)
				.attr("d", function(d){ return d ? "M" + d.join("L") + "Z" : null; });

			var hitAreas = this.groups.hitAreas.selectAll(".trk-dualaxislinearea__hit-areas")
				.data(data);
			hitAreas.exit().remove();
			hitAreas.enter().append("circle")
				.attr("class", "trk-dualaxislinearea__hit-areas")
				.attr("fill", "none")
				.attr("stroke", "none")
				.style("pointer-events", "all")
				.attr("clip-path", function(d){ return "url(#" + self.id + "__clip-" + format(d.date) + ")"; })
				.style("clip-path", function(d){ return "url(#" + self.id + "__clip-" + format(d.date) + ")"; })
				.attr("r", maxDistanceFromPoint);
			hitAreas.transition()
					.duration(self.transition.duration)
					.ease(self.transition.ease)
				.attr("cx", function(d, i){ return self.x(d.date); })
				.attr("cy", function(d, i){
					if(isCompare) return self.y2(d.compare);
					return self.y(d.value);
				});

			var radiusFactor = 1.25, radiusDuration = 300;
			hitAreas.on("mouseover", function(data, i){
				//	use data.point if working direct of a voronoi path set
				var d = data,
					hitPoint = d3.select(this),
					x = self.x(d.date),
					y = self.y(d.value),
					svg = self.svgNode,
					group = self.groups.value;
				if(isCompare){
					y = self.y2(d.compare);
					group = self.groups.compare;
				}

				var width = 164,
					height = 56,
					padding = 24;

				if(isCompare){
					height = 74;
				}

				//	helper to deal with tooltips going off the sides of the chart
				function getXPos(x, w){
					w = w || width;
					var pos = x - (w/2);
					// console.log(pos, width, self.width);
					if(pos <= 0) return 2;
					if((pos+width) >= self.width){
						return (self.width - w) - 2;
					}
					return pos;
				}

				//	show the marker only on mouseover
				var o = src[(isCompare?"compareMarker":"valueMarker")];
				var marker = group.append("circle")
					.attr("id", function(){ return self.id + "__clip-marker-" + format(d.date); })
					.attr("class", function(){
						var s = "trk-dualaxislinearea-series__markers-";
						if(isCompare) s += "compare"
						else s += "value";
						return s;
					})
					.attr("r", 0)
					.attr("cx", x)
					.attr("cy", y)
					.style(o.style)
				.transition()
					.duration(radiusDuration)
					.ease(self.transition.ease)
					.attr(o.attr);

				var g = svg.append("g")
					.attr("class", "trk-trendschart-tooltip__group")
					.attr("id", self.id + "-trendschart-tooltip__group-" + format(d.date))
					.attr('opacity', 0);

				var r = g.append("rect")
					.attr("class", "toolTipRect")
					.attr("fill", "#20263c")
					.style("pointer-events", "none")
					.attr("filter", "url(#" + self.id + "__TooltipDropShadow)")
					.attr("width", width + "px")
					.attr("height", height + "px")
					.attr("rx", 2)
					.attr("ry", 2)
					.attr({
						id: "r" + x + "-" + y + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
						x: function() { return getXPos(x); },
						y: function() { return y - (height+10); }
					});

				var tt = g.append("text").attr({
					id: "tt" + x + "-" + y + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
					x: function() { return getXPos(x) + width/2; },
					y: function() { 
						if(isCompare){
							return y - (height/2) - 27;
						}
						return y - (height/2) - 16; 
					}
				})
				.attr('font-size', "12")
				.attr("fill", "#fff")
				.attr('fill-opacity', ".54")
				.attr('text-anchor', "middle")
				.attr("class", "dateHour tooltipText")
				.style("pointer-events", "none")
				.text(function(){
					if("dateFormatter" in d){ return d.dateFormatter(d.date); }
					return d3.time.format("%a, %b %-d, %Y")(d.date);
				});

				var tc = g.append("text").attr({
					id: "tc" + x + "-" + y + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
					x: function() { return getXPos(x) + width/2; },
					y: function() { 
						if(isCompare){
							return y - (height/2) - 6;
						}
						return y - (height/2) + 6; }
				})
				.attr('font-size', "16")
				.attr("fill", "#fff")
				.attr('text-anchor', "middle")
				.attr("class", "calls tooltipText")
				.style("pointer-events", "none")
				.text(function(){
					return d.tipFormatters.value(d.value);
				});

				if(isCompare){
					var tvc = g.append("text").attr({
						id: "tvc" + x + "-" + y + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
						x: function() { return getXPos(x) + width/2; },
						y: function() { return y - (height/2) + 15; }
					})
					.attr('font-size', "16")
					.attr("fill", "#fff")
					.attr('text-anchor', "middle")
					.attr("class", "calls tooltipText")
					.style("pointer-events", "none")
					.text(function(){
						return d.tipFormatters.compare(d.compare);
					});
				}
				//	console.log(d.tipFormatters);
				if(isCompare){
					var tl = Math.max(tt.node().getComputedTextLength(), tc.node().getComputedTextLength(), tvc.node().getComputedTextLength());
				} else {
					var tl = Math.max(tt.node().getComputedTextLength(), tc.node().getComputedTextLength());
				}
				var w = tl + padding;
				r.attr("width", w + "px");
				r.attr("x", getXPos(x, w));
				tt.attr("x", getXPos(x, w) + w/2);
				tc.attr("x", getXPos(x, w) + w/2);
				if(isCompare) tvc.attr("x", getXPos(x,w) + w/2);
				
				//	set up the specific mouseout handler
				hitPoint.on("mouseout", function(){
					//	Get a handle on the marker this represents
					group.selectAll("#" + self.id + "__clip-marker-" + format(d.date))
						.transition()
							.duration(self.transition.duration)
							.ease(self.transition.ease)
						.attr("r", 0)
						.remove();

					//	remove the tooltip itself
					g.transition()
							.duration(self.transition.duration)
							.ease(self.transition.ease)
							.attr("opacity", 0)
						.remove();

					//	pull the handler
					hitPoint.on("mouseout", null);
				});

				g.transition()
					.duration(self.transition.duration)
					.ease(self.transition.ease)
					.attr("opacity", 1);

			});
			self.isUpdated = true;
		}
	});
});

