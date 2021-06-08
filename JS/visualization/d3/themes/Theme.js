define(["dojo/_base/declare", "dojo/_base/lang"],
function(declare, lang){
	/*************************************************
	 *	Theme.js
	 *	v1.0.0	TRT
	 *	20190326
	 *
	 *	This object is meant to read in actual theme
	 *	files and allow things that consume them to
	 *	get the information it needs out of them.
	 *
	 *************************************************/ 
	var idCounter = 0,
		idPrefix = "trk-charttheme-",
		variations = {};

	//	we need to be able to do a deep mixin as opposed to a shallow one.
	function deepMixin(target, source){
		for(var name in source){
			var tval = target[name],
				sval = source[name];
			if(tval !== sval){
				if(tval && typeof tval === 'object' && sval && typeof sval === 'object'){
					deepMixin(tval, sval);
				} else if (tval && Array.isArray(tval) && sval && Array.isArray(sval)){
					target[name] = sval.slice(0);	//	make a shallow copy of the array
				} else {
					target[name] = sval;
				}
			}
		}
		return target;
	}

	var theme = declare([], {
		id: null,
		name: null,
		source: null,
		variation: null,

		constructor: function(source, variation, name){
			//	The source as created in the actual theme file;
			//	this should be each variation in that file and
			//	not the entire file itself
			var id = idCounter++;
			this.id = idPrefix + id;
			this.source = lang.clone(source);
			this.variation = variation;	//	the trk theme (style-dark, style-light, etc)
			this.name = name;
			variations[this.variation] = this;
		},
		get: function(item){
			if(item in this.source) return lang.clone(this.source[item]);
			return null;
		},
		clone: function(){
			return new theme(lang.clone(this.source), this.variation, this.name);
		}
	});
	theme.Themes = variations;
	theme.mixin = deepMixin;
	theme.create = function(def, src, variation, name){
		return new theme(theme.mixin(lang.clone(def.source), src), variation, name);
	};
	return theme;
});
