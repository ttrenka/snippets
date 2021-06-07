<%@Language="JScript"%>
<!-- #include file="../../../lib/config/config.js" -->
<!-- #include file="../../../lib/crawlr/_base.js" -->
<%
crawlr.require("lib.crawlr.Request");
crawlr.require("lib.crawlr.Response");
crawlr.require("lib.session");

//	set the content type.  THIS MUST HAPPEN FIRST!
crawlr.Response.addHeader("Content-Type", "application/json; charset=iso-8859-1");

if(!crawlr.Request.POST.get("image")){
	var obj = {
		"endpoint": "manage/branding.json",
		"error": "The request for this endpoint is missing the parameters for the call."
	};
	Response.Write(json.serialize(obj));
	Response.End();
}

//	we need to stub these things out to allow LESS to work on the server-side.
var window = this;
var location = window.location = { 
	port: 0,
	href: ''
};
var input = null;
var fso = new ActiveXObject("Scripting.FileSystemObject");
var xhrutil = {
	readText: function (filename) {
		//WScript.StdErr.WriteLine("readText: " + filename);
		var file = fso.OpenTextFile(filename);
		// Don't error on empty files
		var text = file.AtEndOfStream ? '' : file.ReadAll();

		// Strip off any UTF-8 BOM
		var utf8bom = String.fromCharCode(0xEF, 0xBB, 0xBF);
		if (text.substr(0, utf8bom.length) == utf8bom) {
			text = text.substr(utf8bom.length);
		}
		file.Close();
		return text;
	}
};
var input = null;

// XMLHttpRequest that just gets local files. Used when processing "@import"
function XMLHttpRequest(){}
XMLHttpRequest.prototype = {
	open: function (method, url, async) {
		this.url = url;
	},
	send: function () {
		// get the file path relative to the input less file
		var filename = fso.GetAbsolutePathName(fso.BuildPath(fso.GetParentFolderName(input),this.url));
		
		if (filename.match(/.less$/i) && !fso.FileExists(filename)) {
			filename = filename.replace(/.less$/i, '.less.css');
		}
		
		try {
			this.status = 200;
			this.responseText = xhrutil.readText(filename);
		}
		catch (e) {
			this.status = 404;
			this.responseText = e.description;
			console.error(this.responseText);
		}
	},
	setRequestHeader:  function () {},
	getResponseHeader: function () {}
};

// Fake document
var document = {
	_dummyElement: {
		childNodes: [], 
		appendChild: function(){},
		style: {}
	},
	getElementsByTagName: function(){ return []; },
	getElementById: function(){ return this._dummyElement; },
	createElement:  function(){ return this._dummyElement; },
	createTextNode: function(){ return this._dummyElement; }
};        
%>
<!-- #include file="../../../js/less-1-2-1.js" -->
<%
//	START PROCESSING, CSS first.
var ret = {
	results: {}
};

// get the image data and save it right in a LESS file.
var path = crawlr.config.root();

//	grab our template
var tmp = crawlr.read(path + "css\\template.less");

//	read our POST variables for the CSS generation.
var width = parseInt(crawlr.Request.POST.get("width"), 10),
	height = parseInt(crawlr.Request.POST.get("height"), 10),
	imgData = decodeURIComponent(crawlr.Request.POST.get("image")),
	obj = crawlr.Request.POST.get("brandingObject");

tmp = tmp.replace(/___width___/g, width)
	.replace(/___height___/g, height)
	.replace(/___imgdata___/g, imgData)
	.replace(/___login_width___/g, (304 + width))
	.replace(/___login_margin___/g, (11 + width));

crawlr.rm(path + "css\\b\\" + obj + ".less");
crawlr.write(path + "css\\b\\" + obj + ".less", tmp);
input = path + "css\\b\\" + obj + ".less";

//	compile the LESS
var parser = new less.Parser({ filename: obj + ".less" });
try {
	parser.parse(tmp, function(err, tree){
		if(err){
			for(var i in err){
				if(err[i]){
					console.error("LESS Parser error >>>>> ", err[i]);
				}
			}
		} else {
			var css = tree.toCSS({ compress: true });
			crawlr.rm(path + "css\\b\\" + obj + ".css");
			crawlr.write(path + "css\\b\\" + obj + ".css", css);
		}
	});
} catch(e){
	for(var i in e){
		if(e[i]){
			console.error("General LESS error >>>>> ", e[i]);
		}
	}
}

//	process the rest, brand first
var id = crawlr.Request.GET.get("id"),
	params = {
		companyName: "" + crawlr.Request.POST.get("companyName"),
		platformName: "" + crawlr.Request.POST.get("platformName"),
		platformURL: "" + crawlr.Request.POST.get("platformURL"),
		brandingObject: "" + crawlr.Request.POST.get("brandingObject"),
		companyURL: "" + crawlr.Request.POST.get("companyURL"),
		reportEmail: "" + crawlr.Request.POST.get("reportEmail"),
		agencyMarkup: parseFloat(crawlr.Request.POST.get("agencyMarkup"), 10)
	};
if(!id){
	//	this is a new brand, do an INSERT
	var sql = "INSERT INTO branding (companyName, platformName, platformURL, brandingObject, companyURL, reportEmail, agencyMarkup) "
		+ "VALUES (:companyName, :platformName, :platformURL, :brandingObject, :companyURL, :reportEmail, :agencyMarkup)";
	id = crawlr.push(sql, params);
	params.id = id;
} else {
	//	this is an update.
	params.id = id;
	var sql = "UPDATE branding SET companyName = :companyName, platformName = :platformName, platformURL = :platformURL, "
		+ "brandingObject = :brandingObject, companyURL = :companyURL, reportEmail = :reportEmail, agencyMarkup = :agencyMarkup "
		+ "WHERE id = :id ";
	crawlr.push(sql, params);
}

//	now the account
var account = crawlr.Request.POST.get("account-id"),
	accParams = {
		accountName: crawlr.Request.POST.get("account-accountName"),
		accountType: crawlr.Request.POST.get("account-accountType"),
		ownerID: crawlr.Request.POST.get("account-ownerID"),
		userID: crawlr.Request.POST.get("account-userID"),
		brandingID: id
	};
if(account == "_new_"){
	//	this is a new account, do an insert and store the new account ID
	var sql = "INSERT INTO account (accountName, ownerID, brandingID, accountType, userID) "
		+ "VALUES (:accountName, :ownerID, :brandingID, :accountType, :userID)";
	account = crawlr.push(sql, accParams);
	ret.results.account = account;
} else {
	//	this is an update.
	accParams.id = account;
	var sql = "UPDATE account SET accountName = :accountName, accountType = :accountType, "
		+ "ownerID = :ownerID, userID = :userID, brandingID = :brandingID "
		+ "WHERE id = :id ";
	crawlr.push(sql, accParams);
	ret.results.account = account;
}

//	finish off the results object
ret.results = crawlr.mixin(ret.results, params, { image: imgData });

if(crawlr.config.isDebug() && user.hasRole(Roles.Admin)){
	ret.console = console.toJson();
	ret.console.unshift({ type: "warn", message: "---------------------------------------------" });
	ret.console.unshift({ type: "warn", message: "SERVER: admin/manage/branding.json" });
	ret.console.unshift({ type: "warn", message: "---------------------------------------------" });
	ret.console.push({ type: "warn", message: "---------------------------------------------" });
}

//	send out the results.
var out = json.serialize(ret);
if(crawlr.Request.GET.get("callback")){
	out = crawlr.Request.GET.get("callback") + "(" + out + ");";
}
Response.Write(out);
%>
