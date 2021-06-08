define(
	["dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-style"],
	function(declare, lang, listen, topic, style){
	/*	Streamgraph
		Tom Trenka/Adam Schmid
		v0.9.0
		20180302

		Constructor to create reusable Donut charts.
	*/
	var idCount = 1,
		updateTopic = "Streamgraph/update",
		setDataTopic = "Streamgraph/setData";

	/*
		params object for the constructor/update functions:
		{
			id: string, OPTIONAL
			?color: string, OPTIONAL
			width: int, OPTIONAL
			height: int, OPTIONAL
			data: Array<Object>, OPTIONAL
			labelField: string REQUIRED,
			valueField: string REQUIRED,
		}
	*/

	//	Constructor definition
	return declare([], {
		_id: null,
		id: null,
		data: [],
		chartData: [],
		domNode: null,
		svgNode: null,
		width: 0,
		height: 0,
		radius: 0,
		colors: [],
		cssPrefix: "",
		seriesField: "",
		formatterField: "",
		labelField: "",
		valueField: "",

		constructor: function(params, node){
			this._id = "trk-streamgraph-" + idCount++;
			this.id = ("id" in params) ? params.id : this._id;
			this.domNode = node;
			this.seriesField = params.seriesField;
			this.formatterField = params.formatterField;
			this.labelField = params.labelField;
			this.valueField = params.valueField;

			//	optional params
			this.data = ("data" in params) ? params.data : [];
			this.cssPrefix = params.segmentPrefix || this.cssPrefix;
			this.colors = ("colors" in params) ? params.colors: [];

			this.chartData = [];
			this.svgNode = null;

			//	measurements
			if("width" in params){
				this.width = params.width;
				this.height = ("height" in params) ? params.height : (this.width - 48);
			} else {
				this.width = style.get(this.domNode, "width");
				this.height = this.width - 48;
			}
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
		update: function(data){
			//	the main rendering function.  Any changes to a property should
			//	call this function when completed.
			var self = this;
			data = data || self.data;
			if(!data.length){
				console.warn("We must have data before updating chart " + self.id);
				return;
			}

			self.chartData = [];
			var ymin = Number.POSTIVE_INFINITY, 
				ymax = Number.NEGATIVE_INFINITY, 
				isDate = (typeof(data[0][0]) == "object" && "getDate" in data[0][0]);
			for(var i=0, l=data.length; i<l; i++){
				self.chartData.push(data[i].map(function(item){
					ymin = Math.min(ymin, parseFloat(item[self.valueField], 10));
					ymax = Math.max(ymax, parseFloat(item[self.valueField], 10));
					return {
						series: item[self.seriesField],
						formatter: item[self.formatterField],
						label: item[self.labelField],
						value: parseFloat(item[self.valueField], 10)
					};
				});
			}

			var svg = self.svgNode,
				stack = d3.layout.stack().offset("wiggle"),
				x = d3.scale.linear().domain([0, self.data.length]).range([0, self.width]),
				y = d3.scale.linear().domain([ymin, ymax]).range([self.height-2, 0]),
				area = d3.area()
					.x(function(d){ return x(d.label); })
					.y0(function(d){ return y(d.y0); })
					.y1(function(d){ return y(d.y0 + d.value); });

			if(!self.svgNode){
				svg = self.svgNode = d3.select(self.domNode).append("svg")
					.attr("id", self.id)
					.attr("width", "100%")
					.attr("height", "100%")
					.attr("viewBox", "0 0 " + self.width + " " + self.height)
					.attr("preserveAspectRatio", "xMidYMid slice")
					.attr("id", self.id)

				var path = svg.selectAll("path")
					.data(self.chartData)
					.enter()
					.append("path")
						.attr("class", function(d, i){
							return "trk-streamgraph-path trk-streamgraph-path-" + i;
						})
						.attr("d", area)
						.on("mouseover", function(d, i, j){
							console.log(d, i, j);
						})
						.on("mouseout", function(d, i, j){
							console.log(d, i, j);
						});
					if(self.colors.length){
						var color = d3.scale.linear().range(self.colors);
						path.attr("fill", function(d, i){ return color(i); });
					}
			} else {
				d3.selectAll("path")
					.data(self.chartData)
					.transition()
						.duration(1500)
						.attr("d", area);
			}

			/*
				.on("mouseover", function(d, i, j){
					//	console.log("Donut slice: ", this, d, i, j);
					pathAnim(d3.select(this), self.radius, 1);
					d3.select("#" + self.id + " .trk-donut-label").text(d.data.label);
					d3.select("#" + self.id + " .trk-donut-value").text(d3.format(",")(d.value));
				})
				.on("mouseout", function(d, i, j){
					var path = d3.select(this);
					if(!path.classed("clicked")){
						pathAnim(path, self.radius, 0);
						d3.select("#" + self.id + " .trk-donut-label").text(prevLabel);
						d3.select("#" + self.id + " .trk-donut-value").text(prevValue);
					}
				})
			*/
		}
	});
});
