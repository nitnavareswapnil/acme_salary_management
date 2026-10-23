package com.acme.salary.employee.exception;

public class DuplicateEmailException extends RuntimeException {

	public DuplicateEmailException(String email) {
		super("Email already in use: " + email);
	}
}
