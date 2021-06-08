define(["dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "put-selector/put", "dojo/dom-style",
		"google-maps/styles/gmaps-dark-theme", "google-maps/styles/gmaps-light-theme"],
function(declare, lang, listen, topic, put, style, themeDark, themeLight){
	/*
	 *	Note to self: find out if we can use the Google Maps static map API
	 *	to pull off a PNG download for a user. If we can, that means we will
	 *	need to be able to custom override the toPng method in Downloader.
	 *
	 *	Basic concept:
	 *		-	Create a URL for a Google Static Map
	 *		-	new Image() on that bad boy
	 *		-	create a canvas and draw the image to it
	 *		-	follow through on the current PNG download.
	 *
	 *	See http://tech.bellycard.com/blog/where-d-the-water-go-google-maps-water-pixel-detection-with-canvas/ for reference.
	 */

	//	Map widget using Google Maps
	var idCount = 1,
		TOPIC_UPDATE = "GoogleMap/update",
		TOPIC_SETDATA = "GoogleMap/setData",
		TOPIC_RESIZE = "GoogleMap/resize",
		TOPIC_HEATMAPTOGGLE = "GoogleMap/heatmap";

	//	create our internal custom popup
	/*
		//	location point to by the popup tip, width is max width of the popup window
		.popup-tip-anchor {
			height: 0;
			position: absolute;
			width: 200px;
		}
		//	The bubble is anchored above the tip, bottom == tip_height
		.popup-bubble-anchor {
			position: absolute;
			width: 100%;
			bottom: 8px;
			left: 0;
		}
		//	Draw the tip itself, centered horizontally via transform, 8px high and 6px wide defined by the borders
		.popup-bubble-anchor::after {
			content: "";
			position: absolute;
			top: 0;
			left: 0;
			transform: translate(-50%, 0);
			width: 0;
			height: 0;
			border-left: 6px solid transparent;
			border-right: 6px solid transparent;
			border-top: 8px solid white;
		}
		//	The popup bubble itself.
		.popup-bubble-content {
			position: absolute;
			top: 0;
			left: 0;
			transform: translate(-50%, -100%);
			background-color: white;
			padding: 5px;
			border-radius: 5px;
			font-family: sans-serif;
			overflow-y: auto;
			max-height: 60px;
			box-shadow: 0px 2px 10px 1px rgba(0,0,0,0.5);
		}
	*/
	var Popup;
	/*
	 *	NB: This example assumes that you are replacing a Marker with a custom Popup.
	 *	TODO: Try to make this function as an InfoWindow instead?
	 *
	 *	Usage:
	 *	var popup = new Popup(
	 *		new google.maps.LatLng(lat, lng),
	 *		contentNode		//	this will end up being changed to a string, wrapped in a new node.
	 *	);
	 *	popup.setMap(map);
	 */
	function createPopup(){
		Popup = function(position, content){
			//	TODO: figure out a close button
			this.position = position;

			if(typeof(content) == "string"){
				content = put("div", { innerHTML : content });
			}

			//	style the content first
			content.classList.add('popup-bubble-content');

			//	create the anchor and the bubble
			var pixelOffset = document.createElement('div');
			pixelOffset.classList.add('popup-bubble-anchor');
			pixelOffset.appendChild(content);

			this.anchor = document.createElement('div');
			this.anchor.classList.add('popup-tip-anchor');
			this.anchor.appendChild(pixelOffset);

			// Optionally stop clicks, etc., from bubbling up to the map.
			this.stopEventPropagation();
		};
		// NOTE: google.maps.OverlayView is only defined once the Maps API has
		// loaded. That is why Popup is defined inside initMap().
		Popup.prototype = Object.create(google.maps.OverlayView.prototype);

		/** Called when the popup is added to the map. */
		Popup.prototype.onAdd = function() {
			this.getPanes().floatPane.appendChild(this.anchor);
		};

		/** Called when the popup is removed from the map. */
		Popup.prototype.onRemove = function() {
			if (this.anchor.parentElement) {
			  this.anchor.parentElement.removeChild(this.anchor);
			}
		};

		/** Called when the popup needs to draw itself. */
		Popup.prototype.draw = function() {
			var divPosition = this.getProjection().fromLatLngToDivPixel(this.position);
			// Hide the popup when it is far out of view.
			var display = Math.abs(divPosition.x) < 4000 && Math.abs(divPosition.y) < 4000 ?  'block' : 'none';

			if(display === 'block') {
				this.anchor.style.left = divPosition.x + 'px';
				this.anchor.style.top = divPosition.y + 'px';
			}
			if(this.anchor.style.display !== display) {
				this.anchor.style.display = display;
			}
		};

		/** Stops clicks/drags from bubbling up to the map. */
		Popup.prototype.stopEventPropagation = function() {
			var anchor = this.anchor;
			anchor.style.cursor = 'auto';
			['click', 'dblclick', 'contextmenu', 'wheel', 'mousedown', 'touchstart', 'pointerdown'].forEach(function(event){
				anchor.addEventListener(event, function(e){
					e.stopPropagation();
				});
			});
		};
	}

	if(isGoogleAvailable){
		Popup = createPopup();
	} else {
		topic.subscribe("GoogleMaps/loaded", function(data){
			Popup = createPopup();
		});
	}

	//	in the following helper functions, "map" is a reference to our component, not the actual map
	function addMarker(params, map){
		//	params should look like { lat: num, lng: num, content: optional }
		var content = params.content || "",
			title = params.title || "",
			label = params.label || "",
			icon = params.icon || "";		//	full path to image; might hard-code the directory

		if(params.content){ delete params.content; }
		if(params.title){ delete params.title; }
		if(params.label){ delete params.label; }
		if(params.icon){ delete params.icon; }

		if(!icon){
			icon = "/img/map/marker.aspx";
		//	icon = "/img/map/marker.aspx?c=446,68a";
		}

		var opts = { position: params };
		if(title) opts.title = title;
		if(label) opts.label = label;
		if(icon) opts.icon = {
			url: icon,
			anchor: new google.maps.Point(10, 12)	//	Note this depends on the size of the image
		};
		if(!content){
			opts.clickable = false;
		}
		var marker = new google.maps.Marker(opts);

		if(content){
			var info = new google.maps.InfoWindow({ content: content });
			marker.addListener("click", function(){
				info.open(map.map, marker);
			});
		}
		map._markers.push(marker);
	}
	function removeMarker(marker, map){
		marker.setMap(null);
		//	TODO: remove from the map's _marker array
	}
	function setMap(markers, map){
		markers = markers || map._markers;
		markers.forEach(function(marker){
			marker.setMap(map.map);
		});
	}
	function showMarkers(markers, map){
		markers = markers || map._markers;
		setMap(markers, map);
	}
	function clearMarkers(markers, map){
		//	only clear, don't clear out the map's _marker array
		markers = markers || map._markers;
		markers.forEach(function(marker){
			marker.setMap(null);
		});
	}
	function deleteMarkers(markers, map){
		clearMarkers(markers, map);
		map._markers = [];
	}

	return declare([], {
		_cssRules: {},
		_transform: { lat: "lat", lng: "lng", content: "content", title: "title", icon: "icon" },
		_markers: [],
		_clusterer: null,
		_heatmap: null,
		_currentView: "markers",	//	markers || heatmap
		id: null,
		data: [],
		domNode: null,
		mapNode: null,
		map: null,
		options: {},
		width: 0,
		height: 0,

		infoTemplate: null,		//	template to be used to create the contents of an info box

		__ctor__: function(params, node){
			//	Do this as a private/hidden function in case the Google Maps API hasn't finished loading.
			//	set our parameters
			this.id = "trk-googlemap-" + idCount++;
			this.domNode = node;	//	the node in which we will place the actual map

			this._markers = [];		//	make sure the markers array is initialized

			//	field mapping for location data
			if(params.transform){
				this._transform = lang.mixin(lang.clone(this._transform), params.transform);
			}

			//	set up the map node
			this.mapNode = put(node, "div.trk-googlemap#" + this.id);
			this.mapNode.style.width = "100%";
			this.mapNode.style.height = "100%";

			var mapStyle = Themes && Themes.isDark() ? themeDark : themeLight;
			this.options = lang.mixin({
				zoom: 4,
				center: { lat: 37.890251, lng: -95.924384 },
				zoomControl: true,
				mapTypeControl: true,
				scaleControl: true,
				streetViewControl: true,
				rotateControl: false,
				fullscreenControl: false,
				mapTypeId: google.maps.MapTypeId.TERRAIN,
//				mapTypeControlOptions: {
//					mapTypeIds: ['terrain', 'hybrid']
//				},
				styles: mapStyle
			}, params.options || {});

			//	optional params
			this.data = ("data" in params) ? params.data : [];

			//	measurements
			if("width" in params){
				this.width = params.width;
				this.height = ("height" in params) ? params.height : (this.width - 48);
			} else {
				this.width = style.get(this.domNode, "width");
				this.height = this.width - 48;
			}

			this.setup();

			if(this.data.length){
				//	we were passed data with the constructor, update ourselves.
				this.update();
			}
		},
		constructor: function(params, node){
			//	Make sure the Google Maps API has been loaded
			var self = this;
			if(!isGoogleAvailable){
				console.warn("GoogleMap: Google Maps API has not been loaded. Setting up subscription...");
				topic.subscribe("GoogleMaps/loaded", function(){
					self.__ctor__(params, node);
				});
			} else {
				self.__ctor__(params, node);
			}
		},
		setup: function(){
			var self = this;
			this.map = new google.maps.Map(this.mapNode, this.options);
			this.map.addListener("maptypeid_changed", function(){
				var type = self.map.getMapTypeId();
				if(type == "terrain" || type == "roadmap"){
					//	restore the current theme
					self.options.styles = (Themes && Themes.isDark() ? themeDark : themeLight);
					self.map.setOptions({ styles: self.options.styles });
				} else {
					self.map.setOptions({ styles: null });
				}
			});

			topic.subscribe("Themes/setTheme", function(data){
				self.options.styles = (Themes.isDark() ? themeDark : themeLight);
				self.map.setOptions({ styles: self.options.styles });
			});
		},
		setReadyCallback: function(callback){
			//	generic function that allows you to automatically set up a callback
			//	function when the Google Maps API is actually available. If it already
			//	is, the callback will be run immediately; otherwise it will wait for
			//	the GoogleMaps/loaded topic to publish, and run it then.
			var self = this;
			if(!isGoogleAvailable){
				topic.subscribe("GoogleMaps/loaded", function(){
					callback(self);
				});
			} else {
				callback(self);
			}
		},
		toggleHeatmap: function(show){
			show = !!show;	//	force to boolean
			if(this._heatmap && show){
				this._clusterer.clearMarkers();
				if (this._heatmap.data == null){
					this._currentView = "heatmap";
					this.update(this.data);
				}
				this._heatmap.setMap(this.map);
				this._currentView = "heatmap";
			} else {
				this._heatmap.setMap(null);
				this._heatmap.data = null;
				this._clusterer.addMarkers(this._markers);
				this._currentView = "markers";
			}
			topic.publish(TOPIC_HEATMAPTOGGLE, { show: show, map: this });
		},
		getData: function(){
			//	Get the raw data fed to the chart
			return this.data;
		},
		setData: function(data){
			//	Set the data for this chart and update.
			this.setReadyCallback(function(m){
				m.data = data;
				m.update(data);
			});
		},
		update: function(data){
			//	the main rendering function.  Any changes to a property should
			//	call this function when completed. Note that we are wrapping in
			//	a callback here because we don't want to run this until the Maps
			//	API is actually loaded.
			this.setReadyCallback(function(m){
				data = data || m.data;
				if(!data) return;

				if(m._markers.length){
					if(m._clusterer){
						m._clusterer.removeMarkers(m._markers);
						m._clusterer = null;
					}
					deleteMarkers(m._markers, m);
				}
				if (m._heatmap) {
					m._heatmap.setMap(null);
				}
				//	the default field mapping
				data.forEach(function(item){
					var lat = +item[m._transform.lat],
						lng = +item[m._transform.lng];
					var loc = { lat: lat, lng: lng };
					if(item[m._transform.content]){ loc.content = item[m._transform.content]; }
					if(item[m._transform.title]){ loc.title = item[m._transform.title]; }
					if(item[m._transform.icon]){ loc.icon = item[m._transform.icon]; }
					addMarker(loc, m);
				});

				m._clusterer = new MarkerClusterer(m.map, m._markers, {
					minimumClusterSize: 7,
					maxZoom: 18,
					averageCenter: true,
					imagePath: "/img/map/mc-NEW-PNG/m"
				});
				if(data.length > 1){
					m._clusterer.fitMapToMarkers();
					//	TODO: do we really need this? Sometimes the bounding box is a little off...
					/*
					if(m.map.getZoom() < 3){
						m.map.setZoom(m.map.getZoom()+1);
					}
					*/
				} else {
					if(data.length){
						m.map.setCenter({ lat: +data[0][m._transform.lat], lng: +data[0][m._transform.lng] });
						setTimeout(function(){
							m.map.setZoom(11);
						}, 1000);
					}
				}

				var heatmapDark = [
					'rgba(0, 0, 0, 0)',
					'rgba(90, 124, 219, 1)',
					'rgba(126, 115, 187, 1)',
					'rgba(162, 106, 155, 1)',
					'rgba(198, 97, 123, 1)',
					'rgba(234, 88, 91, 1)',
					'rgba(252, 84, 75, 1)'
				];

				if(google.maps.visualization){
					var points = m._markers.map(function(marker){ return marker.getPosition(); });
					m._heatmap = new google.maps.visualization.HeatmapLayer({
						data: points,
						radius: 16,
	//					dissipating: false,
	//					maxIntensity: 8,
	//					opacity: 0.6,
						gradient: heatmapDark
					});
				}

				//	TODO: double-check if this is the best way to go.
				if(m._currentView == "heatmap"){
					m.toggleHeatmap(true);
				}
				
				topic.publish(TOPIC_UPDATE, { id: m.id, map: m.map, data: m.data });
			});
		},
		resize: function(){
			//	attach to the window.resize event; re-measures the domNode and updates.
			this.setReadyCallback(function(m){
				m.update();
			});
		}
	});
});
