define(["dojo/_base/lang", "app/ui/charts/themes/Theme", "app/ui/charts/themes/dualaxislinearea/default" ],
function(lang, Theme, Default){
	/****************************************************************
	 *	Dual Axis Linearea chart Neon Blue theme (Network Activity)
	 ****************************************************************/ 
	var variations = {};

	variations[Default.variation] = Default;
	var dark = {
		gradients: {
			value: {
				stops: [
					{ offset: "0%", "stop-color": "#F78E59", "stop-opacity": "0" },
					{ offset: "90%", "stop-color": "#F78E59", "stop-opacity": "0.8" }
				]
			},
			compare: {
				stops: [
					{ offset: "0%", "stop-color": "#5757D1", "stop-opacity": "0" },
					{ offset: "90%", "stop-color": "#5757D1", "stop-opacity": "0.8" }
				]
			}
		},
		compareLine: {
			style: { stroke: "#5757D1", }
		},
		valueLine: {
			style: { stroke: "#F78E59" }
		},
		compareMarker: {
			style: { fill: "#5757D1" }
		},
		valueMarker: {
			style: { fill: "#F78E59" }
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
		gradients: {
			value: {
				stops: [
					{ offset: "0%", "stop-color": "#F78E59", "stop-opacity": "0" },
					{ offset: "90%", "stop-color": "#F78E59", "stop-opacity": "0.8" }
				]
			},
			compare: {
				stops: [
					{ offset: "0%", "stop-color": "#5757D1", "stop-opacity": "0" },
					{ offset: "90%", "stop-color": "#5757D1", "stop-opacity": "0.8" }
				]
			}
		},
		compareLine: {
			style: { stroke: "#5757D1", }
		},
		valueLine: {
			style: { stroke: "#F78E59" }
		},
		compareMarker: {
			style: { fill: "#5757D1" }
		},
		valueMarker: {
			style: { fill: "#F78E59" }
		}
	};
	variations["style-light"] = Theme.create(Default, light, "style-light", "Light");

	return variations;
});
