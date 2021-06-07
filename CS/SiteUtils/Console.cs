using System;
using System.Collections.Generic;

namespace SiteUtils {
	public static class Console {
//		private static List<Dictionary<string, object>> messages = new List<Dictionary<string, object>>();

		public static void Log(object message, List<Dictionary<string, object>> messages){
			Dictionary<string, object> m = new Dictionary<string, object>();
			m.Add("type", "log");
			m.Add("message", message);
			messages.Add(m);
		}
		public static void Info(object message, List<Dictionary<string, object>> messages){
			Dictionary<string, object> m = new Dictionary<string, object>();
			m.Add("type", "info");
			m.Add("message", message);
			messages.Add(m);
		}
		public static void Debug(object message, List<Dictionary<string, object>> messages){
			Dictionary<string, object> m = new Dictionary<string, object>();
			m.Add("type", "debug");
			m.Add("message", message);
			messages.Add(m);
		}
		public static void Warn(object message, List<Dictionary<string, object>> messages){
			Dictionary<string, object> m = new Dictionary<string, object>();
			m.Add("type", "warn");
			m.Add("message", message);
			messages.Add(m);
		}
		public static void Error(object message, List<Dictionary<string, object>> messages){
			Dictionary<string, object> m = new Dictionary<string, object>();
			m.Add("type", "error");
			m.Add("message", message);
			messages.Add(m);
		}
		public static void GroupCollapsed(List<Dictionary<string, object>> messages){
			Dictionary<string, object> m = new Dictionary<string, object>();
			m.Add("type", "groupCollapsed");
			m.Add("message", "");
			messages.Add(m);
		}
		public static void GroupCollapsed(string label, List<Dictionary<string, object>> messages){
			Dictionary<string, object> m = new Dictionary<string, object>();
			m.Add("type", "groupCollapsed");
			m.Add("message", label);
			messages.Add(m);
		}
		public static void GroupEnd(List<Dictionary<string, object>> messages){
			Dictionary<string, object> m = new Dictionary<string, object>();
			m.Add("type", "groupEnd");
			m.Add("message", "");
			messages.Add(m);
		}

		public static List<Dictionary<string, object>> Flush(List<Dictionary<string, object>> messages){
			Dictionary<string, object> start = new Dictionary<string, object>();
			start.Add("type", "groupCollapsed");
			start.Add("message", "SERVER:");
			messages.Insert(0, start);
			Dictionary<string, object> end = new Dictionary<string, object>();
			end.Add("type", "groupEnd");
			end.Add("message", "");
			messages.Add(end);
			return messages;
		}

		public static List<Dictionary<string, object>> Flush(string filename, List<Dictionary<string, object>> messages){
			Dictionary<string, object> start = new Dictionary<string, object>();
			start.Add("type", "groupCollapsed");
			start.Add("message", "SERVER: " + filename);
			messages.Insert(0, start);
			Dictionary<string, object> end = new Dictionary<string, object>();
			end.Add("type", "groupEnd");
			end.Add("message", "");
			messages.Add(end);
			return messages;
		}
	}
}
