using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using System.Data.SqlClient;
using System.Text;

namespace Aimedia {
    public class Utilities {
        private static string connectionString = "Server=172.16.2.10;User Id=aimg_db;Password=tas4284;Database=AiMG_systems;";
        public static string ConnectionString { get => connectionString; set => connectionString = value; }

        public static List<String> FetchDataTsv(string cn, string sql){
            List<String> res = new List<String>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
		        conn.Open();
		        SqlDataReader reader = cmd.ExecuteReader();

		        int count = reader.FieldCount;
		        string[] header = new String[count];
		        for(int i=0; i<count; i++){
			        header[i] = reader.GetName(i);
		        }
		        res.Add(String.Join("\t", header));

		        while (reader.Read()){
			        // do the rest
			        string[] row = new String[count]; 
			        for(int i=0; i<count; i++){
				        row[i] = reader.GetValue(i).ToString();
			        }
		            res.Add(String.Join("\t", row));
		        }
		        reader.Close();
	        }
            return res;
        }
        public static List<String> FetchDataTsv(string cn, string sql, int timeout){
            List<String> res = new List<String>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
				cmd.CommandTimeout = timeout;
		        conn.Open();
		        SqlDataReader reader = cmd.ExecuteReader();

		        int count = reader.FieldCount;
		        string[] header = new String[count];
		        for(int i=0; i<count; i++){
			        header[i] = reader.GetName(i);
		        }
		        res.Add(String.Join("\t", header));

		        while (reader.Read()){
			        // do the rest
			        string[] row = new String[count]; 
			        for(int i=0; i<count; i++){
				        row[i] = reader.GetValue(i).ToString();
			        }
		            res.Add(String.Join("\t", row));
		        }
		        reader.Close();
	        }
            return res;
        }
        public static List<String> FetchDataTsv(string cn, string sql, Dictionary<String, String> p){
            List<String> res = new List<String>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
                foreach(var pair in p){
                    cmd.Parameters.AddWithValue("@" + pair.Key, pair.Value);
                }
		        conn.Open();
		        SqlDataReader reader = cmd.ExecuteReader();

		        int count = reader.FieldCount;
		        string[] header = new String[count];
		        for(int i=0; i<count; i++){
			        header[i] = reader.GetName(i);
		        }
		        res.Add(String.Join("\t", header));

		        while (reader.Read()){
			        // do the rest
			        string[] row = new String[count]; 
			        for(int i=0; i<count; i++){
				        row[i] = reader.GetValue(i).ToString();
			        }
		            res.Add(String.Join("\t", row));
		        }
		        reader.Close();
	        }
            return res;
        }
        public static List<String> FetchDataTsv(string cn, string sql, Dictionary<String, String> p, int timeout){
            List<String> res = new List<String>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
				cmd.CommandTimeout = timeout;
                foreach(var pair in p){
                    cmd.Parameters.AddWithValue("@" + pair.Key, pair.Value);
                }
		        conn.Open();
		        SqlDataReader reader = cmd.ExecuteReader();

		        int count = reader.FieldCount;
		        string[] header = new String[count];
		        for(int i=0; i<count; i++){
			        header[i] = reader.GetName(i);
		        }
		        res.Add(String.Join("\t", header));

		        while (reader.Read()){
			        // do the rest
			        string[] row = new String[count]; 
			        for(int i=0; i<count; i++){
				        row[i] = reader.GetValue(i).ToString();
			        }
		            res.Add(String.Join("\t", row));
		        }
		        reader.Close();
	        }
            return res;
        }
        public static String FetchDataJson(string cn, string sql){
            List<Dictionary<String, Object>> res = new List<Dictionary<String, Object>>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
		        conn.Open();
		        SqlDataReader reader = cmd.ExecuteReader();
		        int count = reader.FieldCount;

		        while (reader.Read()){
			        // do the rest
                    Dictionary<String, Object> row = new Dictionary<String, Object>();			        
                    for(int i=0; i<count; i++){
                        row.Add(reader.GetName(i), reader.GetValue(i));
			        }
                    res.Add(row);
		        }
                String result =  Newtonsoft.Json.JsonConvert.SerializeObject(res, Newtonsoft.Json.Formatting.Indented);	        
		        reader.Close();
                return result;
            }
        }
        public static String FetchDataJson(string cn, string sql, int timeout){
            List<Dictionary<String, Object>> res = new List<Dictionary<String, Object>>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
				cmd.CommandTimeout = timeout;
		        conn.Open();
		        SqlDataReader reader = cmd.ExecuteReader();
		        int count = reader.FieldCount;

		        while (reader.Read()){
			        // do the rest
                    Dictionary<String, Object> row = new Dictionary<String, Object>();			        
                    for(int i=0; i<count; i++){
                        row.Add(reader.GetName(i), reader.GetValue(i));
			        }
                    res.Add(row);
		        }
                String result =  Newtonsoft.Json.JsonConvert.SerializeObject(res, Newtonsoft.Json.Formatting.Indented);	        
		        reader.Close();
                return result;
            }
        }        
		public static String FetchDataJson(string cn, string sql, Dictionary<String, String> p){
            List<Dictionary<String, Object>> res = new List<Dictionary<String, Object>>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
		        conn.Open();
                foreach(var pair in p){
                    cmd.Parameters.AddWithValue("@" + pair.Key, pair.Value);
                }
                SqlDataReader reader = cmd.ExecuteReader();
		        int count = reader.FieldCount;

		        while (reader.Read()){
			        // do the rest
                    Dictionary<String, Object> row = new Dictionary<String, Object>();			        
                    for(int i=0; i<count; i++){
                        row.Add(reader.GetName(i), reader.GetValue(i));
			        }
                    res.Add(row);
		        }
                String result =  Newtonsoft.Json.JsonConvert.SerializeObject(res, Newtonsoft.Json.Formatting.Indented);
		        reader.Close();
                return result;
            }
        }
        public static String FetchDataJson(string cn, string sql, Dictionary<String, String> p, int timeout){
            List<Dictionary<String, Object>> res = new List<Dictionary<String, Object>>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
				cmd.CommandTimeout = timeout;
		        conn.Open();
                foreach(var pair in p){
                    cmd.Parameters.AddWithValue("@" + pair.Key, pair.Value);
                }
                SqlDataReader reader = cmd.ExecuteReader();
		        int count = reader.FieldCount;

		        while (reader.Read()){
			        // do the rest
                    Dictionary<String, Object> row = new Dictionary<String, Object>();			        
                    for(int i=0; i<count; i++){
                        row.Add(reader.GetName(i), reader.GetValue(i));
			        }
                    res.Add(row);
		        }
                String result =  Newtonsoft.Json.JsonConvert.SerializeObject(res, Newtonsoft.Json.Formatting.Indented);
		        reader.Close();
                return result;
            }
        }
        public static List<Dictionary<String, Object>> FetchDataRaw(string cn, string sql){
            List<Dictionary<String, Object>> res = new List<Dictionary<String, Object>>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
		        conn.Open();
		        SqlDataReader reader = cmd.ExecuteReader();
		        int count = reader.FieldCount;

		        while (reader.Read()){
			        // do the rest
                    Dictionary<String, Object> row = new Dictionary<String, Object>();			        
                    for(int i=0; i<count; i++){
                        row.Add(reader.GetName(i), reader.GetValue(i));
			        }
                    res.Add(row);
		        }
		        reader.Close();
                return res;
            }
        }
        public static List<Dictionary<String, Object>> FetchDataRaw(string cn, string sql, int timeout){
            List<Dictionary<String, Object>> res = new List<Dictionary<String, Object>>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
				cmd.CommandTimeout = timeout;
		        conn.Open();
		        SqlDataReader reader = cmd.ExecuteReader();
		        int count = reader.FieldCount;

		        while (reader.Read()){
			        // do the rest
                    Dictionary<String, Object> row = new Dictionary<String, Object>();			        
                    for(int i=0; i<count; i++){
                        row.Add(reader.GetName(i), reader.GetValue(i));
			        }
                    res.Add(row);
		        }
		        reader.Close();
                return res;
            }
        }
        public static List<Dictionary<String, Object>> FetchDataRaw(string cn, string sql, Dictionary<String, object> p){
            List<Dictionary<String, Object>> res = new List<Dictionary<String, Object>>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
		        conn.Open();
		        foreach(var pair in p){
                    cmd.Parameters.AddWithValue("@" + pair.Key, pair.Value);
                }
                SqlDataReader reader = cmd.ExecuteReader();
		        int count = reader.FieldCount;

		        while (reader.Read()){
			        // do the rest
                    Dictionary<String, Object> row = new Dictionary<String, Object>();			        
                    for(int i=0; i<count; i++){
                        row.Add(reader.GetName(i), reader.GetValue(i));
			        }
                    res.Add(row);
		        }
		        reader.Close();
                return res;
            }
        }
       public static List<Dictionary<String, Object>> FetchDataRaw(string cn, string sql, Dictionary<String, object> p, int timeout){
            List<Dictionary<String, Object>> res = new List<Dictionary<String, Object>>();
	        using (SqlConnection conn = new SqlConnection(cn)){
		        SqlCommand cmd = new SqlCommand(sql, conn);
				cmd.CommandTimeout = timeout;
		        conn.Open();
		        foreach(var pair in p){
                    cmd.Parameters.AddWithValue("@" + pair.Key, pair.Value);
                }
                SqlDataReader reader = cmd.ExecuteReader();
		        int count = reader.FieldCount;

		        while (reader.Read()){
			        // do the rest
                    Dictionary<String, Object> row = new Dictionary<String, Object>();			        
                    for(int i=0; i<count; i++){
                        row.Add(reader.GetName(i), reader.GetValue(i));
			        }
                    res.Add(row);
		        }
		        reader.Close();
                return res;
            }
        }

        public static String EncodeJson(List<Dictionary<String, Object>> data){
            return Newtonsoft.Json.JsonConvert.SerializeObject(data);
        }

		public static String EncodeJson(Dictionary<String, Object> data){
           return Newtonsoft.Json.JsonConvert.SerializeObject(data);
		}

        public static String EncodeTsv(List<Dictionary<String, Object>> data){
            List<String> res = new List<String>();
            Dictionary<String, Object> row = data[0];
  		    List<String> tmp = new List<String>(); 
    	    foreach(string key in row.Keys){
				tmp.Add(key);            
            }
		    res.Add(String.Join("\t", tmp));
            for(int i=0; i<data.Count; i++){
                Dictionary<String, Object> row2 = data[i];
  			    List<String> tmp2 = new List<String>(); 
 
			    foreach(string key in row2.Keys){
				    tmp2.Add(row2[key].ToString());
			    }
		        res.Add(String.Join("\t", tmp2));
  			    tmp2.Clear();
            }
            return String.Join("\n", res);
        }

        public static String EncodeCsv(List<Dictionary<String, Object>> data){
            List<String> res = new List<String>();
            Dictionary<String, Object> row = data[0];
  			List<String> tmp = new List<String>(); 
			foreach(string key in row.Keys){
				tmp.Add("\"" + key + "\"");
			}
		    res.Add(String.Join(",", tmp));

            for(int i=0; i<data.Count; i++){
      			List<String> tmp2 = new List<String>(); 
			    foreach(string key in row.Keys){
				    tmp2.Add("\"" + row[key].ToString().Replace(",", "\\,") + "\"");
			    }
		        res.Add(String.Join(",", tmp2));
                tmp2.Clear();
            }
            return String.Join("\n", res);
        }

		/*
		//	Methods for getting remote resources
		private static HttpClient httpClient;
		public static async Task<String> GET(string url){
			using (var httpClient = new HttpClient()){
				using (var request = new HttpRequestMessage(new HttpMethod("GET"), url)){
					request.Headers.TryAddWithoutValidation("Accept", "application/json");
					request.Headers.TryAddWithoutValidation("User-Agent", "curl/7.60.0"); 

				//	var base64authorization = Convert.ToBase64String(Encoding.ASCII.GetBytes("username:password"));
				//	request.Headers.TryAddWithoutValidation("Authorization", $"Basic {base64authorization}"); 
				//	request.Content = new StringContent("{\"status\": \"resolved\"}", Encoding.UTF8, "application/json"); 

					var response = await httpClient.SendAsync(request);
				}
			}
		}
		public static async Task<String> GET(string url, string user, string password){
			using (var httpClient = new HttpClient()){
				using (var request = new HttpRequestMessage(new HttpMethod("GET"), url)){
					request.Headers.TryAddWithoutValidation("Accept", "application/json");
					request.Headers.TryAddWithoutValidation("User-Agent", "curl/7.60.0"); 

					var base64authorization = Convert.ToBase64String(Encoding.ASCII.GetBytes(user + ":" + password));
					request.Headers.TryAddWithoutValidation("Authorization", "Basic " + base64authorization); 
				//	request.Content = new StringContent("{\"status\": \"resolved\"}", Encoding.UTF8, "application/json"); 

					var response = await httpClient.SendAsync(request);
				}
			}		}
		public static async Task<String> GET(string url, string[] parameters){
		}
		public static async Task<String> GET(string url, string[] parameters, string user, string password){
			using (var httpClient = new HttpClient()){
				using (var request = new HttpRequestMessage(new HttpMethod("GET"), url)){
					request.Headers.TryAddWithoutValidation("Accept", "application/json");
					request.Headers.TryAddWithoutValidation("User-Agent", "curl/7.60.0"); 

					var base64authorization = Convert.ToBase64String(Encoding.ASCII.GetBytes(user + ":" + password));
					request.Headers.TryAddWithoutValidation("Authorization", "Basic " + base64authorization); 
				//	request.Content = new StringContent("{\"status\": \"resolved\"}", Encoding.UTF8, "application/json"); 

					var response = await httpClient.SendAsync(request);
				}
			}		}
		public static async Task<String> POST(string url){
			using (var httpClient = new HttpClient()){
				using (var request = new HttpRequestMessage(new HttpMethod("POST"), url)){
					request.Headers.TryAddWithoutValidation("Accept", "application/json");
					request.Headers.TryAddWithoutValidation("User-Agent", "curl/7.60.0"); 

					var base64authorization = Convert.ToBase64String(Encoding.ASCII.GetBytes("username:password"));
					request.Headers.TryAddWithoutValidation("Authorization", "Basic " + base64authorization); 
				//	request.Content = new StringContent("{\"status\": \"resolved\"}", Encoding.UTF8, "application/json"); 

					var response = await httpClient.SendAsync(request);
				}
			}
		}
		public static async Task<String> POST(string url, string user, string password){
			using (var httpClient = new HttpClient()){
				using (var request = new HttpRequestMessage(new HttpMethod("POST"), url)){
					request.Headers.TryAddWithoutValidation("Accept", "application/json");
					request.Headers.TryAddWithoutValidation("User-Agent", "curl/7.60.0"); 

					var base64authorization = Convert.ToBase64String(Encoding.ASCII.GetBytes(user + ":" + password));
					request.Headers.TryAddWithoutValidation("Authorization", "Basic " + base64authorization); 
				//	request.Content = new StringContent("{\"status\": \"resolved\"}", Encoding.UTF8, "application/json"); 

					var response = await httpClient.SendAsync(request);
				}
			}
		}
		public static async Task<String> POST(string url, string[] parameters){
		}
		public static async Task<String> POST(string url, string[] parameters, string user, string password){
			using (var httpClient = new HttpClient()){
				using (var request = new HttpRequestMessage(new HttpMethod("POST"), url)){
					request.Headers.TryAddWithoutValidation("Accept", "application/json");
					request.Headers.TryAddWithoutValidation("User-Agent", "curl/7.60.0"); 

					var base64authorization = Convert.ToBase64String(Encoding.ASCII.GetBytes(user + ":" + password));
					request.Headers.TryAddWithoutValidation("Authorization", "Basic " + base64authorization); 
				//	request.Content = new StringContent("{\"status\": \"resolved\"}", Encoding.UTF8, "application/json"); 

					var response = await httpClient.SendAsync(request);
				}
			}
		}
		public static async Task<String> POST(string url, string content){
		}
		public static async Task<String> POST(string url, string content, string user, string password){
			using (var httpClient = new HttpClient()){
				using (var request = new HttpRequestMessage(new HttpMethod("POST"), url)){
					request.Headers.TryAddWithoutValidation("Accept", "application/json");
					request.Headers.TryAddWithoutValidation("User-Agent", "curl/7.60.0"); 

					var base64authorization = Convert.ToBase64String(Encoding.ASCII.GetBytes(user + ":" + password));
					request.Headers.TryAddWithoutValidation("Authorization", "Basic " + base64authorization); 
					request.Content = new StringContent(content, Encoding.UTF8, "application/json"); 

					var response = await httpClient.SendAsync(request);
				}
			}
		}
		*/
    }
}
