<%@ Page language="C#" AutoEventWireup="false" Debug="true" %>
<%@ Import namespace="System.Collections.Generic" %>
<%@ Import namespace="Aimedia" %>

<%
	Response.ContentType = "application/json; charset=iso-8859-1";

	//	Check the user access first
	Aimedia.User user = (Aimedia.User)Session["user"];
	if(!user.isEmployee){
		Dictionary<String, Object> err = new Dictionary<String, Object>();
		err.Add("error", "Access denied");
		Response.Write(Newtonsoft.Json.JsonConvert.SerializeObject(err));
		Response.End();
	}

	Aimedia.Branding branding = (Aimedia.Branding)Session["branding"];

	//	for debugging purposes. We need to pass this to any Aimedia.Console[methods] as the second arg.
	List<Dictionary<string, object>> messages = new List<Dictionary<string, object>>();

	//	Parse out the query string/form variables
	PageParams param = (Request.QueryString.Count > 0) ? new PageParams(Request.QueryString) 
		: ((Request.Form.Count > 0) ? new PageParams(Request.Form) : new PageParams());

	//	Check to see if this is an agency user
	if(user.HasRole(RoleNames.Agency)){
		param.UserId = user.id;
		param.getBudget();
	}

	//	debugging purposes
	DateTime _start = DateTime.Now;
	string type = "s";
	if(param.SelectionType == "g") type = "g";
	if(param.SelectionType == "c") type = "c";

	string sql = @"EXEC pNetworkAdLeadsAll @id, @startDateFull, @endDateFull, @type";
	
	// Set our parameters
	Dictionary<String, object> p = param.GetSQLParams();
	p.Add("type", type);

	if(user.HasRole(RoleNames.Agency)){
		sql = @"EXEC pNetworkAdLeadsAll @id, @startDateFull, @endDateFull, @type, @user";
		p.Add("user", user.id);
	}

	//	Set up the return object
	Dictionary<String, Object> ret = new Dictionary<String, Object>();

	//	Get the data
	List<Dictionary<String, Object>> rs = Utilities.FetchDataRaw((String)Application["cn"], sql, p, 220);

	for(int i=0; i<rs.Count; i++){
		Dictionary<String, Object> row = rs[i];
		row.Add("id", (i+1));
		row["spent"] = ((double)row["spent"]) * branding.Markup;
	}
	ret.Add("items", rs);

	Aimedia.Console.Log("Page execution: " + (DateTime.Now - _start), messages);
	Aimedia.Console.Log("Record count: " + rs.Count, messages);
	Aimedia.Console.Log(p, messages);												//	parameters used for both SQL statements
	Aimedia.Console.Log(sql, messages);												//	first SQL statement

	if(user.hasConsole){
		ret.Add("console", Aimedia.Console.Flush("srv/cards/networkAdActivityByDay.aspx", messages));
	}

	//	Encode as JSON and send it out
	String json = Utilities.EncodeJson(ret);
	Response.Write(json);
%>

