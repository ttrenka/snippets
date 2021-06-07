using System;
using System.Collections.Generic;

namespace SiteUtils {
    public class User {
        public User(){
            //  initialize a blank user, so do nothing
			Roles.GetRoles();
			roles = new List<Role>();
			viewClients = new List<int>();
			viewGroups = new List<int>();
			viewPrograms = new List<int>();
			emailPrograms = new List<int>();
			programAlerts = new List<int>();
        }
	    public User(String username, String password){
		    // initialize someone logging in (existing user)
 			Roles.GetRoles();
			roles = new List<Role>();
			viewClients = new List<int>();
			viewGroups = new List<int>();
			viewPrograms = new List<int>();
			emailPrograms = new List<int>();
			programAlerts = new List<int>();
			bool verified = initialize(username, password);
	    }

        //  Main definitions about the user themselves
        public int id { get; private set; }
        public string email { get; private set; }
        public string password { get; set; }
        public string firstName { get; private set; }
        public string lastName { get; private set; }
        public string status { get; private set; }
		public int clientId { get; private set; }
		public int programId { get; private set; }
        public int brandingId { get; private set; }
        public string theme { get; set; }
        public DateTime createdOn { get; private set; }
        public int createdBy { get; private set; }
        public DateTime lastModified { get; private set; }
        public DateTime lastLogin { get; private set; }

        //  the peripheral information tied to this user
        private List<Role> roles;
        private List<int> viewClients;
        private List<int> viewGroups;
        private List<int> viewPrograms;
        private List<int> emailPrograms;
        private List<int> programAlerts;

        public List<Role> _Roles { get => roles; }
        public List<int> ProgramAlerts { get => programAlerts; }
        public List<int> ViewClients { get => viewClients; }
        public List<int> ViewGroups { get => viewGroups; }
        public List<int> ViewPrograms { get => viewPrograms; }
        public List<int> EmailPrograms { get => emailPrograms; }

        //  whether or not this is a valid user
        public bool isVerified { get; private set; }

		//	whether or not this is an Ai Media Group Employee
		public bool isEmployee { get; private set; }

		//	whether or not this is an Admin, Developer or Tester
		public bool isTester { get; private set; }

		//	whether or not this user gets console messages (debugging purposes)
		public bool hasConsole { get; private set; }

        //  whether or not this user has sufficient access so that viewAccess stuff is ignored
        public bool ViewAllClients { get; private set; }
        public bool ViewAllGroups { get; private set; }
        public bool ViewAllPrograms { get; private set; }

		public bool HasRole(int id){
			return Roles.HasRole(this, id);
		}
		public bool HasRole(string title){
			return Roles.HasRole(this, title);
		}
		public bool HasRole(Role r){
			return Roles.HasRole(this, r);
		}

		public bool initialize(String usr, String pwd){
            //  Only used when someone is logging in; we verify access first and if we're good, populate everything
            string testSql = @"SELECT u.id, u.firstName, u.lastName, u.email, u.password, u.status, u.lastLogin,  
		        r.name AS role, r.title AS role_title, r.description AS role_description 
	 	        FROM users u 
		        LEFT JOIN (userRoles ur 
		        INNER JOIN roles r 
		        ON r.id = ur.roles_id) 
		        ON ur.user_id = u.id 
		        WHERE u.email = @email 
				AND CONVERT(varbinary(MAX), CONVERT(varchar(MAX), @pwd, 1), 1) = HASHBYTES('SHA1', u.password) 
				AND u.status = 1";
			Dictionary<String, object> param = new Dictionary<String, object>();
	        param.Add("email", usr);
            param.Add("pwd", pwd);
            List<Dictionary<string, object>> rs = Utilities.FetchDataRaw(Utilities.ConnectionString, testSql, param);
            if(rs.Count > 0){
                //  set the view all stuff to false first
                ViewAllClients = false;
                ViewAllGroups = false;
                ViewAllPrograms = false;
				isEmployee = false;
				hasConsole = false;
				isVerified = true;

                //  this is a legit user, so read our stuff and fill out our object
               for(int i = 0; i < rs.Count; i++){
                    Dictionary<String, Object> row = rs[i];
                    //  start with the first row to fill out the main parts of our object
                    if(i == 0){
                        id = (int)row["id"];
                        firstName = (string)row["firstName"];
                        lastName = (string)row["lastName"];
                        email = (string)row["email"];
						password = (string)row["password"];
                        status = (string)row["status"];
                        lastLogin = (DateTime)row["lastLogin"];
                    }

                    //  do the roles
                    Role r = SiteUtils.Roles.FindRole((string)row["role_title"]);
                    if(r != null){
                        roles.Add(r);
                        if(r.AccountType < 4){
                            ViewAllClients = true;
                            ViewAllPrograms = true;
                        }
                        if(r.AccountType == 1){
                            ViewAllGroups = true;
                        }
                    }
                }

                //  now check the roles this user has to see if they can view everything
				if(HasRole(RoleNames.Admin)
					|| HasRole(RoleNames.Developer)
					|| HasRole(RoleNames.Manager)
					|| HasRole(RoleNames.Rep)
					|| HasRole(RoleNames.SEM)
					|| HasRole(RoleNames.Proxy)
					|| HasRole(RoleNames.Financial)
					|| HasRole(RoleNames.Analytics)
					|| HasRole(RoleNames.QA)
					|| HasRole(RoleNames.Intern)
					|| HasRole(RoleNames.Beta)
					|| HasRole(RoleNames.Agency)
				){
					isEmployee = true;
					if(!HasRole(RoleNames.Agency)){
						ViewAllClients = true;
						ViewAllPrograms = true;
						if(HasRole(RoleNames.Admin)){
							ViewAllGroups = true;
						}
					}
					if(HasRole(RoleNames.Admin) || HasRole(RoleNames.Developer)){
						hasConsole = true;
					}
				}

				//	set up our default Client ID. This is for everyone, not just limited users
				string clientSql = ""; 
				if(HasRole(RoleNames.Agency)){
					clientSql += @"SELECT TOP 1 cl.clientID
						FROM clientList cl
						WHERE cl.clientID IN (
							SELECT c.clientID FROM campaigns c
							INNER JOIN viewAccess v
								ON v.canViewType = 2
									AND v.userID = @user
									AND v.canViewID = c.id
							WHERE c.state = 1
						)
						ORDER BY cl.clientName";
				} else {
					clientSql += @"SELECT TOP 1 cl.clientID
						FROM clientList cl
						WHERE cl.clientID IN (
							SELECT c.clientID FROM campaigns c
							WHERE c.state = 1
						)
						ORDER BY cl.clientName";
				}

				Dictionary<String, object> cParam = new Dictionary<String, object>();
				cParam.Add("user", id);
				List<Dictionary<string, object>> crs = Utilities.FetchDataRaw(Utilities.ConnectionString, clientSql, cParam);
				if(crs.Count > 0){
					for(int i = 0; i < crs.Count; i++){
						Dictionary<String, Object> row = crs[i];
						//  start with the first row to fill out the main parts of our object
						if(i == 0){
							clientId = (int)row["clientID"];
						}
					}
				}

				//	Find the first program that's active for said client
				string programSql = "";
				if(HasRole(RoleNames.Agency)){
					programSql = @"SELECT TOP 1 c.id
						FROM campaigns c
						INNER JOIN viewAccess v
							ON v.canViewType = 2
								AND v.userID = @user
								AND v.canViewID = c.id
						WHERE c.state = 1
						ORDER BY c.campaignName";
				} else {
					programSql = @"SELECT TOP 1 c.id 
						FROM campaigns c 
						WHERE c.clientId = " + clientId + " AND c.state = 1 ORDER BY c.campaignName";
				}

				List<Dictionary<string, object>> prs = Utilities.FetchDataRaw(Utilities.ConnectionString, programSql, cParam);
				if(prs.Count > 0){
					for(int i = 0; i < prs.Count; i++){
						Dictionary<String, Object> row = prs[i];
						//  start with the first row to fill out the main parts of our object
						if(i == 0){
							programId = (int)row["id"];
						}
					}
				}

				//	TODO: Remove this next set of lines once out of beta
				isVerified = isEmployee;
            } else {
                isVerified = false;
            }
            return isVerified;
        }
    }

    public class Role {
         public Role(int id, string name, string title, string description){
            //  given the passed parameters, create a Role object
            Id = id;
            Name = name;
            Title = title;
            Description = description;
            initialize();
        }
        
        public Role(int id, string name, string title, string description, int accountType){
            //  given the passed parameters, create a Role object
            Id = id;
            Name = name;
            Title = title;
            Description = description;
            AccountType = accountType;
            initialize();
        }

        //  internal variables
        public int Id { get; private set;}
        public string Name { get; private set; }
        public string Title { get; private set; }
        public string Description { get; private set; }
        public int AccountType { get; private set; }

        //  users associated with this role
        public List<int> Users { get; private set; }

        private void initialize(){
			Users = new List<int>();
            //  we want to go get the users for this particular role.
            string sql = @"SELECT user_id FROM userRoles WHERE roles_id = @id ORDER BY user_id";
            Dictionary<String, object> param = new Dictionary<String, object>();
	        param.Add("id", Id);
            List<Dictionary<string, object>> rs = Utilities.FetchDataRaw(Utilities.ConnectionString, sql, param);
            for(int i = 0; i < rs.Count; i++){
                Dictionary<String, Object> row = rs[i];
                Users.Add((int)row["user_id"]);
            }
        }
    }
	
	//	We can't use an enum here so instead we fake it with a struct
	public struct RoleNames {
		public static string Admin =  "admin";
		public static string Developer = "dev";
		public static string Manager = "manager";
		public static string Rep = "rep";
		public static string Customer = "customer";
		public static string Agency = "agency";
		public static string SEM = "sem";
		public static string Proxy = "proxy";
		public static string Financial = "financial";
		public static string Analytics = "analytics"; 
		public static string QA = "qa";
		public static string Intern = "intern";
		public static string Beta = "beta";
	}

    public class Roles {
        //  definitions
        public static Role FindRole(int id){
            Role r = null;
            for(int i = 0; i < roles.Count; i++){
                if(roles[i].Id == id) return roles[i];
            }
            return r;
        }
        public static Role FindRole(string title){
            Role r = null;
            for(int i = 0; i < roles.Count; i++){
                if(roles[i].Title == title || roles[i].Name == title){ return roles[i]; }
            }
            return r;
        }

        private static List<Role> roles = new List<Role>();
        public static List<Role> GetRoles(){
            //  just return the internal list of available roles
            if(roles.Count == 0){
                //  initialize the Roles list
                string sql = "SELECT id, name, title, description, accountType FROM roles";
                List<Dictionary<string,object>> rs = Utilities.FetchDataRaw(Utilities.ConnectionString,sql);
                for(int i = 0; i < rs.Count;i++){
                    Dictionary<String,Object> row = rs[i];
                    int id = (int)row["id"];
                    string name = (string)row["name"];
                    string title = (string)row["title"];
                    string description = (string)row["description"];
					int accountType = 16;
					if(row.ContainsKey("accountType") && row["accountType"] != null){
	                    accountType = (int)row["accountType"];
						Role r = new Role(id, name, title, description, accountType);
						roles.Add(r);
					} else {
	                    Role r = new Role(id, name, title, description);
	                    roles.Add(r);
					}
                }
            }
            return roles;
        }

        public static bool HasRole(User user, int id){
            //  Role by ID
            Role r = FindRole(id);
            return HasRole(user, r);
        }
        public static bool HasRole(User user, string title){
            //  Role by Title
            Role r = FindRole(title);
            return HasRole(user, r);
        }
        public static bool HasRole(User user, Role role){
            //  Role by Role
            List<Role> check = user._Roles;
            for(int i = 0; i < check.Count; i++){
                Role r = check[i];
                if(r == role) return true;
            }
            return false;
        }
    }
}
