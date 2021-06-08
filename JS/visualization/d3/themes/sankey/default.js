define(["dojo/_base/lang", "app/ui/charts/themes/Theme"],
function(lang, Theme){
	/*************************************************
	 *	Sankey chart Default theme
	 *
	 *	This file should always be the base class for
	 *	any custom theme file for the sankey visualization.
	 *
	 *	All default theme objects should be a completely
	 *	defined theme, and the objects that use it
	 *	should override any values that it needs to.
	 *
	 *************************************************/ 
	return new Theme({
		gradients: {
			"link0": {
				gradientDirection: {
					x1: "0%",
					x2: "100%",
					y1: "0%",
					y2: "0%"
				},
				stops: [
					{ offset: "0%", "stop-color": "#013a71", "stop-opacity": "0.2" },
					{ offset: "100%", "stop-color": "#013a71", "stop-opacity": "1" }
				]
			},
			"link1": {
				gradientDirection: {
					x1: "0%",
					x2: "100%",
					y1: "0%",
					y2: "0%"
				},
				stops: [
					{ offset: "0%", "stop-color": "#105483", "stop-opacity": "0.2" },
					{ offset: "100%", "stop-color": "#105483", "stop-opacity": "1" }
				]
			},
			"link2": {
				gradientDirection: {
					x1: "0%",
					x2: "100%",
					y1: "0%",
					y2: "0%"
				},
				stops: [
					{ offset: "0%", "stop-color": "#016e8f", "stop-opacity": "0.2" },
					{ offset: "100%", "stop-color": "#016e8f", "stop-opacity": "1" }
				]
			},
			"link3": {
				gradientDirection: {
					x1: "0%",
					x2: "100%",
					y1: "0%",
					y2: "0%"
				},
				stops: [
					{ offset: "0%", "stop-color": "#018897", "stop-opacity": "0.2" },
					{ offset: "100%", "stop-color": "#018897", "stop-opacity": "1" }
				]
			},
			"link4": {
				gradientDirection: {
					x1: "0%",
					x2: "100%",
					y1: "0%",
					y2: "0%"
				},
				stops: [
					{ offset: "0%", "stop-color": "#42a19d", "stop-opacity": "0.2" },
					{ offset: "100%", "stop-color": "#42a19d", "stop-opacity": "1" }
				]
			},
			"link5": {
				gradientDirection: {
					x1: "0%",
					x2: "100%",
					y1: "0%",
					y2: "0%"
				},
				stops: [
					{ offset: "0%", "stop-color": "#73baa6", "stop-opacity": "0.2" },
					{ offset: "100%", "stop-color": "#73baa6", "stop-opacity": "1" }
				]
			},
			"link6": {
				gradientDirection: {
					x1: "0%",
					x2: "100%",
					y1: "0%",
					y2: "0%"
				},
				stops: [
					{ offset: "0%", "stop-color": "#a7d9B8", "stop-opacity": "0.2" },
					{ offset: "100%", "stop-color": "#a7d9B8", "stop-opacity": "1" }
				]
			},
			"link7": {
				gradientDirection: {
					x1: "0%",
					x2: "100%",
					y1: "0%",
					y2: "0%"
				},
				stops: [
					{ offset: "0%", "stop-color": "#d5f0c7", "stop-opacity": "0.2" },
					{ offset: "100%", "stop-color": "#d5f0c7", "stop-opacity": "1" }
				]
			}
		}
	}, "default", "Default");
});
