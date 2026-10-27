package com.acme.salary.insights.dto;

import java.math.BigDecimal;

public record DepartmentAverage(String department, BigDecimal avgSalary, long employeeCount) {
}
