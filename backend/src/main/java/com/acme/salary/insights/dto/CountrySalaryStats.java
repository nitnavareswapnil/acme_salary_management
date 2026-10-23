package com.acme.salary.insights.dto;

import com.acme.salary.employee.entity.Country;

import java.math.BigDecimal;

public record CountrySalaryStats(Country country, String currency, BigDecimal minSalary, BigDecimal maxSalary,
		BigDecimal avgSalary, long employeeCount) {
}
