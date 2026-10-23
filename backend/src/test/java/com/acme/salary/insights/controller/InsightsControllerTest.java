package com.acme.salary.insights.controller;

import com.acme.salary.employee.entity.Country;
import com.acme.salary.insights.dto.CountrySalaryStats;
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
}
