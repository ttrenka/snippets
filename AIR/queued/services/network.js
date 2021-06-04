dojo.provide("qd.services.network");

(function(){
	var monitor, monitorUrl="http://www.netflix.com";

	qd.services.network = new (function(){
		//	summary:
		//		A singleton object for access to the network layer of Queued.
		var self = this,
			pollInterval = 2500;
		var statusChange = function(e){
			self.onChange((monitor && monitor.available));
		};

		//	Properties
		this.__defineGetter__("isRunning", function(){
			//	summary:
			//		Return whether or not the monitor is running.
			return (monitor && monitor.running);	//	Boolean
		});

		this.__defineGetter__("lastPoll", function(){
			//	summary:
			//		Return the last time the monitor checked the network status.
			return (monitor && monitor.lastStatusUpdate);	//	Date
		});

		this.__defineGetter__("available", function(){
			//	summary:
			//		Return whether or not the network is available.
			return monitor && monitor.available;	//	Boolean
		});

		this.__defineSetter__("available", function(/* Boolean */b){
			//	summary:
			//		Explicitly set the network availability
			if(monitor){
				monitor.available = b;
			}
			return (monitor && monitor.available);	//	Boolean
		});

		//	FIXME: This is for DEV purposes only!
		this.offline = function(){
			monitor.stop();
			monitor.available = false;
		};
		this.online = function(){
			monitor.start();
		};

		this.initialized = false;

		//	Methods
		this.init = function(/* String? */url){
			//	summary:
			//		Initialize the network services by creating and starting the monitor.
			//	set up the offline monitor
			monitor = new air.URLMonitor(new air.URLRequest((url||monitorUrl))); 
			monitor.pollInterval = pollInterval;
			monitor.addEventListener(air.StatusEvent.STATUS, statusChange);
			self.initialized = true;
			self.onInitialize(monitor.urlRequest.url);
		};

		this.start = function(){
			//	summary:
			//		Start the monitor services.
			if(!monitor){
				self.init();
			}
			console.log("qd.services.network.start: monitor is running.");
			self.onStart();
			return monitor.start();
		};

		this.stop = function(){
			//	summary:
			//		Stop the monitor services.
			console.log("qd.services.network.stop: monitor is stopped.");
			self.onStop();
			return (monitor && monitor.stop());
		};

		//	Event stubs
		this.onInitialize = function(/* String */url){
			//	summary:
			//		Fires when the network services is initialized.
			qd.app.splash("Network services initialized");
		};
		this.onStart = function(){
			//	summary:
			//		Fires when the network services is started.
			qd.app.splash("Network services started");
		};
		this.onStop = function(){
			//	summary:
			//		Fires when the network services is stopped.
		};
		this.onChange = function(/* Boolean */isAvailable){
			//	summary:
			//		Stub event to connect to when the network status changes
			console.log("qd.services.network.onChange: current status is " + isAvailable);
		};
	})();
})();
