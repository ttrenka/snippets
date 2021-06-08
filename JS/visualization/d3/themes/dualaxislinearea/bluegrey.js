define(["dojo/_base/lang", "app/ui/charts/themes/Theme", "app/ui/charts/themes/dualaxislinearea/default" ],
function(lang, Theme, Default){
	/************************************************************************
	 *	Dual Axis Linearea chart Neon Blue Grey theme (Phone Call Activity)
	 ************************************************************************/ 
	var variations = {};

	variations[Default.variation] = Default;
	var dark = {
		filters: {
			lineDropShadow: {
				elements: {
					feDropShadow: { 
						attr: {
							"flood-color": "#02141c",
							"flood-opacity": "0.8"
						}
					}
				}
			}
		},
		gradients: {
			value: {
				stops: [
					{ offset: "0%", "stop-color": "#2196b5", "stop-opacity": "0" },
					{ offset: "90%", "stop-color": "#2196b5", "stop-opacity": "0.8" }
				]
			},
			compare: {
				stops: [
					{ offset: "0%", "stop-color": "#f78e59", "stop-opacity": "0" },
					{ offset: "90%", "stop-color": "#f78e59", "stop-opacity": "0.8" }
				]
			}
		},
		compareLine: {
			style: { stroke: "#f78e59", }
		},
		valueLine: {
			style: { stroke: "#2196b5" }
		},
		compareMarker: {
			style: { fill: "#f78e59" }
		},
		valueMarker: {
			style: { fill: "#2196b5" }
		}
	};
	variations["style-dark"] = Theme.create(Default, dark, "style-dark", "Dark");

	var light = {
		axis: {
			"x-axis": {
				style: {
					"font-size": "11px",
					"font-weight": "300",
					"fill": "rgba(0, 0, 0, 0.87)"
				}
			},
			"y-axis-value": {
				style: {
					"font-size": "11px",
					"font-weight": "300",
					"fill": "rgba(0, 0, 0, 0.87)"
				}
			},
			"y-axis-compare": {
				style: {
					"font-size": "11px",
					"font-weight": "300",
					"fill": "rgba(0, 0, 0, 0.87)"
				}
			}
		},
		filters: {
			lineDropShadow: {
				elements: {
					feDropShadow: { 
						attr: {
							"flood-color": "#0c2a36",
							"flood-opacity": "0.5"
						}
					}
				}
			}
		},
		gradients: {
			value: {
				stops: [
					{ offset: "0%", "stop-color": "#2196b5", "stop-opacity": "0" },
					{ offset: "90%", "stop-color": "#2196b5", "stop-opacity": "0.8" }
				]
			},
			compare: {
				stops: [
					{ offset: "0%", "stop-color": "#f78e59", "stop-opacity": "0" },
					{ offset: "90%", "stop-color": "#f78e59", "stop-opacity": "0.8" }
				]
			}
		},
		compareLine: {
			style: { stroke: "#f78e59", }
		},
		valueLine: {
			style: { stroke: "#2196b5" }
		},
		compareMarker: {
			style: { fill: "#f78e59" }
		},
		valueMarker: {
			style: { fill: "#2196b5" }
		}
	};
	variations["style-light"] = Theme.create(Default, light, "style-light", "Light");

	return variations;
});
