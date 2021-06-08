define(["dojo/_base/declare", "put-selector/put", "dojo/query", "dojo/on", "dojo/topic", "dojo/domReady!"], function(declare, put, query, listen, topic){
	/*	DateRangePicker
	 *	v.2.0
	 *	TRT 20180919
	 *
	 *	Complete rewrite of the original DatePicker. Entirely generated with JS, with any DOM ids being
	 *	generated direct. Allow for the option of allowing a way of selecting a compare date range, and
	 *	responsive.
	 */

	var sqlFormat = d3.time.format("%Y-%m-%d"),
		sqlParse = d3.time.format("%Y-%m-%d").parse,
		shortFormat = d3.time.format("%b %-d, %Y"),
		shortParse = d3.time.format("%b %-d, %Y").parse,
		longFormat = d3.time.format("%B %-d, %Y"),
		longParse = d3.time.format("%B %-d, %Y").parse;

	//	default ranges, and the functions to set our values.
	var ranges = {
		"Yesterday": function(){
			var dt = new Date(), start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()), end = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
			start.setDate(start.getDate() - 1);
			end.setDate(end.getDate() - 1);
			return { start: start, end: end };
		},
		"Last 7 Days": function(){
			var dt = new Date(), start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()), end = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()-1);
			start.setDate(start.getDate() - 7);
			return { start: start, end: end };
		},
		"Last Week": function(){
			//	find our last Sunday and adjust accordingly.
			var dt = new Date(), start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()), end = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
			var offset = start.getDay();
			start.setDate((start.getDate() - 1) - (offset + 6));
			end.setDate((end.getDate() - 1) - offset);
			return { start: start, end: end };
		},
		"This Month": function(){
			var dt = new Date(), start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()), end = new Date(start.getFullYear(), start.getMonth()+1, 1);
			start.setDate(1);
			end.setDate(end.getDate()-1);
			return { start: start, end: end };
		},
		"Last Month": function(){
			//	apparently you have to set the date first before changing the month.
			var dt = new Date(), start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
			start.setDate(1);
			start.setMonth(start.getMonth() - 1);
			var end = new Date(start.getFullYear(), start.getMonth()+1, 1);
			end.setDate(end.getDate()-1);
			return { start: start, end: end };
		},
		"Last 90 Days": function(){
			var dt = new Date(), start = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - 1), end = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - 1);
			start.setDate(start.getDate() - 90);
			return { start: start, end: end };
		}
	};

	//	ranges map
	var rangesMap = {
		"y": "Yesterday",
		"l7": "Last 7 Days",
		"lw": "Last Week",
		"tm": "This Month",
		"lm": "Last Month",
		"l9": "Last 90 Days",
		"cr": "Custom Range"
	}, rangesReverseMap = {};
	for(var range in rangesMap){
		rangesReverseMap[rangesMap[range]] = range;
	}

	//	helper functions
	function buildMonth(dt){
		//	return [[]], where outer array is the month to display and the inner arrays
		//	are of length 7, corresponding to Sun - Sat. Dates not within the given month
		//	will have a value of 0.

		var first = new Date(dt.valueOf()),
			last = new Date(dt.valueOf());
		first.setDate(1);
		var start = first.getDay();	//	the day of week we start on
		last.setMonth(last.getMonth() + 1);
		last.setDate(1);
		last.setDate(last.getDate() - 1);
		var end = last.getDay();

		//	let's build our arrays
		var month = [], limit = 7, padding = 0, current = new Date(first.valueOf());
		while(current.valueOf() <= last.valueOf()){
			var week = [];
			for(var i=0; i<limit; i++){
				if(!month.length){
					//	this is the first week, pad until current.getDay() == start
					week.push((i < start) ? 0 : current.getDate());
					if(i >= start) current.setDate(current.getDate()+1);
				}
				else if(current.valueOf() > last.valueOf()){
					//	last week of the month.
					week.push(0);
					current.setDate(current.getDate() + 1);
				}
				else {
					week.push(current.getDate());
					current.setDate(current.getDate() + 1);
				}
			}
			month.push(week);
		}
		return month;
	}

	function buildCalendar(numMonths, dates){
		//	TODO: we're not using this for now but might need it to pop more months into the calendar
		dates = dates || { start: sqlParse(formValues.sqlDateStart), end: sqlParse(formValues.sqlDateEnd) };
		numMonths = +numMonths || 36;

		var year = [], current = new Date();
		current.setDate(1);
		current.setMonth((current.getMonth()+1) - numMonths);

		//	ok, let's fill out our calendar, and include info about what month is starting and what is ending.
		var end = new Date(current.valueOf());
		end.setMonth(end.getMonth() + 12);
		end.setDate(end.getDate()-1);

		for(var i=0; i < numMonths; i++){
			var o = {
				data: buildMonth(current),
				start: new Date(current.getFullYear(), current.getMonth(), 1),
				month: current.getMonth(),
				year: current.getFullYear()
			};
			year.push(o);
			current.setMonth(current.getMonth() + 1);
		}
		return year;
	}

	//	variables/constants
	var TRANSITION_DURATION_SECONDS = 0.3, // Total duration of the menu animation.
		TRANSITION_DURATION_FRACTION = 0.8, // The fraction of the total duration we want to use for menu item animations.
		CLOSE_TIMEOUT = 150, // How long the menu stays open after choosing an option (so the user can see the ripple).
		TRANSITION_DURATION = TRANSITION_DURATION_SECONDS * TRANSITION_DURATION_FRACTION;

	//	CSS classes for the main containers
	var domNodeClass			= ".trk-date__input-container",
		mainInputContClass	= ".trk-date__input-textfield.mdl-textfield.mdl-js-textfield.mdl-textfield--floating-label",
		mainInputClass		   = ".mdl-textfield__input",
		mainLabelClass			= ".mdl-textfield__label",
		iconClass				= ".mdl-icon-toggle__label.material-icons";

	//	CSS classes for the menu elements
	var menuClass			    = ".trk-date__picker",
		menuSidePanelClass	 = ".trk-date__picker__input-container",
		rangeDropdownClass	 = ".mdl-textfield.mdl-js-textfield.mdl-textfield--floating-label.getmdl-select",
		rangeUlClass		    = ".mdl-menu.mdl-menu--bottom-left.mdl-js-menu",
		rangeLiClass		    = ".mdl-menu__item",
		rangeLiDividerClass	 = ".mdl-menu__item--full-bleed-divider",
		dateInputClass		    = ".mdl-textfield.mdl-js-textfield.mdl-textfield--floating-label.trk-start__date",
		dateCompareInputClass = ".mdl-textfield.mdl-js-textfield.mdl-textfield--floating-label.trk-start__date.trk-date-picker__compare-range--input",
		toggleClass			    = ".trk-date__picker__compare-range-toggle",
		toggleSwitchClass	    = ".mdl-switch.mdl-js-switch.mdl-js-ripple-effect",
		toggleInputClass	    = ".mdl-switch__input",
		toggleLabelClass	    = ".mdl-switch__label",
		compareInputClass	    = ".mdl-textfield__input.mdl-js-textfield.mdl-textfield--floating-label.trk-date-picker__compare-range--input.trk-date-picker__compare-range",
		errorClass			    = ".mdl-textfield__error",
		buttonCancelClass		 = ".mdl-button.mdl-js-button.mdl-js-ripple-effect.trk-calendar__cancel";
		buttonOkClass			 = ".mdl-button.mdl-js-button.mdl-js-ripple-effect";

	//	CSS classes for the various parts of a calendar month
	var headerRowClass 	= ".trk-calendar__header.trk-calendar__row.layout-align-space-between-center",
		monthClass			= ".trk-calendar__button.trk-calendar__header-month",	//	%B %Y
		yearClass			= ".trk-calendar__button.trk-calendar__header-year",	//	%B %Y
		headerDivClass		= ".trk-calendar__day-header.trk-calendar__row",
		headerDowClass		= ".trk-calendar__button.trk-calendar__button-round",
		bodyDivClass		= ".trk-calendar",
		bodyDivContainer	= ".trk-calendar__date-row",
		bodyRowClass		= ".trk-calendar__row",
		bodyDayClass		= ".trk-calendar__button.trk-calendar__button-date.mdl-js-button.trk-calendar__button-round",	//.mdl-js-ripple-effect
		bodyDayEmptyClass	= ".trk-calendar__button.trk-calendar__button-date.disabled",
		bodyDayInRange		= ".trk-calendar__button.trk-calendar__button-date.mdl-js-button.trk-calendar__button-selected.trk-calendar__button-in-range.trk-calendar__button-round", //.mdl-js-ripple-effect
		bodyDaySelected	= ".trk-calendar__button.trk-calendar__button-date.mdl-js-button.trk-calendar__button-selected.trk-calendar__button-round";	//.mdl-js-ripple-effect
		compareSelected	= ".trk-calendar__compare-range";

	//	ID variables for various date range picker nodes
	var id_counter = 0,
		id_prefix = "trk-daterange-picker-",
		menu_counter = 0,
		menu_prefix = "trk-daterange-picker__menu-",
		toggle_counter = 0,
		toggle_prefix = "trk-daterange-picker__toggle-",
		button_counter = 0,
		button_prefix = "trk-daterange-picker__button-",
		input_counter = 0,	//	can be reused for any input type="text" element
		input_prefix = "trk-daterange-picker__input-";

	function renderContainer(){
		//	Create the main HTML fragment, including the two containers for the calendar and the side panel
		var c = put("div#" + id_prefix + id_counter++ + domNodeClass);	//	our full date picker, will become the domNode.

		//	The top input
		var inputContainer = put(c, "div" + mainInputContClass),
			id = input_counter++;
			input = put(inputContainer, 'input#' + input_prefix + id + mainInputClass + '[size="32"][type="text"][value=""][readonly]'),
			innerLabel = put(inputContainer, 'label[for="' + input_prefix + id + '"]');
		put(innerLabel, "i" + iconClass + '[for="' + input_prefix + id + '"]', { innerHTML: "arrow_drop_down" });
		put(inputContainer, "label" + mainLabelClass + '[for="' + input_prefix + id + '"]', { innerHTML: "Date Range" });

		componentHandler.upgradeElement(inputContainer, "MaterialTextfield");

		//	The menu container
		var menu = put(c, "div#" + menu_prefix + menu_counter++ + menuClass);
		return {
			domNode: c,
			inputNode: inputContainer,
			input: input,
			menu: menu
		};
	}

	function renderMonth(start, dates, arr){
		//	make the HTML fragment out of the given month array, including any classes needed for
		//	showing selections
		//
		//	start == first day of month to be rendered
		//	dates == the currently selected date range, as { start: date, end: date }
		//	arr == month array (from buildMonth)
		//	the month header

		var header = put("div" + headerRowClass);
		put(header, "button" + monthClass + '[data-value="' + d3.time.format("%Y-%m")(start) + '"]', { innerHTML: d3.time.format("%B")(start) });
		put(header, "button" + yearClass + '[data-value="' + d3.time.format("%Y")(start) + '"]', { innerHTML: d3.time.format("%Y")(start) });

		//	header row of days of week
		var headerRow = put("div" + headerDivClass);
		put(headerRow, "button" + headerDowClass, { innerHTML: '<span>S</span>' });
		put(headerRow, "button" + headerDowClass, { innerHTML: '<span>M</span>' });
		put(headerRow, "button" + headerDowClass, { innerHTML: '<span>T</span>' });
		put(headerRow, "button" + headerDowClass, { innerHTML: '<span>W</span>' });
		put(headerRow, "button" + headerDowClass, { innerHTML: '<span>T</span>' });
		put(headerRow, "button" + headerDowClass, { innerHTML: '<span>F</span>' });
		put(headerRow, "button" + headerDowClass, { innerHTML: '<span>S</span>' });

		//	OK, build the body of the calendar
		var calMonth = put("div" + bodyDivClass),
			calMonthContainer = put(calMonth, "div" + bodyDivContainer);

		arr.forEach(function(week, idx){
			var row = put(calMonthContainer, "div" + bodyRowClass);
			for(var i=0; i<7; i++){
				var item = week[i];
				if(item == 0){
					put(row, "button[type='button']" + bodyDayEmptyClass, { innerHTML: "<span></span>" });
				} else {
					//	ok, figure out if we're in selected date range and apply the appropriate class.
					var current = new Date(start.getFullYear(), start.getMonth(), item),
						last = new Date(start.getFullYear(), (start.getMonth()+1), 1),
						span = { innerHTML: "<span>" + item + "</span>" },
						cls = bodyDayClass;	//	default, unselected
					last.setDate(last.getDate()-1);
					if(current >= dates.start && current <= dates.end){
						cls = bodyDaySelected;
						if(current != dates.start && i < 6 && current < dates.end){
							if(current.getDate() == last.getDate()){
								cls = bodyDaySelected;
							} else {
								cls = bodyDayInRange;
							}
						}
						// console.log(current, cls);
					}
					var node = put(row, "button[type='button'][data-value='" + d3.time.format("%Y-%m-%d")(current) + "']" + cls, span);
					componentHandler.upgradeElement(node, "MaterialButton");
				}
			}
		});

		return {
			header: header,
			headings: headerRow,
			body: calMonth
		};
	}

	function renderCalendar(numMonths, dates){
		numMonths = +numMonths || 36;
		dates = dates || { start: sqlParse(formValues.sqlDateStart), end: sqlParse(formValues.sqlDateEnd) };
		var days = buildCalendar(numMonths),
			container = put("div.trk-date__picker__months");

		var startMonthNode;
		days.forEach(function(month, idx){
			var c = put('div.trk-date__picker__month-container[data-value="' + d3.time.format("%Y-%m")(new Date(month.year, month.month, 1)) + '"]');
			var m = renderMonth(month.start, dates, month.data);
			put(c, m.header);
			put(c, m.headings);
			put(c, m.body);
			put(container, c);
			if(dates.start.getMonth() == month.month && dates.start.getFullYear() == month.year){
				startMonthNode = c;
			}
		});

		return {
			node: container,
			scrollTo: function(){
				if(startMonthNode) container.scrollTop = startMonthNode.offsetTop;
			}
		};
	}

	function renderSidePanel(compare){
		var c = put("div" + menuSidePanelClass);

		//	Range dropdown
		var rd = put(c, "div" + rangeDropdownClass),
			id = input_counter++,
			input = put(rd, "input#" + input_prefix + id + mainInputClass + '[type="text"][readonly][value=""]'),
			innerLabel = put(rd, 'label[for="' + input_prefix + id + '"]'),
			label = put(rd, 'label' + mainLabelClass + '[for="' + input_prefix + id + '"]', { innerHTML: "Date Range" }),
			opts = put(rd, "ul" + rangeUlClass + '[for="' + input_prefix + id + '"]');
		put(innerLabel, "i" + iconClass, { innerHTML: "arrow_drop_down" });
		var li;
		for(var p in rangesMap){
			//	cr should always be last, slap the divider on the previous li
			if(p == "cr"){
				continue;
				//	put(li, rangeLiDividerClass);
			}
			li = put(opts, "li" + rangeLiClass + '[data-value="' + p + '"]', { innerHTML: rangesMap[p] });
		}
		componentHandler.upgradeElement(rd, "MaterialTextfield");
		getmdlSelect.addEventListeners(rd);

		//	start and end date inputs
		var start = put(c, "div" + dateInputClass),
			id = input_counter++,
			startInput = put(start, "input#" + input_prefix + id + mainInputClass + '[type="text"][value=""]');
		put(start, "label" + mainLabelClass + '[for="' + input_prefix + id + '"]', { innerHTML: "Start Date" });
		put(start, "span" + errorClass, { innerHTML: "Must be a valid date." });
		componentHandler.upgradeElement(start, "MaterialTextfield");

		var end = put(c, "div" + dateInputClass),
			id = input_counter++,
			endInput = put(end, "input#" + input_prefix + id + mainInputClass + '[type="text"][value=""]');
		put(end, "label" + mainLabelClass + '[for="' + input_prefix + id + '"]', { innerHTML: "End Date" });
		put(end, "span" + errorClass, { innerHTML: "Must be a valid date." });
		componentHandler.upgradeElement(end, "MaterialTextfield");

		//	only add if this picker has the compare component
		var toggle, cti, c_menu, c_startInput, c_endInput;
		if(compare){
			put(c, "div.trk-date__picker__input-divider");

			//	the toggle
			toggle = put(c, "div" + toggleClass);
			put(toggle, "div", { innerHTML: "Compare Dates" });
			var id = toggle_counter ++,
				ctl = put(toggle, "label" + toggleSwitchClass + '[for="' + toggle_prefix + id + '"]'),
				cti = put(ctl, "input#" + toggle_prefix + id + toggleInputClass + '[type="checkbox"]');
			put(ctl, "span" + toggleLabelClass);
			componentHandler.upgradeElement(ctl, "MaterialSwitch");

			//	TODO: menu selections


			//	date inputs
			var c_start = put(c, "div" + dateCompareInputClass),
				id = input_counter++,
				c_startInput = put(c_start, "input#" + input_prefix + id + mainInputClass + '[type="text"][value=""]');
			c_startInput.value = "";
			put(c_start, "label" + mainLabelClass + '[for="' + input_prefix + id + '"]', { innerHTML: "Start Date" });
			put(c_start, "span" + errorClass, { innerHTML: "Must be a valid date." });
			componentHandler.upgradeElement(c_start, "MaterialTextfield");

			var c_end = put(c, "div" + dateCompareInputClass),
				id = input_counter++,
				c_endInput = put(c_end, "input#" + input_prefix + id + mainInputClass + '[type="text"][value=""]');
			c_endInput.value = "";
			put(c_end, "label" + mainLabelClass + '[for="' + input_prefix + id + '"]', { innerHTML: "End Date" });
			put(c_end, "span" + errorClass, { innerHTML: "Must be a valid date." });
			componentHandler.upgradeElement(c_end, "MaterialTextfield");
		}

		//	The validation message section
		var validContainer = put(c, "div.trk-calendar__messages");

		//	finally, the buttons
		var buttons = put(c, "div.trk-calendar__buttons"),
			cancel = put(buttons, "button#" + button_prefix + button_counter++ + buttonCancelClass, { innerHTML: "Cancel" }),
			ok = put(buttons, "button#" + button_prefix + button_counter++ + buttonOkClass, { innerHTML: "OK" });
		componentHandler.upgradeElement(cancel, "MaterialButton");
		componentHandler.upgradeElement(ok, "MaterialButton");

		//	assemble everything into one big fuckall object for return.
		var ret = {
			container: c,
			menu: {
				input: input,
				options: opts
			},
			start: startInput,
			end: endInput,
			messages: validContainer,
			buttons: {
				cancelButton: cancel,
				okButton: ok
			}
		};
		if(compare){
			ret.compare = {
				toggle: {
					container: toggle,
					input: cti
				},
/*
				menu: {
					input: c_input,
					options: c_opts
				},
*/
				start: c_startInput,
				end: c_endInput
			};
		}
		return ret;
	}

	var dateRangePicker = declare([], {
		id: null,
		parentNode: null,
		domNode: null,
		//	TODO: Other node references here

		//	main nodes
		inputNode: null,	//	also the trigger node
		inputMain: null,
		menuNode: null,

		outlineNodes: { calendar: null, input: null },
		dateRangeNode: null,
		calendarNode: null,
		dateInputNodes: { start: null, end: null },
		compareDateInputNodes: { start: null, end: null },
		messageNode: null,
		buttonNodes: { ok: null, cancel: null },

		//	data references
		dates: { start: null, end: null },
		range: "tm",	//	hard-coded for now
		rangeType: "r",
		calendar: null,

		//	example:
		//		selected date range is 9/1/2108 - 9/30/2018
		//		Compare range: starting two weeks before
		//		length: 30 (days in compare range)
		//		offset: 14 (end date of compare is 14 days before selected start date)
		hasCompare: false,
		compare: {
			length: 0,	//	how many days in the range
			offset: 0	//	how many days before start before considering the length above
		},
		_originalValues: {
			dates: { start: null, end: null },
			range: "tm",
			rangeType: "r",
			compare: { length: 0, offset: 0 }
		},

		//	event handler references
		handlers: {
			body: null,
			open: null,
			calendar: null,
			dates: {
				range: null,
				start: null,
				end: null
			},
			compare: {
				"switch": null,
				start: null,
				end: null
			},
			cancel: null,
			apply: null
		},

		//	internal variables
		isGlobal: true,	//	Mainly used for the primary pickers, and will publish a specific topic on date change
		before: false,	//	When building the component, whether or not to place it first or last in the parentNode
		opened: false,
		monthsToRender: 36,	//	default setting for how many months to render in the calendar
		_calFirstClick: false,	//	detecting first and second cal click
		_calInCompare: false,	//	detecting if the compare switch was just flipped, and if true then operate on compare dates
		_rangeLimit: 92,		//	The max number of days allowed within a range.
		_isValid: {
			start: false,
			end: false,
			compareStart: false,
			compareEnd: false
		},
		_invalidMessages: {
			"badDate": "Please enter a valid date",
			"futureDate": "Please enter a date prior to today",
			"outOfRange": "Please select a range less than 92 days"
		},

		constructor: function(params, node){
			this.parentNode = node;
			this.dates = (params && "dates" in params) ? params.dates : this.dates;
			this.range = (params && "range" in params) ? params.range : this.range;
			this.rangeType = (params && "rangeType" in params) ? params.rangeType : this.rangeType;
			this.hasCompare = (params && "compare" in params) ? !!params.compare : this.hasCompare;
			if(this.hasCompare){
				this.compare = (params && "compare" in params) ? params.compare : this.compare;
			}
			this.isGlobal = (params && "global" in params) ? !!params.global: this.isGlobal;
			this.before = (params && "before" in params) ? !!params.before : this.before;
			this.monthsToRender = (params && "months" in params) ? +params.months: this.monthsToRender;

			//	variables are initialized, set it up
			this.setup();
		},
		setup: function(){
			var self = this;

			//	First, render the component
			this._render();

			//	setup all event handlers
			//	this._addDelay();
			var cancel = function(e){
				self.dateRangeNode.input.setAttribute("data-value", self._originalValues.range);
				self.dateRangeNode.input.value = rangesMap[self._originalValues.range];
				self.dates.start = self._originalValues.dates.start;
				self.dates.end = self._originalValues.dates.end;
				self.range = self._originalValues.range;
				self.rangeType = self._originalValues.rangeType;
				self.setPickerDates(self.dates);
				self.setHumanDateRange(self.dates);
				self.dateInputNodes.start.parentNode.classList.remove("is-invalid");
				self.dateInputNodes.end.parentNode.classList.remove("is-invalid");
				self.messageNode.innerHTML = "";
				put(self.inputMain, "!is-focused");
				self.close(e);

				self._datesChanged();
			};

			//	stop any clicks on the menu from going past the menu
			listen(this.menuNode, "click", function(e){
				e.stopPropagation();
				//	check to see if this click was outside of the date range picker,
				//	and close it if it was.
				var dropdown = self.dateRangeNode.options,
					p = dropdown.parentNode.parentNode;

				//	get the target and trace up to our menu node first.
				//	if we find the date range picker to be in the parent
				//	chain, ignore it.
				var node = e.target, b = false;
				while(node && node != self.menuNode){
					if(node == p){
						b = true;
						break;
					}
					node = node.parentNode;
				}
				if(!b) dropdown.MaterialMenu.hide();
			});

			//	Open and close
			this.handlers.body = listen.pausable(document.body, "click", cancel);
			this.handlers.body.pause();
			this.handlers.open = listen.pausable(this.inputNode, "click", function(e){
				e.stopPropagation();
				put(self.inputMain, ".is-focused");
				self.open(e);
				self.dateInputNodes.start.focus();
			});

			//	Clicking on the calendar direct
			this.handlers.calendar = listen(this.calendarNode, "click", function(e){
				e.stopPropagation();
				//	close the range picker no matter what
				self.dateRangeNode.options.MaterialMenu.hide();
				self.messageNode.innerHTML = "";

				var node = e.target;
				if(node.nodeName.toLowerCase() != "button") node = node.parentNode;
				if(!node.classList.contains("trk-calendar__button-date")) return;	//	TODO: the month and year buttons

				//	handle our clicks
				var dt = sqlParse(node.getAttribute("data-value"));
				if(self.dateInputNodes.end.value != ""){
					//	this is a start date
					self.dateInputNodes.start.parentNode.classList.remove("is-invalid");
					self.dates.start = dt;
					self.dates.end = null;
					self.dateInputNodes.start.value = shortFormat(self.dates.start);
					self.dateInputNodes.end.value = "";
					self.dateInputNodes.end.focus();
				} else {
					//	this is an end date
					//	figure out if this new date is younger than the old one first.
					if(dt.valueOf() < self.dates.start.valueOf()){
						self.dates.end = self.dates.start;
						self.dates.start = dt;
					} else {
						self.dates.end = dt;
					}
					self.dateInputNodes.start.value = shortFormat(self.dates.start);
					self.dateInputNodes.end.value = shortFormat(self.dates.end);
				}
				self.rangeType = "d";	//	Absolute Dates
				self._datesChanged();
			});

			//	Date range picker handling for dates
			listen(this.dateRangeNode.input, "change", function(e){
				self.dateRangeNode.input.parentNode.classList.remove("is-focused");
				self.dateInputNodes.start.focus();
			});
			this.handlers.dates.range = listen(this.dateRangeNode.input.parentNode, "click", function(e){
				e.stopPropagation();
				if(e.target.nodeName.toLowerCase() != "li") return;
				var val = e.target.getAttribute("data-value");

				//	get our new dates
				var dates = ranges[rangesMap[val]]();
				self.range = val;
				self.rangeType = "r";
				self.dates = dates;
				self.dateInputNodes.start.value = shortFormat(self.dates.start);
				self.dateInputNodes.end.value = shortFormat(self.dates.end);
				self.dateRangeNode.input.setAttribute("data-value", val);

				self._datesChanged();
			});

			//	Direct input for dates
			var startKeyHandler = listen.pausable(this.dateInputNodes.start, "keydown", function(e){
				startKeyHandler.pause();
				self.dateInputNodes.start.parentNode.classList.remove("no-keypress");
			});
			startKeyHandler.pause();
			listen(this.dateInputNodes.start, "focus", function(e){
				self.dateInputNodes.start.parentNode.classList.add("no-keypress");
				startKeyHandler.resume();
				self.dateInputNodes.start.select();
				//	self.dateInputNodes.start.setSelectionRange(0,0);
			});
			this.handlers.dates.start = listen.pausable(this.dateInputNodes.start, "change", function(e){
				e.stopPropagation();
				var test = Date.parse(self.dateInputNodes.start.value);
				if(!isNaN(test)){
					//	we're good
					self.dateInputNodes.start.parentNode.classList.remove("is-invalid");
					self.dates.start = new Date(test);
					self.dates.end = null;
					self.dateInputNodes.start.value = shortFormat(self.dates.start);
					self.dateInputNodes.end.value = "";
					self.dateInputNodes.end.focus();
					self.rangeType = "d";	//	Absolute Dates
				} else {
					query("span.mdl-textfield__error", self.dateInputNodes.start.parentNode).forEach(function(msgNode){
						msgNode.innerHTML = self._invalidMessages.badDate;
					});
					if(!self.dateInputNodes.start.parentNode.classList.contains("is-invalid")){
						self.dateInputNodes.start.parentNode.classList.add("is-invalid");
					}
				}

				//	Finally, tell everything else the dates have changed.
				var val = d3.time.format("%Y-%m")(self.dates.start);
				query('div.trk-date__picker__month-container[data-value="' + val + '"]', self.calendarNode).forEach(function(node){
					self.calendarNode.scrollTop = node.offsetTop;
				});

				self._datesChanged();
			});

			var endKeyHandler = listen.pausable(this.dateInputNodes.end, "keydown", function(e){
				endKeyHandler.pause();
				self.dateInputNodes.end.parentNode.classList.remove("no-keypress");
			});
			listen(this.dateInputNodes.end, "focus", function(e){
				if(self.dateInputNodes.end.value != ""){
					self.dateInputNodes.end.parentNode.classList.add("no-keypress");
					endKeyHandler.resume();
					self.dateInputNodes.end.select();
				//	self.dateInputNodes.end.setSelectionRange(0,0);
				}
			});
			this.handlers.dates.end = listen.pausable(this.dateInputNodes.end, "change", function(e){
				e.stopPropagation();
				var test = Date.parse(self.dateInputNodes.end.value);
				if(!isNaN(test)){
					//	we're good
					self.dateInputNodes.end.parentNode.classList.remove("is-invalid");
					self.dates.end = new Date(test);
					self.dateInputNodes.end.value = shortFormat(self.dates.end);
					self.rangeType = "d";	//	Absolute Dates
				} else {
					query("span.mdl-textfield__error", self.dateInputNodes.end.parentNode).forEach(function(msgNode){
						msgNode.innerHTML = self._invalidMessages.badDate;
					});
					if(!self.dateInputNodes.end.parentNode.classList.contains("is-invalid")){
						self.dateInputNodes.end.parentNode.classList.add("is-invalid");
					}
				}

				//	Finally, tell everything else the dates have changed.
				var val = d3.time.format("%Y-%m")(self.dates.start);
				query('div.trk-date__picker__month-container[data-value="' + val + '"]', self.calendarNode).forEach(function(node){
					self.calendarNode.scrollTop = node.offsetTop;
				});
				self._datesChanged();
			});

			if(this.hasCompare){
				//	TODO: set up the compare handlers, and set up the additional actions on the calendar

			}

			//	Final actions
			this.handlers.cancel = listen(this.buttonNodes.cancel, "click", cancel);
			this.handlers.ok = listen(this.buttonNodes.ok, "click", function(e){
				e.stopPropagation();
				var results = {
					dates: {
						start: sqlFormat(self.dates.start),
						end: sqlFormat(self.dates.end)
					},
					range: self.range,
					rangeType: self.rangeType
				};
				if(self.isGlobal){
					//	publish the topic
					topic.publish("DatePicker/datesChanged", { source: self, data: results });
				}

				//	make sure our values are updates
				self._originalValues.dates.start = self.dates.start;
				self._originalValues.dates.end = self.dates.end;
				self._originalValues.range = self.range;
				self._originalValues.rangeType = self.rangeType;
				self.setHumanDateRange(self.dates);
				self.dateInputNodes.start.parentNode.classList.remove("is-invalid");
				self.dateInputNodes.end.parentNode.classList.remove("is-invalid");
				put(self.inputMain, "!is-focused");

				//	close ourselves regardless
				self.close(e);
			});

			//	finally, listen to see if another instance changed dates and we're supposed to follow
			if(this.isGlobal){
				topic.subscribe("DatePicker/datesChanged", function(results){
					if(results.source !== self){
						//	came from another instance
						console.log("Changing dates for " + self.id + " using:", results);
						self.dates.start = sqlParse(results.data.dates.start);
						self.dates.end = sqlParse(results.data.dates.end);
						self.range = results.data.range;
						self.rangeType = results.data.rangeType;

						self._originalValues.dates.start = self.dates.start;
						self._originalValues.dates.end = self.dates.end;
						self._originalValues.range = self.range;
						self._originalValues.rangeType = self.rangeType;
						self.setPickerDates(self.dates);
						self.setHumanDateRange(self.dates);
						self.dateRangeNode.input.value = rangesMap[self.range] || "Custom Range";
						self.dateRangeNode.input.setAttribute("data-value", self.range);
						self.dateInputNodes.start.parentNode.classList.remove("is-invalid");
						self.dateInputNodes.end.parentNode.classList.remove("is-invalid");
					}
				});
			}
		},
		_render: function(){
			var self = this;

			//	The main component "shell"
			var component = renderContainer();
			this.domNode = component.domNode;
			put(this.parentNode, this.domNode);	//	TODO: handle if this is supposed to be first-child or last-child (this.before)
			this.id = this.domNode.id;
			this.inputNode = component.inputNode;
			this.inputMain = component.input;
			this.outlineNodes.calendar = put(component.menu, "-div.trk-date__picker-outline.mdl-shadow--8dp");
			this.menuNode = component.menu;

			//	Build and attach the calendar
			var calendar = this.calendar = renderCalendar(this.monthsToRender);
			this.calendarNode = calendar.node;
			put(component.menu, calendar.node);

			//	Build and attach the side panel
			var panel = renderSidePanel(this.hasCompare);
			//	console.log(panel);
			put(component.menu, panel.container);
			this.outlineNodes.input = put(panel.container, "-div.trk-date__picker__input-container--outline");
			this.dateRangeNode = panel.menu;
			this.dateInputNodes.start = panel.start;
			this.dateInputNodes.end = panel.end;
			this.messageNode = panel.messages;

			//	TODO: get the references to the compare section
			if(this.hasCompare){
			}

			//	Action buttons
			this.buttonNodes.ok = panel.buttons.okButton;
			this.buttonNodes.cancel = panel.buttons.cancelButton;

			//	start setting values
			this.setPickerDates(this.dates);
			this.setHumanDateRange(this.dates);
			this.dateRangeNode.input.value = rangesMap[this.range];
			this.dateRangeNode.input.setAttribute("data-value", this.range);

			this._originalValues = {
				dates: { start: this.dates.start, end: this.dates.end },
				range: this.range,
				rangeType: this.rangeType,
				compare: { length: 0, offset: 0 }
			};
		},

		//	UX methods
		_addDelay: function(){
			var w = this.domNode.getBoundingClientRect().width;
			query(".trk-date__picker-child", this.domNode).forEach(function(node){
				var d = (node.offsetWidth/w * TRANSITION_DURATION) + "s";
				node.style.transitionDelay = d;
			});
		},
		_removeDelay: function(){
			query(".trk-date__picker-child", this.domNode).forEach(function(node){
				node.style.transitionDelay = "0s";
			});
		},

		//	validation functions
		_valDateInput: function(node){
			//	This is generic; all we're doing is seeing if the value passed is a valid date or not.
			return !isNaN(Date.parse(node.value));
		},
		validate: function(){
			//	Rules:
			//	1. end date must either include yesterday or be before yesterday
			//	2. start date must be on or before yesterday
			//	3. number of days in the selected range must be equal to or less than the limit we have set
			var valid = true,
				test = new Date(),
				start = this.dates.start.valueOf(),
				end = this.dates.end.valueOf(),
				messages = [];
			test.setDate(test.getDate() - 1);
			test = test.valueOf();

			if(!((end - start) <= (this._rangeLimit * 24 * 60 * 60 * 1000))){
				//	out of range (too many days selected)
				valid = false;
				messages.push(this._invalidMessages.outOfRange);
			}

			if(!(end >= test && start <= test) && !(start < test && end <= test)){
				//	future date range selected
				valid = false;
				messages.push(this._invalidMessages.futureDate);
			}

			return {
				valid: valid,
				messages: messages
			};
		},

		//	basic UI functions
		enable: function(){
			this.handlers.open.resume();
			this.inputNode.MaterialTextfield.enable();
		},
		disable: function(){
			if(this.opened){
				this.close();
			}
			this.handlers.open.pause();
			this.inputNode.MaterialTextfield.disable();
		},
		open: function(e){
			if(e) e.stopPropagation();
			if(!this.opened){
				this.menuNode.classList.add("is-shown");
				this.outlineNodes.calendar.classList.add("is-shown");
				this.outlineNodes.input.classList.add("is-shown");
				this.calendar.scrollTo();
				this.opened = true;
				this.handlers.body.resume();
			}
		},
		close: function(e){
			if(e) e.stopPropagation();
			if(this.opened){
//				this._removeDelay();
				this.menuNode.classList.remove("is-shown");
				this.outlineNodes.calendar.classList.remove("is-shown");
				this.outlineNodes.input.classList.remove("is-shown");
			}
			this.opened = false;
			this.handlers.body.pause();
		},
		_toggleOk: function(enable){
			//	you MUST pass true if you want the button to be enabled!
			this.buttonNodes.ok.disabled = !!!enable;
		},

		getDates: function(){
			return this.dates;
		},
		setDates: function(dates, check){
			this.dates.start = dates.start;
			this.dates.end = dates.end;
			this._datesChanged();
		},
		_datesChanged: function(){
			//	internal handler ONLY to be informed when our dates have changed.
			var self = this;

			//	go set the right classes on buttons in the calendar
			query("button.trk-calendar__button-selected", this.calendarNode).forEach(function(node){
				node.classList.remove("trk-calendar__button-selected");
				node.classList.remove("trk-calendar__button-in-range");
			});
			query("button.trk-calendar__button-date", this.calendarNode).forEach(function(node, idx){
				var value = node.getAttribute("data-value");
				if(value){
					var dt = sqlParse(value);
					if(!self.dates.end && dt.valueOf() == self.dates.start.valueOf()){
						node.classList.add("trk-calendar__button-selected");
					} else if(self.dates.end){
						if(dt.valueOf() >= self.dates.start.valueOf() && dt.valueOf() <= self.dates.end.valueOf()) node.classList.add("trk-calendar__button-selected");
						var lastDayOfMonth = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1);
						if(lastDayOfMonth.getDate() > 1 && dt.valueOf() >= self.dates.start.valueOf() && dt.getDay() < 6 && dt.valueOf() < self.dates.end.valueOf()){
							node.classList.add("trk-calendar__button-in-range");
						}
					}
				}
			});

			//	See if our dates match any of the preset date ranges
			/*
			if(this.dates.start && this.dates.end){
				var range = "cr", b = false;
				for(var p in ranges){
					var test = ranges[p]();
					if(test.start.valueOf() == this.dates.start.valueOf() && test.end.valueOf() == this.dates.end.valueOf()){
						b = true;
						range = rangesReverseMap[p];
						break;
					}
				}
				this.dateRangeNode.input.setAttribute("data-value", range);
				this.dateRangeNode.input.value = rangesMap[range] || "Custom Range";
				this.range = range;
			}
			*/
			if(this.rangeType == "d"){
				//	reset our range input
				this.range = "cr";
				self.dateRangeNode.input.value = "Custom Range";
				self.dateRangeNode.input.setAttribute("data-value", "cr");
			}

			if(this.dates.end){
				var test = this.validate();
				this._toggleOk(test.valid);
				if(!test.valid){
					//	TODO: do something with these messages
					self.messageNode.innerHTML = "";
					test.messages.forEach(function(message){
						put(self.messageNode, "span.mdl-textfield__error", { innerHTML: message });
					});
					console.log(test.messages);
				} else {
					//	clear out the messages
					self.messageNode.innerHTML = "";
				}
			} else this._toggleOk();	//	disable if we don't have an end date
		},
		setPickerDates: function(dates){
			if(this.dateInputNodes.start) this.dateInputNodes.start.value = shortFormat(dates.start);
			if(this.dateInputNodes.end) this.dateInputNodes.end.value = dates.end ? shortFormat(dates.end) : "";
		},
		setHumanDateRange: function(dates){
			this.inputMain.value = longFormat(dates.start) + " - " + longFormat(dates.end);
		}
	});

	dateRangePicker.ranges = ranges;
	dateRangePicker.rangesMap = rangesMap;
	return dateRangePicker;
});
