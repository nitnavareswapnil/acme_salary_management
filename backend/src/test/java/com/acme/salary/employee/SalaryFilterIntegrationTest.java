package com.acme.salary.employee;

import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.service.EmployeeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Full stack against real PostgreSQL. The seeded 10,000 rows are present, so each test isolates its own rows
// with a unique search term in the email.
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class SalaryFilterIntegrationTest {

	@Container
	@ServiceConnection
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private EmployeeService service;

	@Test
	void salaryFilterWithoutCountryReturns400InStandardShape() throws Exception {
		mockMvc.perform(get("/api/employees").param("minSalary", "40000"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("minSalary and maxSalary require a country"));
		mockMvc.perform(get("/api/employees").param("maxSalary", "60000"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void salaryRangeReturnsOnlyEmployeesInsideItForThatCountry() throws Exception {
		create("range.low@acme.com", Country.INDIA, "30000.00");
		create("range.mid@acme.com", Country.INDIA, "50000.00");
		create("range.high@acme.com", Country.INDIA, "90000.00");
		create("range.uk@acme.com", Country.UK, "50000.00");

		mockMvc.perform(get("/api/employees").param("search", "range.").param("country", "INDIA")
						.param("minSalary", "40000").param("maxSalary", "60000"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].email").value("range.mid@acme.com"));
	}

	@Test
	void departmentAveragesAreServedFromTheDatabaseForOneCountry() throws Exception {
		mockMvc.perform(get("/api/insights/countries/INDIA/departments"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].department").isString())
				.andExpect(jsonPath("$[0].avgSalary").isNumber())
				.andExpect(jsonPath("$[0].employeeCount").isNumber());
	}

	private void create(String email, Country country, String salary) {
		service.create(new EmployeeRequest("Range Tester", email, "Engineering", "Software Engineer",
				country, new BigDecimal(salary)));
	}
}
