crawlr.Filters = new (function(){
	
	this.showFilters=function(options, option_order, current_cat, current_id){
		current_cat = current_cat.toLowerCase();
		current_id = current_id.toLowerCase();

		crawlr.Response.write('dojo.require("skyline.Filter");\n', 'script');

		var n = crawlr.Kernel.current();
		var p = n.parent();
		while(true){
			var p2 = p.parent();
			if(!p2){ break; }
			n = p;
			p = n.parent();
		}
		n = n.url;
		
		var show_cat_links = true;
		var single_list = false;
		var sf = '<div id="Filters">'
			+ '<form action="' + crawlr.config.href() + '/' + n + '">'
			+ '<div class="filter-cap"><span class="caption">Search by';
		if(option_order.length == 1){
			show_cat_links = false;
			single_list = true;
			sf += ' ' + option_order[0].toUpperCase().substring(0,1)
				+ option_order[0].toLowerCase().substring(1,option_order[0].length);					
		}
		sf += ':</span>';
		if(show_cat_links)
			sf += '<span class="instruction">(Click on a search category to view all options)</span>';
		sf += '</div><div class="lists">';
		
		for(var f=0, fl=option_order.length; f<fl; f++){
			var option_list = options[option_order[f]];
			var cat = option_list[0].category.toLowerCase();
			sf += '<div class="list-item">';
			if(show_cat_links){
				sf += '<h3' + ((cat == current_cat) ? ' class="filter-current"' : '') + '>'
					+ '<a href="' + crawlr.config.href() + '/' + n + '/' + cat + '/">'
					+ cat.toUpperCase().substring(0,1)
					+ cat.substring(1,cat.length)
					+ '</a></h3>';
			}
			sf += '<select class="list-' + ((single_list) ? 'single' : cat) + '" dojoType="skyline.Filter" criteria="' + cat + '">'
				+ '<option value="">Select ';
			if (cat.charAt(cat.length-1)!="s")
				sf += 'a' + (('aeiou'.indexOf(cat.substring(0,1)) != -1) ? 'n ' : ' ');
			sf += cat.toUpperCase().substring(0,1)
				+ cat.substring(1,cat.length)
				+ '</option>';
			for(var i=0, l=option_list.length; i<l; i++){
				sf += '<option value="' + option_list[i].id + '"'
					+ ((cat == current_cat && option_list[i].id.toLowerCase() == current_id) ? ' selected="true"' : '')
					+ '>' + option_list[i].title + '</option>';
			}
			sf += '</select></div>';
		}
		
		return sf
			+ '</form>'
			+ '<div class="clear"></div>'
			+ '</div>'
			+ '</div>';
	};
	
})();