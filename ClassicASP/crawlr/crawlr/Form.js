crawlr.Form = function(node){
	this.node			= node;
	this.showOptional	= true;
	this.emails			= {};
	this.components		= null;
	this.width			= 400;
	this.fieldSpacing	= 10;

	this._loadForm();
	this._loadComponents();
	
	// check for and validate the visitor token
	this.visitorToken = crawlr.Request.cookies.get("vt");
	if(this.visitorToken && /^[a-z0-9]{32}$/.test(this.visitorToken)){
		console.debug('Found visitor token "' + this.visitorToken + '"');

		// delete any old tokens first
		crawlr.push("DELETE FROM formVisitors WHERE VisitorToken = '" + crawlr.sqlSafe(this.visitorToken) + "' AND Expires IS NOT NULL AND Expires < GETDATE()");
		
		var r = crawlr.fetch(
			"SELECT V.FormComponentId, V.Value",
			"FROM	formVisitors V",
			"JOIN	formComponentAssoc CA ON",
			"		CA.FormComponentId = V.FormComponentId AND",
			"		(FormId = " + this.node.formId + " OR FormId IS NULL)",
			"WHERE	V.VisitorToken = '" + crawlr.sqlSafe(this.visitorToken) + "'"
		);
		
		var values = {};
		for(var i=0, len=r.items.length; i<len; i++){
			values[r.items[i]["FormComponentId"]] = r.items[i]["Value"];
		}
		this.components.getRoot().setValues(values);
	}
	
	console.debug("---- BEGIN POSTBACK PROCESSING ----	");
	this.components.getRoot().processPostBack();
	console.debug("---- END POSTBACK PROCESSING ----");
	
	this._render();
};

crawlr.extend(crawlr.Form, {
	_loadForm: function(){
		var site = crawlr.Site.current(),
			siteId = site.siteId,
			r = crawlr.fetch(
				"SELECT	F.RedirectUrl, F.ShowOptional, M.FormEmailId, M.Type, M.Subject, M.TextMessage, M.HtmlMessage,",
				"		M.FromAddress, M.ToAddress, M.CcAddress, M.DealerOverrideFrom, M.DealerOverrideTo, M.DealerOverrideCc",
				"FROM	forms F",
				"LEFT JOIN formEmails M ON M.FormId = F.FormId",
				"WHERE	F.FormId = " + this.node.formId
			).items;
		
		if(!r.length){ throw "Form: FormId " + this.node.formId + " not found in database"; }
		this.node.redirectUrl	= r[0]["RedirectUrl"];
		this.showOptional		= r[0]["ShowOptional"];

		for(var i=0, len=r.length; i<len; i++){
			if(r[i]["FormEmailId"]){
				this.emails[r[i]["Type"]] = {
					from:		siteId == 1 || !r[i]["DealerOverrideFrom"] || !site.formFromAddress ? r[i]["FromAddress"] : site.formFromAddress,
					to:			siteId == 1 || !r[i]["DealerOverrideTo"] || !site.formToAddress ? r[i]["ToAddress"] : site.formToAddress,
					cc:			siteId == 1 || !r[i]["DealerOverrideCc"] || !site.formCcAddress ? r[i]["CcAddress"] : site.formCcAddress,
					subject:	r[i]["Subject"] || "No subject",
					text:		r[i]["TextMessage"],
					html:		r[i]["HtmlMessage"]
				};
			}
		}
	},
	
	_loadComponents: function(){
		var r = crawlr.fetch(
			"SELECT	ParentFormComponentId, FormComponentId, Params",
			"FROM	formComponentAssoc",
			"WHERE	FormId = " + this.node.formId + " OR FormId IS NULL",
			"ORDER BY SortOrder"
		);
		this.components = new crawlr.FormComponentTree(r.items, this);
		
		// add the honeypot
		this.components.getRoot().addChild(crawlr.mixin({ id:0, form:this }, crawlr.FormComponents.getComponent(0)));
	},
	
	_getArgs: function(s){
		var r = /\#[^\(]+\(([\S\s]+?)\)\#/g.exec(s);
		if(r && r.length > 1){
			try{
				return eval("([" + r[1].replace(/\r/g,"\\r").replace(/\n/g,"\\n") + "])");
			}catch(e){}
		}
		return [];
	},
	
	_getSelectedSeminarInfo: function(fields){
		var id = fields.getByType("seminarEventId");
		if(id){
			var field = fields.getByType("seminarevents");
			if(field){
				var s = field.params.seminars || [];
				for(var i=0, len=s.length; i<len; i++){
					if(s[i].id == id.value){
						return s[i];
					}
				}
			}
		}
		return null;
	},
	
	_processTokens: function(s, fields, isHtml){
		if(/\#dealerinfo\([\S\s]+?\)\#/.test(s)){
			console.debug("---- #dealerinfo()#");
			if(crawlr.Site.current().siteId == 1){
				var postalCode = fields.getByType("postalcode"),
					country = fields.getByType("countrydropdown"),
					r = null;
			
				if(postalCode && country){
					if(/(usa|canada)/ig.test(country.value)){
						r = crawlr.fetch(
							"SELECT	L.Name, L.Address1, L.Address2, L.City, L.Region, L.PostalCode, L.Phone, L.Contact",
							"FROM	distPostalCodes PC",
							"JOIN	distMaster M ON M.id = PC.distMaster AND M.Status IN (" + crawlr.config.status() + ")",
							"JOIN	distLocation L ON L.id = PC.distLocation AND L.distMaster = M.id AND L.Status IN (" + crawlr.config.status() + ")",
							"WHERE	PC.PostalCode = '" + crawlr.sqlSafe(postalCode.value) + "'"
						).items;
					}else{
						r = crawlr.fetch(
							"SELECT	L.Name, L.Address1, L.Address2, L.City, L.Region, L.PostalCode, L.Phone, L.Contact",
							"FROM	stdCountry C",
							"JOIN	distLocation L ON L.Status IN (" + crawlr.config.status() + ") AND L.Country = C.Id",
							"JOIN	distMaster M ON M.id = L.distMaster AND M.Status IN (" + crawlr.config.status() + ")",
							"WHERE	C.Name = '" + crawlr.sqlSafe(country.value) + "'"
						).items;
					}
				}
			
				if(r && r.length == 1){
					var i = r[0];
					var v = [ i["Name"], "Phone: " + i["Phone"], i["Address1"] ];
					if(i["Address2"] && i["Address2"].length){ v.push(i["Address2"]); }
					v.push(i["City"] + ", " + i["Region"] + " " + i["PostalCode"]);
					if(i["Contact"] && i["Contact"].length){ v.push("Contact: " + i["Contact"]); }
					for(var j=0; j<v.length; j++){ v[j] = crawlr.escapeHtml(v[j]); }
					s = s.replace(/\#dealerinfo\(([\S\s]+?)\)\#/g, this._getArgs(s)[0] + v.join(isHtml ? "<br>\n" : "\n"));
				}else{
					s = s.replace(/\#dealerinfo\(([\S\s]+?)\)\#/g, "");
				}
			}else{
				s = s.replace(/\#dealerinfo\(([\S\s]+?)\)\#/g, "");
			}
		}
		if(/\#now\([\S\s]+?\)\#/.test(s)){
			var args = this._getArgs(s);
			console.debug("---- #now(" + json.serialize(args) + ")# -&gt; " + crawlr.formatDateTime(new Date(), args[0]));
			s = s.replace(/\#now\(([\S\s]+?)\)\#/g, crawlr.formatDateTime(new Date(), args[0]));
		}
		if(/\#formvalue\([\S\s]+?\)\#/.test(s)){
			var r = s.match(/\#formvalue\(([\S\s]+?)\)\#/g) || [];
			for(var i=0, len=r.length; i<len; i++){
				var args = this._getArgs(r[i]);
				var value = args.length > 1 ? args[1] : "";
				var field = fields.getById(args[0]);
				if(field){
					value = field.value;
					// !!! we may need to support other types
					if(field.type != null){
						if(field.type == "yesno"){
							value = util.toYesNo(value);
						}else if(field.type == "newsletter"){
							value = util.toYesNoAlreadyReceive(value);
						}
					}
				}
				console.debug("---- #formvalue(" + json.serialize(args) + ")# -&gt; " + value);
				s = s.replace(/\#formvalue\(([\S\s]+?)\)\#/, isHtml ? crawlr.escapeHtml(value) : value);
			}
		}
		if(/\#seminar_name\#/.test(s)){
			var v = "Unknown";
			var seminar = this._getSelectedSeminarInfo(fields);
			if(seminar){
				v = seminar.title;
			}
			console.debug("---- #seminar_name# -&gt; " + v);
			s = s.replace(/\#seminar_name\#/g, v);
		}
		if(/\#host_name\#/.test(s)){
			var hn = "http://" + crawlr.Site.current().hostName;
			console.debug("---- #host_name# -&gt; " + hn);
			s = s.replace(/\#host_name\#/, hn);
		}
		if(/\#seminar_to_attend\#/.test(s)){
			// (ID 2641) September 16, 2008 12:00 p.m., Knoxville TN
			var sta = "";
			var field = fields.getByType("seminarEventId");
			if(field){
				var id = field.value;
				var field = fields.getByType("seminarevents");
				if(field && field.params.seminars){
					var seminars = field.params.seminars;
					for(var i=0, len=seminars.length; i<len; i++){
						if(seminars[i].id == id){
							sta = "(ID " + id + ") " + crawlr.formatDateTime(seminars[i].startTime) + ", " + seminars[i].city + ", " + seminars[i].region;
							break;
						}
					}
				}
			}
			console.debug("---- #seminar_to_attend# -&gt; " + sta);
			s = s.replace(/\#seminar_to_attend\#/g, sta);
		}
		if(/\#registered_seminars\#/.test(s)){
			console.debug("---- #registered_seminars#");
			var v = "";
			try{
				var field = fields.getByType("seminarevents");
				if(!field || !field.params.seminars){ throw "No seminarevents field found"; }
				var seminars = field.params.seminars || [];
				var events = eval('([' + field.value + '])');
				for(var i=0, len=events.length; i<len; i++){
					// find the seminar
					for(var j=0, len2=seminars.length; j<len2; j++){
						if(events[i] == seminars[j].id){
							if(isHtml){
								v += '<li><b>' + crawlr.escapeHtml(seminars[j].title) + ', ' + crawlr.escapeHtml(crawlr.formatDateTimeRange(seminars[j].startTime, seminars[j].endTime)) + '</b><br>\n' +
									crawlr.escapeHtml(seminars[j].dealer) + ' ' + crawlr.escapeHtml(seminars[j].locationTitle) + '<br>\n' +
									crawlr.escapeHtml(seminars[j].address1) + '<br>\n' +
									(seminars[j].address2 && seminars[j].address2.length ? crawlr.escapeHtml(seminars[j].address2) + '<br>\n' : '') +
									crawlr.escapeHtml(seminars[j].city + ', ' + seminars[j].region + ' ' + seminars[j].postalCode) + '</li>\n';
							}else{
								v += '- ' + seminars[j].title + ', ' + crawlr.formatDateTimeRange(seminars[j].startTime, seminars[j].endTime) + '\n' +
									'    ' + seminars[j].dealer + ' ' + crawlr.escapeHtml(seminars[j].locationTitle) + '\n' +
									'    ' + seminars[j].address1 + '\n' +
									(seminars[j].address2 && seminars[j].address2.length ? '    ' + seminars[j].address2 + '\n' : '') +
									'    ' + seminars[j].city + ', ' + seminars[j].region + ' ' + seminars[j].postalCode + '\n\n';
							}
							break;
						}
					}
				}
			}catch(e){
				//console.debug(e);
			}
			s = s.replace(/\#registered_seminars#/g, (isHtml ? '<ul>' + v + '</ul>' : v));
		}
		if(/\#seminar_registerer\#/.test(s)){
			var v = "someone"; // this is probably not awesome
			var field = fields.getByType("seminarRegisterer");
			if(field){
				v = field.value;
			}
			console.debug("---- #seminar_registerer# -&gt; " + v);
			s = s.replace(/\#seminar_registerer#/g, v);
		}
		if(/\#seminar_guests\([\S\s]+?\)\#/.test(s)){
			console.debug("---- #seminar_guests()#");
			var args = this._getArgs(s), v = "";
			try{
				var field = fields.getByType("seminarattendees");
				if(!field){ throw "No seminarattendees field found."; }
				var attendees = eval('(' + crawlr.unescapeHtmlEntities(field.value) + ')');
				if(!attendees || !attendees.length){ throw "No attendees entered."; }
				v += args[0];
				if(isHtml){ v += '<ul>'; }
				for(var i=0; i<attendees.length; i++){
					if(isHtml){
						v += '<li><b>' + crawlr.escapeHtml(attendees[i].firstName + ' ' + attendees[i].lastName) + '</b><br>\n' + (attendees[i].title.length ? crawlr.escapeHtml(attendees[i].title) + '<br>\n' : "") + crawlr.escapeHtml(attendees[i].email) + '</li>\n';
					}else{
						v += ' - ' + attendees[i].firstName + ' ' + attendees[i].lastName + '\n     ' + attendees[i].title + '\n     ' + attendees[i].email + '\n';
					}
				}
				if(isHtml){ v += '</ul>\n'; }
				v += args[1];
			}catch(e){
				//console.debug(e);
			}
			s = s.replace(/\#seminar_guests\(([\S\s]+?)\)\#/g, v);
		}
		if(/\#formvalues#/.test(s)){
			//console.debug("Found #formvalues#");
			var v = "";
			for(var i=0, len=fields.count(); i<len; i++){
				var field = fields.getByIndex(i);
				var type = field.type || "";
				console.debug("---- #formvalues# [" + type + "]");
				switch(type){
					case "formvalue":
						var formvalue = field.params.value;
						var value = this._processTokens(formvalue, fields, isHtml);
						//console.debug("Found a formvalue! " + formvalue + " -&gt; " + value);
						v += field.emailLabel + ":\t" + value + '\n';
						break;
					case "dimensions":
						var label = eval('(' + field.emailLabel + ')');
						var value = { width:"", depth:"" };
						if(field.value.length){
							try{
								var tmp = eval('(' + field.value + ')');
								value.width = tmp.width || "";
								value.depth = tmp.depth || "";
							}catch(e){}
						}
						v += label.width + ":\t" + value.width + '\n' +
							label.depth + ":\t" + value.depth + '\n';
						break;
					case "yesno":
						v += field.emailLabel + ":\t" + util.toYesNo(field.value) + '\n';
						break;
					case "newsletter":
						v += field.emailLabel + ":\t" + util.toYesNoAlreadyReceive(field.value) + '\n';
						break;
					case "submitbutton":
						v += field.emailLabel + ":\t" + field.formLabel + '\n';
						break;
					case "seminarevents":
						var seminar = this._getSelectedSeminarInfo(fields);
						if(seminar){
							console.debug("Creating the 5 extra seminar fields");
							v += "Seminar Date:\t" + crawlr.formatDate(seminar.startTime, "M/D/YYYY") + '\n' +
								"Seminar Time:\t" + crawlr.formatTime(seminar.startTime) + '\n' +
								"Seminar Location:\t" + seminar.city + ', ' + seminar.region + '\n' +
								"The dealer code giving the seminar:\t" + seminar.distributorCode + '\n' +
								"The dealer name:\t" + seminar.dealer + '\n';
							//console.debug("Done!");
						}
						break;
					case "seminarRegisterer":
					case "seminarattendees":
					case "seminarEventId":
						// do nothing
						break;
					default:
						v += field.emailLabel + ":\t" + field.value + '\n';
				}
			}
			s = s.replace(/\#formvalues#/g, v);
		}
		return s;
	},
	
	_processEmail: function(email, fields){
		var isHtml = email.html ? true : false;
		var msg = {};
		var debugAddress = crawlr.config.get("emailDebugAddresses") || "";
		msg.from	= this._processTokens(email.from || crawlr.config.systemEmail(), fields);
		msg.to		= debugAddress.length ? debugAddress : this._processTokens(email.to, fields);
		msg.cc		= debugAddress.length ? "" : this._processTokens(email.cc, fields);
		msg.subject	= this._processTokens(email.subject, fields);
		msg.text	= this._processTokens(email.text, fields);
		msg.html	= this._processTokens(email.html, fields, isHtml);
		
		if(msg.text || msg.html){
			console.info(crawlr.escapeHtml(json.serialize(msg)));
			crawlr.sendmail(msg);
		}else{
			console.debug("Email doesn't contain a body! Skipping...");
		}
	},
	
	_render: function(){
		var root = this.components.getRoot();

		console.debug("---- BEGIN FORM PROCESSING ----");
		var output = root.processForm();
		console.debug("---- END FORM PROCESSING ----");
		
		if(crawlr.Request.POST.getKeys().length > 0){
			// if there weren't any errors, then save the values, send some emails, and redirect
			if(output.errorCount){
				console.info("Errors detected, re-displaying the form.");
			}else{
				console.info("Form looks valid, saving...");
				
				// create the fields object and combine all the fields
				var fields = new crawlr.FormFields();
				var formValues = this.node.get("formValues") || [];
				for(var i=0, len=formValues.length; i<len; i++){
					fields.add({
						id:			"NULL",
						type:		"formvalue",
						formLabel:	formValues[i].label,
						emailLabel:	formValues[i].label,
						value:		formValues[i].value,
						params:		{ value:formValues[i].value }
					});
				}
				for(var i=0, len=output.fields.length; i<len; i++){
					fields.add({
						id:			output.fields[i].id,
						type:		output.fields[i].type,
						formLabel:	output.fields[i].formLabel,
						emailLabel:	output.fields[i].emailLabel,
						value:		output.fields[i].value,
						params:		output.fields[i].params
					});
				}

				console.debug(fields.toString());

				var isSeminarsForm = false;
				var vt = this.visitorToken || crawlr.generateUUID();
				var deleteIds = [];
				var visitorValues = [];
				var archiveValues = [];
				var industryField = null;
				
				console.debug("---- BEGIN SAVING VALUES ----");
				for(var i=0, len=fields.count(); i<len; i++){
					var field = fields.getByIndex(i);
					if(!/(group|row|submitbutton|honeypot)/.test(field.type)){
						if(/(seminarattendees|seminarevents)/.test(field.type)){ isSeminarsForm = true; }
						if(field.params.industry){ industryField = field; }
						if(field.params.visitorSave){
							if(this.visitorToken){
								deleteIds.push(field.id);
							}
							visitorValues.push("SELECT '" + vt + "', " + field.id + ", '" + crawlr.sqlSafe(field.formLabel) + "', '" + crawlr.sqlSafe(field.value) + "', " +
								(field.params.visitorExpireHours ? "DATEADD(hh, " + field.params.visitorExpireHours + ", GETDATE())" : "NULL"));
						}
						var value = field.value;
						if(field.type == "formvalue"){
							value = this._processTokens(field.params.value, fields);
						}
						if(field.params.readonly){
							value = field.params.defaultValue || value;
						}
						archiveValues.push("SELECT " + this.node.formId + ", " + field.id + ", '" + crawlr.sqlSafe(field.formLabel) + "', '" + crawlr.sqlSafe(value) + "', '" + vt + "'");
					}
				}
				
				if(this.visitorToken && deleteIds.length){
					crawlr.push("DELETE FROM formVisitors WHERE VisitorToken = '" + this.visitorToken + "' AND FormComponentId IN (" + deleteIds.join(',') + ")");
				}
				if(visitorValues.length){
					crawlr.push("INSERT INTO formVisitors (VisitorToken, FormComponentId, Label, Value, Expires) " + visitorValues.join(" UNION "));
				}
				if(archiveValues.length){
					crawlr.push("INSERT INTO formArchive (FormId, FormComponentId, Label, Value, VisitorToken) " + archiveValues.join(" UNION "));
				}
				console.debug("---- END SAVING VALUES ----");
				
				// set the vt cookie to visitorToken
				if(!this.visitorToken){
					var x = new Date();
					x.setTime(x.getTime() + (365 * 24 * 60 * 60 * 1000));
					Response.Cookies("vt") = vt;
					Response.Cookies("vt").Expires = x.getVarDate();
				}
				
				// seminar stuff
				var seminarEventsField		= null;
				var seminarEvents			= [];
				var seminarAttendeesField	= null;
				var seminarAttendees		= [];
				var seminarRegisterer		= "";
				if(isSeminarsForm){
					seminarEventsField		= root.findFieldByType("seminarevents");
					seminarEvents			= eval('([' + seminarEventsField.value + '])') || [];
					seminarAttendeesField	= root.findFieldByType("seminarattendees");
					try{
						seminarAttendees	= eval('(' + crawlr.unescapeHtmlEntities(seminarAttendeesField.value) + ')') || [];
					}catch(e){}
					seminarRegisterer		= root.byId(seminarAttendeesField.params.firstNameId).value + ' ' + root.byId(seminarAttendeesField.params.lastNameId).value;
					fields.add({ type:"seminarRegisterer", value:seminarRegisterer });
				}
				
				// send some emails
				console.debug("---- BEGIN EMAIL PROCESSING ----");
				for(var type in this.emails){
					try{
						console.debug('Processing a "' + type + '" email');
						
						if(type == "skyline" && isSeminarsForm){
							for(var i=0, len=seminarEvents.length; i<len; i++){
								// send primary info
								console.debug("Processing primary attendee email to skyline");
								var newFields = fields.clone();
								newFields.add({ type:"seminarEventId", value:parseInt(seminarEvents[i]) });
								this._processEmail(this.emails[type], newFields);
								
								// loop throught the guests
								for(var j=0, len2=seminarAttendees.length; j<len2; j++){
									console.debug("Processing guest " + (j+1) + " attendee email to skyline");
									newFields.setById(seminarAttendeesField.params.firstNameId,				seminarAttendees[j].firstName);
									newFields.setById(seminarAttendeesField.params.lastNameId,				seminarAttendees[j].lastName);
									newFields.setById(seminarAttendeesField.params.titleId,					seminarAttendees[j].title);
									newFields.setById(seminarAttendeesField.params.emailId,					seminarAttendees[j].email);
									newFields.setById(seminarAttendeesField.params.leadSource2Id,			"guest");
									newFields.setById(seminarAttendeesField.params.learnedAboutSeminarId,	"Other:\tRegistered by " + seminarRegisterer);
									newFields.setById(seminarAttendeesField.params.contactEmailId,			0);
									newFields.setById(seminarAttendeesField.params.receiveNewsletterId,		0);
									this._processEmail(this.emails[type], newFields);
								}
							}
						}else if(type == "confirmation_guest"){
							var newFields = fields.clone();
							for(var i=0, len=seminarAttendees.length; i<len; i++){
								newFields.setById(seminarAttendeesField.params.firstNameId,	seminarAttendees[i].firstName);
								newFields.setById(seminarAttendeesField.params.lastNameId,	seminarAttendees[i].lastName);
								newFields.setById(seminarAttendeesField.params.titleId,		seminarAttendees[i].title);
								newFields.setById(seminarAttendeesField.params.emailId,		seminarAttendees[i].email);
								this._processEmail(this.emails[type], newFields);
							}
						}else{
							this._processEmail(this.emails[type], fields);
						}
					}catch(e){
						console.error(e);
					}
				}
				console.debug("---- END EMAIL PROCESSING ----");

				// redirect to the thank you page
				if(this.node.redirectUrl.indexOf("get:/") == 0){
					// should be able to pull this from the output.values
					if(industryField){
						Session.Value(String(Request.ServerVariables("http_referer"))) = { industry:industryField.value, industryComponentId:industryField.id };
					}
					this.node.redirectUrl = crawlr.Request.buildDomain() + crawlr.config.href() + this.node.redirectUrl.substring(4);
				}
				console.info("Redirecting to " + this.node.redirectUrl);
				Response.Redirect(this.node.redirectUrl);
				Response.End;
			}
		}

		var n = crawlr.config.newline();
		var counts = root.getElementCounts();
		var url = this.node.url;
		var a = url.match(/\[\[([\u0001-\uFFFF]*?)\]\]/g);
		if(a){
			for(var i=0, len=a.length; i<len; i++){
				url = url.replace(a[i], this.node.get(a[i].replace(/\[\[|\]\]/g, ""))) || "";
			}
		}
		
		crawlr.Response.write(
			'<div class="clear"></div>' + n +
			'<div class="form" style="width:' + this.width + 'px">' + n +
				(!this.showOptional || (this.showOptional && counts.required < counts.total) ? '<div class="reqOptMsg">' + (this.showOptional ? 'All fields are required unless marked as optional.' : 'Required fields are identified with a <span class="required">*</span>.') + '</div>' + n : '') +
				'<form action="' + crawlr.config.href() + '/' + url + '" id="form' + this.node.formId + '" method="post">' + n +
					output.form + n +
				'</form>' + n +
			'</div>' + n, "form"
		);
		crawlr.Response.write('var validatorArgs={form:"form' + this.node.formId + '",fields:' + json.serialize(output.validation).replace(/\t|\n\r|\n/g, "") + '};' + n, "script");
	}
});

crawlr.FormFields = function(){
	this._fields = [];
};

crawlr.extend(crawlr.FormFields, {
	add: function(field){
		var obj = {
			id:			field.id || -1,
			type:		field.type || "",
			formLabel:	field.formLabel || "",
			emailLabel:	field.emailLabel || "",
			value:		field.value || "",
			params:		{}
		};
		if(field.params){
			for(var i in field.params){
				obj.params[i] = field.params[i];
			}
		}
		this._fields.push(obj);
	},

	count: function(){
		return this._fields.length;
	},
	
	getByIndex: function(i){
		return this._fields[i];
	},
	
	getIndexById: function(id){
		for(var i=0, len=this._fields.length; i<len; i++){
			if(this._fields[i].id != null && this._fields[i].id == id){
				return i;
			}
		}
		return null;
	},
	
	getById: function(id){
		var i = this.getIndexById(id);
		if(i){
			return this._fields[i];
		}
		return null;
	},
	
	getByType: function(type){
		for(var i=0, len=this._fields.length; i<len; i++){
			if(this._fields[i].type != null && this._fields[i].type == type){
				return this._fields[i];
			}
		}
		return null;
	},
	
	setById: function(id, value){
		var i = this.getIndexById(id);
		if(i){
			if(this._fields[i].type == "formvalue"){
				this._fields[i].params.value = value;
			}
			this._fields[i].value = value;
		}
	},
	
	clone: function(){
		var fields = new crawlr.FormFields();
		for(var i=0, len=this._fields.length; i<len; i++){
			fields.add(this._fields[i]);
		}
		return fields;
	},
	
	toString: function(){
		var s = '<table border="1"><thead><tr><th>id</th><th>type</th><th>form label</th><th>email label</th><th>value</th><th>params</th></tr></thead><tbody>';
		for(var i=0, len=this._fields.length; i<len; i++){
			s += '<tr><td>' + this._fields[i].id + '</td><td>' + this._fields[i].type + '</td><td>' + this._fields[i].formLabel + '</td><td>' + this._fields[i].emailLabel + '</td><td>' + this._fields[i].value + '</td><td>' + json.serialize(this._fields[i].params).replace(/\t|\n\r|\n/g, "") + '</td></tr>';
		}
		return s + '</tbody></table>';
	}
});

crawlr.FormComponents = new (function(){
	var components = {};
	
	var r = crawlr.fetch(
		"SELECT	FormComponentId, FormLabel, EmailLabel, Type",
		"FROM	formComponents"
	);
	
	for(var i=0, len=r.items.length; i<len; i++){
		components[r.items[i]["FormComponentId"]] = {
			formLabel:	r.items[i]["FormLabel"],
			emailLabel:	r.items[i]["EmailLabel"],
			type:		r.items[i]["Type"]
		};
	}
	
	this.getComponent = function(id){
		return id != null ? components[id] || {} : null;
	};
})();

crawlr.FormComponentsOptions = new (function(){
	var options = {};
	
	var r = crawlr.fetch(
		"SELECT	FormComponentId, Label, Value, Selected",
		"FROM	formComponentOptions",
		"ORDER BY FormComponentId, SortOrder"
	);
	
	for(var i=0, len=r.items.length; i<len; i++){
		if(!options[r.items[i]["FormComponentId"]]){
			options[r.items[i]["FormComponentId"]] = [];
		}
		options[r.items[i]["FormComponentId"]].push({
			label:		r.items[i]["Label"],
			value:		r.items[i]["Value"],
			selected:	r.items[i]["Selected"]
		});
	}
	
	this.getOptions = function(id){
		return id ? options[id] || [] : null;
	};
})();

crawlr.FormComponentsCountries = new (function(){
	var countries = [];
	
	var r = crawlr.fetch(
		"SELECT	Id, Name, RegionType",
		"FROM	stdCountry",
		"ORDER BY SortOrder"
	).items;
	
	for(var i=0, len=r.length; i<len; i++){
		countries.push({
			id:			r[i]["Id"],
			name:		r[i]["Name"],
			regionType:	r[i]["RegionType"]
		});
	}
	
	this.getCountries = function(){
		return countries;
	};
	
	this.getRegionTypeByCountry = function(country){
		for(var i=0, len=countries.length; i<len; i++){
			if(countries[i].name == country || (i == 0 && country && !country.length)){
				return countries[i].regionType;
			}
		}
		return "Region";
	};
})();

crawlr.FormComponentTree = function(r, form){
	this.root = new crawlr.FormComponentNode({ form:form });
	for(var i=0, len=r.length; i<len; i++){
		if(r[i]["ParentFormComponentId"] == null){
			var n = this.root.addChild(
				crawlr.mixin({
						id: r[i]["FormComponentId"],
						params: r[i]["Params"] ? eval('({' + r[i]["Params"] + '})') : {},
						form: form
					}, crawlr.FormComponents.getComponent(r[i]["FormComponentId"])
				)
			);
			n.addChildren(r);
		}
	}
	this.getRoot = function(){ return this.root; };
};

crawlr.FormComponentNode = function(obj){
	obj = obj || {};
	this.id			= obj.id;
	this.parent		= obj.parent;
	this.form		= obj.form;
	this.params		= obj.params || {};
	this.value		= obj.value || "";
	this.formLabel	= obj.formLabel || "";
	this.emailLabel	= obj.emailLabel || "";
	this.type		= obj.type || "unknown";
	this.error		= null;
	this.children	= [];
};

crawlr.extend(crawlr.FormComponentNode, {
	childCount: function(){
		return this.children.length;
	},

	addChild: function(obj, pos){
		obj.parent = this;
		var n = new crawlr.FormComponentNode(obj);
		if(pos != null){
			this.children.splice(pos, 0, n);
		}else{
			this.children.push(n);
		}
		return n;
	},
	
	addChildren: function(r){
		for(var i=0, len=r.length; i<len; i++){
			if(r[i]["ParentFormComponentId"] == this.id){
				var n = this.addChild(
					crawlr.mixin({
							id: r[i]["FormComponentId"],
							params: r[i]["Params"] ? eval('({' + r[i]["Params"] + '})') : {},
							form: this.form
						}, crawlr.FormComponents.getComponent(r[i]["FormComponentId"])
					)
				);
				n.addChildren(r);
			}
		}
	},
	
	setValues: function(values){
		if(this.id != null && values[this.id]){
			this.value = values[this.id];
		}
		for(var i=0, len=this.children.length; i<len; i++){
			this.children[i].setValues(values);
		}
	},
	
	getElementCounts: function(){
		var obj = { total:0, required:0 };
		if(this.id != null && !/(row|group|honeypot|submitbutton|formvalue)/i.test(this.type)){
			obj.total++;
			if(this.params.required){
				obj.required++;
			}
		}
		for(var i=0, len=this.children.length; i<len; i++){
			var t = this.children[i].getElementCounts();
			obj.total += t.total;
			obj.required += t.required;
		}
		return obj;
	},
	
	byId: function(id){
		if(this.id == id){ return this; }
		for(var i=0, len=this.children.length; i<len; i++){
			var field = this.children[i].byId(id);
			if(field != null){ return field; }
		}
		return null;
	},
	
	findIdByType: function(type){
		if(this.id != null && this.type == type){ return this.id; }
		for(var i=0, len=this.children.length; i<len; i++){
			var id = this.children[i].findIdByType(type);
			if(id != null){ return id; }
		}
		return null;
	},
	
	findFieldByType: function(type){
		if(this.id != null && this.type == type){ return this; }
		for(var i=0, len=this.children.length; i<len; i++){
			var field = this.children[i].findFieldByType(type);
			if(field != null){ return field; }
		}
		return null;
	},
	
	_computeFieldWidth: function(isRow, childCount){
		if(!this.params.width){ return 0; }
		
		var w = "" + this.params.width, q = w.indexOf('%'), fw = this.form.width;
		if(childCount > 1){
			fw -= (childCount - 1) * this.form.fieldSpacing;
		}
		if(q != -1){
			return Math.floor(fw * (w.substring(0, q) - 0) / 100.0) - (childCount > 1 ? 2 : 0);
		}
		return parseInt(w.replace(/px/ig, ""));
	},

	_prefix: function(idx, className){
		var style = "", childCount = this.parent.childCount(), isRow = this.parent.type == "row", width = this._computeFieldWidth(isRow, childCount);
		className = (this.error ? "inputError" : "") + (className || "");
		if(!isRow && className.indexOf("row") == -1){ className += (className.length ? " " : "") + "row"; }
		if(childCount > 1){ style += "overflow:hidden;padding-right:2px;"; }
		if(width){ style += "width:" + width + "px;"; }
		return (isRow && idx ? '<div style="height:1px;width:' + this.form.fieldSpacing + 'px"></div>' : "") +
			'<div' + (className.length ? ' class="' + className + '"' : '') + (style.length ? ' style="' + style + '"' : '') + '>';
	},
	
	_required: function(){
		if(this.params.required && !this.form.showOptional){
			return ' <span class="required">*</span>';
		}
		if(!this.params.required && this.form.showOptional){
			return ' <span class="optional">(optional)</span>';
		}
		return "";
	},
	
	_label: function(id){
		return '<label for="' + id + '">' + crawlr.escapeHtml(this.formLabel) + this._required() + '</label>';
	},
	
	_error: function(e){
		if(e){ this.error = e; }
		return this.error ? '<span class="msg">' + crawlr.escapeHtml(this.error) + '</span>' : "";
	},
	
	_an: function(s){
		return s.indexOf("how ") == 0 ? "" : ("aeiouh".indexOf(s.substring(0,1)) != -1 ? "an " : "a ");
	},
	
	processPostBack: function(){
		this.value = this.value || this.params.defaultValue || "";
		
		if(this.id != null && crawlr.Request.POST.getKeys().length > 0 && !/(group|row|submitbutton|formvalue)/.test(this.type)){
			this.value = util.trim(crawlr.Request.POST.get('c' + this.id) || "");
			//console.debug("postback " + this.id + " [" + this.type + "] " + this.formLabel + " = \"" + this.value + "\"");
		}
		
		for(var i=0, len=this.children.length; i<len; i++){
			this.children[i].processPostBack();
		}
	},
	
	processForm: function(idx){
		var r = { form:"", validation:[], fields:[], errorCount:0 };
		var n = crawlr.config.newline();
		var id = 'c' + this.id;
		var maxlength = 512;
		var _t = this;
		var isPostBack = crawlr.Request.POST.getKeys().length > 0;
		var label = this.formLabel.toLowerCase().replace(/\bi(?![a-z])/g,"I").replace(/skyline/ig, "Skyline");
		
		function v(t, i){ r.validation.push([ t, i, _t.formLabel ]); }
		function e(m){ r.errorCount++; _t._error(m); }
		
		if(this.id != null){
			//console.debug("Processing node " + this.id + " [" + this.type + "] " + this.formLabel);
			
			if(!/(group|row|honeypot)/.test(this.type)){
				r.fields.push(this);
			}
			
			switch(this.type){
				case "countrydropdown":
					// form output
					var s = "", countries = crawlr.FormComponentsCountries.getCountries();
					for(var i=0, len=countries.length; i<len; i++){
						s += '<option rt="' + countries[i].regionType + '" code="' + countries[i].id + '" value="' + crawlr.escapeHtml(countries[i].name) + '"' + (this.value == countries[i].name ? ' selected="selected"' : '') + '>' + crawlr.escapeHtml(countries[i].name) + '</option>';
					}
					r.form += this._prefix(idx) + this._label(id) + '<select class="select" id="' + id + '" name="' + id + '">' + s + '</select>' + this._error() + '</div>' + n;
					break;
				
				case "datepicker":
					// validation
					if(this.params.required){
						v("isNotNull", id);
						if(isPostBack && !this.value.length){ e("Please enter " + this._an(label) + label + "."); }
					}
					v("isDate", id);
					if(isPostBack && this.value.length && !/^(0[1-9]|1[012]|[1-9])[- /.](0[1-9]|[1-9]|[12][0-9]|3[01])[- /.](19|20)\d\d$/.test(this.value)){ e("Please enter " + this._an(label) + label); }
					
					if(this.params.validateFutureDate){
						v("isFutureDate", id);
						if(isPostBack && this.value.length && (new Date(this.value)).getTime() < (new Date()).getTime()){ e("Please a valid date in the format mm/dd/yyyy."); }
					}
					
					// form output
					r.form += this._prefix(idx, "datepicker") + this._label(id) + '<input dojoType="skyline.DatePicker" class="text" name="' + id + '" type="text" value="' + this.value + '" maxlength="' + (this.params.maxlength || 10) + '"/>' + this._error() + '</div>' + n;
					break;
				
				case "dimensions":
					// validation
					if(this.params.required && isPostBack){
						var width = "", depth = "";
						try{
							if(this.value.length){
								var tmp = eval('(' + this.value + ')');
								if(tmp && tmp.width){ width = util.trim("" + tmp.width); }
								if(tmp && tmp.depth){ depth = util.trim("" + tmp.depth); }
							}
						}catch(e){}
						if(!width.length || !depth.length){ e("Please enter " + this._an(label) + label + "."); }
					}
					
					// form output
					r.form += this._prefix(idx) + this._label(id) + '<input dojoType="skyline.Dimensions" name="' + id + '" type="hidden" value="' + crawlr.escapeHtmlEntities(this.value) + '"' + (this.params.required ? ' required="true"' : '') + '/>' + this._error() + '</div>' + n;
					break;

				case "dropdown":
					var options = crawlr.FormComponentsOptions.getOptions(this.id);
					
					// validation
					if(this.params.validateFirstNotSelectable){
						v("isNotFirst", id);
						if(isPostBack){
							// because we don't have access to the selectedIndex, just loop backwards until we get a match
							for(var i=options.length-1; i>=0; i--){
								if(options[i].value == this.value){
									if(i==0){
										e("Please select " + this._an(label) + label);
									}
									break;
								}
							}
						}
					}
					
					// form output
					var s = "";
					for(var i=0, len=options.length; i<len; i++){
						s += '<option value="' + crawlr.escapeHtml(options[i].value) + '"' + ((this.value.length && this.value == options[i].value) || (!this.value.length && options[i].selected) ? ' selected="selected"' : '') + '>' + crawlr.escapeHtml(options[i].label) + '</option>';
					}
					r.form += this._prefix(idx) + this._label(id) + '<select class="select" name="' + id + '">' + s + '</select>' + this._error() + '</div>' + n;
					break;
					
				case "group":
					for(var i=0, len=this.children.length; i<len; i++){
						var t = this.children[i].processForm(i);
						r.form += t.form;
						r.validation = r.validation.concat(t.validation);
						r.fields = r.fields.concat(t.fields);
						r.errorCount += t.errorCount;
					}
					break;
				
				case "honeypot":
					// validation
					if(isPostBack && this.value && this.value.length){ e("Honeypot contains a value!"); }
					
					// form output
					r.form += '<div class="row magikRow" style="overflow:hidden;padding-right:2px;">' + this._label(id) + '<input class="text" name="' + id + '" type="text" value="" maxlength="512"/></div>' + n;
					break;

				case "multilinetextbox":
					// validation
					if(this.params.required){
						v("isNotNull", id);
						if(isPostBack && !this.value.length){ e("Please enter " + this._an(label) + label + "."); }
					}
					
					// form output
					r.form += this._prefix(idx) + this._label(id) + '<textarea class="textarea" name="' + id + '" maxlength="' + (this.params.maxlength || maxlength) + '">' + this.value + '</textarea>' + this._error() + '</div>' + n;
					break;
				
				case "regiondropdown":
					// validation
					if(this.params.required){
						v("isNotNull", id);
					}
					if(this.params.validateFirstNotSelectable){
						v("isNotFirst", id);
					}
					if((this.params.required || this.params.validateFirstNotSelectable) && isPostBack && !this.value.length){
						var countryField = this.form.components.getRoot().findFieldByType("countrydropdown");
						label = (countryField ? crawlr.FormComponentsCountries.getRegionTypeByCountry(countryField.value) : "Region").toLowerCase();
						e("Please select " + this._an(label) + label + ".");
					}
					
					// form output
					var s = "", regions = crawlr.fetch(
						"SELECT	Country, Id, Name",
						"FROM	stdCountryRegion",
						"WHERE	Country IN ('CA','US') AND Id != Name",
						"ORDER BY Country, Name"
					).items;
					for(var i=0, len=regions.length; i<len; i++){
						if(i == 0 || regions[i]["Country"] != regions[i-1]["Country"]){
							s += (i == 0 ? '' : ',') + regions[i]["Country"] + ':[["' + regions[i]["Name"] + '","' + regions[i]["Id"] + '"]';
						}else{
							s += ',["' + regions[i]["Name"] + '","' + regions[i]["Id"] + '"]';
						}
						if(i + 1 == len || regions[i]["Country"] != regions[i+1]["Country"]){
							s += "]";
						}
					}
					
					crawlr.Response.write(
						'dojo.addOnLoad(function(){' +
							'new skyline.RegionPicker({' +
								'countryNode:dojo.byId("c' + this.form.components.getRoot().findIdByType("countrydropdown") + '"),' +
								'required:"' + crawlr.escapeJS(this._required()) + '",' +
								'regions:{' + s + '},' +
								'selected:"' + crawlr.escapeJS(this.value) + '"' +
							'}, dojo.byId("' + id + '"));' +
						'});\n', "script"
					);
					
					r.form += this._prefix(idx) + '<div id="' + id + '"><label for="' + id + 'tmp">Region</label><input class="text" id="' + id + 'tmp" name="' + id + '" type="text"/></div>' + this._error() + '</div>' + n;
					break;
				
				case "row":
					r.form += '<div class="inline row">' + n;
					for(var i=0, len=this.children.length; i<len; i++){
						var t = this.children[i].processForm(i);
						r.form += t.form;
						r.validation = r.validation.concat(t.validation);
						r.fields = r.fields.concat(t.fields);
						r.errorCount += t.errorCount;
					}
					r.form += '</div><div class="clear"></div>' + n;
					break;
				
				case "seminarattendees":
					// validation
					// TODO - if there are any attendees, make sure their email is valid... this will probably suck
					
					// form output
					r.form += this._prefix(idx) + '<input dojoType="skyline.SeminarAttendees" name="' + id + '" type="hidden" value="' + crawlr.escapeHtmlEntities(this.value) + '"/>' + this._error() + '</div>' + n;
					break;
					
				case "seminarevents":
					// validation
					if(this.params.required){
						v("isNotNull", id);
						if(isPostBack && !this.value.length){ e("Please select a seminar."); }
					}
					
					// form output
					var seminarEventId = this.form.node.get("id");
					if(!seminarEventId || parseInt(seminarEventId) != seminarEventId){ break; }
					
					var seminars = crawlr.fetch(
						"SELECT	E2.SeminarEventId, E2.StartTime, E2.EndTime, E2.FormId, E2.Description, E2.LocationTitle, E2.LocationAddress1, E2.LocationAddress2,",
						"		E2.LocationCity, ISNULL(CR.Name, E2.LocationRegion) AS Region, E2.LocationRegion, E2.LocationCountry, E2.LocationPostalCode,",
						"		M.DistributorCode, M.Title AS Dealer, S.Title,",
						"		(CASE WHEN " + (isPostBack ? (this.value.length ? "E2.SeminarEventId IN (" + this.value + ")" : "1 = 0") : "E2.SeminarEventId = " + seminarEventId),
						"		THEN 1 ELSE 0 END) AS Selected",
						"FROM	seminarEvents E",
						"JOIN	seminarEvents E2 ON",
						"		E2.DealerId = E.DealerId AND",
						"		E2.StartTime >= GETDATE() AND",
						"		E2.Status = 1",
						"LEFT JOIN stdCountryRegion CR ON",
						"		CR.Id = E2.LocationRegion AND",
						"		CR.Country = E2.LocationCountry AND",
						"		CR.Status IN (" + crawlr.config.status() + ")",
						"JOIN	seminars S ON S.SeminarId = E2.SeminarId",
						"JOIN	distMaster M ON",
						"		M.id = E2.DealerId AND",
						"		M.Status IN (" + crawlr.config.status() + ")",
						"JOIN	distLocation L ON",
						"		L.distMaster = E2.DealerId AND",
						"		L.id = E2.DealerLocationId AND",
						"		L.Status IN (" + crawlr.config.status() + ")",
						"WHERE	E.SeminarEventId = " + seminarEventId,
						"ORDER BY E2.StartTime"
					).items;
					
					this.params.seminars = [];
					
					var s = '<div class="field-wrapper"><table class="alternating"><tbody>', script = 'dojo.addOnLoad(function(){';
					for(var i=0, len=seminars.length; i<len; i++){
						var id2 = id + '_' + i;
						
						this.params.seminars.push({
							id:					seminars[i]["SeminarEventId"],
							startTime:			seminars[i]["StartTime"],
							endTime:			seminars[i]["EndTime"],
							title:				seminars[i]["Title"] || "",
							dealer:				seminars[i]["Dealer"],
							locationTitle:		seminars[i]["LocationTitle"] || "",
							address1:			seminars[i]["LocationAddress1"] || "",
							address2:			seminars[i]["LocationAddress2"] || "",
							city:				seminars[i]["LocationCity"] || "",
							region:				seminars[i]["LocationRegion"] || "",
							postalCode:			seminars[i]["LocationPostalCode"] || "",
							distributorCode:	seminars[i]["DistributorCode"] || ""
						});

						s +=	'<tr>' +
									'<td' + (i % 2 == 0 ? ' class="even"' : '') + '>' +
										'<input type="checkbox" id="' + id2 + '" name="' + id + '" value="' + seminars[i]["SeminarEventId"] + '"' + (seminars[i]["Selected"] ? ' checked="checked"' : '') + '/>' +
										'<div>' +
											'<label for="' + id2 + '">' + crawlr.formatDateTimeRange(seminars[i]["StartTime"], seminars[i]["EndTime"]) + '</label>' +
											'<div class="title">' + seminars[i]["Title"] + '</div>' +
											((seminars[i]["Description"] || "").length ? '<div class="desc">' + seminars[i]["Description"] + '</div>' : '') +
											'<div id="details_' + id2 + '"' + (seminars[i]["Selected"]?'':' style="display:none;"') + '>' +
												seminars[i]["LocationTitle"] + '<br/>' +
												seminars[i]["LocationAddress1"] + '<br/>' +
												(seminars[i]["LocationAddress2"] && seminars[i]["LocationAddress2"].length ? seminars[i]["LocationAddress2"] + '<br/>' : '') +
												seminars[i]["LocationCity"] + ', ' + seminars[i]["LocationRegion"] + ' ' + seminars[i]["LocationPostalCode"] + '<br/>' +
											'</div>' +
										'</div>' +
									'</td>' +
								'</tr>';
						
						script += 'dojo.connect(dojo.byId("' + id2 + '"), "onclick", skyline.form.toggleSeminarDetails);';
					}
					s+='</tbody></table></div>';
					crawlr.Response.write(script + '});' + n, "script");
					r.form += this._prefix(idx) + this._label(id) + s + this._error() + '</div>' + n;
					break;

				case "submitbutton":
					r.form += '<div class="row"><a href="#" class="buttonBig" onclick="return skyline.form.submit(validatorArgs);"><span>' + crawlr.escapeHtml(this.formLabel) + '</span></a></div><div class="clear"></div>' + n;
					break;

				case "email":
				case "postalcode":
				case "textbox":
					if(this.type == "email"){ maxlength=256; }
					if(this.type == "postalcode"){ maxlength=16; }

					// read only
					if(this.params.readonly){
						r.form += this._prefix(idx) + this._label(id) + '<div class="readonly">' + this.params.defaultValue + '</div></div>' + n;
						break;
					}
					
					// validation
					if(this.params.required){
						v("isNotNull", id);
						if(isPostBack && !this.value.length){ e("Please enter " + this._an(label) + label + "."); }
					}
					if(this.params.validateInteger){
						v("isInt", id);
						if(isPostBack && this.value.length && this.value != parseInt(this.value)){ e('Please enter a numeric "' + label + '".'); }
					}
					if(this.params.validatePositive){
						v("isPositiveInt", id);
						if(isPostBack && this.value.length && this.value == parseInt(this.value) && parseInt(this.value) < 0){ e('Please enter a positive numeric "' + label + '".'); }
					}
					if(this.type == "email"){
						v("isEmail", id);
						this.value = this.value.toLowerCase();
						if(isPostBack && this.value.length && !/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[a-zA-Z]{2}|com|org|edu|net|gov|mil|biz|info|mobi|name|aero|jobs|museum)\b/.test(this.value)){ e("Please enter a valid e-mail address."); }
					}
					
					// form output
					r.form += this._prefix(idx) + this._label(id) + '<input class="text" name="' + id + '" type="text" value="' + this.value + '" maxlength="' + (this.params.maxlength || maxlength) + '"/>' + this._error() + '</div>' + n;
					break;
				
				case "newsletter":
					// validation
					if(this.params.required){
						v("isYesNo", id);
						if(isPostBack && !this.value.length){ e("Please choose " + label + "."); }
					}
					
					// form output
					r.form +=	'<div class="' + (this.error ? "inputError " : "") + '"><div class="row">' +
									'<label>' + crawlr.escapeHtml(this.formLabel) + this._required() + '</label>' +
									'<div class="inlineRadios">' +
										'<label><input class="radio" type="radio" name="' + id + '" value="1"' + (""+this.value == "1" ? ' checked="checked"' : '') + '/> Yes</label> ' +
										'<label><input class="radio" type="radio" name="' + id + '" value="0"' + (""+this.value == "0" ? ' checked="checked"' : '') + '/> No</label>' +
										'<label><input class="radio" type="radio" name="' + id + '" value="2"' + (""+this.value == "2" ? ' checked="checked"' : '') + '/> Already receiving e-newsletter</label>' +
									'</div>' +
								'</div>' +
								'<div class="clear"></div>' + this._error() + '</div>' + n;
					break;
					
				case "yesno":
					// validation
					if(this.params.required){
						v("isYesNo", id);
						if(isPostBack && !this.value.length){ e("Please choose " + label + "."); }
					}
					
					// form output
					r.form +=	'<div class="' + (this.error ? "inputError " : "") + '"><div class="row">' +
									'<label>' + crawlr.escapeHtml(this.formLabel) + this._required() + '</label>' +
									'<div class="inlineRadios">' +
										'<label><input class="radio" type="radio" name="' + id + '" value="1"' + (""+this.value == "1" ? ' checked="checked"' : '') + '/> Yes</label> ' +
										'<label><input class="radio" type="radio" name="' + id + '" value="0"' + (""+this.value == "0" ? ' checked="checked"' : '') + '/> No</label>' +
									'</div>' +
								'</div>' +
								'<div class="clear"></div>' + this._error() + '</div>' + n;
					break;
			}
		}else{
			for(var i=0, len=this.children.length; i<len; i++){
				var t = this.children[i].processForm(i);
				r.form += t.form;
				r.validation = r.validation.concat(t.validation);
				r.fields = r.fields.concat(t.fields);
				r.errorCount += t.errorCount;
			}
		}

		return r;
	}
});
