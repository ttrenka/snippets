define(["dojo/_base/declare", "app/xhr-queue", "dojo/_base/xhr", "dojo/Deferred", "jszip/dist/jszip", "dojo/dom", "dojo/query", "put-selector/put", "dojo/on", "dojo/topic", "jszip/vendor/FileSaver", "dojo/domReady!"],
function(declare, Queue, xhr, Deferred, JSZip, dom, query, put, listen, topic){
	/*	Downloader.js
	 *	v.2.0.0
	 *	20180409
	 *	Tom Trenka
	 *
	 *	Module to allow something to be downloaded as:
	 *	SVG/PNG, CSV/TSV, ZIP
	 *
	 *	SVG and PNG download based on svjimmy (https://github.com/mbostock/svjimmy/blob/master/index.js)
	 *	Approach for CSV/TSV based on same techniques.
	 *	ZIP download uses JSZip (https://stuk.github.io/jszip/)
	 *
	 *	Note that we are also using JSZip's FileSaver.
	 */

	//	basic functions
	var dateParse = d3.time.format("%Y-%m-%d").parse,
		dateFormat = d3.time.format("%-m/%-d/%Y"),
		reStrip = /[\-\s]+/g,
		strip = function(val){ return ("" + val).replace(reStrip, ""); };

	//	polyfill for older browsers
	if(!HTMLCanvasElement.prototype.toBlob){
		Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
			value: function(callback/*, type, encoderOptions*/) {
				var url = this.toDataURL.apply(this, [].slice.call(arguments, 1));
				var m = /^data:(.*?);base64,(.*)$/.exec(url), type = m[1], b64 = m[2];
				setTimeout(function() {
					callback(new Blob([
						new Uint8Array(window.atob(b64).split('').map(function(c){ return c.charCodeAt(0); })
					)], {type: type}));
				}, 0);
			}
		});
	}

	//	go grab our stylesheets and cache them as plain text
	var styles = "";
	["/css/svg.css", "/js/p/vizuly/src/styles/vizuly.css"].forEach(function(sheet){
		xhr.get({
			url: sheet,
			handleAs: "text"
		}).then(function(data){
			styles += data;
		});
	});

	//	helper functions
	function formatCsvData(data, structure){
		var a = [], delimiter = ",";

		//	do the headers
		var row = [];
		structure.forEach(function(item){
			if(!("hidden" in item) || ("hidden" in item && !item.hidden)){
				row.push('"' + (item.label || item.field).replace(",", "\\,") + '"');
			}
		});
		a.push(row.join(delimiter));

		//	now do the data
		for(var i=0, l=data.length; i<l; i++){
			var row = [];
			structure.forEach(function(item){
				if(!("hidden" in item) || ("hidden" in item && !item.hidden)){
					var d = data[i][item.field];
					if("get" in item){ d = item.get(data[i]); }
					if("formatter" in item){ d = item.formatter(d, data[i]); }
					row.push('"' + ("" + d).replace('"', '""') + '"');
				}
			});
			a.push(row.join(delimiter));
		}
		return a.join("\n");
	}
	function formatTsvData(data, structure){
		var a = [], delimiter = "\t";

		//	do the headers
		var row = [];
		structure.forEach(function(item){
			if(!("hidden" in item) || ("hidden" in item && !item.hidden)){
				row.push((item.label || item.field));
			}
		});
		a.push(row.join(delimiter));

		//	now do the data
		for(var i=0, l=data.length; i<l; i++){
			var row = [];
			structure.forEach(function(item){
				if(!("hidden" in item) || ("hidden" in item && !item.hidden)){
					var d = data[i][item.field];
					if("get" in item){ d = item.get(data[i]); }
					if("formatter" in item){ d = item.formatter(d, data[i]); }
					row.push(d);
				}
			});
			a.push(row.join(delimiter));
		}
		return a.join("\n");
	}

	var id_prefix = "trk-downloader__",
		id_count = 0;
	var icon_map = {
		svg: "perm_media",
		png: "image",
		csv: "description",
		tsv: "description",
		all: "archive"
	};

	var dnldr = declare([], {
		card: null,			//	the card object
		domNode: null,		//	the menu node of the card		REQUIRED (we keep this because might have to swap out downloaders)
		buttonNode: null,	//	the button that gets created
		menuNode: null,		//	the UL menu list for downloads
		items: null,
		_menuAlignClass: "mdl-menu--bottom-right",
		before: false,

		constructor: function(params, node){
			this.card = params.card;
			this.items = params.items;
			this._menuAlignClass = params.alignClass || this._menuAlignClass;
			this.before = "before" in params ? params.before : false;

			//	node should be a div.trk-card__menus
			this.domNode = node;
			dnldr._add(this);
			this.setup();
		},
		setup: function(){
			if(!this.items){
				console.warn("Downloader for " + this.card.title + " is missing menu items.");
				return;
			}

			//	set up the DOM structure and insert into the document
			var node = this.domNode, self = this, button, menu;
			if(this.before){
				node = node.childNodes[0];
			}
			var container = put(node, (this.before?"-":"") + "div.trk-card__menus-button.trk-downloader-menu");
			this.buttonNode = button = put(container, 'button.mdl-button.mdl-button--icon.mdl-js-button.mdl-js-ripple-effect#' + id_prefix + id_count + '-button');
			put(button, 'i.material-icons', { innerHTML: "file_download" });
			componentHandler.upgradeElement(button, "MaterialButton");

			//	set up the actual menu. We want to make sure we keep graphic downloads separate from data downloads
			this.menuNode = menu = put(container, 'ul.mdl-menu.' + this._menuAlignClass + '.mdl-js-menu.mdl-js-ripple-effect.trk-download__menu');
			menu.setAttribute("for", id_prefix + id_count + "-button");
			var cont = put(menu, "div.trk-menu_columns");
			var div = put(cont, "div");
			this.items.forEach(function(item, idx, arr){
				var li = put(menu, "li.mdl-menu__item.mdl-menu__item-icon");
				li.setAttribute("data-value", item.toLowerCase());
				if((idx+1) < arr.length && (arr[idx+1] == "csv" || arr[idx+1] == "tsv") || (self.items.length > 1 && self.items.length-1 == idx)){
					put(li, ".mdl-menu__item--full-bleed-divider");
				}
				var icon = put(li, "i.material-icons.mdl-list__item-icon", { innerHTML: icon_map[item] });
				put(li, "span", item.toUpperCase());
			});

			//	Check to see if there's more than one download type, and if so add the ALL item
			if(this.items.length > 1){
				var li = put(menu, "li.mdl-menu__item.mdl-menu__item-icon");
				li.setAttribute("data-value", "all");
				var icon = put(li, "i.material-icons.mdl-list__item-icon", { innerHTML: icon_map["all"] });
				put(li, "span", "ALL");
			}
			componentHandler.upgradeElement(menu, "MaterialMenu");

			//	set up the event listeners for the menu and anything else that has to happen.
			listen(menu, "click", function(e){
				e.stopPropagation();
				e.preventDefault();

				//	figure out what was clicked on
				var node = e.target;
				if(node.nodeName.toLowerCase() != "li") node = node.parentNode;
				var type = node.getAttribute("data-value");

				//	now that we know the right filetype, do the prep. This includes figuring out how to get data
				//	and structure out of our card so that we can set that up properly.
				switch(type.toLowerCase()){
					case "svg": { self.svg(); break; }
					case "png": { self.png(); break; }
					case "csv": { self.csv(); break; }
					case "tsv": { self.tsv(); break; }
					case "all": { self.zip(); break; }
					default: {
						//	TODO: what to do about a failsafe here?
						break;
					}
				}
			});
			id_count++;
		},

		format: {
			tsv: function(data, structure){ return formatTsvData(data, structure); },
			csv: function(data, structure){ return formatCsvData(data, structure); }
		},

		filename: function(){
			//	Here we are making some assumptions about structure.
			var field;
			switch(formValues.selectionType){
				case "g": field = "groupId"; break;
				case "c": field = "clientId"; break;
				default: field = "programId"; break;
			}
			return strip(this.card.title) + "_" + formValues.selectionType + formValues[field] + "_" + strip(formValues.sqlDateStart) + "_" + strip(formValues.sqlDateEnd);
		},
		information: function(title, quoted){
			//	pull out the info from our formValues and get human-readable information to prepend to data downloads.
			var a = [], st = formValues.selectionType, label;
			switch(st){
				case "c":
				case "g": label = "Group: "; break;
				default: label = "Program: "; break;
			}
			var test = dom.byId("trk-client__input");
			if(test){
				a.push("Client: " + dom.byId("trk-client__input").value);
				a.push(label + dom.byId("trk-program__input").value);
			}
			a.push("Report: " + title);
			a.push("Date Range: " + dateFormat(dateParse(formValues.sqlDateStart)) + " - " + dateFormat(dateParse(formValues.sqlDateEnd)));
			a.push("Generated On: " + dateFormat(new Date()));
			if(quoted){
				a = a.map(function(item){ return '"' + item + '"'; });
			}
			return a.join("\n") + "\n\n";
		},

		//	the actual render functions
		render: {
			svg: function(node){
				var dfd = new Deferred();
				if(!node || node.namespaceURI !== "http://www.w3.org/2000/svg" || node.ownerSVGElement){
					setTimeout(function(){
						dfd.reject(new Error("Downloader.render.svg: the passed node is not an <svg> node."));
					}, 10);
					return dfd.promise;
				}

				var svg = node.cloneNode(true);
				svg.setAttribute("preserveAspectRatio", "xMidYMid");
				put(svg, 'style[type="text/css"]', { innerHTML: styles });
				
				var content = (new XMLSerializer).serializeToString(svg);
				setTimeout(function(){
					dfd.resolve(new Blob([content], { type: "image/svg+xml" }));
				}, 10);
				return dfd.promise;
			},
			png: function(node){
				var dfd = new Deferred();	//	the eventual return object
				if(!node || node.namespaceURI !== "http://www.w3.org/2000/svg" || node.ownerSVGElement){
					setTimeout(function(){
						dfd.reject(new Error("Downloader.render.png: the passed node is not an <svg> node."));
					}, 10);
					return dfd.promise;
				}

				var svg = node.cloneNode(true);
				svg.setAttribute("preserveAspectRatio", "xMidYMid");
				put(svg, 'style[type="text/css"]', { innerHTML: styles });
				
				var content = (new XMLSerializer).serializeToString(svg);
				var url = URL.createObjectURL(new Blob([content], {type: "image/svg+xml"})),
					canvas = put("canvas"),
					context = canvas.getContext("2d"),
					img = new Image,
					ratio = window.devicePixelRatio || 1,
					rect = node.getBoundingClientRect(),
					width = rect.width * ratio,
					height = rect.height * ratio;

				//	TODO: This is a hack for some of the custom charts. Applies only to making PNGs.
				if(node.classList.contains("trk-forcebubble")){ height = width; }

				img.onload = function(e){
					setTimeout(function(){
						context.drawImage(img, 0, 0, width, height);
						canvas.toBlob(function(blob){
							URL.revokeObjectURL(url);
							dfd.resolve(blob);
						});
					}, 10);
				};
				canvas.width = width;
				canvas.height = height;
				img.src = url;

				return dfd.promise;
			},
			csv: function(data){
				var dfd = new Deferred();
				setTimeout(function(){ dfd.resolve(new Blob([data]), { type: "text/csv" }); }, 10);
				return dfd.promise;
			},
			tsv: function(data){
				var dfd = new Deferred();
				setTimeout(function(){ dfd.resolve(new Blob([data]), { type: "text/tsv" }); }, 10);
				return dfd.promise;
			}
		},

		//	TODO: figure out a way of doing these in an overridable fashion
		zip: function(){
			var self = this, todo = {}, present = this.items.join(), done = function(){
				for(var p in todo){
					if(!todo[p]) return false;
				}
				return true;
			}, fin = function(){
				zip.generateAsync({ type: "blob" }).then(function(data){
					saveAs(data, self.filename() + ".zip");
				});
			};
			this.items.forEach(function(item){
				if(item != "all"){ todo[item] = false; }
			});


			var zip = new JSZip();
			//	start with our directory structure.
			var img, data;
			if(present.indexOf("svg") > -1 || present.indexOf("png") > -1){
				var img = zip.folder("images");
			}
			if(present.indexOf("csv") > -1 || present.indexOf("tsv") > -1){
				var data = zip.folder("data");
			}

			//	setup our README file.
			var readme = this.information(this.card.title) + "\n\nFiles include:\n";
			this.items.forEach(function(item){
				readme += "\t" + self.filename() + "." + item + "\n";
			});
			zip.file("README.txt", readme);

			//	shoot off our shit
			if(present.indexOf("svg") > -1){
				var node = query("svg", this.card.domNode)[0];
				this.render.svg(node).then(function(blob){
					todo["svg"] = true;
					img.file(self.filename() + ".svg", blob);
					done() && fin();
				});
			}
			if(present.indexOf("png") > -1){
				var node = query("svg", this.card.domNode)[0];
				this.render.png(node).then(function(blob){
					todo["png"] = true;
					img.file(self.filename() + ".png", blob);
					done() && fin();
				});
			}
			if(present.indexOf("csv") > -1){
				var s = this.information(this.card.title, true);
				if(({}).toString.call(self.card.data) == "[object Array]"){
					//	The typical case
					s += formatCsvData(self.card.data, self.card.structure);
				} else {
					//	using an object to store multiple datasets
					var idx = 0;
					for(var p in self.card.data){
						var data = self.card.data[p];
						s += (idx > 0?"\n\n":"") + (data.title || p) + "\n\n";
						s += formatCsvData(data, self.card.structure[p]);
					}
				}
				this.render.csv(s).then(function(blob){
					todo["csv"] = true;
					data.file(self.filename() + ".csv", blob);
					done() && fin();
				});
			}
			if(present.indexOf("tsv") > -1){
				var s = this.information(this.card.title);
				if(({}).toString.call(self.card.data) == "[object Array]"){
					//	The typical case
					s += formatTsvData(self.card.data, self.card.structure);
				} else {
					//	using an object to store multiple datasets
					var idx = 0;
					for(var p in self.card.data){
						var data = self.card.data[p];
						s += (idx > 0?"\n\n":"") + (data.title || p) + "\n\n";
						s += formatTsvData(data, self.card.structure[p]);
					}
				}
				this.render.tsv(s).then(function(blob){
					todo["tsv"] = true;
					data.file(self.filename() + ".tsv", blob);
					done() && fin();
				});
			}
		},
		svg: function(){
			var self = this;
			var node = query("svg", this.card.domNode)[0];
			this.render.svg(node).then(function(blob){
				saveAs(blob, self.filename() + ".svg");
			});
		},
		png: function(){ 
			var self = this;
			var node = query("svg", this.card.domNode)[0];
			this.render.png(node).then(function(blob){
				saveAs(blob, self.filename() + ".png");
			}).then(null, function(err){
				console.warn(err);
			});
		},
		csv: function(){ 
			var self = this, s = this.information(this.card.title, true);
			if(({}).toString.call(self.card.data) == "[object Array]"){
				//	The typical case
				s += formatCsvData(self.card.data, self.card.structure);
			} else {
				//	using an object to store multiple datasets
				for(var p in self.card.data){
					var data = self.card.data[p];
					s += "\n\n" + (data.title || p) + "\n\n";
					s += formatCsvData(data, self.card.structure[p]);
				}
			}
			this.render.csv(s).then(function(blob){
				saveAs(blob, self.filename() + ".csv");
			});
		},
		tsv: function(){ 
			var self = this, s = this.information(this.card.title);
			if(({}).toString.call(self.card.data) == "[object Array]"){
				//	The typical case
				s += formatTsvData(self.card.data, self.card.structure);
			} else {
				//	using an object to store multiple datasets
				for(var p in self.card.data){
					var data = self.card.data[p];
					s += "\n\n" + (data.title || p) + "\n\n";
					s += formatTsvData(data, self.card.structure[p]);
				}
			}
			this.render.tsv(s).then(function(blob){
				saveAs(blob, self.filename() + ".tsv");
			});
		}
	});

	//	Set up static registry stuff in prep for "Get me all X on current tab"
	dnldr._registry = [];	//	This is an array instead of a set of named downloaders.
	dnldr._add = function(d){ dnldr._registry.push(d); };
	dnldr._getCurrent = function(){
		//	Go through the registry, and return all Downloaders that are currently being viewed.
		var ret = [];
		dnldr._registry.forEach(function(d){
			var c = d.card, t = Queue.inActiveTab(c.domNode);
			if(!t.in_tab || (t.in_tab && t.is_active)){
				ret.push(d);
			}
		});
		return ret;
	};
	return dnldr;
});
