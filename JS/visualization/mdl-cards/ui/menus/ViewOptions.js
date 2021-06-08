define(["dojo/_base/declare", "dojo/dom", "dojo/query", "put-selector/put", "dojo/on", "dojo/topic", "dojo/domReady!"],
function(declare, dom, query, put, listen, topic){
	var idCounter = 0,
		menuCounter = 0,
		idPrefix = "trk-menu-viewoptions-",
		TOPIC_ONCHANGE = "ViewOptions/onchange";

	return declare([], {
		card: null,			//	the card object
		domNode: null,		//	the menu node of the card
		buttonNode: null,	//	the button that gets created
		menuNode: null,		//	the UL menu list for downloads
		items: [],			//	the items to be placed in the menu
		callback: function(){ },
		selected: null,
		_iconName: "equalizer",
		_title: "View Options",
		_paramType: "Metric",
		_menuAlignClass: "mdl-menu--bottom-right",
		before: false,
		reset: false,

		constructor: function(params, node){
			this.card = params.card;
			this.id = idPrefix + idCounter++;
			this.items = params.items;
			this.callback = params.callback;
			this._menuAlignClass = params.alignClass || this._menuAlignClass;
			this._iconName = params.icon || this._iconName;
			this._title = ("title" in params) ? params.title : "View Options";
			this._paramType = ("paramType" in params) ? params.paramType : "Metric";
			this.selected = params.selected || null;
			this.before = "before" in params ? params.before : false;
			this.reset = "reset" in params ? params.reset : false;

			//	node should be a div.trk-card__menus
			this.domNode = node;
			this.setup();
		},
		setup: function(){
			if(!this.items.length) throw new Error("ViewOptions: the menu items must be set before running setup()");

			//	build our menu and set up the listener to do whatever needs to be done
			var node = this.domNode, button, menu, self = this, id = menuCounter++;
			if(this.before){
				node = node.childNodes[0];
			}

			//	the overall container node
			var container = put(node, (this.before?"-":"") + "div.trk-card__menus-button.trk-viewoptions-menu");

			//	The button to open the menu
			this.buttonNode = button = put(container, 'button.mdl-button.mdl-button--icon.mdl-js-button.mdl-js-ripple-effect#' + idPrefix + 'button-' + id);
			put(button, 'i.material-icons', { innerHTML: this._iconName });
			componentHandler.upgradeElement(button, "MaterialButton");

			//	The menu itself
			this.menuNode = menu = put(container, 'ul.mdl-menu.' + this._menuAlignClass + '.mdl-js-menu.mdl-js-ripple-effect[for="' + idPrefix + 'button-' + id + '"]');
			put(menu, "h5.trk-menu__title", { innerHTML: this._title });
			var cont = put(menu, "div.trk-menu_columns");
			var div = put(cont, "div.trk-view_options");
			if(this._paramType != ""){
				put(div, "h6", { innerHTML: this._paramType });
			}
			this.items.forEach(function(item, idx){
				var value = item.toLowerCase().replace(/\s+/, "");
				var li = put(div, 'li.mdl-menu__item[data-value="' + value + '"]');
				var label = put(li, 'label.mdl-radio.mdl-js-radio.mdl-js-ripple-effect[for="' + idPrefix + value + '-' + id + '"]');
				var input = put(label, 'input.mdl-radio__button#' + idPrefix + value + "-" + id + '[type="radio"][name="' + idPrefix + id + '"][value="' + value + '"]');
				if(self.selected){
					input.checked = (self.selected == value);
				} else if(idx == 0 && !self.reset){
					input.checked = true;
					self.selected = value;
				}
				put(label, "span.mdl-radio__label", { innerHTML: item });
				if(self.reset && idx == self.items.length - 1){
					put(li, ".mdl-menu__item--full-bleed-divider");

					//	add the reset item
					var li = put(div, 'li.mdl-menu__item.mdl-menu__item-icon.trk-viewoptions__reset[data-value="' + self.reset + '"]');
					var label = put(li, 'label.mdl-radio.mdl-js-radio.mdl-js-ripple-effect[for="' + idPrefix + self.reset + '-' + id + '"]');
					var input = put(label, 'input.mdl-radio__button#' + idPrefix + self.reset + "-" + id + '[type="radio"][name="' + idPrefix + id + '"][value="' + self.reset + '"]');
					put(label, "i.material-icons", { innerHTML: "autorenew" });
					put(label, "span.mdl-radio__label", { innerHTML: "Reset" });
					self.selected = "";
					input.checked = true;
				}
			});
			componentHandler.upgradeElement(menu, "MaterialMenu");

			//	set up our event handler
			listen(menu, "click", function(e){
				//	handle the reset if it is there
				if(e.target.nodeName.toLowerCase() != "input") return;
				self.selected = e.target.parentNode.parentNode.getAttribute("data-value").toLowerCase();
				setTimeout(function(){
					self.callback(self.selected);
					topic.publish(TOPIC_ONCHANGE, { id: self.id, menu: self, option: self.selected });
				}, 10);
			});
		}
	});
});
