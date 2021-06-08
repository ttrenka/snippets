define(
	["dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/throttle", "dojo/topic", "dojo/dom-style"],
	function(declare, lang, listen, throttle, topic, style){
	/*	Trends
		Tom Trenka/Adam Schmid
		v1
		20190108

		Constructor to create reusable Donut charts.
	*/
	var idCount = 1,
		markerCounter = 0,
		updateTopic = "Trends/update",
		setDataTopic = "Trends/setData",
		format = d3.time.format("%Y%m%d"),
		parse = d3.time.format("%Y-%m-%d").parse;

	/*
		params object for the constructor/update functions:
		{
			id: string, OPTIONAL
			?color: string, OPTIONAL
			width: int, OPTIONAL
			height: int, OPTIONAL
			data: Array<Object>, OPTIONAL
			formatter: function OPTIONAL
		}
	*/

	//	Constructor definition
	return declare([], {
		_id: null,
		id: null,
		data: [],
		chartData: [],
		margin: { top: 20, right: 20, bottom: 20, left: 20 },
		maxDistanceFromPoint: 50,
		domNode: null,
		svgNode: null,
		width: 0,
		height: 0,
		stopColors: {
			upper: "#1f7b94",
			lower: "#1f7b94"
		},
		transition: {
			duration: 500,
			ease: "cubic-out"
		},
		gradientNodes: {},
		groups: {},
		cssPrefix: "",
		isSetup: false,
		formatter: function(val){ return d3.format(",")(val); },
		defaultFormatter: function(val){ return d3.format(",")(val); },

		constructor: function(params, node){
			this._id = "trk-trendschart-" + idCount++;
			this.id = ("id" in params) ? params.id : this._id;
			this.domNode = node;
			this.formatter = params.formatter || this.defaultFormatter;

			//	optional params
			this.data = ("data" in params) ? params.data : [];
			// AMS 2017-2-16 Now being set in SCSS
			//this.colors = ("colors" in params) ? params.colors : ["#5a099b", "#7714b1", "#881bbd", "#A454CC", "#c58edf", "#dcbbec"];
			this.cssPrefix = params.segmentPrefix || this.cssPrefix;

			this.stopColors = ("colors" in params) ? lang.mixin(lang.clone(this.stopColors), params.colors) : lang.clone(this.stopColors);
			this.gradientNodes = { upper: null, lower: null };
			this.groups = { upper: null, lower: null, actual: null, zero: null, ma: null, hitAreas: null };
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
				this.width = style.get(this.domNode, "width");
				this.height = (Math.floor((this.width*9)/16) - 48);
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
		resetFormatter: function(){
			this.formatter = this.defaultFormatter;
		},
		setFormatter: function(fn){
			this.formatter = fn;
		},
		setup: function(){
			//	Set up the basics of this chart; leave the general update pattern to the update method.
			var self = this;

			//	Our axes
			var x = this.x = d3.time.scale().range([0, this.width]);
			var y = this.y = d3.scale.linear().range([this.height, 0]);
			this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
			this.yAxis = d3.svg.axis().scale(this.y).orient("right");
	//		this.yAxis = d3.svg.axis().scale(this.y).orient("left");

			//	Our series plots
			this.upperArea = d3.svg.area()
				.interpolate("basis")
				.x(function(d, i){ return x(d.date); })
				.y0(function(d, i){ return y(d.max); })
				.y1(function(d, i){ return y(self.max); });	//	figure out what number is supposed to be here
			this.upperLine = d3.svg.line()
				.interpolate("basis")
				.x(function(d, i){ return x(d.date); })
				.y(function(d, i){ return y(d.max); });

			this.lowerArea = d3.svg.area()
				.interpolate("basis")
				.x(function(d, i){ return x(d.date); })
				.y0(function(d, i){ return y(self.min); })
				.y1(function(d, i){ return y(d.min); });
			this.lowerLine = d3.svg.line()
				.interpolate("basis")
				.x(function(d, i){ return x(d.date); })
				.y(function(d, i){ return y(d.min); });

			this.zeroLine = d3.svg.line()
				.x(function(d, i){ return x(d.date); })
				.y(function(d, i){ return y(0); });

			this.maLine = d3.svg.line()
				.interpolate("cardinal")
				.x(function(d, i){ return x(d.date); })
				.y(function(d, i){ return y(d.mv); });

			this.actualLine = d3.svg.line()
				.interpolate("monotone")
				//	.tension(0.2)
				.x(function(d, i){ return x(d.date); })
				.y(function(d, i){ return y(d.value); });

			//	Voronoi for the actual line
			this.voronoi = d3.geom.voronoi()
				.x(function(d, i){ return x(d.date); })
				.y(function(d, i){ return y(d.value); })
				.clipExtent([[0, 0], [self.width, self.height]]);

			var svg = this.svgNode = d3.select(this.domNode).append("svg")
				.attr("width", "100%")
				.attr("height", "100%")
				.attr("viewBox", "0 0 " + (this.width) + " " + (this.height + this.margin.top + this.margin.bottom))
		//		.attr("viewBox", "0 0 " + (this.width + this.margin.left + this.margin.right) + " " + (this.height + this.margin.top + this.margin.bottom))
		//		.attr("preserveAspectRatio", "xMidyMid slice")
				.attr("id", this.id);
			var defs = this.defs = svg.append("defs").attr("class", "trk-trendschart__defs");
			var g = this.groupNode = svg.append("g")
				.attr("class", "trk-trendschart-plot")
		//		.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

			//	TRT: the following is taken from the vizualy alterations
			this.plotClipPath = defs.append("clipPath")
					.attr("id", this.id + "__plotClipPath")
				.append("rect");

			defs.append("filter")
					.attr("id", this.id + "__lineDropShadow")
					.attr("height", "130%")
				.append("feDropShadow")
					.attr("class", "trk-trendschart-defs__line-shadow")
					.attr("dx", "1")
					.attr("dy", "2")
					.attr("stdDeviation", "3")
					.attr("flood-color", "#000000")	//	TODO: override this color
					.attr("flood-opacity", ".6");

			defs.append("filter")
					.attr("id", this.id + "__rectDropShadow")
					.attr("height", "130%")
				.append("feDropShadow")
					.attr("class", "trk-trendschart-defs__rect-shadow")
					.attr("dx", "1")
					.attr("dy", "2")
					.attr("stdDeviation", "1.5")
					.attr("flood-color", "#000000")	//	TODO: override this color
					.attr("flood-opacity", ".2");

			defs.append("filter")
					.attr("id", this.id + "__TooltipDropShadow")
					.attr("height", "130%")
				.append("feDropShadow")
					.attr("dx", "1")
					.attr("dy", "2")
					.attr("stdDeviation", "1.5")
					.attr("flood-color", "#000000")
					.attr("flood-opacity", ".2");

			var upperGradient = this.gradientNodes.upper = defs.append("linearGradient")
				.attr("id", this.id + "__gradientUpper")
				.attr("x1", "0%")
				.attr("x2", "0%")
				.attr("y1", "100%")
				.attr("y2", "0%");
			upperGradient.append("stop")
				.attr("offset", "0%")
				.attr("stop-color", this.stopColors.upper)
				.attr("stop-opacity", "0.8");
			upperGradient.append("stop")
				.attr("offset", "90%")
				.attr("stop-color", this.stopColors.upper)
				.attr("stop-opacity", "0");

			var lowerGradient = this.gradientNodes.lower = defs.append("linearGradient")
				.attr("id", this.id + "__gradientLower")
				.attr("x1", "0%")
				.attr("x2", "0%")
				.attr("y1", "100%")
				.attr("y2", "0%");
			lowerGradient.append("stop")
				.attr("offset", "0%")
				.attr("stop-color", this.stopColors.lower)
				.attr("stop-opacity", "0");
			lowerGradient.append("stop")
				.attr("offset", "90%")
				.attr("stop-color", this.stopColors.lower)
				.attr("stop-opacity", "0.8");

			this.seriesNode = g.append("g").attr("class", "trk-trendschart-series");
			var gs = this.groups;
			this.groups.zero = this.seriesNode.append("g").attr("class", "trk-trendschart-series__zero");
			this.groups.upper = this.seriesNode.append("g").attr("class", "trk-trendschart-series__upper");
			this.groups.lower = this.seriesNode.append("g").attr("class", "trk-trendschart-series__lower");
			this.groups.ma = this.seriesNode.append("g").attr("class", "trk-trendschart-series__ma");
			this.groups.actual = this.seriesNode.append("g").attr("class", "trk-trendschart-series__actual");
			this.groups.hitAreas = this.seriesNode.append("g").attr("class", "trk-trendschart-series__hitAreas");

			this.xAxisNode = g.append("g")
				.attr("class", "trk-trendschart-x__axis")
				.attr("transform", "translate(0, " + this.height + ")");
			this.yAxisNode = g.append("g")
				.attr("class", "trk-trendschart-y__axis")
				.attr("transform", "translate(" + this.margin.left + ", 0)");
	//			.attr("transform", "translate(" + this.width + ", 0)");

			this.isSetup = true;
		},
		update: function(data){
			//	the main rendering function.  Any changes to a property should
			//	call this function when completed.
			//	NB: Data submitted should already be pre-calcuated and take the following form:
			//	{ date, min, max, ma, value }
			if(!this.isSetup) this.setup();

			var self = this;
			data = data || self.data;
			if(!data.length){
				console.warn("We must have data before updating chart " + self.id);
				return;
			}

			//	Set up our domains
			this.min = d3.min(data, function(d){ return d.min; });			//	lower SD band
			this.max = d3.max(data, function(d){ return Math.max(d.max, (d.value * 1.25)); });			//	higher SD band

			this.x.domain(d3.extent(data, function(d){ return d.date; }));
			this.y.domain([self.min, self.max]);

			var g = this.groupNode;

			//	update our axes
			this.xAxisNode.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.call(self.xAxis);
			this.yAxisNode.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.call(self.yAxis);

			//	do our plotting. This consists of 5 basic elements (order is important in the rendering stack):
			//	1. Zero line (for reference)
			//	2. Upper Bollinger Band
			//	3. Lower Bollinger Band
			//	4. Moving average line
			//	5. Actual data
			var zero = this.groups.zero.selectAll("path.trk-trendschart-series__zero-line").data([data]);
			zero.enter().append("path")
				.attr("class", "trk-trendschart-series__zero-line");
			zero.exit().remove();
			zero.attr("d", function(d, i){ return self.zeroLine(d); });

			var upper = this.groups.upper.selectAll(".trk-trendschart-series__upper-band").data([data]);
			upper.enter()
				.append("path")
				.attr("class", "trk-trendschart-series__upper-band")
				.style("fill", "url(#" + this.id + "__gradientUpper)");
			upper.exit().remove();
			upper.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.upperArea(d); });

			var upperLine = this.groups.upper.selectAll(".trk-trendschart-series__upper-line").data([data]);
			upperLine.enter()
				.append("path")
				.attr("class", "trk-trendschart-series__upper-line")
				.attr("filter", "url(#" + self.id + "__lineDropShadow)");
			upperLine.exit().remove();
			upperLine.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.upperLine(d); });

			var lower = this.groups.lower.selectAll(".trk-trendschart-series__lower-band").data([data]);
			lower.enter()
				.append("path")
				.attr("class", "trk-trendschart-series__lower-band")
				.style("fill", "url(#" + this.id + "__gradientLower)");
			lower.exit().remove();
			lower.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.lowerArea(d); });

			var lowerLine = this.groups.lower.selectAll(".trk-trendschart-series__lower-line").data([data]);
			lowerLine.enter()
				.append("path")
				.attr("class", "trk-trendschart-series__lower-line")
				.attr("filter", "url(#" + self.id + "__lineDropShadow)");
			lowerLine.exit().remove();
			lowerLine.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.lowerLine(d); });

			var ma = this.groups.ma.selectAll(".trk-trendschart-series__moving-average").data([data]);
			ma.enter().append("path").attr("class", "trk-trendschart-series__moving-average");
			ma.exit().remove();
			ma.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.maLine(d); });

			var actual = this.groups.actual.selectAll(".trk-trendschart-series__actual").data([data]);
			actual.enter().append("path")
				.attr("class", "trk-trendschart-series__actual")
				.attr("filter", "url(#" + self.id + "__lineDropShadow)");
			actual.exit().remove();
			actual.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("d", function(d, i){ return self.actualLine(d); });

			//	markers
			var markerRadius = 4, alertMarkerRadius = 5, now = new Date();
			var markers = this.groups.actual.selectAll(".trk-trendschart-series__markers").data(data);
			markers.exit().transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
				.attr("fill-opacity", 0.1)
				.attr("cy", self.y(0))
				.remove();

			markers.transition()
				.duration(self.transition.duration)
				.ease(self.transition.ease)
					.attr("id", function(d, i){ return self.id + "__clip-marker-" + format(d.date); })
					.attr("class", function(d, i){
						var s = "trk-trendschart-series__markers";
						if(d.date.valueOf() <= now.valueOf() && d.value >= d.max) s += " trk-trendschart-series__markers-alert";
						return s;
					})
					.attr("r", function(d, i){ return (d.date.valueOf() <= now.valueOf() && d.value >= d.max) ? alertMarkerRadius : markerRadius; })
					.attr("cx", function(d, i){ return self.x(d.date); })
					.attr("cy", function(d, i){ return self.y(d.value); });

			markers.enter().append("circle")
					.attr("class", function(d, i){
						var s = "trk-trendschart-series__markers";
						if(d.date.valueOf() <= now.valueOf() && d.value >= d.max) s += " trk-trendschart-series__markers-alert";
						return s;
					})
					.attr("id", function(d, i){ return self.id + "__clip-marker-" + format(d.date); })
					.attr("r", function(d, i){ return (d.date.valueOf() <= now.valueOf() && d.value >= d.max) ? alertMarkerRadius : markerRadius; })
				.transition()
					.duration(self.transition.duration)
					.ease(self.transition.ease)
					.attr("cx", function(d, i){ return self.x(d.date); })
					.attr("cy", function(d, i){ return self.y(d.value); });

			/*
			//	uncomment this code if you want to see the mouseover boundaries
			var testV = this.seriesNode.selectAll(".voronoi")
				.data(self.voronoi(data));
			testV.enter().append("path")
				.attr("class", "voronoi");
			testV.exit().remove();
			testV.transition()
					.duration(self.transition.duration)
					.ease(self.transition.ease)
				.attr("d", function(d){ return d ? "M" + d.join("L") + "Z" : null; });
		 	*/

			//	finally, the voronoi
			var vd = self.voronoi(data), maxDistanceFromPoint = 20;
			var clips = self.defs.selectAll(".clip")
				.data(vd);
			clips.exit().remove();
			clips.selectAll("path.clip-path-circle").remove();
			clips.attr("id", function(d){ return self.id + "__clip-" + format(d.point.date); });
			clips.enter().append("clipPath")
				.attr("class", "clip")
				.attr("id", function(d){ return self.id + "__clip-" + format(d.point.date); });
			var path = clips.append("path")
				.attr("class", "clip-path-circle");
			path.transition()
					.duration(self.transition.duration)
					.ease(self.transition.ease)
				.attr("d", function(d){ return d ? "M" + d.join("L") + "Z" : null; });

			var hitAreas = this.groups.hitAreas.selectAll(".trk-trendschart__hit-areas")
				.data(data);
			hitAreas.exit().remove();
			hitAreas.enter().append("circle")
				.attr("class", "trk-trendschart__hit-areas")
				.attr("clip-path", function(d){ return "url(#" + self.id + "__clip-" + format(d.date) + ")"; })
				.style("clip-path", function(d){ return "url(#" + self.id + "__clip-" + format(d.date) + ")"; })
				.attr("r", maxDistanceFromPoint);
			hitAreas.transition()
					.duration(self.transition.duration)
					.ease(self.transition.ease)
				.attr("cx", function(d, i){ return self.x(d.date); })
				.attr("cy", function(d, i){ return self.y(d.value); });

			var radiusFactor = 1.25, radiusDuration = 300;

			hitAreas.on("mouseover", function(data, i){
				//	use data.point if working direct of a voronoi path set
				var d = data,
					hitPoint = d3.select(this),
					x = self.x(d.date),
					y = self.y(d.value),
					svg = self.svgNode;

				var width = 132,
					height = 56;

				//	helper to deal with tooltips going off the sides of the chart
				function getXPos(x){
					var pos = x - (width/2);
					// console.log(pos, width, self.width);
					if(pos <= 0) return 2;
					if((pos+width) >= self.width){
						return (self.width - width) - 2;
					}
					return pos;
				}

				//	Get a handle on the marker this represents
				var marker = self.groups.actual.select("#" + self.id + "__clip-marker-" + format(d.date));
				var cls = marker.classed("trk-trendschart-series__markers-alert"), radius = markerRadius;
				if(cls){ radius = alertMarkerRadius; }
				marker.transition()
					.duration(radiusDuration)
					.ease(self.transition.ease)
					.attr("r", radius*radiusFactor);

				//	TODO: use this with a translate transform and do the rest as relative positioning
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
						y: function() { return y - (height+6); }
					});

				var tt = g.append("text").attr({
					id: "tt" + x + "-" + y + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
					x: function() { return getXPos(x) + width/2; },
					y: function() { return y - (height/2) - 12; }
				})
				.attr('font-size', "14")
				.attr("fill", "#fff")
				.attr('fill-opacity', ".54")
				.attr('text-anchor', "middle")
				.attr("class", "dateHour tooltipText")
				.style("pointer-events", "none")
				.text(function(){
					return d3.time.format("%a, %b %-d, %Y")(d.date);
				});

				var tc = g.append("text").attr({
					id: "tc" + x + "-" + y + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
					x: function() { return getXPos(x) + width/2; },
					y: function() { return y - (height/2) + 10; }
				})
				.attr('font-size', "18")
				.attr("fill", "#fff")
				.attr('text-anchor', "middle")
				.attr("class", "calls tooltipText")
				.style("pointer-events", "none")
				.text(function(){
					if(d.value == 1) {
						return d3.format(",")(+d.value) + " Call";
					} else {
						return d3.format(",")(+d.value) + " Calls";
					}
				});

				//	set up the specific mouseout handler
				hitPoint.on("mouseout", function(d, i){
					//	Get a handle on the marker this represents
					var cls = marker.classed("trk-trendschart-series__markers-alert"), radius = markerRadius;
					if(cls){ radius = alertMarkerRadius; }
					marker.transition()
						.duration(radiusDuration)
						.ease(self.transition.ease)
						.attr("r", radius);

					//	remove the tooltip itself
					g.transition()
							.duration(radiusDuration)
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
		},
		resize: function(){
			//	attach to the window.resize event; re-measures the domNode and updates.
			return this.update();
		}
	});
});
