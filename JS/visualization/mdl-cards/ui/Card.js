define(["dojo/_base/declare", "app/xhr-queue", "dojo/query", "dojo/domReady!"], function(declare, Queue, query){
	//	The base metadata structure for a card
	return declare([], {
		domNode: null,
		title: "",
		type: "card",
		structure: [],
		constructor: function(params, node){
			this.title = params.title || "";
			this.type = params.type || this.type;
			if(node) this.domNode = node;
		},
		setup: function(){
			//	stub for subclasses
		},
		setNode: function(node){
			this.domNode = node;
		},
		zeroCheck: function(b){
			//	"b" should be a boolean that says whether or not our loaded data has anything in it
			var test = !!b,	//	cast just in case
				dataNodes = query(".trk-card__data", this.domNode),
				noDataNodes = query(".trk-card__empty-data", this.domNode);
			if(test){
				//	valid data, hide the no data node and make sure the data node is not hidden
				dataNodes.forEach(function(node){ node.classList.remove("trk-card__data-hide"); });
				noDataNodes.forEach(function(node){
					if(!node.classList.contains("trk-card__data-hide")){
						node.classList.add("trk-card__data-hide");
					}
				});
			} else {
				//	force the preloader off
				Queue.preloader(this.domNode);
				dataNodes.forEach(function(node){
					if(!node.classList.contains("trk-card__data-hide")) node.classList.add("trk-card__data-hide");
				});
				noDataNodes.forEach(function(node){ node.classList.remove("trk-card__data-hide"); });
			}
			return test;
		}
	});
});
