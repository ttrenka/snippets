using System;
using System.Collections;
using System.Data;
using System.Data.SqlClient;
using OpenSmtp.Mail;

namespace DepartmentZed {
	public class Utilities {
		public static string MailBackupPath = "c:\\tmp\\";
		public static bool SaveEmails = false;
		public static DataSet GetDataSet(string sql, string connectionString) {
			SqlConnection cn = new SqlConnection(connectionString);
			cn.Open();
			SqlDataAdapter da = new SqlDataAdapter(sql, cn);
			DataSet ds = new DataSet();
			da.Fill(ds);
			da.Dispose();
			cn.Close();
			cn.Dispose();
			return ds;
		}
		public static DataRowCollection GetRecordSet(string sql, string cn) {
			return GetDataSet(sql, cn).Tables[0].Rows;
		}
		public static bool ExecuteNonQuery(string sql, string connectionString){
			SqlConnection cn = new SqlConnection(connectionString);
			cn.Open();
			SqlCommand cm = new SqlCommand(sql, cn);
			int i = cm.ExecuteNonQuery();
			cm.Dispose();
			cn.Close();
			cn.Dispose();
			return true;
		}

		public static bool SendMail(string from, string to, string subject, string message) {
			bool ret = true;
			try {
				Smtp smtpMailer = new Smtp();
				MailMessage msg = new MailMessage(from, to);
				if (message.IndexOf("<html>") > -1)
					msg.HtmlBody = message;
				msg.Body = message;
				msg.Subject = subject;

				//	for debugging
				if (Utilities.SaveEmails)
					msg.Save(Utilities.MailBackupPath + subject.Replace(" ", "") + "." + DateTime.Now.ToString("yyyy-MM-dd.HH-mm-ss") + ".eml");

				smtpMailer.SendMail(msg);
			} catch {
				ret = false;
			}
			return ret;
		}
		public static bool SendMail(string from, string to, string subject, string textbody, string htmlbody){
			return Utilities.SendMail(from, to, String.Empty, subject, textbody, htmlbody);
		}
		public static bool SendMail(string from, string to, string cc, string subject, string textbody, string htmlbody){
			bool ret = true;
			try {
				Smtp smtpMailer = new Smtp();
				MailMessage msg = new MailMessage(from, to);
				msg.HtmlBody = htmlbody;
				msg.Body = textbody;
				msg.Subject = subject;
				if (cc != String.Empty) {
					ArrayList a = new ArrayList();
					a.Add(cc);
					msg.CC = a;
				}

				//	for debugging
				if (Utilities.SaveEmails)
					msg.Save(Utilities.MailBackupPath + subject.Replace(" ", "") + "." + DateTime.Now.ToString("yyyy-MM-dd.HH-mm-ss") + ".eml");
				smtpMailer.SendMail(msg);
			} catch (Exception ex) {
				string msg = ex.Message;
				ret = false;
			}
			return ret;
		}

		public static bool SendMail(string from, string to, string subject, string textbody, string htmlbody, string un, string pwd){
			return Utilities.SendMail(from, to, String.Empty, subject, textbody, htmlbody, un, pwd);
		}
		public static bool SendMail(string from, string to, string cc, string subject, string textbody, string htmlbody, string un, string pwd){
			bool ret = true;
			try {
				Smtp smtpMailer = new Smtp();
				smtpMailer.Username = un;
				smtpMailer.Password = pwd;
				MailMessage msg = new MailMessage(from, to);
				msg.HtmlBody = htmlbody;
				msg.Body = textbody;
				msg.Subject = subject;
				if (cc != String.Empty) {
					ArrayList a = new ArrayList();
					a.Add(cc);
					msg.CC = a;
				}

				//	for debugging
				if (Utilities.SaveEmails)
					msg.Save(Utilities.MailBackupPath + subject.Replace(" ", "") + "." + DateTime.Now.ToString("yyyy-MM-dd.HH-mm-ss") + ".eml");
				smtpMailer.SendMail(msg);
			} catch {
				ret = false;
			}
			return ret;
		}
		
		public static bool SendMail(MailMessage msg){
			bool ret = true;
			try {
				Smtp smtpMailer = new Smtp();
				if (Utilities.SaveEmails)
					msg.Save(Utilities.MailBackupPath + msg.Subject.Replace(" ", "").Replace(",", "") + "." + DateTime.Now.ToString("yyyy-MM-dd.HH-mm-ss") + ".eml");
				smtpMailer.SendMail(msg);
			} catch {
				ret = false;
			}
			return ret;
		}
	}
}