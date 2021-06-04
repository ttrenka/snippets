dojo.provide("qd.app.sync");

dojo.require("dojo.behavior");
dojo.require("qd.app");

qd.app.sync = new (function(){
	var progress=0, nActions=0, current=0;

	function closeDialog(){
		//	summary:
		//		Hide the sync confirmation dialog.
		dijit.byId("syncConfirmDialogNode").hide();
	}

	this.showDialog = function(){
		//	summary:
		//		Show the sync confirmation dialog. It always starts on the
		//		"question" page.
		nActions = 0;
		progress = 0;
		current = 0;
		this.switchPage("question");
		dijit.byId("syncConfirmDialogNode").show();
		dojo.style("progressNode", "width", "0");
	};

	this.switchPage = function(page){
		//	summary:
		//		Toggle the dialog page.
		//	page:
		//		One of "question", "progress".
		var question, progress;
		switch(page){
			case "progress":
				question = "none";
				progress = "block";
				break;
			case "question":
			default:
				question = "block";
				progress = "none";
		}
		dojo.style("syncQuestionNode", "display", question);
		dojo.style("syncProgressNode", "display", progress);
	};

	this.synchronizeChanges = function(){
		//	summary:
		//		Synchronized queued changes with Netflix.

		console.warn("SYNCHRONIZING CHANGES");
		this.switchPage("progress");
		current = 0;
		qd.services.online.synchronize();
	};

	this.discardChanges = function(){
		//	summary:
		//		Throw away queued changes that haven't been synchronized with Netflix.

		console.warn("DISCARDING CHANGES");
		var h = dojo.connect(qd.services.online, "onDiscardSync", function(){
			dojo.disconnect(h);
			closeDialog();
		});
		qd.services.online.discardSynchronizations();
	};

	this.progress = function(/* Number? */percent){
		//	summary:
		//		Get or set the sync progress as a percentage; this is just
		//		for display purposes; call it to provide a visual indication
		//		of where the sync process is at any given time.
		//	percent:
		//		Number representing the percentage complete.
		if(arguments.length){
			progress = percent;
			dojo.style("progressNode", "width", progress+"%");
		}else{
			return progress;
		}
	};

	this.closeDialog = function(){
		//	summary:
		//		Function to expose the internal closeDialog() function as a public member of qd.app.sync.
		closeDialog();
	};

	dojo.behavior.add({
		"#syncQuestionNode .synchronizeButton": {
			onclick:dojo.hitch(this, "synchronizeChanges")
		},
		"#syncQuestionNode .discardButton": {
			onclick:dojo.hitch(this, "discardChanges")
		}
	});

	dojo.connect(qd.services.online, "onSyncNeeded", dojo.hitch(this, function(n){
		this.showDialog();
		nActions = n;
	}));
	dojo.connect(qd.services.online, "onSyncComplete", function(){
		closeDialog();
	});

	dojo.connect(qd.services.online, "onSyncItemStart", dojo.hitch(this, function(prompt){
		dojo.byId("syncProgressPrompt").innerHTML = prompt + "...";
	}));
	dojo.connect(qd.services.online, "onSyncItemComplete", dojo.hitch(this, function(){
		current++;
		this.progress(Math.min(100, Math.round((current/nActions)*100)));
	}));
})();
