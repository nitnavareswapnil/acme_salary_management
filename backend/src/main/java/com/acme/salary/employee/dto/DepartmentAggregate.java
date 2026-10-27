package com.acme.salary.employee.dto;

import java.math.BigDecimal;

// Raw per-department totals from the database; the average is derived like in JobTitleAggregate.
public record DepartmentAggregate(String department, BigDecimal totalSalary, long employeeCount) {
}
