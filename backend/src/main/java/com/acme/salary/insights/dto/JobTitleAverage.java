package com.acme.salary.insights.dto;

import java.math.BigDecimal;

public record JobTitleAverage(String jobTitle, BigDecimal avgSalary, long employeeCount) {
}
