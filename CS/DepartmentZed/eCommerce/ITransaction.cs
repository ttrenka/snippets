using System;

namespace DepartmentZed.eCommerce {
	public interface ITransaction {
		bool Process(Order o);
		bool Approve(Order o);
		bool Finalize(Order o);
		bool Credit(Order o);
		bool Void(Order o);
		TransactionResult GetResult();
	}
}
