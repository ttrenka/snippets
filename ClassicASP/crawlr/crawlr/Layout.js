crawlr.Layout=new (function(){

	var columnCount = 5;
	var rowCount = 4;
	var limit = columnCount*rowCount;
	var groupCount = 0;
	var photoCount = 0;
	
	this.setColumnCount = function(thisColumns) {
		columnCount = thisColumns;
		limit = columnCount*rowCount;
	};
	this.setRowCount = function(thisRows) {
		rowCount = thisRows;
		limit = columnCount*rowCount;
	};
	this.setLimit = function(thisLimit) {
		limit = thisLimit;
	};
	this.getLimit = function() {
		return limit;
	};
	this.resetGroupCount = function() {
		groupCount = 0;
	};
	this.resetPhotoCount = function() {
		groupCount = 0;
	};
	this.setPhotoCount = function(thisPhotoCount) {
		photoCount = thisPhotoCount;
	};
	
	this.buildThumbnailGrid = function(imgRS, relPath, linkByDP, titleAbove, resetPC){
		console.log("in tg, relPath is ",relPath);
		var tg = '<div class="thumb-grid">';
		for(var i=0; i<limit; i++){
			var thisRS=imgRS[i];
			//console.log("item has path ", thisRS.path, " fullimgpath ", thisRS.fullimgpath, " title ", thisRS.title);
			tg += '<div class="grid-item' + (((i+1)%columnCount == 0) ? '-last' : '') + '">'
				+ '<a href="'
				+ ((linkByDP == 1) ? 'get:' + relPath + thisRS.displaypath + '/' : '/img' + relPath + thisRS.fullimgpath)
				+ '" id="g' + groupCount + 'p' + photoCount + '" '
				+ ((linkByDP == 0) ? 'onClick="return false" ' : '')
				+ 'title="' + thisRS.title + '">';
			if (titleAbove == 1)
				tg += '<div class="title">' + thisRS.title + '</div>';
			tg += '<img src="' + crawlr.config.getStaticDomain() + '/img' + relPath + thisRS.path + '" width="120" border="0" alt="' + crawlr.escapeHtml(thisRS.AltTitle || thisRS.title) + '"/>';
			if (titleAbove == 0)
				tg += '<div class="title">' + thisRS.title + '</div>';
			tg += '</a></div>';
			if((i+1)%columnCount == 0)
				tg += '<div class="cl"></div>';
			photoCount++;
		}
		if (resetPC == 1)
			photoCount = 0;
		else
			photoCount -= limit;
		tg += '<div class="clear"></div></div>';
		return tg;
	};
	
	this.showLimitLink = function(itemCount,linkURL){
		var ll = '<span class="more">' + limit + ' of ' + itemCount + ' shown.'
		if(itemCount>limit)
			ll += '&nbsp;&nbsp;<a href="get:' + linkURL + '">Click to see more &gt;&gt;</a>'
		ll += '</span>';
		return ll;
	};
	
	this.showSearchHeader = function(resType, resName, itemCount){
		var lh = '<div class="filter-cap"><span class="caption">Results ' + resType.replace("By ","by ");
		if (resName.length)
			lh += ': ' + resName;
		lh += '</span>';
		if (resName.length > 30)
			lh += '<br/>';
		lh += '<span class="more">There are ' + itemCount + ' results for your search.</span></div>';
		return lh;
	};
	
	this.showBack = function(){
		var ref = String(Request.ServerVariables("http_referer"));
		if(ref.indexOf(String(Request.ServerVariables("server_name"))) != -1){
			return '<div class="back-link"><a href="' + ref + '">&lt;&lt; Back</a></div>'
		}
		var section_root = (crawlr.Request.GET.get("get").split("/"))[1]
		return '<div class="back-link"><a href="get:/' + section_root + '/">Search ' + section_root.replace("-"," ") + ' &gt;&gt;</a></div>';
	};
	
	this.buildLightbox = function(imgRS, relPath, resetPC){
		var lb = '\n<script type="text/javascript">\n'
			+ 'dojo.addOnLoad(function(){';
		for(var i=0; i<limit; i++){
			var thisRS=imgRS[i];
			lb += '\nnew skyline.Lightbox({group:"group' + groupCount + '",href:"/img' + relPath + thisRS.fullimgpath + '",caption:"' + thisRS.caption + '",description:"' + thisRS.description + '"}, dojo.byId("g' + groupCount + 'p' + photoCount + '"));\n';
			photoCount++;
		}
		lb += '});\n</script>\n';
		if (resetPC == 1) {
			groupCount++;
			photoCount = 0;
		}
		return lb;
	};
	
	this.showById = function(imgRS, relPath, parentTitle, title, linkByDP){
		var bi = this.showSearchHeader(parentTitle, title, imgRS.length);
		if (imgRS.length>0){
			this.setLimit(imgRS.length);
			bi += this.buildThumbnailGrid(imgRS, relPath, linkByDP, 0, 1);
			bi += this.buildLightbox(imgRS, relPath, 1);
		}
		bi += this.showBack();
		return bi;
	};
	
	this.showByCategory = function(groups, imgRS, relPath, curCat, title, linkByDP){
		this.setRowCount(2);
		var bg = this.showSearchHeader(title, "", imgRS.items.length);
		for(var i=0, l=groups.length; i<l; i++){
			var group=groups[i];
			this.setLimit(Math.min(group.items.length, 10));
			bg += '<div class="filter-cap">';
			bg += '<span class="caption">' + group.title + '</span>';
			bg += this.showLimitLink(group.items.length, relPath + curCat + '/' + group.key + '/');
			bg += '</div>';
			bg += this.buildThumbnailGrid(group.items, relPath, linkByDP, 0, 1);
			bg += this.buildLightbox(group.items, relPath, 1);
		}
		bg += this.showBack();
		return bg;
	};
	
	this.buildPortfolioGrid = function(imgRS, relPath, resetPC){
		var pg = '<div id="PortfolioItems">';
		console.log("in buildPortfolioGrid: ", imgRS.length, " items - showing ", limit);
		for(var i=0, l=limit; i<l; i++){
			var item=imgRS[i];
			
			// lib item
			if (i%2 == 0)
				pg += '<div class="cl"></div>';
			pg += '<div class="pi-item' + ((i%2 == 0) ? ' cl' : '') + '">';
			
			// thumbnail
			console.log("itemkey ", item.itemkey, " ", item.stub);
			pg += '<div class="pi-thumb">'
				+ '<a href="get:' + relPath + item.itemkey + '/" '
				+ 'title="' + item.title + '"><img src="/img' + relPath + item.stub + '/' + item.path + '" '
				+ 'width="120" border="0" alt="' + item.title + '" /></a>'
				+ '</div>';
				
			// link and size area
			pg += '<div class="pi-link"><div>'
				
			// rental
			if(item.Rental_Category_Count>0)
				pg += '<div class="rental">'
					+ '<a href="get:/Design-Portfolio/rental-' + item.category.toLowerCase() + '/" title="Rental">'
					+ '<img src="/img/Design-Portfolio/rental-icon-small.gif" border="0" alt="Rental" />'
					+ '</a>'
					+ '</div>';
				
			// display name
			pg += '<div class="title">'
				+ '<a href="get:' + relPath + item.itemkey + '/">'
				+ '<h3>' + item.title + '</h3>'
				+ '</a>'
				+ '</div></div>';
				
			// display abstract if available
			//if(!util.isEmpty(item.abstract))
			//	pg += '<p>' + item.abstract + '</p>';
			
			//	display sizes
			var sql='SELECT DISTINCT ao.title AS title FROM dpAttributeOption ao '
				+ 'INNER JOIN dpObjectCategories oc ON oc.dpOption=ao.id AND oc.dpAttribute=ao.dpAttribute '
				+ 'WHERE oc.dpMaster=\'' + item.itemkey + '\' and oc.status IN (' + crawlr.config.status() + ')';
			var rs=crawlr.fetch(sql);
			if(rs.items.length>0){
				pg += '<div class="exsizes">Exhibit Sizes</div>';
				for(var j=0, jl=rs.items.length; j<jl; j++){
					pg += '<div>' + rs.items[j].title + '</div>';
				}
			}

			// close link and size area
			pg += '<div class="clear"></div></div>';
			
			// close lib item
			pg += '<div class="clear"></div></div>';
		}

		pg += '<div class="clear"></div></div>';
		
		return pg;
	
	};
	
	this.buildRentalGrid = function(lines, category, id, resetPC){
		var rg = '';
		for(var i=0; i<lines.length;i++){
			if (!id){
				limit = 4;
				if (lines[i].groups[0].items.length < limit)
					limit = lines[i].groups[0].items.length;
				rg += '<div class="rental-line">'
					+ '<h3>' + lines[i].line_title + '</h3>'
					+ this.showLimitLink(lines[i].groups[0].items.length, "/Rental-Catalog/" + category + "/" + lines[i].line_id + "/")
					+ '</div>';
			}
			for(var j=0; j<lines[i].groups.length;j++){
				group = lines[i].groups[j];
				rg += '<div class="rental-group">';
				if (id)
					rg += '<h3>'
						+ ((group.group_has_content) ? '<a href="/Rental-Catalog/' + group.group_id + '/">' : '')
						+ group.group_title
						+ '</h3>'
						+ ((group.group_has_content) ? '</a>' : '');
				rg += '<div class="rental-grid">';
				useLimit = group.items.length;
				if(!resetPC && useLimit > limit) {
					useLimit = limit;
				}
				console.log("displaying group ",group.group_title," showing ",useLimit," items");
				for(var k=0; k<useLimit; k++){
					item = group.items[k];
					console.log("displaying item ",item.title);
					rg += '<div class="grid-item' + ((k+1)%4 == 0 ? '-last' : '') + '">'
						+ '<a href="/Rental-Catalog/' + item.id + '/">'
						+ '<img src="' + crawlr.config.getStaticDomain() + '/img/Rental-Catalog/' + lines[i].line_id + '/' + item.thumbPath + '" '
						+ 'alt="' + item.title + '" title="' + item.title + '" border="0" />'
						+ '<div class="title">' + item.name + '</div></a></div>';
					if((k+1)%4 == 0)
						rg += '<div class="cl"></div>';
					photoCount++;
				}
				rg += '</div><div class="clear"></div>';
				rg += '</div><div class="clear"></div>';
				if (resetPC == 1)
					photoCount = 0;
				else
					photoCount -= limit;
			}
		}
		return rg;
	};
	
})();
