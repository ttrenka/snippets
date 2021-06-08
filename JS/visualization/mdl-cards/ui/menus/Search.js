define(
["dojo/_base/lang", "dojo/_base/declare", "dojo/query", "put-selector/put", "dojo/on", "dojo/throttle", "dojo/topic"],
function(lang, declare, query, put, listen, throttle, topic){
/*
<div class="mdl-textfield mdl-js-textfield mdl-textfield--expandable trk-search-menu">
	<label class="mdl-button mdl-js-button mdl-button--icon" for="keywords-search">
		<i class="material-icons">search</i>
	</label>
	<div class="mdl-textfield__expandable-holder">
		<input class="mdl-textfield__input" type="search" id="keywords-search" />
		<label class="mdl-textfield__label" for="client-search"></label>
		<i class="material-icons">cancel</i>
	</div>
</div>
*/
	var idCounter = 0,
		idPrefix = "trk-menu-search-",
		TOPIC_ONCHANGE = "/onchange";

	return declare([], {
		card: null,			//	the card object
		domNode: null,		//	the menu node of the card
		searchNode: null,
		inputNode: null,
		clearNode: null,
		placeholder: "",
		waitTime: 100,
		callback: function(){ },
		before: false,		//	if we want to insert this before any existing nodes in the domNode

		constructor: function(params, node){
			this.card = params.card;
			this.id = idPrefix + idCounter++;
			this.callback = params.callback;
			this.waitTime = params.wait || this.waitTime;
			this.placeholder = params.placeholder || this.placeholder;
			this.before = "before" in params ? params.before : false;

			this.changeTopic = this.id + TOPIC_ONCHANGE;

			//	node should be a div.trk-card__menus
			this.domNode = node;
			this.setup();
		},
		setup: function(){
			//	build our menu and set up the listener to do whatever needs to be done
			var node = this.domNode, self = this;
			var tmp = this.before ? node.childNodes[0] : node;
			var c = put(tmp, (this.before?"-":"") + "div.mdl-textfield.mdl-js-textfield.mdl-textfield--expandable.trk-search-menu.trk-card__menus-button");
			var label = put(c, 'label.mdl-button.mdl-js-button.mdl-button--icon[for="' + this.id + '"]');
			put(label, "i.material-icons", { innerHTML: "search" });
			componentHandler.upgradeElement(label, "MaterialButton");

			var div = this.searchNode = put(c, "div.mdl-textfield__expandable-holder");
			var input = this.inputNode = put(div, 'input.mdl-textfield__input[type="search"]#' + this.id + (this.placeholder.length?'[placeholder="' + this.placeholder + '"]':""));
			put(div, 'label.mdl-textfield__label[for="' + this.id + '"]');
			this.clearNode = put(div, "i.material-icons", { innerHTML: "cancel" });
			this.clearNode.style.display = "none";
			componentHandler.upgradeElement(div, "MaterialTextfield");

			//	set up our event handlers
			listen(input, "input", throttle(function(e){
				if(e.target.nodeName.toLowerCase() != "input") return;
				if(self.inputNode.value != ""){
					self.clearNode.style.display = "";
					self.callback(self.inputNode.value, e);
					topic.publish(self.changeTopic, { id: self.id, menu: self, value: self.inputNode.value });
				} else {
					self.inputNode.focus();
					self.clearNode.style.display = "none";
					self.searchNode.classList.remove("is-dirty");

					//	fire off the callback and topic
					self.callback("", e);
					topic.publish(self.changeTopic, { id: self.id, menu: self, value: "" });
				}
			}, self.waitTime));
			listen(this.clearNode, "click", function(e){
				//	refocus on the input
				self.inputNode.focus();

				//	reset our values and classes
				self.inputNode.value = "";
				self.clearNode.style.display = "none";
				self.searchNode.classList.remove("is-dirty");

				//	fire off the callback and topic
				self.callback("", e);
				topic.publish(self.changeTopic, { id: self.id, menu: self, value: "" });
			});
			listen(this.inputNode, "blur", function(e){
				//	if our input is empty, pull the is-dirty class
				var n = self.searchNode.parentNode;
				if(self.inputNode.value == ""){
					n.classList.remove("is-dirty");
				}
			});
		}
	});
});
