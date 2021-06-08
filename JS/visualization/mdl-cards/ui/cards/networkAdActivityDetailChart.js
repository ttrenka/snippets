define(["dojo/_base/declare", "dojo/_base/lang", "app/xhr-queue", "app/ui/Card", "app/util", "dojo/_base/xhr", "dojo/query", "put-selector/put", "dojo/on", "dojo/topic",
	"app/ui/charts/DualAxisLineArea", "app/ui/charts/themes/dualaxislinearea/blue", "app/ui/menus/Downloader", "app/ui/menus/info", "app/ui/menus/MetricDropdown", "dojo/domReady!"],
function(declare, lang, Queue, Card, util, xhr, query, put, listen, topic, LineArea, theme, Downloader, Info, MetricDropdown){
	var TOPIC_LOADDATABEGIN = "networkAdActivity/loadDataBegin",
		TOPIC_LOADDATACOMPLETE = "networkAdActivity/loadDataComplete",
		TOPIC_CHANGEFILTER = "/changeFilter",
		TOPIC_QUEUECOMPLETE = "xhr-queue/complete",
		id_counter = 0,
		defaultMetric = "spend",
		structure = [
			{ field: "programId", label: "Program ID", hidden: false },
			{ field: "programName", label: "Program", hidden: false },
			{ field: "networkName", label: "Network", hidden: false },
			{ field: "campaignName", label: "Campaign", sortable: true, hidden: false },
			{ field: "networkAdGroupName", label: "Ad Group", hidden: false },
			{ field: "networkAdName", label: "Ad Name", hidden: false },
			{ field: "adVariation", label: "Type", hidden: false },
			{ field: "headline", label: "Headline", hidden: false },
			{ field: "destinationURL", label: "Destination URL", hidden: false },
			{ field: "displayURL", label: "Display URL", hidden: false },
			{ field: "imageURL", label: "Image URL", hidden: false },
			{ field: "descriptionLine1", label: "Description Line 1", hidden: false },
			{ field: "descriptionLine2", label: "Description Line 2", hidden: false },
			{ field: "phoneNumber", label: "Phone", hidden: false },
			{ field: "adPosition", label: "Ad Position", hidden: false },
			{ field: "spend", label: "Network Spend", formatter: function(val){ return d3.format(".2f")(val); }, hidden: false },
			{ field: "webLeads", label: "Web Leads", hidden: false },
			{ field: "phoneLeads", label: "Phone Leads", hidden: false },
			{ field: "touches", label: "Touches", hidden: false },
			{ field: "impressions", label: "Impressions", hidden: false },
			{ field: "clicks", label: "Clicks", hidden: false },
			{ field: "views", label: "Page Views", hidden: false },
			{ field: "ctr", label: "CTR", formatter: function(val){ return d3.format(".2f")(val); }, hidden: false },
			{ field: "avgCpc", label: "Avg CPC", formatter: function(val){ return d3.format(",.2f")(val); }, hidden: false },
			{ field: "quantity", label: "Quantity", hidden: false },
			{ field: "amt", label: "Revenue", formatter: function(val){ return d3.format(".2f")(val); }, hidden: false }
		];

	var chart_formatters = {
		"amt": function(d){ return d3.format("$,.2f")(d); },
		"avgCpc": function(d){ return d3.format("$,.2f")(d); },
		"ctr": function(d){ return d3.format(".2p")(d); },
		"spend": function(d){ return d3.format("$,.2f")(d); },
		"webLeads": function(d){ return d3.format(",")(d); },
		"phoneLeads": function(d){ return d3.format(",")(d); },
		"touches": function(d){ return d3.format(",")(d); },
		"impressions": function(d){ return d3.format(",")(d); },
		"clicks": function(d){ return d3.format(",")(d); }
	};
	var tip_formatters = {
		"amt": function(d){ return "Revenue " + d3.format("$,.2f")(d); },
		"avgCpc": function(d){ return "Avg CPC " + d3.format("$,.2f")(d); },
		"ctr": function(d){ return "CTR " + d3.format(".2p")(d); },
		"spend": function(d){ return "Spend " + d3.format("$,.2f")(d); },		//	double-check this number, something is off
		"webLeads": function(d){ return "Web Leads " + d3.format(",")(d); },
		"phoneLeads": function(d){ return "Phone Leads " + d3.format(",")(d); },
		"touches": function(d){ return "Touches " + d3.format(",")(d); },
		"impressions": function(d){ return "Impressions " + d3.format(",")(d); },
		"clicks": function(d){ return "Clicks " + d3.format(",")(d); }
	};
	//	Date parse and format function references
	var parse = d3.time.format("%Y-%m-%d").parse,
		format = d3.time.format("%Y-%m-%d");

	function processData(data){
		var metrics = this.metrics.get();
		var valueField = metrics.field, compareField, isCompare = false;
		//var valueField = metrics.field, isComp;
		if(metrics.compare_field){
			compareField = metrics.compare_field;
			isCompare = true;
		}

		var template = {
			date: null,
			value: 0
		};
		var bins = util.dateBins(template);
		data.forEach(function(item){
			var test = d3.time.format("%Y-%m-%d")(item.date);
			if(test in bins){
				bins[test].value = +item[valueField];
				if(isCompare){
					bins[test].compare = +item[compareField];
				}
			}
		});

		var d = [];
		for(var bin in bins){
			var item = bins[bin];
			item.date = parse(bin);
			item.formatters = {};
			item.tipFormatters = {};
			item.formatters.value = chart_formatters[valueField];
			item.tipFormatters.value = tip_formatters[valueField];
			if(isCompare){
				if(!("compare" in item)){
					item.compare = 0;
				}
				item.formatters.compare = chart_formatters[compareField];
				item.tipFormatters.compare = tip_formatters[compareField];
			}
			d.push(bins[bin]);
		}
		return d;
	}

	function buildInput(val, isCompare){
		//	val is optional
		var id = "network-ads-detail__chart-metric-" + input_counter++;
		var node = put("div.mdl-textfield.mdl-js-textfield.mdl-textfield--floating-label.getmdl-select");
		var input = put(node, 'input#' + id + '[type="text"][value="' + (val || "—") + '"][size="13"][readonly].mdl-textfield__input');
		var label = put(node, 'label' + (isCompare?".metric-compare":"") + '[for="' + id + '"]');
		put(label, "i.mdl-icon-toggle__label.material-icons", { innerHTML: "arrow_drop_down" });
		var menu = put(node, 'ul[for="' + id + '"].mdl-menu.mdl-menu--bottom-left.mdl-js-menu');
		for(var p in options){
			put(menu, 'li.mdl-menu__item[data-value="' + options[p] + '"]', { innerHTML: p });
		}
		componentHandler.upgradeElement(node, "MaterialTextfield");
		getmdlSelect.addEventListeners(node);
		return node;
	}

	function resetFields(card){
		card._field = "spend";
		card._compare_field = "";
		query("input", card._field_node).forEach(function(node){ node.value = "Network Spend"; });
	//	query("input", card._compare_node).forEach(function(node){ node.value = "—"; });
	}

	return declare([ Card ], {
		_isSetup: false,
		_isLoading: false,
		_isViewed: false,
		_viz: null,
		_compare_field: "",
		id: null,
		domNode: null,
		title: "Network Ad Activity",
		type: "chart",
		structure: structure,
		data: [],
		downloader: null,
		loadDataBeginTopic: TOPIC_LOADDATABEGIN,
		loadDataCompleteTopic: TOPIC_LOADDATACOMPLETE,

		constructor: function(params, node){
			var id = id_counter++;
			this.id = "NetworkAdsDetailChart-" + id;
			this.title = params.title || "Network Ad Activity";
			this.type = params.type || "chart";
			this.domNode = node;	//	REQUIRED
			this.changeFilterTopic = "NetworkAdsDetail-" + id + TOPIC_CHANGEFILTER;
			this.process = lang.hitch(this, processData);
			this.data = [];
			this.setup();
		},
		setup: function(){
			if(this._isSetup) return;
			var node = this.domNode,
				self = this;

			var menus = query("div.trk-card__menus", node)[0];
			if(menus){
				//	do the downloader
				this.downloader = new Downloader({
					items: ["png", "svg"],
					card: this
				}, menus);

				//	do the Info
				this.info = new Info({ card: this }, menus);
			}

			//	Build our metric field and set our values.
			var compare = query("div.trk-chart_metric-select", node)[0];
			if(compare){
				//	Set up the metrics dropdowns
				this.metrics = new MetricDropdown({
					card: self,
					options: {
						"Network Spend": "spend",
						"Revenue": "amt",
						"Web Leads": "webLeads",
						"Phone Leads": "phoneLeads",
						"Touches": "touches",
						"Impressions": "impressions",
						"Clicks": "clicks",
						"Avg CPC": "avgCpc",
						"CTR": "ctr"
					},
					defaultField: "spend",
					compare: true,
					callback: function(metrics){
						self.update(self.data);
					}
				}, compare);
			}

			//	var viz_node = query("div.trk-card__linearea-chart", node)[0];
			viz_node = query("div.trk-card__linearea-chart", node)[0];
			if(viz_node){
				self._viz = new LineArea({
					card: self,
					theme: theme,
					transition: {
						duration: 500
					}
				}, viz_node);
			}
			

			topic.subscribe(this.changeFilterTopic, function(results){
				if(!self.zeroCheck("filter" in results)){
					return;
				}
				if(results.filter && !results.filter.length){
					Queue.preloader(self.domNode, true);
					return;
				} else {
					Queue.preloader(self.domNode);
				}
				//	Change the chart based on the filter change.
				self.data = results.filter;
				self.update(self.data);
			});

			this._isSetup = true;
		},
		update: function(data){
			//	Make sure we have a list of filters to go on
			if(!this.zeroCheck(data && data.length)) {
				return;
			}
			var self = this;
			if(!data.length){
				Queue.preloader(self.domNode, true);
				return;
			}
			Queue.preloader(self.domNode);

			this.data = data;

			//	assemble our data
			var daily = [], dMap = {};
			data.forEach(function(item){
				item.days.forEach(function(day){
					var dt = format(day.date);
					if(!(dt in dMap)){
						dMap[dt] = {
							date: day.date,
							amt: 0,
							spend: 0,
							webLeads: 0,
							phoneLeads: 0,
							touches: 0,
							impressions: 0,
							clicks: 0
						}
					}
					dMap[dt].amt += day.amt;
					dMap[dt].spend += day.spend;
					dMap[dt].webLeads += day.webLeads;
					dMap[dt].phoneLeads += day.phoneLeads;
					dMap[dt].touches += day.touches;
					dMap[dt].impressions += day.impressions;
					dMap[dt].clicks += day.clicks;
				});
			});

			for(var p in dMap){
				dMap[p].avgCpc = dMap[p].clicks ? dMap[p].spend/dMap[p].clicks : 0;
				dMap[p].ctr = dMap[p].impressions ? dMap[p].clicks/dMap[p].impressions : 0;
				daily.push(dMap[p]);
			}

			//	finally, update the chart
			var d = this.process(daily);
			this._viz.update(d);
		}
	});
});

