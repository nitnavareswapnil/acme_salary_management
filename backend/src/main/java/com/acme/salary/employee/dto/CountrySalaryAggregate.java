package com.acme.salary.employee.dto;

import com.acme.salary.employee.entity.Country;

import java.math.BigDecimal;

// Raw per-country totals from the database. The average is derived from total and count (see InsightsServiceImpl).
public record CountrySalaryAggregate(Country country, BigDecimal minSalary, BigDecimal maxSalary,
		BigDecimal totalSalary, long employeeCount) {
}
