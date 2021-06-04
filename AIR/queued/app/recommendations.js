dojo.provide("qd.app.recommendations");

dojo.require("dojo.behavior");
dojo.require("dojo.fx");
dojo.require("qd.app");
dojo.require("qd.app.resultsList");
dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.filter.lists");
dojo.require("dojox.dtl.tag.misc");

qd.app.recommendations = new (function(){
	this.getClearContextData = function(){
		//	summary:
		//		Return a plain object to use with a DTL context containing data
		//		specific to this results list, for clearing the results template.
		return {
			skipCount: true,
			headerClass: "recommendations",
			sort_by: qd.app.resultsList.sort
		};
	};

	this.getSortContextData = function(){
		//	summary:
		//		Return a plain object to use with a DTL context containing data
		//		specific to this results list, for sorting the results template.
		return {
			skipCount: true,
			headerClass: "recommendations"
		};
	};

	/*=====
	qd.app.recommendations.fetch.__FetchArgs = function(resultCount, result, error){
		//	summary:
		//		Arguments object for fetching recommendations.
		//	resultCount: Number?
		//		The number of results to find. Defaults to 20.
		//	result: Function?
		//		The callback function that will be executed when a result is
		//		fetched.
		//	error: Function?
		//		The callback function to be executed if there is an error in fetching.
	}
	=====*/

	this.fetch = function(/* qd.app.recommendations.fetch.__FetchArgs */kwArgs){
		//	summary:
		//		Fetch recommendations from the Netflix API and render
		//		them to the page.
		var dfd = new dojo.Deferred(),
		    qar = qd.app.resultsList;

		qd.service.titles.recommendations({
			start: qar.results.length+1,
			max: (kwArgs && kwArgs.resultCount) || qar.ITEMS_PER_FETCH,
			result: function(results){
				qar.renderResults(new dojox.dtl.Context({
					skipCount: true,
					headerClass: "recommendations",
					results: results,
					sort_by: "Relevance"
				}));
				dfd.callback(results);
			},
			error: function(err){
				// TODO
			}
		});

		return dfd;
	};

	this.fetchMore = function(/* qd.app.recommendations.fetch.__FetchArgs */kwArgs){
		//	summary:
		//		Fetch additional recommendations from the Netflix API.
		var dfd = new dojo.Deferred(),
		    qar = qd.app.resultsList;

		qd.app.underlay.show();
		qd.service.titles.recommendations({
			start: qar.results.length+1,
			max: (kwArgs && kwArgs.resultCount) || qar.ITEMS_PER_FETCH,
			result: function(results){
				qar.renderMoreResults(new dojox.dtl.Context({
					results: results,
					buttonClass:"addButton inQueue"
				}));
				dfd.callback(results);
				qd.app.underlay.hide();
			},
			error: function(err){
				// TODO
			}
		});

		return dfd;
	};
})();
