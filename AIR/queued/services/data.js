dojo.provide("qd.services.data");

qd.services.data = new (function(){
	//	summary:
	//		A singleton object that handles any interaction with the
	//		encrypted database.
	//	database: String
	//		The filename of the database.
	this._testKey = "h1dd3n!!11one1";
	this._testDb = "queued-test.db";	//	revert to queued.db
	var _key = this._testKey;
	this.database = this._testDb;

	var initFile = "js/updates/resources/initialize.sql",
		initialized = false;

	var syncConn = new air.SQLConnection(),
		asyncConn = new air.SQLConnection(),
		inCreation = false,
		self = this;

	//	Properties
	this.__defineGetter__("initialized", function(){
		//	summary:
		//		Returns whether the engine is initialized.
		return initialized;	//	Boolean
	});

	//	these can't be getters, unfortunately.
	this.connection = function(/* Boolean? */async){
		//	summary:
		//		Return the proper connection.
		return (async ? asyncConn : syncConn);	//	air.SQLConnection
	};
	this.connected = function(/* Boolean? */async){
		//	summary:
		//		Returns whether the appropriate connection is actually connected.
		return (async ? asyncConn.connected : syncConn.connected );	//	Boolean
	};
	this.transacting = function(/* Boolean? */async){
		//	summary:
		//		Return whether the appropriate connection is in the middle of a transaction.
		return (async ? asyncConn.inTransaction : syncConn.inTransaction );	//	Boolean
	};
	this.lastId = function(/* Boolean? */async){
		//	summary:
		//		Return the lastId of the appropriate connection (INSERT/REPLACE).
		return (async ? asyncConn.lastInsertRowID : syncConn.lastInsertRowID );	//	mixed
	};

	function eventSetup(/* air.SQLConnection */conn){
		//	set up all of our event handlers on the passed connection
		//	open the db, set up the connection handlers
		conn.addEventListener(air.SQLEvent.OPEN, self.onOpen);
		conn.addEventListener(air.SQLErrorEvent.ERROR, self.onError);
		conn.addEventListener(air.SQLEvent.CLOSE, self.onClose);
		conn.addEventListener(air.SQLEvent.ANALYZE, self.onAnalyze);
		conn.addEventListener(air.SQLEvent.DEANALYZE, self.onDeanalyze);
		conn.addEventListener(air.SQLEvent.COMPACT, self.onCompact);
		conn.addEventListener(air.SQLEvent.BEGIN, self.onBegin);
		conn.addEventListener(air.SQLEvent.COMMIT, self.onCommit);
		conn.addEventListener(air.SQLEvent.ROLLBACK, self.onRollback);
		conn.addEventListener(air.SQLEvent.CANCEL, self.onCancel);
		conn.addEventListener(air.SQLUpdateEvent.INSERT, self.onInsert);
		conn.addEventListener(air.SQLUpdateEvent.UPDATE, self.onUpdate);
		conn.addEventListener("delete", self.onDelete);
		return conn;
	}
	
	this.init = function(/* String */key, /* String */db, /* Boolean? */forceCreate){
		//	summary:
		//		Initialize the Queued data service.
		//	set up the key
		var k = key||this._testKey;
		if(typeof(k) == "string"){
			_key = new air.ByteArray();
			_key.writeUTFBytes(k);
			k = _key;
		}

		if(key){ this._testKey = key; }
		this.database = db || this.database;

		//	open the sync connection and test to see if it needs to run the create statements
		var sync = eventSetup(syncConn);
		sync.open(air.File.applicationStorageDirectory.resolvePath(this.database), "create", false, 1024, k);

		//	open the async connection
		var async = eventSetup(asyncConn);
		async.openAsync(air.File.applicationStorageDirectory.resolvePath(this.database), "create", null, false, 1024, k);

		if(!forceCreate){
			var s = new air.SQLStatement();
			s.sqlConnection = sync;
			//	latest change: remove integer ID from Title table.  If it exists, recreate.
			s.text = "SELECT json FROM Title LIMIT 1";
			try{
				s.execute();
			} catch(e){
				this.create({ connection: sync, file: this.initFile });
			}
		} else {
			this.create({ connection: sync, file: this.initFile });
		}
		this.onInitialize();

		//	attach to app.onExit
		var h = dojo.connect(qd.app, "onExit", function(evt){
			if(evt.isDefaultPrevented()){
				return;
			}
			dojo.disconnect(h);
			async.close();
			sync.close();
			air.trace("Database connections closed.");
		});
	};

	/*=====
	qd.services.data.__CreateArgs = function(file, connection){
		//	summary:
		//		Optional keyword arguments object for the create method.
		//	file: String?
		//		The filename to be used for creating the db.
		//	connection: air.SQLConnection?
		//		The connection to be used for creating the db.  Defaults
		//		to the synchronous connection.
	}
	=====*/
	this.create = function(/* qd.services.data.__CreateArgs */kwArgs){
		//	summary:
		//		Create the database.
		inCreation = true;
		var file = kwArgs && kwArgs.file || initFile,
			conn = kwArgs && kwArgs.connection || syncConn;

		var f = air.File.applicationDirectory.resolvePath(file);
		if(f.exists){
			//	kill off the async connection first.
			asyncConn.close();
			asyncConn = null;

			var fs = new air.FileStream();
			fs.open(f, air.FileMode.READ);
			var txt = fs.readUTFBytes(fs.bytesAvailable);
			fs.close();

			var st = new Date();

			//	break it apart.
			txt = txt.replace(/\t/g, "");
			var c="", inMerge = false, test = txt.split(/\r\n|\r|\n/), a=[];
			for(var i=0; i<test.length; i++){
				if(inMerge){
					c += test[i];
					if(test[i].indexOf(")")>-1){
						a.push(c);
						c = "";
						inMerge = false;
					}
				} else {
					if(test[i].indexOf("(")>-1 && test[i].indexOf(")")==-1){
						inMerge = true;
						c += test[i];
					} else {
						a.push(test[i]);
					}
				}
			}
			
			//	use raw SQL statements here because of the need to preempt any
			//	statements that might have been called while creating.
			for(var i=0, l=a.length; i<l; i++){
				var item = dojo.trim(a[i]);
				if(!item.length || item.indexOf("--")>-1){ continue; }
				var s = new air.SQLStatement();
				s.text = item;
				s.sqlConnection = conn;
				s.execute();
			}

			//	profiling
			console.warn("db creation took " + (new Date().valueOf() - st.valueOf()) + "ms.");

			//	re-open the async connection.
			asyncConn = new air.SQLConnection();
			var async = eventSetup(asyncConn);
			async.openAsync(air.File.applicationStorageDirectory.resolvePath(this.database), "create", null, false, 1024, _key);

			//	fire off the onCreate event.
			this.onCreate();

			//	run an analysis on it
			//conn.analyze();
		}
	};

	/*=====
	 qd.services.data.fetch.__Args = function(sql, params, result, error){
		//	sql: String
		//		The SQL statement to be executed.
		//	params: Object|Array?
		//		Any parameters to be pushed into the SQL statement.  If an
		//		Array, expects the SQL statement to be using ?, if an object
		//		it expects the SQL statement to be using keywords, prepended
		//		with ":".
		//	result: Function?
		//		The callback to be executed when results are returned.
		//	error: Function?
		//		The callback to be executed when an error occurs.
		this.sql = sql;
		this.params = params;
		this.result = result;
		this.error = error;
	 }
	=====*/

	function prep(/* qd.services.data.fetch.__Args */kwArgs, /* air.SQLStatement */s, /* Boolean */async){
		//	summary:
		//		Prepare the SQL statement and return it.
		s.sqlConnection = kwArgs.connection || (async ? asyncConn : syncConn);
		s.text = kwArgs.sql;
		if(kwArgs.params && dojo.isArray(kwArgs.params)){
			//	allow the ordered list version
			for(var i=0, l=kwArgs.params.length; i<l; i++){
				s.parameters[i] = kwArgs.params[i];
			}
		} else {
			var params = kwArgs.params || {};
			for(var p in params){
				s.parameters[":" + p] = params[p];
			}
		}
		return s;	//	air.SQLStatement
	}

	var queue = [], createHandler;
	function exec(){
		var o = queue.shift();
		if(o){
			o.deferred.addCallback(exec);
			o.deferred.addErrback(exec);
			o.statement.execute();
		}
	}

	function query(/* qd.services.data.fetch.__Args */kwArgs, /* air.SQLStatement */s){
		//	summary:
		//		Inner function to communicate with the database.
		
		//	set up the deferred.
		var dfd = new dojo.Deferred();

		//	set up the event handlers.
		var onResult = function(evt){
			var result = s.getResult();
			dfd.callback(result);
		};
		var onError = function(evt){
			console.warn(evt);
			dfd.errback(evt); 
		}

		if(kwArgs.result){ 
			dfd.addCallback(function(result){
				kwArgs.result.call(kwArgs, result.data, result);
			});
		}
		if(kwArgs.error){
			dfd.addErrback(function(evt){
				kwArgs.error.call(kwArgs, evt);
			});
		}

		s.addEventListener(air.SQLEvent.RESULT, onResult);
		s.addEventListener(air.SQLErrorEvent.ERROR, onError);

		queue.push({
			statement: s,
			deferred: dfd
		});

		if(!inCreation){
			exec();
		} 
		else if(!createHandler){
			//	we only want this to start once, don't go adding a bunch more connections
			createHandler = dojo.connect(self, "onCreate", function(){
				dojo.disconnect(createHandler);
				createHandler = null;
				exec();
			});
		}
		return dfd;	//	dojo.Deferred
	}

	this.fetch = function(/* qd.services.data.fetch.__Args */kwArgs){
		//	summary:
		//		Fetch (i.e. read) data out of the database.  Can be used for write operations
		//		but is not recommended; use execute for write ops.  This method is hard-coded
		//		to use the synchronous connection (i.e. thread-blocking).
		if(!kwArgs.sql){
			console.log("qd.services.data.fetch: no SQL passed. " + dojo.toJson(kwArgs));
			return null;
		}

		//	fetch should use the sync connection unless an SQLConnection is passed with the kwArgs.
		var s = prep(kwArgs, new air.SQLStatement(), false),
			d = query(kwArgs, s);
		this.onFetch(kwArgs);
		return d;	//	dojo.Deferred
	};

	this.execute = function(/* qd.services.data.fetch.__Args */kwArgs){
		//	summary:
		//		Execute the passed SQL against the database.  Should be used
		//		for write operations (INSERT, REPLACE, DELETE, UPDATE).  This
		//		method is hard-coded to use the asynchronous connection.
		if(!kwArgs.sql){
			console.log("qd.services.data.execute: no SQL passed. " + dojo.toJson(kwArgs));
			return null;
		}

		//	execute should use the async connection unless an SQLConnection is passed with the kwArgs.
		var s = prep(kwArgs, new air.SQLStatement(), true),
			d = query(kwArgs, s);
		this.onExecute(kwArgs);
		return d;	//	dojo.Deferred
	};

	//	event stubs
	this.onError = function(/* air.Event */evt){ };
	this.onOpen = function(/* air.Event */evt){ };
	this.onClose = function(/* air.Event */evt){ };

	//	analysis & maintenance
	this.onAnalyze = function(/* air.Event */evt){ };
	this.onDeanalyze = function(/* air.Event */evt){ };
	this.onCompact = function(/* air.Event */evt){ };
	this.onInitialize = function(){ };
	this.onCreate = function(){ 
		inCreation = false;
	};

	//	adding other database files
	this.onAttach = function(/* air.Event */evt){ };
	this.onDetach = function(/* air.Event */evt){ };

	//	transactions
	this.onBegin = function(/* air.Event */evt){ };
	this.onCommit = function(/* air.Event */evt){ };
	this.onRollback = function(/* air.Event */evt){ };

	//	SQL execution
	this.onFetch = function(/* qd.services.data.fetch.__Args */kwArgs){ };
	this.onExecute = function(/* qd.services.data.fetch.__Args */kwArgs){ };
	this.onCancel = function(/* air.Event */evt){ };
	this.onInsert = function(/* air.Event */evt){ };
	this.onUpdate = function(/* air.Event */evt){ };
	this.onDelete = function(/* air.Event */evt){ };
})();
