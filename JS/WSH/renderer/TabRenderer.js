/************************************************************
 *	TabRenderer.js for WSH
 *	v.1.1.0
 *	TRT 20160922
 *
 *	Given a set of column definitions and a JSON array of
 *	data, create a flushable string of data.
 *
 * 	Usage:
 *
 * 	var tab = new TabRenderer(columns);
 * 	var s = tab.render(JSONArray);
 *
 * 	The variable "s" is a string containing the full output
 * 	of the .txt.
 ************************************************************/

TabRenderer = function(cols){
	var newline = "\r\n",
		delimiter = "\t";

	function createRowCells(each){
		var a = [];
		for(var i=0, l=cols.length; i<l; i++){
			var col = cols[i];
			a.push("" + each(col));
		}
		return a.join(delimiter) + newline;
	}

	function createHeaderCells(){
		//	This is comma delimited, we can't do nested headers at all.
		var a = [];
		for(var i=0, l=cols.length; i<l; i++){
			var col = cols[i];
			a.push(col.label || col.field);
		}
		return a.join(delimiter) + newline;
	}

	function renderRow(object, options){
		return createRowCells(function(column){
			var data = object;
			if(column.get){
				data = column.get(0, object);
			}else if("field" in column && column.field != "_item"){
				data = data[column.field];
			}
			if(column.formatter){
				return column.formatter(data);
			}else if(column.renderCell){
				return column.renderCell(data);
			}else if(data != null){
				return data;
			}
			//	catch all in case we actually don't have any data.
			return "";
		});
	}

	function renderHeader(){
		return createHeaderCells();
	}

	this.render = function(data, dontRenderHeader){
		var s = "";
		if(!dontRenderHeader){
			s += renderHeader();
		}
		for(var i=0, l=data.length; i<l; i++){
			s += renderRow(data[i]);
		}
		return s;
	};
}
