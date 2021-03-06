using System;

namespace DepartmentZed.Automation {
	/// <summary>
	/// Basic interface for this custom package namespace.
	/// </summary>
	public interface IPackage {
		void SetConnectionString(string cn);
		void Execute();
	}
}
