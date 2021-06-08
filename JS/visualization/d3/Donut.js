define(
	["dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-style"],
	function(declare, lang, listen, topic, style){
	/*	Donut
		Tom Trenka/Adam Schmid
		v0.9.0
		20170915

		Constructor to create reusable Donut charts.
	*/
	var idCount = 1,
		updateTopic = "Donut/update",
		setDataTopic = "Donut/setData",
		resizeTopic = "Donut/resize";

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
			formatter: function OPTIONAL
		}
	*/
	function pathAnim(path, radius, dir){
		switch(dir){
			case 0:
				path.transition()
					.duration(500)
					.ease('quadOut')
					.duration(200)
					.attr('d', d3.svg.arc()
						.innerRadius(radius * 0.82)
						.outerRadius(radius)

					);
				break;
			case 1:
				path.transition()
					.attr('d', d3.svg.arc()
						.innerRadius(radius * 0.78)
						.outerRadius(radius + 6)

					);
				break;
		}
	}

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
		labelField: "",
		valueField: "",
		formatter: function(val){ return d3.format(",")(val); },
		defaultFormatter: function(val){ return d3.format(",")(val); },

		constructor: function(params, node){
			this._id = "trk-donut-" + idCount++;
			this.id = ("id" in params) ? params.id : this._id;
			this.domNode = node;
			this.labelField = params.labelField;
			this.valueField = params.valueField;
			this.formatter = params.formatter || this.defaultFormatter;

			//	optional params
			this.data = ("data" in params) ? params.data : [];
			// AMS 2017-2-16 Now being set in SCSS
			//this.colors = ("colors" in params) ? params.colors : ["#5a099b", "#7714b1", "#881bbd", "#A454CC", "#c58edf", "#dcbbec"];
			this.cssPrefix = params.segmentPrefix || this.cssPrefix;

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
			this.radius = (Math.min(this.width, this.height)/2) - 16;

			/*
			if(this.data.length){
				//	we were passed data with the constructor, update ourselves.
				this.update();
			}
			*/
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
		update: function(data){
			//	the main rendering function.  Any changes to a property should
			//	call this function when completed.
			var self = this;
			data = data || self.data;
			if(!data.length){
				console.warn("We must have data before updating chart " + self.id);
				return;
			}

			/*
			var color = d3.scale.ordinal()
				.range(self.colors);
			*/

			var arc = d3.svg.arc()
				.outerRadius(self.radius)
				.innerRadius(self.radius * 0.82);
					// .startAngle(function(d) { return d.startAngle + Math.PI; })
					// .endAngle(function(d) { return d.endAngle + Math.PI; });

			var pie = d3.layout.pie()
				.padAngle(0)
				.value(function(d){ return d.value; })
				.sort(null);

			//	create the map
			self.chartData = data.map(function(item){
				return {
					label: item[self.labelField],
					value: +item[self.valueField]
				};
			});

			var svg = self.svgNode,
				isCreated = true,
				isClicked = false,
				prevLabel = data.total[self.labelField],
				prevValue = self.formatter(data.total[self.valueField]);
			if(!self.svgNode){
				isCreated = false;	//	we just want to know if this was the first time or not.
				svg = self.svgNode = d3.select(self.domNode).append("svg")
						.attr("width", "100%")
						.attr("height", "100%")
						.attr("viewBox", "0 0 " + self.width + " " + self.height)
				//		.attr("preserveAspectRatio", "xMidyMid slice")
						.attr("id", self.id)
					.append("g")
						.attr("class", "trk-donut-slices")
						.attr("transform", "translate(" + self.width / 2 + "," + self.height / 2 + ")")
			} else {
				svg.selectAll("#" + self.id + " text").remove();
				svg.selectAll("#" + self.id + " path").remove();
			}

			svg.append("text")
				.attr("class", "trk-donut-label")
				.attr("y", self.radius * - 0.06)
				.attr("text-anchor", "middle")
				.text(data.total.label);

			svg.append("text")
				.attr("class", "trk-donut-value")
				.attr("y", self.radius * 0.2)
				.attr("text-anchor", "middle")
				.text(self.formatter(+data.total.value));

			var tmp = svg.selectAll("path")
				.data(pie(self.chartData))
				.enter()
			.append("path")
				.attr("class", function(d, i){
					var s = "trk-donut-slice";
					if(self.cssPrefix.length) s += " " + self.cssPrefix + i;
					return s;
				})
				.attr("title", function(d){ return d.data.label + ": " + self.formatter(d.data.value); })
				.attr("d", arc)
				.on("mouseover", function(d, i, j){
					//	console.log("Donut slice: ", this, d, i, j);
					pathAnim(d3.select(this), self.radius, 1);
					d3.select("#" + self.id + " .trk-donut-label").text(d.data.label);
					d3.select("#" + self.id + " .trk-donut-value").text(self.formatter(d.value));
				})
				.on("mouseout", function(d, i, j){
					var path = d3.select(this);
					if(!path.classed("clicked")){
						pathAnim(path, self.radius, 0);
						d3.select("#" + self.id + " .trk-donut-label").text(prevLabel);
						d3.select("#" + self.id + " .trk-donut-value").text(prevValue);
					}
				})
				// AMS 2017-2-16 removed click event. becomes confusing if accidental clicks occur.
				.on("click", function(d, i, j){
				 	var path = d3.select(this), _self = this;
				 	svg.selectAll("path.clicked").each(function(_d, _i){
				 		//	console.log((self == this), self, this);
				 		if(_self != this){
				 			var tmp = d3.select(this);
				 			tmp.classed("clicked", false);
				 			pathAnim(tmp, self.radius, 0);
				 		}
				 	});
				 	var clicked = path.classed('clicked');
				 	pathAnim(path, self.radius, ~~(!clicked));
				 	path.classed('clicked', !clicked);
					if(!clicked){
						prevLabel = d.data.label;
						prevValue = self.formatter(d.data.value);
					} else {
						prevLabel = data.total[self.labelField];
						prevValue = self.formatter(data.total[self.valueField]);
					}
				});
			if(tmp.exit){
				tmp.exit().remove();
			}
		},
		resize: function(){
			//	attach to the window.resize event; re-measures the domNode and updates.
			return this.update();
		}
	});
});
