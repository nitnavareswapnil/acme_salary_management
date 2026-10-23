package com.acme.salary.employee.exception;

public class EmployeeNotFoundException extends RuntimeException {

	public EmployeeNotFoundException(Long id) {
		super("Employee not found: " + id);
	}
}
