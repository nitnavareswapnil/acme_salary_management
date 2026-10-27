package com.acme.salary.employee.exception;

import java.util.List;

public class EmployeeNotFoundException extends RuntimeException {

	public EmployeeNotFoundException(Long id) {
		super("Employee not found: " + id);
	}

	public EmployeeNotFoundException(List<Long> ids) {
		super("Employees not found: " + ids);
	}
}
