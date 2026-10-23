package com.acme.salary.insights.service;

import com.acme.salary.insights.dto.CountrySalaryStats;

import java.util.List;

public interface InsightsService {

	List<CountrySalaryStats> countryStats();
}
