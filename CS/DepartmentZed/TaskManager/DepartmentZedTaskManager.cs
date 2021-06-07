using System;
using System.Text;
using System.Configuration;
using DepartmentZed.Automation;
using DepartmentZed.eCommerce;
using OpenSmtp.Mail;

namespace DepartmentZed.TaskManager {
	class DepartmentZedTaskManager {
		[STAThread]
		static void Main(string[] args)	{
			/*
				OK.  Command line args.
				args[0]:
				"?" || "/?" || "help": display a menu
				otherwise the name of the class to create.
				if the class isn't handled, then leave.
			*/
			string cn = ConfigurationSettings.AppSettings["connectionString"];
			if (cn == null || cn == String.Empty) {
				Console.WriteLine("Configuration file is missing.");
				return;
			}

			SmtpConfig.SmtpHost = ConfigurationSettings.AppSettings["Smtp.Server"];
			SmtpConfig.SmtpPort = Int32.Parse(ConfigurationSettings.AppSettings["Smtp.Port"]);
			//	SmtpConfig. = ConfigurationSettings.AppSettings["Smtp.User"];
			//	string smtpPassword = ConfigurationSettings.AppSettings["Smtp.Password"];

			switch(args[0]) {
				case "?":
				case "/?":
				case "help":
				case "HELP": {
					Console.WriteLine("TaskManager Usage:");
					Console.WriteLine("--------------------------------------------");
					Console.WriteLine("TaskManager [taskName]");
					Console.WriteLine("");
					Console.WriteLine("Where the task name is one of the following:");
					Console.WriteLine("AmazonOrders");
					Console.WriteLine("AmazonShipmentConfirmation");
					Console.WriteLine("AutoShipments");
					Console.WriteLine("AutoShipReminder");
					Console.WriteLine("Fulfillment");
					Console.WriteLine("ConfirmFulfillment");
					Console.WriteLine("HowToUse");
					Console.WriteLine("LinkShare");
					break ;
				}

				case "AmazonOrders" : {
					AmazonOrders az = new AmazonOrders(cn);
					az.AmazonUri = ConfigurationSettings.AppSettings["Amazon.Uri"];
					az.MerchantId = ConfigurationSettings.AppSettings["Amazon.MerchantId"];
					az.MerchantName = ConfigurationSettings.AppSettings["Amazon.MerchantName"];
					az.User = ConfigurationSettings.AppSettings["Amazon.User"];
					az.Password = ConfigurationSettings.AppSettings["Amazon.Password"];
					if (ConfigurationSettings.AppSettings["Amazon.nOrders"] != null)
						az.NumberOfOrders = Int32.Parse(ConfigurationSettings.AppSettings["Amazon.nOrders"]);
					az.Execute();
					Console.WriteLine("AmazonOrders task was successful.");
					break ;
				}
				case "AmazonShipmentConfirmation" : {
					AmazonShipmentConfirmation az = new AmazonShipmentConfirmation(cn);
					az.AmazonUri = ConfigurationSettings.AppSettings["Amazon.Uri"];
					az.MerchantId = ConfigurationSettings.AppSettings["Amazon.MerchantId"];
					az.MerchantName = ConfigurationSettings.AppSettings["Amazon.MerchantName"];
					az.User = ConfigurationSettings.AppSettings["Amazon.User"];
					az.Password = ConfigurationSettings.AppSettings["Amazon.Password"];
					az.Execute();
					Console.WriteLine("AmazonShipmentConfirmation task was successful.");
					break ;
				}
				case "CompleteImport" : {
					(new CompleteImport(cn)).Execute();
					Console.Write("Complete Import task was successful.");
					break;
				}
				case "AutoShipReminder" : {
					(new AutoShipReminder(cn)).Execute();
					Console.Write("AutoShipReminder task was successful.");
					break;
				}
				case "AutoShipments" : {
					AutoShipments auto = new AutoShipments(cn);
					auto.CustomerService = ConfigurationSettings.AppSettings["custServiceEmail"];
					auto.TransactionUser = Remitment.Decrypt(ConfigurationSettings.AppSettings["Transaction.User"]);
					auto.TransactionPassword = Remitment.Decrypt(ConfigurationSettings.AppSettings["Transaction.Password"]);
					auto.TransactionKey = ConfigurationSettings.AppSettings["Transaction.Key"];
					auto.TransactionAsTest = (ConfigurationSettings.AppSettings["Transaction.Test"] == "1");
					auto.Execute();
					Console.Write("AutoShipments task was successful.");
					break;
				}
				case "Fulfillment" : {
					Fulfillment f = new Fulfillment(cn);
					f.FtpUri = ConfigurationSettings.AppSettings["Fulfillment.Uri"];
					f.User = ConfigurationSettings.AppSettings["Fulfillment.User"];
					f.Password = ConfigurationSettings.AppSettings["Fulfillment.Password"];
					f.Directory = ConfigurationSettings.AppSettings["Fulfillment.Incoming"];
					f.ErrorEmails = ConfigurationSettings.AppSettings["Fulfillment.ErrorAddresses"];
					f.Execute();
					Console.Write("Fulfillment task was successful.");
					break ;
				}
				case "ConfirmFulfillment" : {
					ConfirmFulfillment f = new ConfirmFulfillment(cn);
					f.BackupPath = ConfigurationSettings.AppSettings["Fulfillment.BackupPath"];
					f.CustomerService = ConfigurationSettings.AppSettings["custServiceEmail"];
					f.TransactionUser = Remitment.Decrypt(ConfigurationSettings.AppSettings["Transaction.User"]);
					f.TransactionPassword = Remitment.Decrypt(ConfigurationSettings.AppSettings["Transaction.Password"]);
					f.TransactionKey = ConfigurationSettings.AppSettings["Transaction.Key"];
					f.TransactionAsTest = (ConfigurationSettings.AppSettings["Transaction.Test"] == "1");
					f.Filemask = ConfigurationSettings.AppSettings["Fulfillment.Filemask"];
					f.FtpUri = ConfigurationSettings.AppSettings["Fulfillment.Uri"];
					f.User = ConfigurationSettings.AppSettings["Fulfillment.User"];
					f.Password = ConfigurationSettings.AppSettings["Fulfillment.Password"];
					f.Directory = ConfigurationSettings.AppSettings["Fulfillment.outgoing"];
					f.Execute();
					Console.Write("ConfirmFulfillment task was successful.");
					break ;
				}
				case "HowToUse" : {
					(new HowToUse(cn)).Execute();
					Console.Write("HowToUser task was successful.");
					break;
				}
				case "LinkShare" : {
					LinkShare ls = new LinkShare(cn);
					ls.LogFile = ConfigurationSettings.AppSettings["Linkshare.Log"] ;
					ls.ExecutablePath = ConfigurationSettings.AppSettings["Linkshare.Executable"] ;
					ls.LinksharePath = ConfigurationSettings.AppSettings["Linkshare.Path"] ;
					ls.BackupPath = ConfigurationSettings.AppSettings["Linkshare.BackupPath"] ;
					ls.Execute();
					Console.Write("LinkShare task was successful.");
					break;
				}
				case "SuspensionReminder" : {
					(new SuspensionReminder(cn)).Execute();
					Console.Write("SuspensionReminder task was successful.");
					break;
				}
				default : {
					Console.WriteLine("The assembly you asked for was not found.");
					break ;
				}
			}
			return;
		}
	}
}
