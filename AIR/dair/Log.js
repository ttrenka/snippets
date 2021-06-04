dojo.provide("dair.Log");
dojo.require("dair.File");


dojo.declare("dair.Log", null, {
	
	extension:"txt",
	contents:"",
	cache:[],
	timeBetweenWrites:100,
	
	constructor: function(/*Object*/options){
		
		// options:
		//		path: String
		//			Absolute path from the root of your drive
		//			OR 
		//			a user directory: 
		//				user:		 User's root directory
		//				documents: 	 User's Documents directory
		//				desktop: 	 User's Desktop directory
		//				application: User's Application directory
		//				applicationStorage: User's Application Storage directory
		//		folder: String
		//			Name of folder to create in target directory
		//			Used with a user directory, not an
		//			absolute path
		//		name: String
		//			Name of file (always .txt, leave extension off)
		//
		//		extension: String
		//			The extension of the file. Defaults to TXT
		//		append: Boolean
		//			Clears file and starts new on start
		//		timeStamp: Boolean
		//			Adds time stamp to file name
		//
		
		var d = new Date(), sp = "", sp2 = ".";
		var dstr = function(type){
			var n = d["get"+type]();
			n = type=="Month" ? n+1 : n;
			return type=="FullYear"
				? n.toString().substring(2,4)
				: n.toString().length==1?"0"+n:n+"";
		}
		var name = options.name 
			+ (options.timeStamp 
				? "["+dstr("FullYear")+sp+dstr("Month")+sp+dstr("Date")+sp2+dstr("Hours")+sp2+dstr("Minutes")+sp2+dstr("Seconds")+"]"  
				: "" ) + "." + this.extension;
		
		var f = options.folder
		if(f){
			f = f.replace(new RegExp(/\\/g), "/");
			f = (f.lastIndexOf("/")==f.length-1) ?  f : f+"/";
		} 
		
		var endPath = f + name;
		
		if(air.File[options.path+"Directory"]){
			console.log("USER DIR")
			this.file = air.File[options.path+"Directory"].resolvePath(endPath);
		}else{
			console.log("ABS PATH")
			var p = options.path;
			if(p){
				p = p.replace(new RegExp(/\\/g), "/");
				p = (p.lastIndexOf("/")==p.length-1) ?  p : p+"/";
			}
			var endPath = p + name;
			this.file = new air.File(endPath);
		}

		console.log("LOG FILE PATH:", this.file.nativePath);
		
		this.fileStream = new air.FileStream();
		
		if (this.file.exists && this.append) {
			this.fileStream.open(this.file, air.FileMode.READ);
			this.contents = this.fileStream.readMultiByte(this.fileStream.bytesAvailable, air.File.systemCharset) || "";
		}
		
		var self = this;
		setInterval(function(){
			self._checkWrite();
		}, this.timeBetweenWrites);
	},
	
	_checkWrite: function(){
		if(this.cache.length){
			this.writeToFile(this.cache.join("\n"));
		}
		this.cache = [];
	},
	write: function(str){
		this.cache.push(str);
	},
	writeToFile:function(str){
		this.contents += str + "\n";
		this.fileStream.openAsync(this.file, air.FileMode.WRITE);
		this.fileStream.writeUTFBytes(this.contents);
		this.fileStream.close();
	}
})