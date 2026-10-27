package com.acme.salary.employee;

import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.repository.EmployeeRepository;
import com.acme.salary.employee.service.EmployeeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Full stack (controller, service, transaction, real PostgreSQL) for the all-or-nothing guarantee.
// Rows are created by the tests themselves, so the seeded data does not matter.
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class EmployeeBulkDeleteIntegrationTest {

	@Container
	@ServiceConnection
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private EmployeeService service;

	@Autowired
	private EmployeeRepository repository;

	@Test
	void deletesEveryRequestedEmployeeInOneCall() throws Exception {
		Long first = create("bulk.one@acme.com");
		Long second = create("bulk.two@acme.com");

		mockMvc.perform(delete("/api/employees").contentType(MediaType.APPLICATION_JSON)
						.content("{\"ids\":[" + first + "," + second + "]}"))
				.andExpect(status().isNoContent());

		assertThat(repository.findExistingIds(List.of(first, second))).isEmpty();
	}

	@Test
	void keepsEveryEmployeeWhenOneIdIsMissing() throws Exception {
		Long existing = create("bulk.keep@acme.com");
		long missing = -1L;

		mockMvc.perform(delete("/api/employees").contentType(MediaType.APPLICATION_JSON)
						.content("{\"ids\":[" + existing + "," + missing + "]}"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Employees not found: [" + missing + "]"));

		assertThat(repository.findExistingIds(List.of(existing))).containsExactly(existing);
	}

	@Test
	void jobTitlesAreDistinctAndSorted() throws Exception {
		create("bulk.title@acme.com");

		assertThat(service.jobTitles()).isSorted().doesNotHaveDuplicates().contains("Software Engineer");
	}

	private Long create(String email) {
		return service.create(new EmployeeRequest("Bulk Tester", email, "Engineering", "Software Engineer",
				Country.INDIA, new BigDecimal("55000.00"))).id();
	}
}
