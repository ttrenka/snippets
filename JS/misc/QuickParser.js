dojo.provide("iwc.util.QuickParser");

dojo.require("dojo.date.locale");
dojo.require("iwc.util.timezones");

/**
	A note about 118n (internationalization).

	Due to the difficulty in interpreting natural language strings, none of the QuickParser
	uses the resources available in the l10n packages; instead, a default dictionary is 
	defined within the code itself and used.  This dictionary includes many different 
	phrase possibilities but does it using regular expressions and arrays; and it is not
	a true JSON object (unlike the l10n resources).

	To enable localization for the Quick Parser, a dictionary specific to the locale
	and including the variable names defined below is required.  Some variables can be
	left out; those that are will use the default dictionary's definitions instead.  In
	addition, some of the default dictionary's properties are built on the fly; this
	was done out of convenience as opposed to necessity.

	If you wish to use a localized dictionary for the parser:

	1. Define the dictionary as a single object; make sure that any functions
		defined conform to the same signature as the dictionary below.
	2. Pass a reference to the localized dictionary to the single "parse" method, like so:
		var evtObject = iwc.util.QuickParser.parse(str, contextDate, myDictionary);

	myDictionary will be mixed into the default dictionary.
**/
 
iwc.util.QuickParser=new (function(){
	//	the default object to be used for quick parsing: in English.  Other dictionaries
	//		will be mixed into a clone of this one as fallback.
	var _dictionary = {
		//	quoted phrases
		reQuoted: /(['"])([^'"]*)\1/g,

		//	common punctuation markings
		rePunctuation: /[,;]/g,

		//	find any times matching the English format (12 + 24 hour clocks)
		reTimes: /(\d{1,2}((\:*\d{1,2})*\s*(am|pm|a.m.|p.m.|AM|PM|A.M.|P.M.)+)|(\d{1,2}\:\d{1,2}))/g,

		//	common abbreviations for 12 hour clocks
		re12hour: /am|pm|a\.m\.|p\.m\.|AM|PM|A\.M\.|P\.M\./g,

		//	find any dates; supports both American and European formats, year is optional
		//	reDates:  /\d{1,2}\/\d{1,2}[\/\d{2,4}]*/g,

		//	new dates expression, more advanced.
		reDates: /(\d{1,2}\/\d{1,2}[\/\d{2,4}]*)|((jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)(\.)?\s+(\d{1,2}(st|nd|rd|th)?)(\,)?\s?([\d{2,4}]*)\b)((\s?(to|\-|through the)\s?)\d{1,2}(st|nd|rd|th)?\b)?/gi,

		//	Find any valid email address, interpret as invitees
		reInvitees: /[a-z0-9!#$%\&'\*\+\/\=\?\^_`\{\|\}~-]+(?:\.[a-z0-9!#$%\&'\*\+\/\=\?\^_`\{\|\}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|museum)\b/gi,

		//	expression that will be built based on TZ information returned from the Calendar server
		reTimezones: null,

		//	pull out any extra spaces
		reNormalize: /\s+/g,

		//	splitter for comma-delimited phrasing (like monday, wednesday, and friday, returns ["monday", "wednesday", "friday"]
		reListSplitter: /,\s+and\s+|\s+and\s+|,\s?|\s+/gi,

		//	common modifier words, usually ignored
		modifiers: [" to", " on", " from", "-", " at", " in", " with", " w/"],

		//	modifiers used for denoting location
		loc: [" at"," in"],

		//	delimiter for date and time
		dateDelimiter: "/",
		timeDelimiter: ":",

		//	order that date strings will be interpreted; for European, use [ "day", "month", "year" ]
		dateOrder: [ "month", "day", "year" ],

		//	date pattern used for formatting.  Use "d/M/yyyy" for European dates.
		datePattern: "M/d/yyyy",

		//	functions to support common date substitutions, such as today, tomorrow.
		substitutes: {
			//	key on the property, run the function to globally replace within the phrase string.
			//	context is the date context of the parser, dict is a reference to the dictionary used for parsing.
			today: function(context, dict){ 
				return dojo.date.locale.format(
					context, 
					{ selector: "date", datePattern: dict.datePattern } 
				); 
			},
			tomorrow: function(context, dict){ 
				return dojo.date.locale.format(
					dojo.date.add(context, "day", 1), 
					{ selector: "date", datePattern: dict.datePattern } 
				); 
			},
			noon: function(){ return "12pm"; },
			midnight: function(){ return "12am"; }
		},
		
		//	---NON-RECURRANCE DEFINITIONS----------------------------------------------------------------
		//	We only use some of the following when we know we are not dealing with a recurring expression.

		//	find any string that represents some sort of duration
		reDuration: /for\s+(\d+)\s+(seconds|minutes|hours|days|weeks|months|years|second|minute|hour|day|week|month|year)/i,

		//	Common names for day of week; used for both detection and substitution (order is important!)
		dow: [
			[ "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" ],
			[ "sun", "mon", "tues", "wed", "thurs", "fri", "sat" ],
			[ "sun", "mon", "tue", "wed", "thu", "fri", "sat" ]
		],

		//	month value lookup
		months: { "jan":0, "feb":1, "mar":2, "apr":3, "may":4, "jun":5, "jul":6, "aug":7, "sep":8, "oct":9, "nov":10, "dec":11 },

		//	modifiers used with day of week notations
		dowModifiers: [" on", " next"],

		//	---RECURRANCE DEFINITIONS----------------------------------------------------------------
		//	Note that in general, only those elements that require specific languages need be here.
		
		//	Frequency (FREQ) mappings
		rrFreqMap:{
			//	we use the shortest possible version; ex. "hour" will match hour, hours, and hourly
			"second": "SECONDLY",
			"minute": "MINUTELY",
			"hour" 	: "HOURLY",
			"day"	: "DAILY",
			"daily"	: "DAILY",	//	need because of the change in 3rd letter
			"week"	: "WEEKLY",
			"month"	: "MONTHLY",
			"year"	: "YEARLY"
		},

		//	BYDAY mappings.
		//	note that this function is a shortcut, you will need to be explicit for other languages.
		rrByDayMap: null, 	//	build it after being defined.

		//	the default day a week starts on for the locale (i.e. WKST)
		rrWeekStart: "SU",

		//	the frequency map
		rrFrequency: null,	//	build it after this is finished being defined.
		
		//	the default frequency value
		rrFreqDefault: "MONTHLY",

		//	ordinals in English; only support the first 10, anything after that is highly unlikely
		rrOrdinalMap: {
			"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6, "seventh":7, "eighth": 8, "ninth": 9, "tenth": 10
		},
		rrNumeralMap: {
			"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
		},
		
		//	figure out if this is a recurrance phrase by looking for certain keywords
		rrIs: /((starting|every|until|repeats)|(first|second|third|fourth|fifth)|(hourly|daily|weekly|monthly|yearly))/gi,

		//	--- RECURRANCE EXPRESSIONS ------------------------------------------------------
		//	We do this as a generic array because we don't know what other locales might
		//		use in terms of phrase structure.  Again, order is important.
		
		//	Note that we pass the match through; this way the methods calling it can use
		//		it to remove said matches from the phrase given.

		//	Additional return properties:
		//		_match: (string) the original match, but can be modified so that the processor can handle removing it from the orignal phrase correctly.
		//		_type:	(string) the type of regular expression; these are the flags that are passed to the rule.
		//		_finalize: (bool) whether or not this particular rule, because if it's nature, should finalize the parsing (i.e. break)
		
		//	Note that you can add any additional properties you need; as long as they are prefaced with "_", they will not be used to assemble
		//		final RRULE.
		
		rrPhrases: [
			//	ex: starting on 6/1
			/* starting */ {
				re: /\s+starting\s+(on\s+)?(\d{1,2}\/\d{1,2}[\/\d{2,4}]*)/i,
				rule: function(phrase, match, dict){
					var dt=dict.parseDate(match[2], dict)[0];
					return {
						DTSTART: dt,		//	special case, pass the real date back.  This is the context.
						_match: match,
						_phrase: dojo.trim(phrase.replace(match[0], "").replace(dict.reNormalize, " ")),
						_finalize: false,
						_type: "i"
					};
				}
			},
			
			//	ex: starting on June 1st
			/* starting */ {
				re: /\s+starting\s+(on\s+)?(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)(\.)?\s+(\d{1,2}(st|nd|rd|th)?)(\,)?\s?([\d{2,4}]*)/i,
				rule: function(phrase, match, dict){
					var dt=dict.parseDate(match[0].replace(/\s+starting\s+(on\s+)?/gi, ""), dict)[0];
					return {
						DTSTART: dt,		//	special case, pass the real date back.  This is the context.
						_match: match,
						_phrase: dojo.trim(phrase.replace(match[0], "").replace(dict.reNormalize, " ")),
						_finalize: false,
						_type: "i"
					};
				}
			},
			
			//	ex: until 7/4/2010
			/* until */ {
				re:  /\s+until\s+(\d{1,2}\/\d{1,2}[\/\d{2,4}]*)/i,
				rule: function(phrase, match, dict){
					var tmp=dict.parseDate(match[1], dict)[0];
					var dt=dojo.date.add(new Date(tmp.year, tmp.month, tmp.day), "day", 1);
					var Y="0000"+dt.getUTCFullYear(), M="00"+(dt.getUTCMonth()+1), D="00"+dt.getUTCDate();
					var H="00"+dt.getUTCHours(), m="00"+dt.getUTCMinutes(), s="00"+dt.getUTCSeconds();
					
					return {
						UNTIL:Y.slice(Y.length-4) + M.slice(M.length-2) + D.slice(D.length-2)
							+ "T"
							+ H.slice(H.length-2) + m.slice(m.length-2) + s.slice(s.length-2) + "Z", 
						_finalize: false,
						_phrase: dojo.trim(phrase.replace(match[0], "").replace(dict.reNormalize, " ")),
						_match: match,
						_type: "i"
					};
				}
			},
		
			//	ex: until July 4, 2010
			/* until */ {
				re: /\s+until\s+(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)(\.)?\s+(\d{1,2}(st|nd|rd|th)?)(\,)?\s?([\d{2,4}]*)/i,
				rule: function(phrase, match, dict){
					var tmp=dict.parseDate(match[0].replace(/\s+until\s+/, ""), dict)[0];
					var dt=dojo.date.add(new Date(tmp.year, tmp.month, tmp.day), "day", 1);
					var Y="0000"+dt.getUTCFullYear(), M="00"+(dt.getUTCMonth()+1), D="00"+dt.getUTCDate();
					var H="00"+dt.getUTCHours(), m="00"+dt.getUTCMinutes(), s="00"+dt.getUTCSeconds();
					
					return {
						UNTIL:Y.slice(Y.length-4) + M.slice(M.length-2) + D.slice(D.length-2)
							+ "T"
							+ H.slice(H.length-2) + m.slice(m.length-2) + s.slice(s.length-2) + "Z", 
						_finalize: false,
						_phrase: dojo.trim(phrase.replace(match[0], "").replace(dict.reNormalize, " ")),
						_match: match,
						_type: "i"
					};
				}
			},
		
			//	ex: for 6 weeks
			/* count */ {
				re: /for\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(second|minute|hour|day|week|month|year)s?/i,
				rule: function(phrase, match, dict){
					var count=parseInt(match[1],10), freq=dict.rrFreqMap[match[2]] || dict.rrFreqDefault;
					
					//	count might be a language-based number, fix if need be.
					if(isNaN(count)){ count=dict.rrNumeralMap[count]||1; }
					return {
						FREQ: freq,
						COUNT: count,
						_finalize: false,
						_phrase: dojo.trim(phrase.replace(match[0], "").replace(dict.reNormalize, " ")),
						_match: match,
						_type: "i"
					}
				}
			},
		
			//	ex: repeats monthly, monthly
			/* repeats */ {
				re: /(repeats\s+)?(hourly|daily|weekly|monthly|yearly)/i,
				rule: function(phrase, match, dict){
					//	we care about the last match only.  Simplicity of the expression assumes INTERVAL=1
					return {
						FREQ: (match && match[2] && match[2].toUpperCase()) || dict.rrFreqDefault,
						INTERVAL: 1,
						_finalize: false,
						_phrase: dojo.trim(phrase.replace(match[0], "").replace(dict.reNormalize, " ")),
						_match: match,
						_type: "i"

					}
				}
			},

			//	--- Now it gets ugly.  You will need to make sure you are running matches on the more complex phrases first, easiest last. ---

			//	ex: first and last days of the month, 3rd month of the year, 20th week of the year
			/* bymonthday */ {
				re: /(\d+(st|nd|rd|th)|\bday(s)?|week(s)?|month(s)?)\s?(of the month|of the year)/gi,
				rule: function(phrase, match, dict){
					//	grab all the days, figure out the interval
					var test=/of the\s+(month|year)/i, freq="MONTHLY", m=match[0].match(test);
					if(m){ freq=m[1].toUpperCase()+"LY"; }
					phrase=dojo.trim(phrase.replace(test, "").replace("on the", ""));

					//	figure out the rest of the expression
					var re=/(\d+(st|nd|rd|th)|first|second|third|fourth|fifth|last)(\s?(day(s)?|week(s)?|month(s)?))?/i;
					test=/(second|minute|hour|day|week|month|year)/gi;
					var list=phrase.split(dict.reListSplitter), bywhat={ what:"BYMONTHDAY" };
	
					var l=list.length, i=0, startPos=-1, endPos=-1, t=[], ord;
					for(; i<l; i++){
						// try the ordinal first
						m=list[i].match(re);
						if(m){
							if(startPos<0) startPos=i;
							endPos=i;	//	increment anyways
							lastMatch=m[0];

							//	ok, figure out the ordinal
							if(m[2]){
								//	this is number-based
								ord=parseInt(m[1], 10);
								t.push(ord);
							} else {
								//	word-based
								if(m[1].toLowerCase()=="last"){
									var _ord=t.pop();
									if(_ord){
										_ord*=-1;
										t.push(_ord);
									}
								} else {
									ord=dict.rrOrdinalMap[m[1]]||1;
									t.push(ord);
								}
							}

							// figure out the BY___
							if(m[6]){
								switch(m[6].toLowerCase()){
									case "day": {
										if(freq=="MONTHLY")
											bywhat.what="BYMONTHDAY";
										else if(freq=="YEARLY")
											bywhat.what="BYYEARDAY";
										break;
									}
									case "week": {
										freq="YEARLY";	//	force it
										bywhat.what="BYWEEKNO"; break;
									}
									case "month": {
										freq="YEARLY";	//	force it
										bywhat.what="BYMONTH"; break;
									}
								}
							}
						}

						m=list[i].match(test);
						if(m) endPos=i;	//	keep it going.
					}

					var p=[];
					for(var i=0; i<list.length; i++){
						if(i<startPos || i>endPos) p.push(list[i]);
					}
					phrase=dojo.trim((p.join(" ")).replace(dict.reNormalize, " "));

					var ret= {
						FREQ: freq,
						_finalize: false,
						_phrase: phrase,
						_match: match,
						_type: "i"
					};
					ret[bywhat.what]=t.join(",");
					return ret;
				}
			},

			//	ex: every second week, every 21st day, every other month
			/* repeats using "every" */ {
				re: /every\s+((other|(\d+)(st|nd|rd|th)|first|second|third|fourth|fifth)\s+)?(day|week|month|year)/gi,
				rule: function(phrase, match, dict){
					//	this is a copy of our rule, note the i flag (as opposed to gi in the main rule)
					var split=/every\s+((other|(\d+)(st|nd|rd|th)|first|second|third|fourth|fifth)\s+)?(day|week|month|year)/i;
					
					//	this should only be one match, beginning with "every"; we assume we are defining freq and interval
					var p=match[0].match(split);

					//	get our frequency, ex "every 3rd month" will find MONTHLY
					var freq=dict.rrFreqMap[p[5]] || dict.rrFreqDefault;

					//	get our interval
					var intvl=1;
					if(p[2] /* other|ordinal */){
						//	other first
						if(p[2].toLowerCase()=="other") intvl=2;
						else {
							//	test if its a real numeric interval, ie "21st"
							if(!isNaN(parseInt(p[2], 10))) intvl=parseInt(p[2], 10);
							else intvl=dict.rrOrdinalMap[p[2]] || intvl;
						}
					}

					//	 fix the phrase
					for(var i=0; i<match.length; i++){
						phrase=phrase.replace(match[i], "");
					}
					phrase=dojo.trim(phrase.replace(dict.reNormalize, " "));
					
					return {
						FREQ: freq,
						INTERVAL: intvl,
						_finalize: false,
						_phrase: phrase,
						_match: match,
						_type: "gi"
					};
				}
			},

			//	ex: on the first,2nd and tHIRd FRIDAY
			/* weekday rules */ {
				re: /(sun(day)?|mon(day)?|tue((s)?day)?|wed(nesday)?|thu((rs)?(day))?|fri(day)?|sat(urday)?)+/gi,
				rule: function(phrase, match, dict){
					//	more interested in the phrase than the match.
					var dow=/sun(day)?|mon(day)?|tue((s)?day)?|wed(nesday)?|thurs(day)?|thu|fri(day)?|sat(urday)?/i;
					var ordinal=/(other|\d+(st|nd|rd|th)|first|second|third|fourth|fifth|last)/i;

					var list=phrase.split(dict.reListSplitter);
					var byMonth=(phrase.match(ordinal)!=null);

					var l=list.length, i=0, startPos=-1, endPos=-1, freq="WEEKLY", intvl=null, t=[];
					//	these loops should ignore any unnecessary modifiers.
					if(byMonth){
						freq="MONTHLY";
						var m, lastMatch, idx=0, ord=1;
						for(; i<l; i++){
							// try the ordinal first
							m=list[i].match(ordinal);
							if(m){
								i++; 	//	increment for the next thing now instead of later.
								idx=phrase.indexOf(m[0]);
								if(startPos<0) startPos=idx;
								lastMatch=m[0];

								//	ok, figure out the ordinal
								if(m[2]){
									//	this is number-based
									ord=parseInt(m[1], 10);
								} else {
									//	word-based
									if(m[1].toLowerCase()=="other"){
										intvl=2;
									}
									else if(m[1].toLowerCase()=="last"){
										ord*=-1;
									}
									else ord=dict.rrOrdinalMap[m[1]]||1;
								}
							}

							//	look for the dow
							m=list[i].match(dow);
							if(m){
								idx=phrase.indexOf(m[0], idx);
								if(startPos<0) startPos=idx;
								lastMatch=m[0];
								if(dict.rrByDayMap[lastMatch.toLowerCase()]){ 
									t.push({ ord: ord, byDay: dict.rrByDayMap[lastMatch.toLowerCase()] });
								}
							}
						}
						if(lastMatch && idx){
							endPos=phrase.indexOf(lastMatch, idx-1)+lastMatch.length;
						}

						//	if we got "other", then we need to reset this.
						if(intvl){
							freq="WEEKLY";
							t=dojo.map(t, function(item){
								return item.byDay;
							});
						} else {
							t=dojo.map(t, function(item){
								return item.ord + item.byDay;
							});
						}
					} else {
						//	these are consectutive weekdays
						var m, lastMatch, idx=0;
						for(; i<l; i++){
							m=list[i].match(dow);
							if(m){
								idx=phrase.indexOf(m[0], idx);
								if(startPos<0) startPos=idx;
								lastMatch=m[0];
								if(dict.rrByDayMap[lastMatch.toLowerCase()]){
									t.push(dict.rrByDayMap[lastMatch.toLowerCase()]);
								}
							}
						}
						if(lastMatch && idx){
							endPos=phrase.indexOf(lastMatch, idx-1)+lastMatch.length;
						}
					}

					//	final phrase cleanup.
					phrase = dojo.trim((phrase.substring(0, startPos)+phrase.substring(endPos+1)).replace(dict.rrIs, "").replace(dict.reNormalize, " "));

					var ret = {
						FREQ: freq,
						WKST: dict.rrWeekStart,
						BYDAY: t.join(","),
						_finalize: false,
						_phrase: phrase,
						_match: match,
						_type: "gi"
					};
					if(intvl) ret.INTERVAL=intvl;
					return ret;
				}
			}

		],

		//	character phrase used for tokenizing quoted expressions.  Do not replace.
		token: "++#++",

		//	move the date and time parsing here so that the scope is accessible.
		parseDate: function(str, dict){
			//	fix to handle month names and multiple dates in context (i.e. Sept 4 - 7)
			var reWithDelim=/\d{1,2}\/\d{1,2}[\/\d{2,4}]*/gi,
				reByName=/(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)(\.)?\s+(\d{1,2}(st|nd|rd|th)?)(\,)?\s?([\d{2,4}]*)/gi,
				reByNameI=/(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)(\.)?\s+(\d{1,2}(st|nd|rd|th)?)(\,)?\s?([\d{2,4}]*)/i,
				reContext=/(\s?(to|\-|through the)\s?)(\d{1,2})(st|nd|rd|th)?\b/i;

			var dto={ month:0, day:0, year: 0 }, now=new Date(), order=dict.dateOrder;

			//	format: 9/1, 7/11/2008
			if(str.match(reWithDelim)){
				var dta=str.split(dict.dateDelimiter);
				if(dta.length<2
					||isNaN(parseInt(dta[0],10))
					||isNaN(parseInt(dta[1],10))
				){
					throw new Error("iwc.util.QuickParser: the string passed ('"+str+"') is not a parsable date.");
				}
				
				for(var i=0, l=order.length; i<l; i++){
					dto[order[i]]=parseInt(dta[i], 10)||0;
					if(order[i]=="month"){ dto[order[i]]-=1; }
					if(order[i]=="year" && dto[order[i]]==0){ dto[order[i]]=now.getFullYear(); }

				}

				//	validate it
				var v=new Date(dto.year, dto.month, dto.day);
				dto.valid=(v.getFullYear()==dto.year && v.getMonth()==dto.month && v.getDate()==dto.day);
				return [ dto ];
			}

			//	format: June 6; jul 4, 2008; Dec. 24th through the 28th
			var m=str.match(reByName);
			if(m){
				var dates=[];
				dojo.forEach(m, function(item){
					var dta=item.match(reByNameI), o=dojo.clone(dto);
					o.month=dict.months[dta[1].toLowerCase().substr(0,3)]||-1;
					o.day=parseInt(dta[15],10);
					o.year=parseInt(dta[18], 10);
					if(isNaN(o.year)){ o.year=now.getFullYear(); }

					//	validate it
					var v=new Date(o.year, o.month, o.day);
					o.valid=(v.getFullYear()==o.year && v.getMonth()==o.month && v.getDate()==o.day);
					dates.push(o);

					//	check for a trailing context.
					var cm=str.match(reContext);
					if(cm){
						var co=dojo.clone(dto);
						co.month=o.month;
						co.year=o.year;
						co.day=parseInt(cm[3], 10);
						var v=new Date(co.year, co.month, co.day);
						co.valid=(v.getFullYear()==co.year && v.getMonth()==co.month && v.getDate()==co.day);
						dates.push(co);
					}
				});
				return dates;
			}

			//	if we got here, something ain't right.
			throw new Error("iwc.util.QuickParser: the string passed ('" + str + "') is not a parseable date.");
		},

		parseTime: function(str, dict){
			var m=str.match(dict.re12hour);
			var t=dojo.trim(str.replace(dict.re12hour, ""));
			var add=0;
			if(m&&m.length>0){
				add=(m[0].toLowerCase().indexOf("p")==0)?12:0;
			}
			var tc=t.split(dict.timeDelimiter);
			
			var h=((parseInt(tc[0],10)%12)+add)%24;
			var m=parseInt(tc[1],10)||0;

			//	validate it
			var v=new Date(), now=new Date();
			v.setHours(h, m, 0);
			var b=(v.getFullYear()==now.getFullYear()
				&& v.getMonth()==now.getMonth()
				&& v.getDate()==now.getDate()
				&& v.getHours()==h
				&& v.getMinutes()==m
			);
			return { hours:h, minutes:m, valid:b };
		}
	};

	//	build a couple of things.
	_dictionary.rrByDayMap = (function(dict){
		var o={};
		for(var dow=0, l=dict.dow.length; dow<l; dow++){
			var a=dict.dow[dow];
			for(var i=0, il=a.length; i<il; i++){
				if(!o[a[i]]){
					o[a[i]]=a[i].substr(0,2).toUpperCase();
				}
			}
		}
		return o;
	})(_dictionary);

	_dictionary.rrFrequency = (function(dict){
		var a=[], p;
		for(p in dict.rrFreqMap){ a.push(p); }
		 return new RegExp(a.join("|"), "gi");
	})(_dictionary);

	//	connect our tz builder to iwc.util.getTimeZones
	if(!iwc.util.getTimeZoneNameMap){
		var h=dojo.connect(iwc.util, "getTimeZones", function(){
			dojo.disconnect(h);
			var tz=iwc.util.getTimeZoneNameMap(), t=[];
			for(var p in tz){ t.push(p); }
			t.sort(function(a, b){ 
				if(a.length>b.length) return -1; 
				if(a.length<b.length) return 1;
				if(a>b) return 1;
				if(a<b) return -1;
				return 0;
			});
			_dictionary.reTimezones = new RegExp("\\s+("+t.join("|")+")", "gi");
		});
	}

	//////////////////////////////////////////////////////////////////
	//	Utility functions
	//////////////////////////////////////////////////////////////////

	var isRecurrance = function(obj, dict){
		//	figure out if this is a recurrance definition
		return (obj._phrase.match(dict.rrIs)!=null);
	};

	//////////////////////////////////////////////////////////////////
	//	break each part of the phrase up and fill in what is necessary
	//	Note that we reverse the order of args, since the dict is
	//	required but the date context is not.
	//////////////////////////////////////////////////////////////////
	
	//	our entrance point for recurrance parsing.
	var _rrule = function(obj, dict, context){
		var params=[], paramMap={};

		dojo.forEach(dict.rrPhrases, function(phraseRule){
			var m=obj._phrase.match(phraseRule.re);
			if(!m) return;

			var o=phraseRule.rule(obj._phrase, m, dict);
			console.log("QuickParser._rrule: rule result:", o);

			for(var p in o){
				//	don't push the privates
				if(p.charAt(0)!="_" && p!="DTSTART"){ paramMap[p]=o[p]; }
				if(p=="DTSTART"){
					//	special case, push this into dates
					obj.dates.push(o[p]);
				}
			}
			
			//	deal with removing the matched parts of the phrase for the next one.
			//	Note that we are using the returned reference; this gives us the ability
			//	to alter the matches based on the rules.
			if(o._phrase){
				//	we did this in the function already, so just swap
				obj._phrase=o._phrase;
			} else {
				if(o._type.indexOf("g")>-1){
					dojo.forEach(o._match, function(str){
						if(str || str!==undefined){
							obj._phrase.replace(str, "");
						}
					});
				} else {
					//	just pull the first one.
					obj._phrase.replace(o._match[0], "");
				}
			}
		});

		//	go through the rule set.
		var hasCount=false, hasUntil=false;
		for(var param in paramMap){
			//	can't have both count and until, so the first one will win here.
			if(param=="COUNT"||param=="UNTIL"){
				if(param=="COUNT"){
					if(!hasUntil){
						hasCount=true;
					} else continue;
				} 
				else if(param=="UNTIL"){
					if(!hasCount){
						hasUntil=true;
					} else continue;
				}
			} 
			params.push(param+"="+paramMap[param]);
		}

		obj.recurrance="RRULE:"+params.join(";");
	}

	//	remove punctuation
	var _punctuation=function(obj, dict, context){
		obj._phrase=obj._phrase.replace(dict.rePunctuation, "");
	}

	//	tokenize quoted phrases
	var _tokenize=function(obj, dict, context){
		var a=obj._phrase.match(dict.reQuoted)||[];
		obj._phrases={};
		dojo.forEach(a, function(item, i){
			var t=dict.token.replace("#", i);
			obj._phrases[t]=item.substr(1, item.length-2);
			obj._phrase=dojo.trim(obj._phrase.replace(item, t));
		});
	}

	//	get invitees
	var _invitees=function(obj, dict, context){
		var a=obj._phrase.match(dict.reInvitees)||[];
		obj.invitees=[];
		dojo.forEach(a, function(item){
			obj.invitees.push(item);
			obj._phrase=dojo.trim(obj._phrase.replace(item, ""));
		});
		obj._phrase=obj._phrase.replace(dict.reNormalize, " ");
	}

	//	date and time substitution
	var _dtsub=function(obj, dict, context){
		for(var p in dict.substitutes){
			if(obj._phrase.toLowerCase().indexOf(p)>-1){
				obj._phrase=obj._phrase.replace(new RegExp(p, "gi"), dict.substitutes[p](context, dict));
			}
		}
		obj._phrase=obj._phrase.replace(dict.reNormalize, " ");
	}

	//	day of week substitution
	var _dowsub=function(obj, dict, context){
		for(var p=0; p<dict.dow.length; p++){
			dojo.forEach(dict.dow[p], function(item, i){
				if(obj._phrase.toLowerCase().indexOf(" "+item)>-1){
					//	calc the add first.
					var add=((i-context.getDay())+7)%7;
					if(add==0) add+=7;
					var res= dojo.date.locale.format(
						dojo.date.add(context, "day", add), 
						{ selector: "date", datePattern:dict.datePattern } 
					);

					//	find and pull any modifier attached to it
					var idx=obj._phrase.toLowerCase().indexOf(item);
					for(var j=0, l=dict.dowModifiers.length; j<l; j++){
						var lidx=obj._phrase.lastIndexOf(dict.dowModifiers[j], idx);
						if(lidx>-1 && lidx >= idx-(dict.dowModifiers[j].length+1)){
							obj._phrase=obj._phrase.substr(0, lidx)+obj._phrase.substr(idx);
							break;
						}
					}

					//	pull the item from the string: refind the index first!
					idx=obj._phrase.toLowerCase().indexOf(item);
					obj._phrase=obj._phrase.substr(0, idx)+res+obj._phrase.substr(idx+item.length);
				}
			});
		}
	}

	//	find any dates
	var _dates=function(obj, dict, context){
		var a=obj._phrase.match(dict.reDates)||[];
		var dates=[], limit=2;
		for(var i=0; i<a.length; i++){
			if(i>=limit) break;
//			dates.push(dict.parseDate(a[i], dict));

			var res=dict.parseDate(a[i], dict);
			dojo.forEach(res, function(item){ dates.push(item); });
			var idx=obj._phrase.indexOf(a[i]);
			for(var j=0; j<dict.modifiers.length; j++){
				var lidx=obj._phrase.lastIndexOf(dict.modifiers[j], idx);
				if(lidx>-1 && lidx >= idx-(dict.modifiers[j].length+1)){
					obj._phrase=obj._phrase.substr(0, lidx)+obj._phrase.substr(idx);
					break;
				}
			}
			obj._phrase=dojo.trim(obj._phrase.replace(a[i], ""));
		}

		//	we might have a date already though, so don't wipe it.
		obj.dates=obj.dates.concat(dates);
		obj._phrase=obj._phrase.replace(dict.reNormalize, " ");

		//	if more than one date was passed, we are to create a recurring event instead.
		if(dates.length>1){
			//	get the difference between dates.
			var min=Number.MAX_VALUE, max=Number.MIN_VALUE;
			for(i=0; i<dates.length; i++){
				var d=new Date(dates[i].year, dates[i].month, dates[i].day);
				min=Math.min(min, d.getTime());
				max=Math.max(max, d.getTime());
			}

			var count=dojo.date.difference(new Date(min), new Date(max), "day")+1;	//	make sure the last day is accounted for
			obj.recurrance="RRULE:FREQ=DAILY;COUNT="+count;
		}
	}

	//	find any times
	var _times=function(obj, dict, context){
		var a=obj._phrase.match(dict.reTimes)||[];
		var times=[], limit=2;
		for(var i=0; i<a.length; i++){
			if(i>=limit) break;
			times.push(dict.parseTime(a[i], dict));
			
			var idx=obj._phrase.indexOf(a[i]);
			for(var j=0; j<dict.modifiers.length; j++){
				var lidx=obj._phrase.lastIndexOf(dict.modifiers[j], idx);
				if(lidx>-1 && lidx >= idx-(dict.modifiers[j].length+1)){
					obj._phrase=obj._phrase.substr(0, lidx)+obj._phrase.substr(idx);
					break;
				}
			}
			obj._phrase=dojo.trim(obj._phrase.replace(a[i], ""));
		}
		obj.times=times;
		obj._phrase=obj._phrase.replace(dict.reNormalize, " ");
	}

	//	duration
	var _duration=function(obj, dict, context){
		var a=obj._phrase.match(dict.reDuration)||[];
		var dur={ n:0, unit:"minute" };
		if(a.length){
			//	position 1 is n, position 2 is the unit
			dur.n=parseInt(a[1], 10);
			var lidx=a[2].lastIndexOf("s");
			dur.unit=(lidx>-1 && lidx==a[2].length-1) ? a[2].slice(0, a[2].length-1) : a[2];
		}
		obj.duration=dur;
		obj._phrase=dojo.trim(obj._phrase.replace(a[0], "").replace(dict.reNormalize, " "));
	}

	//	location
	var _location=function(obj, dict, context){
		for(var i=0; i<dict.loc.length; i++){
			var idx=obj._phrase.indexOf(dict.loc[i]);
			if(idx>-1){
				obj.location=dojo.trim(obj._phrase.substr(obj._phrase.indexOf(" ", idx+1)));
				obj._phrase=dojo.trim(obj._phrase.replace(dict.loc[i],"").replace(obj.location, ""));
				break;
			}
		}
	}

	//	title
	var _title=function(obj, dict, context){
		obj.title=dojo.trim(obj._phrase);
	}

	//	de-tokenize
	var _detokenize=function(obj, dict, context){
		for(var p in obj._phrases){
			obj.title=obj.title.replace(p, obj._phrases[p]);
			if(obj.location){
				obj.location=obj.location.replace(p, obj._phrases[p]);
			}
		}
	}

	//	figure out the time zone.
	var _timezone=function(obj, dict, context){
		var tzid=0, tzalias="", tzdaylight=false;
		var a=obj._phrase.match(dict.reTimezones)||[];
		if(a.length){
			//	only interested in the first one.
			var tzname=a[0];
			var item=(iwc.util.getTimeZoneNameMap())[tzname.toUpperCase()];

			//	look for the continent we are on with the default tzid
			var defRegion=(iwc.supportedServices.calendar.timezone||iwc.userPrefs.general.timezone).split("/")[0];
			var region=item.regions[defRegion];
			if(!region){
				//	grab the first one, call it good.
				for(var p in item.regions){
					region=item.regions[p];
					break;
				}
			}
			
			for(var p in region.tzids){
				//	grab the first one, call it good.
				tzid=p;
				break;
			}
			
			tzdaylight=region.isDaylight;
			tzalias=region.alias;

			//	pull all of the timezones.
			for(var i=0, l=a.length; i<l; i++){
				obj._phrase=obj._phrase.replace(a[i], "");
			}
			obj._phrase=obj._phrase.replace(dict.reNormalize, " ");
		}

		obj.tz= {
			tzid: tzid,
			tzalias: tzalias,
			isDaylight: tzdaylight
		};
	}

	//	the main function.  If you need to pass a dictionary without passing a context date, make sure
	//		you pass "null" as the second argument, i.e.:
	//	var eventObject = iwc.util.QuickParser.parse(str, null, myDictionary);
	this.parse=function(str, dt, dict){
		//	force the timezone load if it's not there already
		if(!_dictionary.reTimezones){ iwc.util.getTimeZones(); }

		//	something is odd with dojo.clone on the dictionary.
		dt=dt||new Date();
		dict=dojo.mixin(_dictionary, dict||{});

		//	set up the object we will operate on.
		var o={
			_phrase: str,
			_phrases: {},
			title: null,
			location: null,
			dates: [],
			times: [],
			tz: { },
			invitees: [],
			duration: {},
			recurrance: null,
			context: dt,
			original: str
		};

		//	run it through the functions.  The default set is non-recurring phrasing. 
		var fns=[
			_punctuation,
			_tokenize,
			_invitees,
			_timezone,
			_dtsub,
			_dowsub,
			_dates,
			_times,
			_duration,
			_location,
			_title,
			_detokenize
		];

		if(isRecurrance(o, dict)){
			//	redefine the function set
			fns=[
				_punctuation,
				_tokenize,
				_invitees,
				_timezone,
				_times,
				_rrule,
				_dates,
				_location,
				_title,
				_detokenize
			];
		}

		dojo.forEach(fns, function(fn){
			fn(o, dict, dt);
		});

		console.log("iwc.util.QuickParser::parse: ", o);
		return o;
	};
})();
