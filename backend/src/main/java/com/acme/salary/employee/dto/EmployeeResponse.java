package com.acme.salary.employee.dto;

import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;

import java.math.BigDecimal;

public record EmployeeResponse(
		Long id,
		String name,
		String email,
		String department,
		String jobTitle,
		Country country,
		String currency,
		BigDecimal baseSalary) {

	public static EmployeeResponse from(Employee employee) {
		return new EmployeeResponse(
				employee.getId(),
				employee.getName(),
				employee.getEmail(),
				employee.getDepartment(),
				employee.getJobTitle(),
				employee.getCountry(),
				employee.getCountry().getCurrency(),
				employee.getBaseSalary());
	}
}
