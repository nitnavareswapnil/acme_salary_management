package com.acme.salary.employee.dto;

import com.acme.salary.employee.entity.Country;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record EmployeeRequest(
		@NotBlank @Size(max = 100) String name,
		@NotBlank @Email @Size(max = 255) String email,
		@NotBlank @Size(max = 100) String department,
		@NotBlank @Size(max = 100) String jobTitle,
		@NotNull Country country,
		// Matches DECIMAL(15,2): 13 integer digits and 2 decimals.
		@NotNull @Positive @Digits(integer = 13, fraction = 2) BigDecimal baseSalary) {
}
