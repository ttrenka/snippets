define(["dojo/_base/lang", "dojo/topic", "app/util", "dojo/on", "put-selector/put"],
function(lang, topic, util, listen, put){
	/*	Consolify and server error handling for AiTRK4
	 *	
	 *	TRT 20200422
	 */

	//	The original function
	/*
	window.consolify = function(data){
		if(data && data.console){
			var messages = data.console;
			for(var i=0, l=messages.length; i<l; i++){
				var item = messages[i];
				console[item.type](item.message);
			}
		}
	}
	*/
	
	var TOPIC_NOSESSION = "console/noSession",
		TOPIC_ACCESSDENIED = "console/accessDenied",
		TOPIC_SERVERERROR = "console/serverError",
		TOPIC_NOERROR = "console/noError",
		codes = {
			noSession: 1,
			accessDenied: 2,
			serverError: 3
		},
		isSetup = false;

	//	create a post back to the login page
	function redirect(){
		var base = lang.clone(formValues || {});
		var fValues = { action: "index.aspx", method: "post" };
		var f = put("form", fValues);
		for(var p in valuesMap){
			put(f, "input", { type: "hidden", name: valuesMap[p], value: base[p] });
		}

		//	get the page and possible tab
		var page = window.location.href;
		put(f, "input", { type: "hidden", name: "page", value: page });

		//	add it to the document and submit it
		put(document.body, f);
		f.submit();
	}

	function repost(){
		var base = lang.clone(formValues || {});
		var fValues = { method: "post" };
		var f = put("form", fValues);
		for(var p in valuesMap){
			put(f, "input", { type: "hidden", name: valuesMap[p], value: base[p] });
		}

		//	add it to the document and submit it
		put(document.body, f);
		f.submit();
	}


	function setupErrorDialog(){
		var button = errorDialog.querySelector("button.trk-dialog-button__retry");
		listen(button, "click", function(e){ repost(); });
		var close = errorDialog.querySelector("button.trk-dialog-button__close");
		listen(close, "click", function(e){
			errorDialog.classList.remove("trk-model--open");
			errorDialog.close();
		});
	}

	function showErrorDialog(data){
		if(!isSetup){
			setupErrorDialog();
			isSetup = true;
		}
		errorDialog.showModal();
		errorDialog.classList.add("trk-modal--open");
		window.resizeBy(1,1);
		setTimeout(function(){ window.resizeBy(-1, -1); }, 10);
	}

	//	render any console object
	function render(data){
		if(data && data.console){
			var messages = data.console;
			for(var i=0, l=messages.length; i<l; i++){
				var item = messages[i];
				console[item.type](item.message);
			}
		}
	}

	//	Check for errors
	function errCheck(data){
		//	Run this before allowing data to move on
		if("error" in data){
			var e = data.error;
			if(e.Code == codes.noSession){
				redirect();
			}
			if(e.Code == codes.accessDenied){
				__ptsd__ && console.warn("Access denied", e);
			}
			if(e.Code == codes.serverError){
				__ptsd__ && console.warn("Server Error", e);
				showErrorDialog(data);
			}
			//	throw new Error(e.Type + " " + e.Message);
		}
	}

	window.consolify = function(data){
		errCheck(data);
		render(data);
	}
	
});
