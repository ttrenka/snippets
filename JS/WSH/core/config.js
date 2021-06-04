var basePath = "c:\\prj\\AiMedia\\AiTRK3\\trunk\\dev\\wsh\\";
// var basePath = "d:\\ftp\\wsh\\";
// var basePath = "d:\\HTTP\\wwwroot\\AIME3\\trunk\\dev\\wsh\\";
config={ 
	connection: "Server=172.16.2.10;UID=aimg_db;PWD=tas4284;Database={AiMG_systems};Driver={SQL Server}",
//	connection: "Driver={SQL Server Native Client 10.0};Server=127.0.0.1;Database=AiMG_SYSTEMS;Uid=sa;Pwd=@Ach3n51;",
	hourOffset: 0,	//	the offset from EST/EDT. If the server is based in ET, use 0; if PT, use 3
	systemEmail: "reports@aimediagroup.com",
	isRemoteSmtp: true,
	smtpPort: 25,
	smtpConnectionTimeout: 30,
	isSmtpBasicAuth: true,
	isSmtpNtAuth: false,
	smtpServer: "localhost",
	smtpUsername: "",
	smtpPassword: "",
	marchexAccount: "QrOX7EYiRfcYywDD",
	marchexUser: "ai-api@aimediagroup.com",
	marchexPwd: "aimedia42",
	logPath: basePath + "logs\\",
	csvPath: basePath + "csv\\",
	templatePath: basePath + "templates\\"
};
