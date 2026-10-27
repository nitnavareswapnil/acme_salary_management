package com.acme.salary.insights.service;

import com.acme.salary.employee.entity.Country;
import com.acme.salary.insights.dto.CountrySalaryStats;
import com.acme.salary.insights.dto.DepartmentAverage;
import com.acme.salary.insights.dto.JobTitleAverage;

import java.util.List;

public interface InsightsService {

	List<CountrySalaryStats> countryStats();

	List<JobTitleAverage> jobTitleAverages(Country country);

	List<DepartmentAverage> departmentAverages(Country country);
}
