package com.acme.salary.insights.service;

import com.acme.salary.employee.dto.CountrySalaryAggregate;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.repository.EmployeeRepository;
import com.acme.salary.insights.dto.CountrySalaryStats;
import com.acme.salary.insights.dto.DepartmentAverage;
import com.acme.salary.insights.dto.JobTitleAverage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class InsightsServiceImpl implements InsightsService {

	private final EmployeeRepository repository;

	public InsightsServiceImpl(EmployeeRepository repository) {
		this.repository = repository;
	}

	@Override
	@Transactional(readOnly = true)
	public List<CountrySalaryStats> countryStats() {
		return repository.aggregateByCountry().stream().map(this::toStats).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<JobTitleAverage> jobTitleAverages(Country country) {
		return repository.aggregateByJobTitle(country).stream()
				.map(aggregate -> new JobTitleAverage(aggregate.jobTitle(),
						average(aggregate.totalSalary(), aggregate.employeeCount()), aggregate.employeeCount()))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<DepartmentAverage> departmentAverages(Country country) {
		return repository.aggregateByDepartment(country).stream()
				.map(aggregate -> new DepartmentAverage(aggregate.department(),
						average(aggregate.totalSalary(), aggregate.employeeCount()), aggregate.employeeCount()))
				.toList();
	}

	private CountrySalaryStats toStats(CountrySalaryAggregate aggregate) {
		return new CountrySalaryStats(aggregate.country(), aggregate.country().getCurrency(),
				aggregate.minSalary(), aggregate.maxSalary(),
				average(aggregate.totalSalary(), aggregate.employeeCount()), aggregate.employeeCount());
	}

	// Groups only exist when they have employees, so the count is never zero.
	private BigDecimal average(BigDecimal total, long count) {
		return total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
	}
}
