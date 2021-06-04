using System;
using System.Collections;
using System.Data;
using System.Data.SqlClient;
using System.Web;
using System.Web.UI;

namespace DepartmentZed.eCommerce {
	public enum AccessTypes {
		None = 0,
		Present = 1,
		Validated = 2,
		Administration = 3
	}
	
	public enum Actions {
		Login = 0, 
		Logout = 1, 
		AddToCart = 2, 
		RemoveFromCart = 3, 
		UpdateCart = 4, 
		AddToLocker = 5, 
		RemoveFromLocker = 6, 
		UpdateLocker = 7
	}
	
	public sealed class Statuses {
		public readonly static string Disabled = "D";
		public readonly static string Staging = "S";
		public readonly static string Live = "L";
		public readonly static string Published = "P";
		public static bool IsIn(string s) {
			return (
				s == Statuses.Disabled
				|| s == Statuses.Staging
				|| s == Statuses.Live
				|| s == Statuses.Published
			);
		}
	}
}