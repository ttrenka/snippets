<%
/***************************************
 Default Example Production Settings
***************************************/

// database settings
cwrConfig.connectionString = "Provider=sqloledb;Network Library=DBMSSOCN;Data Source=sqlserv01,1433;Initial Catalog=skynet;User ID=skyuser;Password=skypwd;Connect Timeout=5";

// dojo settings
cwrConfig.dojoBuildDir = "js-frontend";
cwrConfig.dojoBuildExampleDir = "js-frontend";
cwrConfig.dojoDir = "dojo-1.3.2";

cwrConfig.dojoAdminBuildDir = "js-admin";
cwrConfig.dojoAdminBuildExampleDir = "js-admin";
cwrConfig.dojoAdminDir = "dojo-1.3.2";

// Exa,ple specific settings
cwrConfig.allowedFileExtensionsExampleAdmins = "txt,html,htm,xml,js,swf,pdf,jpg,png,gif,bmp,doc,docx,xls,xlsx,ppt,pptx,wmv,mov,mpg,mpeg,mp3,mp4,zip";
cwrConfig.allowedFileExtensionsDealers = "txt,html,htm,xml,js,swf,pdf,jpg,png,gif,bmp,doc,docx,xls,xlsx,ppt,pptx,wmv,mov,mpg,mpeg,mp3,mp4,zip";
cwrConfig.enableDealerLookupForDealerSites = false;

// analytics settings
cwrConfig.enableOmniture = true;

// email settings
cwrConfig.systemEmail = "\"Example System\" <maildaemon@example.com>";
cwrConfig.isRemoteSmtp = false;
cwrConfig.smtpPort = 24;
cwrConfig.smtpConnectionTimeout = 30;
cwrConfig.isSmtpBasicAuth = true;
cwrConfig.isSmtpNtAuth = false;
cwrConfig.smtpServer = "";
cwrConfig.smtpUsername = "";
cwrConfig.smtpPassword = "";

// debug settings
cwrConfig.emailDebugAddresses = null;
cwrConfig.isDebug = false;
cwrConfig.debugIPs = []; //"127.0.0.1" 
cwrConfig.bypassCache = false;

// domain settings
cwrConfig.defaultDomain = "www.example.com";
cwrConfig.staticDomains = [
	"static1.example.com",
	"static2.example.com",
	"static3.example.com"
];

cwrConfig.secureProtocol = "https";
cwrConfig.secureHostName = "secure.example.com";
cwrConfig.secureGoogleMapKey = "ABQIAAAAHVq45KcxwmUMcVumGF3bFhROC8Wg9V4WlDsNlKYF3c0Ko14YvxSX_RYLODHz3xr3fPwXew8fWxxskw";

cwrConfig.enableChromeFrame = true;

/***************************************
 Dev/Test Environment Settings
***************************************/

switch(String(Request.ServerVariables("SERVER_NAME"))){
	// Chris's VM
	case "midwest.localhost":
	case "iowa.localhost":
	case "example.localhost":
	case "secure.localhost":
		cwrConfig.connectionString = "Provider=sqloledb;Network Library=DBMSSOCN;Data Source=localhost,1433;Initial Catalog=skynet;User ID=skyuser;Password=skypwd;Connect Timeout=5";

		cwrConfig.dojoBuildDir = "js-frontend";
		cwrConfig.dojoBuildExampleDir = "js-frontend";
		cwrConfig.dojoDir = "dojo-1.3.2";

		cwrConfig.dojoAdminBuildDir = "js-dev"; // js-dev
		cwrConfig.dojoAdminBuildExampleDir = "js"; // js
		cwrConfig.dojoAdminDir = "dojo-1.3.2";

		cwrConfig.enableOmniture = false;
		cwrConfig.emailDebugAddresses = "chris@cb1inc.com";

		cwrConfig.isDebug = true;
		//cwrConfig.debugIPs = [];
		//cwrConfig.bypassCache = true;

		cwrConfig.defaultDomain = "example.localhost";
		cwrConfig.staticDomains = [
			"static1.localhost",
			"static2.localhost",
			"static3.localhost"
		];
		cwrConfig.secureHostName = "secure.localhost";
		cwrConfig.secureGoogleMapKey = "ABQIAAAAHVq45KcxwmUMcVumGF3bFhSIRdoYEeAa1GknoUPJre6D88tgjhQ-fek7Q1G7jK3QmfN3q2l_4sDeVw";
		
		cwrConfig.enableChromeFrame = false;
		break;
}
%>
