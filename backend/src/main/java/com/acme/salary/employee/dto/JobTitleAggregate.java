package com.acme.salary.employee.dto;

import java.math.BigDecimal;

// Raw per-job-title totals from the database; the average is derived like in CountrySalaryAggregate.
public record JobTitleAggregate(String jobTitle, BigDecimal totalSalary, long employeeCount) {
}
