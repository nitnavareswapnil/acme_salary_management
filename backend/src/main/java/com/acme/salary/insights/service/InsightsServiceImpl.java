package com.acme.salary.insights.service;

import com.acme.salary.employee.dto.CountrySalaryAggregate;
import com.acme.salary.employee.repository.EmployeeRepository;
import com.acme.salary.insights.dto.CountrySalaryStats;
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

	private CountrySalaryStats toStats(CountrySalaryAggregate aggregate) {
		// Groups only exist for countries that have employees, so the count is never zero.
		BigDecimal average = aggregate.totalSalary()
				.divide(BigDecimal.valueOf(aggregate.employeeCount()), 2, RoundingMode.HALF_UP);
		return new CountrySalaryStats(aggregate.country(), aggregate.country().getCurrency(),
				aggregate.minSalary(), aggregate.maxSalary(), average, aggregate.employeeCount());
	}
}
