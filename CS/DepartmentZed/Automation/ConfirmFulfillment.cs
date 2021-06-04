using System;
using System.Collections;
using System.Data;
using System.IO;
using System.Text;
using DepartmentZed;
using DepartmentZed.eCommerce;
using EnterpriseDT.Net.Ftp;

namespace Zirh.Automation {
	public class ConfirmFulfillment : IPackage {
		private string connectionString;
		private string ftpUri ;
		private string ftpDirectory;
		private string filemask = String.Empty;
		private string user;
		private string pwd;
		private string transUser;
		private string transPwd;
		private string transKey;

		private string backupPath = String.Empty;

		private bool transTest;
		private string custServEmail;

		public string CustomerService {
			get { return custServEmail; }
			set { custServEmail = value; }
		}
		public string TransactionUser {
			get { return transUser; }
			set { transUser = value; }
		}
		public string TransactionPassword {
			get { return transPwd; }
			set { transPwd = value; }
		}
		public string TransactionKey {
			get { return transKey; }
			set { transKey = value; }
		}
		public bool TransactionAsTest {
			get { return transTest; }
			set { transTest = value; }
		}
		public string BackupPath {
			get { return backupPath; }
			set { backupPath = value; }
		}
		public string Filemask {
			get { return filemask; }
			set { filemask = value; }
		}
		public string FtpUri {
			get { return ftpUri ; }
			set { ftpUri = value ; }
		}
		public string Directory {
			get { return ftpDirectory ; }
			set { ftpDirectory = value ; }
		}
		public string User {
			get { return user ; }
			set { user = value ; }
		}
		public string Password {
			get { return pwd ; }
			set { pwd = value ; }
		}

		public ConfirmFulfillment() : this("") { }
		public ConfirmFulfillment(string cn) {
			connectionString = cn ;
		}
		public void SetConnectionString(string cn) {
			connectionString = cn ;
		}

		public void Execute() {
			AuthorizeDotNetTransaction a = new AuthorizeDotNetTransaction(
				transUser,
				transPwd,
				transKey,
				transTest
			);
			ArrayList arr = new ArrayList();

			try {
				FTPClient ftp = new FTPClient(ftpUri);
				ftp.DebugResponses(true);
				ftp.Login(user, pwd);
				ftp.TransferType = FTPTransferType.BINARY;
				if (FtpUri == "dept-z.mine.nu")	ftp.ConnectMode = FTPConnectMode.ACTIVE;
				FTPFile[] files = ftp.DirDetails(ftpDirectory + filemask);
				if (ftpDirectory.IndexOf("/") > -1) {
					string[] dirs = ftpDirectory.Split('/');
					for (int i = 0; i < dirs.Length; i++) ftp.ChDir(dirs[i]);
				} else ftp.ChDir(ftpDirectory);

				for (int i = 0; i < files.Length; i++) {
					string name = files[i].Name;
					string newName = name.Substring(0, name.IndexOf(".txt")) + ".done";
					if (files[i].Name.IndexOf("worder") == -1) continue;
					if (files[i].Name.IndexOf("worderline") > -1) {
						//	just remove it, we don't care about it.
						if (backupPath != String.Empty) ftp.Get(backupPath + files[i].Name, files[i].Name);
						ftp.Rename(name, newName);
						continue;
					}

					//	this should be an worder file.
					DateTime dt = files[i].LastModified;
					string order = files[i].Name.Substring(0, files[i].Name.IndexOf("worder"));

					try {
						//	only new orders, not any old ones.
						//	finalize the transaction
						Order o = new Order(Int32.Parse(order), connectionString);
						bool b = true;
						if (
							o.OrderType != OrderTypes.Amazon
							&& o.TransactionId != String.Empty
						) {
							a.Source = o.OrderType;
							a.IPAddress = o.IPAddress;
							a.OrderNumber = order;
							b = o.Finalize(a);
						}

						if (b) {
							o.CurrentStatus = OrderStatuses.Fulfilled;
							o.PostedOn = dt;

							bool test = false;
							for (int j = 0; j < o.StatusHistory.Count; j++){
								if (o.StatusHistory[j].Status == OrderStatuses.Fulfilled) {
									test = true;
									o.StatusHistory[j].PostedOn = dt;
									o.StatusHistory[j].Comment = "Fulfillment and transaction completed by ZIRH TaskManager.";
									break;
								}
							}

							if (!test){
								o.StatusHistory.Add(new OrderStatus(OrderStatuses.Fulfilled, dt, "Fulfillment and transaction completed by ZIRH TaskManager."));
							}

							//	save the info to the order stuff.
							string sql = "UPDATE usrOrder SET currentStatus = '" + OrderStatuses.Fulfilled + "', "
								+ "postedon = '" + dt.ToString("yyyy-MM-dd HH:mm:ss") + "' "
								+ " WHERE id = " + order;
							Utilities.ExecuteNonQuery(sql, connectionString);

							sql = "DELETE FROM usrOrderStatus "
								+ "WHERE usrOrder = " + order 
								+ " AND OrderStatus = '" + OrderStatuses.Fulfilled + "' ";
							Utilities.ExecuteNonQuery(sql, connectionString);

							sql = "INSERT INTO usrOrderStatus (usrOrder, OrderStatus, PostedOn, Comments) "
								+ " VALUES ("
								+ order + ","
								+ "'" + OrderStatuses.Fulfilled + "', "
								+ "'" + dt.ToString("yyyy-MM-dd HH:mm:ss") + "',"
								+ "'Fulfillment and transaction completed by ZIRH TaskManager.'"
								+ ")";
							Utilities.ExecuteNonQuery(sql, connectionString);
						} else {
							arr.Add(order);
						}
					} catch (Exception ex){
						string message = ex.Message;
					} finally {
						//	back it up if need be.
						if (backupPath != String.Empty) ftp.Get(backupPath + files[i].Name, files[i].Name);
						ftp.Rename(name, newName);
					}
				}
				ftp.Quit();
			} catch (Exception ex) {
				string message = ex.Message; 
			}

			if (arr.Count > 0) {
				//	we had errors, assemble the single mail.
				Utilities.SendMail(
					"customercare@zirh.com",
					CustomerService,
					"Transaction problems with order finalization",
					@"This is a generated report from the ZIRH TaskManager.

The following orders were rejected when attempting to finalize transactions:"
					+ String.Join("\r\n", (string[])arr.ToArray("".GetType()))
					+ @"Please use the ZIRH.com Adminstration tool for more information.

THESE ORDERS HAVE BEEN SHIPPED."
				);
			}

			//	added 2005-08-18 TRT:  Reset any in progress orders to New to resend.
			string sqlstatement = "DELETE FROM usrOrderStatus "
				+ " WHERE usrOrder IN (SELECT id FROM usrOrder WHERE currentstatus = '" + OrderStatuses.InProgress + "') "
				+ " AND OrderStatus = '" + OrderStatuses.InProgress + "' ";
			Utilities.ExecuteNonQuery(sqlstatement, connectionString);

			sqlstatement = "UPDATE usrOrder SET currentStatus = '" + OrderStatuses.NewOrder + "' "
				+ " WHERE currentStatus = '" + OrderStatuses.InProgress + "' ";
			Utilities.ExecuteNonQuery(sqlstatement, connectionString);
		}
	}
}