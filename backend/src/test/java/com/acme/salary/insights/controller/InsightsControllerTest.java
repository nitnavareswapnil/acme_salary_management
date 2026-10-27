package com.acme.salary.insights.controller;

import com.acme.salary.employee.entity.Country;
import com.acme.salary.insights.dto.CountrySalaryStats;
import com.acme.salary.insights.dto.DepartmentAverage;
import com.acme.salary.insights.dto.JobTitleAverage;
import com.acme.salary.insights.service.InsightsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InsightsController.class)
class InsightsControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private InsightsService service;

	@Test
	void returnsSalaryStatsPerCountry() throws Exception {
		when(service.countryStats()).thenReturn(List.of(new CountrySalaryStats(Country.INDIA, "INR",
				new BigDecimal("40000.00"), new BigDecimal("55000.00"), new BigDecimal("47500.00"), 2)));

		mockMvc.perform(get("/api/insights/countries"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].country").value("INDIA"))
				.andExpect(jsonPath("$[0].currency").value("INR"))
				.andExpect(jsonPath("$[0].minSalary").value(40000.00))
				.andExpect(jsonPath("$[0].maxSalary").value(55000.00))
				.andExpect(jsonPath("$[0].avgSalary").value(47500.00))
				.andExpect(jsonPath("$[0].employeeCount").value(2));
	}

	@Test
	void returnsEmptyListWhenThereIsNoData() throws Exception {
		when(service.countryStats()).thenReturn(List.of());

		mockMvc.perform(get("/api/insights/countries"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isEmpty());
	}

	@Test
	void returnsJobTitleAveragesForCountry() throws Exception {
		when(service.jobTitleAverages(Country.INDIA)).thenReturn(List.of(
				new JobTitleAverage("Account Manager", new BigDecimal("80000.00"), 1),
				new JobTitleAverage("Software Engineer", new BigDecimal("50000.00"), 2)));

		mockMvc.perform(get("/api/insights/countries/INDIA/job-titles"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].jobTitle").value("Account Manager"))
				.andExpect(jsonPath("$[0].avgSalary").value(80000.00))
				.andExpect(jsonPath("$[0].employeeCount").value(1))
				.andExpect(jsonPath("$[1].jobTitle").value("Software Engineer"));
	}

	@Test
	void returnsEmptyListForCountryWithoutEmployees() throws Exception {
		when(service.jobTitleAverages(Country.UK)).thenReturn(List.of());

		mockMvc.perform(get("/api/insights/countries/UK/job-titles"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isEmpty());
	}

	@Test
	void rejectsUnknownCountryWith400() throws Exception {
		mockMvc.perform(get("/api/insights/countries/FRANCE/job-titles"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("Invalid value for parameter 'country'"));
	}

	@Test
	void returnsDepartmentAveragesForCountry() throws Exception {
		when(service.departmentAverages(Country.INDIA)).thenReturn(List.of(
				new DepartmentAverage("Sales", new BigDecimal("80000.00"), 1),
				new DepartmentAverage("Engineering", new BigDecimal("50000.00"), 2)));

		mockMvc.perform(get("/api/insights/countries/INDIA/departments"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].department").value("Sales"))
				.andExpect(jsonPath("$[0].avgSalary").value(80000.00))
				.andExpect(jsonPath("$[0].employeeCount").value(1))
				.andExpect(jsonPath("$[1].department").value("Engineering"));
	}

	@Test
	void rejectsUnknownCountryForDepartmentAveragesWith400() throws Exception {
		mockMvc.perform(get("/api/insights/countries/FRANCE/departments"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Invalid value for parameter 'country'"));
	}
}
