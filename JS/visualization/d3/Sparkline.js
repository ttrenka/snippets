define(
	["dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-style"],
	function(declare, lang, listen, topic, style){
	/*  Sparkline
	 	Tom Trenka/Adam Schmid
		v.0.9.0
		20170905

		Constructor to create reusable sparklines.
	*/

	var idCount = 1,
		updateTopic = "Sparkline/update",
		setDataTopic = "Sparkline/setData",
		resizeTopic = "Sparkline/resize";

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
			this._id = "trk-sparkline-" + idCount++;
			this.id = ("id" in params) ? params.id : this._id;
			this.domNode = node;
			this.valueField = params.valueField;

			//	optional params
			this.data = ("data" in params) ? params.data : [];
			this.stroke = ("stroke" in params) ? params.stroke : this.stroke;
			this.strokeWidth = ("strokeWidth" in params) ? params.strokeWidth : this.strokeWidth;
			this.fill = ("fill" in params) ? params.fill : this.fill;

			//	optional chart params
			if("chart" in params){
				for(var p in params.chart){ this[p] = params.chart[p]; }
			}

			//	measurements
			if("width" in params){
				this.width = params.width;
				this.height = ("height" in params) && params.height;
			} else {
				this.width = style.get(this.domNode, "width");
				this.height = style.get(this.domNode, "height");
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
			//	the main rendering function. Any changes to a property should
			//	call this function when completed.
			var self = this;
			data = data || self.data;
			if(!data.length){
				throw new Error("We must have data before updating Sparkline " + self.id);
			}

			var min = d3.min(data, function(d){ return parseFloat(d[self.valueField], 10); });
			var max = d3.max(data, function(d){ return parseFloat(d[self.valueField], 10); });
			var x = d3.scale.linear().domain([0, data.length]).range([0, self.width]);
			var y = d3.scale.linear().domain([min, max]).range([self.height-2, 0]);

			var svg = self.svgNode;
			if(!self.svgNode){
				svg = self.svgNode = d3.select(self.domNode)
					.append("svg")
					.attr("id", self.id)
					.attr("width", self.width)
					.attr("height", self.height);
			} else {
				svg.selectAll("#" + self.id + " g").remove();
			}

			//	deal with our data before doing the line itself. This is a straight up array.
			var chartData = self.chartData = data.map(function(item){
				return parseFloat(item[self.valueField], 10);
			});

			var line = d3.svg.line()
				.x(function(d, i){ return x(i); })
				.y(function(d){ return y(d); });
			svg.append("g")
				.append("path")
				.attr("class", "trk-sparkline-path")
				.attr("stroke", self.stroke)
				.attr("stroke-width", self.strokeWidth)
				.attr("fill", self.fill)
				.attr("d", line(chartData));

			//	finally, fire off events and topics
			//	self.emit("update", data);
			topic.publish(updateTopic, {
				id: self.id,
				node: self.domNode,
				data: self.data
			});
		},
		resize: function(){
			//	attach to the window.resize event; re-measures the domNode and updates.

			return this.update();
		}
	});
});
