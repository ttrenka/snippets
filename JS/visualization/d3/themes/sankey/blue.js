define(["dojo/_base/lang", "app/ui/charts/themes/Theme", "app/ui/charts/themes/sankey/default" ],
function(lang, Theme, Default){
	/****************************************************************
	 *	Sankey Blue theme (placeholder for variations)
	 ****************************************************************/ 
	var variations = {};

	variations[Default.variation] = Default;
	var dark = { };
	variations["style-dark"] = Theme.create(Default, dark, "style-dark", "Dark");

	var light = { };
	variations["style-light"] = Theme.create(Default, light, "style-light", "Light");

	return variations;
});
