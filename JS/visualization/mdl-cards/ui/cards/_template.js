define(
[ "dojo/_base/declare",
 "dojo/_base/lang",
 "app/xhr-queue",
 "app/ui/Card",
 "dojo/_base/xhr",
 "dojo/query",
 "put-selector/put",
 "dojo/on",
 "dojo/throttle",
 "dojo/topic",
 "dojo/domReady!"
], 
function(
	declare,
	lang,
	Queue,
	Card,
	xhr,
	query,
	put,
	listen,
	throttle,
	topic
){
	/**************************************************************
	 *	THIS IS NON-FUNCTIONING CODE!!!!
	 *
	 *	This is a basic template/API outline to show what a 
	 *	specific card should always have as a baseline. A card
	 *	MUST implement all of the methods shown here; how they
	 *	get implemented is up to the card itself.
	 **************************************************************/ 

	//	static variables first (applies to all instances of a card)
	//
	//	topics used for pub/sub: THESE SHOULD BE HERE NO MATTER WHAT
	var TOPIC_LOADDATA = "cardName/loadDataComplete";
	var TOPIC_QUEUECOMPLETE = "xhr-queue/complete";

	//	card instance definition
	return declare([ Card ], {
		_isSetup: false,
		domNode: null,
		title: "Card Title",
		type: "card",
		structure: [],
		data: [],
		loadDataTopic: TOPIC_LOADDATA,
		url: "/path/to/srv/for/card.aspx",

		constructor: function(params, node){
			//	do something with params

			this.domNode = node;
			this.setup();
		},
		setup: function(){
			if(this._isSetup) return;
			var self = this;	//	so we don't have to do any hitching
			
			//	DO STUFF HERE

			//	Final setup: make sure you're listening to the data loads (happens outside of the card)
			topic.subscribe(TOPIC_LOADDATA, function(results){
				self.onload(results.data);
			});
			this._isSetup = true;
		},
		onload: function(data){
			//	do your data handling here. It is suggested that you use static functions
			//	and pass the various properties you need from the instance to do the work.
		}
	});
});
