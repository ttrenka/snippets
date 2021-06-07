var basePath = "c:\\prj\\WSH\\AiTRK3\\trunk\\dev\\wsh\\";
// var basePath = "d:\\ftp\\wsh\\";
config={ 
	connection: "Server=server_ip;UID=db_user;PWD=db_pwd;Database={Example_systems};Driver={SQL Server}",
	hourOffset: 0,	//	the offset from EST/EDT. If the server is based in ET, use 0; if PT, use 3
	systemEmail: "reports@example.com",
	isRemoteSmtp: true,
	smtpPort: 25,
	smtpConnectionTimeout: 30,
	isSmtpBasicAuth: true,
	isSmtpNtAuth: false,
	smtpServer: "localhost",
	smtpUsername: "",
	smtpPassword: "",
	phoneAccount: "QrOX7EYiRfcYywDD",
	phoneUser: "ai-api@example.com",
	phonePwd: "example42",
	logPath: basePath + "logs\\",
	csvPath: basePath + "csv\\",
	templatePath: basePath + "templates\\"
};
