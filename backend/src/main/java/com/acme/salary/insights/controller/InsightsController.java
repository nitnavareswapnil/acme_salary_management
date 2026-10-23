package com.acme.salary.insights.controller;

import com.acme.salary.employee.entity.Country;
import com.acme.salary.insights.dto.CountrySalaryStats;
import com.acme.salary.insights.dto.JobTitleAverage;
import com.acme.salary.insights.service.InsightsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/insights")
public class InsightsController {

	private final InsightsService service;

	public InsightsController(InsightsService service) {
		this.service = service;
	}

	@GetMapping("/countries")
	public List<CountrySalaryStats> countryStats() {
		return service.countryStats();
	}

	@GetMapping("/countries/{country}/job-titles")
	public List<JobTitleAverage> jobTitleAverages(@PathVariable Country country) {
		return service.jobTitleAverages(country);
	}
}
