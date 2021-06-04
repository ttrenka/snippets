dojo.provide("qd.app.search");

dojo.require("dojo.behavior");
dojo.require("dojo.fx");
dojo.require("qd.app");
dojo.require("qd.app.topMovies");
dojo.require("qd.app.resultsList");
dojo.require("dojox.dtl.html");
dojo.require("dojox.dtl.Context");
dojo.require("dojox.dtl.filter.lists");
dojo.require("dojox.dtl.tag.misc");


qd.app.search = new (function(){

	var SUGGEST_TIMEOUT_DURATION = 250,

	    autoSuggestTimer = null,
	    suggestion = null,
	    term = null,
	    totalResultsFound = 0;

	this.getClearContextData = function(){
		//	summary:
		//		Return a plain object to use with a DTL context containing data
		//		specific to this results list, for clearing the results template.
		var qar = qd.app.resultsList;
		return {
			number_found: totalResultsFound,
			headerClass: "search",
			search_term: term,
			sort_by: qar.sort
		};
	};

	this.getSortContextData = function(){
		//	summary:
		//		Return a plain object to use with a DTL context containing data
		//		specific to this results list, for sorting the results template.
		var qar = qd.app.resultsList;
		return {
			number_found: totalResultsFound,
			headerClass: "search",
			search_term: term
		};
	};

	/*=====
	qd.app.search.fetch.__FetchArgs = function(term, resultCount, result, error){
		//	summary:
		//		Arguments object for fetching recommendations.
		//	term: String
		//		The search term to send to Netflix.
		//	resultCount: Number?
		//		The number of results to find. Defaults to 20.
		//	result: Function?
		//		The callback function that will be executed when a result is
		//		fetched.
		//	error: Function?
		//		The callback function to be executed if there is an error in fetching.
	}
	=====*/

	this.fetch = function(/* qd.app.search.fetch.__FetchArgs */kwArgs){
		//	summary:
		//		Fetch search results from the Netflix API and render them
		//		to the page.
		var dfd = new dojo.Deferred(),
		    qar = qd.app.resultsList;
		hideAutoSuggestPicker();

		if(kwArgs && kwArgs.term){ term = kwArgs.term; }
		qd.service.titles.find({
			term: term,
			start: qar.results.length+1,
			max: (kwArgs && kwArgs.resultCount) || qar.ITEMS_PER_FETCH,
			result: function(response){
				totalResultsFound = response.number_found || 0;
				qar.renderResults(new dojox.dtl.Context({
					number_found: totalResultsFound,
					search_term: term,
					headerClass: "search",
					results: response.results,
					sort_by: "Relevance"
				}));
				dfd.callback(response.results);
			},
			error: function(err){
				// TODO
			}
		});

		return dfd;
	};

	this.fetchMore = function(/* qd.app.search.fetch.__FetchArgs */kwArgs){
		//	summary:
		//		Fetch additional search results from the Netflix API.
		var dfd = new dojo.Deferred(),
		    qar = qd.app.resultsList;

		qd.app.underlay.show();
		qd.service.titles.find({
			term: term,
			start: qar.results.length+1,
			max: (kwArgs && kwArgs.resultCount) || qar.ITEMS_PER_FETCH,
			result: function(response){
				qar.renderMoreResults(new dojox.dtl.Context({
					results: response.results,
					buttonClass:"addButton inQueue"
				}));
				dfd.callback(response.results);
			},
			error: function(err){
				// TODO
			}
		});

		return dfd;
	};

	function showAutoSuggestPicker(){
		//	summary:
		//		Reveal the auto-suggest picker.
		dojo.style("searchAutoSuggest", "display", "block");
		qd.app.resultsList.showPicker("searchAutoSuggestList");
	}

	function hideAutoSuggestPicker(){
		//	summary:
		//		Hide the auto-suggest picker.
		qd.app.resultsList.hidePicker("searchAutoSuggestList", function(){
			dojo.style("searchAutoSuggest", "display", "none");
		});
	}

	function highlightSuggestion(/* String|Node */node){
		//	summary:
		//		Highlight the given auto-suggest menu item node as selected.
		//	node:
		//		The node to highlight.
		if(node){
			dojo.query("#searchAutoSuggest li").removeClass("selected");
			dojo.addClass(node, "selected");
		}
	}

	function autosuggest(/* String */value){
		//	summary:
		//		Grab auto-suggest data from the Netflix API and present
		//		it in a drop-down-like menu.
		//	value:
		//		The search term to use as the basis for the suggestions
		var suggest = dojo.query("#searchAutoSuggest ul")[0];
		suggest.innerHTML = "";

		qd.service.titles.autosuggest({
			term: value,
			result: function(arr){
				dojo.forEach(arr, function(item){
					var li = document.createElement("li");
					li.innerHTML = item;
					suggest.appendChild(li);
				});

				if(arr.length){
					showAutoSuggestPicker();
				} else {
					suggest.innerHTML = "<li class='nohover'><i>No suggestions</i></li>";
				}
			},
			error: function(err){
				//	TODO
			}
		});
	}

	this.search = function(/* String */value){
		//	summary:
		//		Switch to the search page and run a search for the given term.
		//	value:
		//		Search term to use.
		qd.app.topMovies.switchPage("search");
		qd.app.resultsList.fetch({term:value});
	}


	dojo.behavior.add({
		// Search bar
		"#searchBar input": {
			onkeypress:dojo.hitch(this, function(e){
				var suggestNode = dojo.query("#searchAutoSuggest ul")[0];
				switch(e.keyCode){
				case dojo.keys.ENTER:
					if(suggestion){ e.target.value = suggestion.innerHTML; }
					qd.app.topMovies.switchPage("search");
					qd.app.resultsList.fetch({term:e.target.value});
					if(autoSuggestTimer){
						clearTimeout(autoSuggestTimer);
						autoSuggestTimer = null;
					}
					dojo.stopEvent(e);
					break;
				case dojo.keys.HOME:
				case dojo.keys.PAGE_UP:
					if(suggestion){
						suggestion = suggestNode.firstChild;
						dojo.stopEvent(e);
					}
					break;
				case dojo.keys.END:
				case dojo.keys.PAGE_DOWN:
					if(suggestion){
						suggestion = suggestNode.lastChild;
						dojo.stopEvent(e);
					}
					break;
				case dojo.keys.UP_ARROW:
					if(!suggestion){
						suggestion = suggestNode.lastChild;
					}else{
						suggestion = suggestion.previousSibling || suggestNode.lastChild;
					}
					break;
				case dojo.keys.DOWN_ARROW:
					if(!suggestion){
						suggestion = suggestNode.firstChild;
					}else{
						suggestion = suggestion.nextSibling || suggestNode.firstChild;
					}
					break;
				default:
					// on normal keypresses, wait for a brief interval before
					// checking for suggestions, to limit unnecessary API calls
					if(autoSuggestTimer){
						clearTimeout(autoSuggestTimer);
						autoSuggestTimer = null;
					}
					autoSuggestTimer = setTimeout(function(){
						suggestion = null;
						autosuggest(e.target.value);
					}, SUGGEST_TIMEOUT_DURATION);
				}
				highlightSuggestion(suggestion);
			}),
			onfocus:function(e){
				if(e.target.value == "Search movies"){
					e.target.value = "";
					dojo.style(e.target, "color", "#000");
				}
			},
			onblur:function(e){
				// janky timeout here because we don't get the onclick event
				// on #searchAutoSuggest if we hide it during this onblur; it
				// goes away too before the click is registered
				setTimeout(function(){
					suggestion = null;
					hideAutoSuggestPicker();
				}, qd.app.resultsList.HIDE_TIMER_DURATION);
				if(autoSuggestTimer){
					clearTimeout(autoSuggestTimer);
					autoSuggestTimer = null;
				}
			}
		},

		"#searchAutoSuggest ul": {
			onclick:dojo.hitch(this, function(e){
				term = e.target.innerHTML;
				dojo.query("#searchBar input")[0].value = term;
				suggestion = null;
				qd.app.topMovies.switchPage("search");
				qd.app.resultsList.fetch();
			}),
			onmouseover:function(e){
				suggestion = e.target;
				highlightSuggestion(suggestion);
			}
		}
	});

})();
