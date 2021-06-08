define(["dojo/_base/lang", "app/ui/charts/themes/Theme"],
function(lang, Theme){
	/*************************************************
	 *	Dual Axis Linearea chart Default theme
	 *
	 *	This file should always be the base class for
	 *	any custom theme file for the Dual Axis Linearea
	 *	visualization.
	 *
	 *	All default theme objects should be a completely
	 *	defined theme, and the objects that use it
	 *	should override any values that it needs to.
	 *
	 *************************************************/ 
	return new Theme({
		"axis": {
			"x-axis": {
				"style": {
					"font-size": "11px",
					"font-weight": "300",
					"fill": "rgba(255, 255, 255, 0.87)"
				}
			},
			"y-axis-value": {
				"style": {
					"font-size": "11px",
					"font-weight": "300",
					"fill": "rgba(255, 255, 255, 0.87)"
				}
			},
			"y-axis-compare": {
				"style": {
					"font-size": "11px",
					"font-weight": "300",
					"fill": "rgba(255, 255, 255, 0.87)"
				}
			}
		},
		"filters": {
			"lineDropShadow": {
				"attr": {
					"height" : "130%"
				},
				"elements": {
					"feDropShadow": { 
						"attr": {
							"dx": "1",
							"dy": "2",
							"stdDeviation": "3",
							"flood-color": "#000",
							"flood-opacity": "0.6"
						}
					}
				}
			},
			"TooltipDropShadow": {
				"attr": {
					"height" : "130%"
				},
				"elements": {
					"feDropShadow": { 
						"attr": {
							"dx": "1",
							"dy": "2",
							"stdDeviation": "1.5",
							"flood-color": "#000",
							"flood-opacity": "0.2"
						}
					}
				}
			}
		},
		"gradients": {
			"value": {
				"gradientDirection": {
					"x1": "0%",
					"x2": "0%",
					"y1": "100%",
					"y2": "0%"
				},
				"stops": [
					{ "offset": "0%", "stop-color": "#666", "stop-opacity": "0" },
					{ "offset": "90%", "stop-color": "#666", "stop-opacity": "0.8" }
				]
			},
			"compare": {
				"gradientDirection": {
					"x1": "0%",
					"x2": "0%",
					"y1": "100%",
					"y2": "0%"
				},
				"stops": [
					{ "offset": "0%", "stop-color": "#aaa", "stop-opacity": "0" },
					{ "offset": "90%", "stop-color": "#aaa", "stop-opacity": "0.8" }
				]
			}
		},
		"hitAreas": {
			"maxDistanceFromPoint": 28
		},
		"compareLine": {
			"style": {
				"fill": "none",
				"stroke": "#aaa",
				"stroke-width": "5px"
			},
			"attr": {
				"opacity": "0.66"
			}
		},
		"valueLine": {
			"style": {
				"fill": "none",
				"stroke": "#666",
				"stroke-width": "5px"
			}
		},
		"compareMarker": {
			"style": {
				"fill": "#aaa",
				"stroke": "white",
				"stroke-width": "2px"
			},
			"attr": { 
				"r": "5"
			}
		},
		"valueMarker": {
			"style": {
				"fill": "#666",
				"stroke": "white",
				"stroke-width": "2px"
			},
			"attr": { 
				"r": "5"
			}
		}
	}, "default", "Default");
});
