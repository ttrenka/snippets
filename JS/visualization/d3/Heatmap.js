define(
	["dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-style"],
	function(declare, lang, listen, topic, style){

	var idCount = 1,
		updateTopic = "Heatmap/update",
		setDataTopic = "Heatmap/setData",
		resizeTopic = "Heatmap/resize";

	return declare([], {
		_id: null,
		id: null,
		data: [],
		chartData: [],
		domNode: null,
		svgNode: null,
		stroke: "hsl(177, 57%, 58%)",
		strokeWidth: "0.66px",
		fill: "none",
		width: 0,
		height: 0,
		valueField: "",

		constructor: function(params, node){
			this._id = "trk-heatmap-" + idCount++;
			this.id = ("id" in params) ? params.id : this._id;
			this.domNode = node;
			this.valueField = params.valueField;

			this.data = ("data" in params) ? params.data : [];
			this.svgNode = null;
			this.chartData = [];

			//	measurements
			if("width" in params){
				this.width = params.width;
				this.height = ("height" in params) ? params.height : (Math.floor((this.width*6)/16.5));
			} else {
				this.width = style.get(this.domNode, "width");
				this.height = Math.floor((this.width*6)/16.5);
			}
			if(this.data.length){
				//	we were passed data with the constructor, update ourselves.
				this.update();
			}
		},
		getData: function(){
			return this.data;
		},
		setData: function(data){
			this.data = data;
			this.update(data);
		},



		update: function(data){
			var self = this;
			var margin = { top: 20, right: 8, bottom: 20, left: 24 },
				width = this.width - margin.left - margin.right,
				height = this.height - margin.top - margin.bottom,
				gridSize = Math.floor(width / 25),
				padding = 4,
				legendElementWidth = gridSize * 3,
				buckets = 5,
				colors = ["#D4F6FF","#8AD3E6","#49B0C9","#1F7B94","#034561"],
				days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
				daysTotals = [],
				longDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
				times = ["12a", "1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p"],
				datasets = this.data; // remove this

			// Make a nested structure with all totals, sorted by the day of week.
			var daysTotalsNest = d3.nest()
				.key(function(d){ return d.dow - 1; })
				.rollup(function(leaves){
					return {
						numCalls: d3.sum(leaves, function(d){ return +d.numCalls; })
					}
				})
				.entries(data);

			var totalVar = 0;
			// Push those totals into an array to be used by the DOW totals labels.
			daysTotalsNest.map(function(item) {
				daysTotals.push(d3.format(",")(item.values.numCalls));
				totalVar += item.values.numCalls;
			});
			var totalVarArray = [d3.format(",")(totalVar)];
			var svg = this.svgNode, g;
			if(!self.svgNode){
				svg = self.svgNode = d3.select(self.domNode)
					.append("svg")
					.attr("id", self.id)
					.attr("viewBox", "0 0 " + (+self.width) + " " + (+self.height));
				svg.append("defs")
					.append("filter")
					.attr("id", "heatRectDropShadow")
					.attr("height", "130%")
					.append("feDropShadow")
						.attr("dx", "1")
						.attr("dy", "2")
						.attr("stdDeviation", "1.5")
						.attr("flood-color", "#000000")
						.attr("flood-opacity", ".2");
				g = svg.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
			} else {
				svg.selectAll("#" + self.id + " g").remove();
				g = svg.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
			}

			var dayLabels = g.selectAll(".dayLabel")
				.data(days)
				.enter().append("text")
					.text(function (d) { return d; })
					.attr("x", 0)
					.attr("y", function (d, i) { return (i * gridSize) + (padding/2); })
					.style("text-anchor", "end")
					.style("font-size", "10px")
					.attr("transform", "translate(-6," + gridSize / 1.5 + ")")
					.attr("class", function (d, i) { return ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis"); });

			var dayTotalsLabels = g.selectAll(".dayTotalsLabel")
				.data(daysTotals)
				.enter().append("text")
					.text(function (d) { return d; })
					.attr("x", width)
					.attr("y", function (d, i) { return (i * gridSize) + (padding/2); })
					.style("text-anchor", "end")
					.style("font-size", "10px")
					.attr("transform", "translate(0," + gridSize / 1.5 + ")")
					.attr("class", function (d, i) { return ((i >= 0 && i <= 4) ? "dayTotalsLabel mono axis axis-workweek" : "dayTotalsLabel mono axis"); });
			
			var totals = g.selectAll(".total")
				.data(totalVarArray)
				.enter().append("text")
					.html(function (d) { return "TOTAL CALLS <tspan x=" + (width + 1) + ">" + d + "</tspan>"; })
					//.text(function (d) { return "TOTAL CALLS \u00A0\u00A0" + d; })
					.attr("x", width - 20)
					.attr("y", height)
					.style("text-anchor", "end")
					.style("font-size", "10px")
					.attr("fill", "#fff")
					.attr("transform", "translate(0," + gridSize / 2 + ")")
					.attr("class", "total mono axis");

			var timeLabels = g.selectAll(".timeLabel")
				.data(times)
				.enter().append("text")
					.text(function(d) { return d; })
					.attr("x", function(d, i) { return (i * gridSize) + (padding/2); })
					.attr("y", 0)
					.style("text-anchor", "middle")
					.style("font-size", "10px")
					.attr("fill", "#fff")
					.attr("transform", "translate(" + gridSize / 2 + ", -6)")
					.attr("class", function(d, i) { return ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis"); });
			this.chartData = this.data.map(function(item) {
				return {
					dow: +item.dow,
					hour: +item.hour,
					numCalls: +item.numCalls
				}
			});
			var heatmapChart = function(data) {
				var colorScale = d3.scale.quantile()
					.domain([0, buckets - 1, d3.max(data, function(d){ return d.numCalls; })])
					.range(colors);

				var cards = g.selectAll(".hour")
					.data(data, function(d){return d.dow+':'+d.hour;});
				// cards.append("title");

				cards.enter().append("rect")
					.attr("x", function(d) { return ((d.hour /*- 1*/) * gridSize) + padding; }) //check var
					.attr("y", function(d) { return ((d.dow - 1) * gridSize) + padding; }) //check var
					.attr("rx", 2)
					.attr("ry", 2)
					.attr("class", "hour")
					.attr("width", gridSize - padding)
					.attr("height", gridSize - padding)
					.style("fill", colors[0])
					.on("mouseover", handleMouseOver)
            	.on("mouseout", handleMouseOut);

				cards.transition().duration(1000)
					.style("fill", function(d) { return colorScale(d.numCalls); }); //check var

				cards.select("title").text(function(d) { return d.numCalls; }); //check var
				cards.exit().remove();

				function handleMouseOver(d, i) {  // Add interactivity
					// Use D3 to select element, change color and size
					//var g = d3.select(this);
					var tooltipXVal = this.x.baseVal.value,
					tooltipYVal = this.y.baseVal.value;

					var r = svg.insert("rect")
						.attr("class", "toolTipRect")
						.attr("fill", "#20263c")
						.attr("filter", "url(#heatRectDropShadow)")
						.attr("width", "68px")
						.attr("height", "26px")
						.attr("rx", 1)
						.attr("ry", 1)
						.attr({
						id: "r" + tooltipXVal + "-" + tooltipYVal + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
						x: function() { return tooltipXVal - 2; },
						y: function() { return tooltipYVal - 4; }
					});

					var tt = svg.append("text").attr({
						id: "tt" + tooltipXVal + "-" + tooltipYVal + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
						x: function() { return tooltipXVal + 32; },
						y: function() { return tooltipYVal + 6; }
					})
					.attr('font-size', "5.5")
					.attr("fill", "#fff")
					.attr('fill-opacity', ".7")
					.attr('text-anchor', "middle")
					.attr("class", "dateHour tooltipText")
					.text(function(){
						return longDays[+d.dow-1] + " " + times[+d.hour] + "m - " + times[(+d.hour+1)%times.length] + "m ";
					});

					var tc = svg.append("text").attr({
						id: "tc" + tooltipXVal + "-" + tooltipYVal + "-" + i,  // Create an id for text so we can select it later for removing on mouseout
						x: function() { return tooltipXVal + 32; },
						y: function() { return tooltipYVal + 17; }
					})
					.attr('font-size', "8")
					.attr("fill", "#fff")
					.attr('text-anchor', "middle")
					.attr("class", "calls tooltipText")
					.text(function(){
						if(d.numCalls == 1) {
							return d3.format(",")(+d.numCalls) + " Call";
						}
						else {
							return d3.format(",")(+d.numCalls) + " Calls";
						}
					});
				}

				function handleMouseOut(d, i){
					var tooltipXVal = this.x.baseVal.value,
					tooltipYVal = this.y.baseVal.value;

					// Select text by id and then remove
					d3.selectAll(".tooltipText").remove();
					d3.selectAll(".toolTipRect").remove();

					// d3.select("#r" + tooltipXVal + "-" + tooltipYVal + "-" + i).remove();
				}
			};

			heatmapChart(this.chartData);

			if(!data.length){
				throw new Error("We must have data before updating HeatMap " + self.id);
			}

			topic.publish(updateTopic, {
				id: self.id,
				node: self.domNode,
				data: self.data
			});
		},




		resize: function(){
			console.log("HM: resize");
			/*
			//	attach to the window.resize event; re-measures the domNode and updates.

			return this.update();
			*/
		}
	});
});
