using System;
using System.Collections.Specialized;
using System.Text;
using System.Web;

namespace DepartmentZed.eCommerce{
	public class PageInformation {
		private string page;
		private string httpMethod;
		private AccessTypes requiredAccess;
		private NameValueCollection savedForm;
		
		public string Page {
			get { return page; }
		}
		public AccessTypes AccessLevel {
			get { return requiredAccess; }
		}
		public string HttpMethod {
			get { return httpMethod; }
		}
		public NameValueCollection Form {
			get { return savedForm; }
		}
		
		public PageInformation(string pg, AccessTypes ac){
			page = pg;
			requiredAccess = ac;
			savedForm = new NameValueCollection();
		}
		public PageInformation(HttpContext c, AccessTypes ac) {
			page = c.Request.Url.AbsoluteUri;
			if (page.IndexOf("http:") > -1
				&& page.IndexOf("localhost") == -1
				&& page.IndexOf("zirh.mine.nu") == -1
			) page = page.Replace("http:", "https:");
			requiredAccess = ac;
			httpMethod = c.Request.HttpMethod;
			savedForm = new NameValueCollection(c.Request.Form);
		}
		
		public void SaveForm(NameValueCollection nvc) {
			savedForm = new NameValueCollection(nvc);
		}

		public string GetForm(){
			StringBuilder sb = new StringBuilder();
			foreach (string name in savedForm) {
				sb.Append("<input type=\"hidden\" name=\"" + name + "\" value=\"" + savedForm[name] + "\" />");
			}
			return sb.ToString();
		}
		
		public void Load(HttpContext c){
			if (httpMethod.ToLower() == "post") {
				StringBuilder sb = new StringBuilder();
				sb.Append("<html><head>");
				sb.Append("<script type=\"text/javascript\">");
				sb.Append("onload = function(){ document.forms[0].submit(); } ; ");
				sb.Append("</script>");
				sb.Append("</head><body>");
				sb.Append("<form action=\"" + page + "\" method=\"post\">");
				sb.Append(GetForm());
				sb.Append("</form>");
				sb.Append("</body></html>");
				c.Response.Write(sb.ToString());
				c.Response.End();
			} else c.Response.Redirect(page);
		}
		
		public bool CanAccess(AccessTypes userAccess) {
			return ((int)userAccess >= (int)requiredAccess);
		}
	}
}
