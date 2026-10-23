package com.acme.salary.employee.controller;

import com.acme.salary.common.dto.PageResponse;
import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.exception.DuplicateEmailException;
import com.acme.salary.employee.exception.EmployeeNotFoundException;
import com.acme.salary.employee.service.EmployeeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EmployeeController.class)
class EmployeeControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockitoBean
	private EmployeeService service;

	@Test
	void listPassesFiltersAndPagingToService() throws Exception {
		when(service.list("asha", Country.INDIA, "Engineering", 1, 10))
				.thenReturn(new PageResponse<>(List.of(response()), 1, 10, 11, 2));

		mockMvc.perform(get("/api/employees")
						.param("search", "asha").param("country", "INDIA").param("department", "Engineering")
						.param("page", "1").param("size", "10"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].name").value("Asha Rao"))
				.andExpect(jsonPath("$.page").value(1))
				.andExpect(jsonPath("$.size").value(10))
				.andExpect(jsonPath("$.totalElements").value(11))
				.andExpect(jsonPath("$.totalPages").value(2));
	}

	@Test
	void listUsesDefaultsWhenNoParametersAreGiven() throws Exception {
		when(service.list(null, null, null, 0, 20)).thenReturn(new PageResponse<>(List.of(), 0, 20, 0, 0));

		mockMvc.perform(get("/api/employees"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content").isEmpty());
	}

	@Test
	void listRejectsUnknownCountryWithStandardErrorBody() throws Exception {
		mockMvc.perform(get("/api/employees").param("country", "FRANCE"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("Invalid value for parameter 'country'"))
				.andExpect(jsonPath("$.errors").isEmpty());
	}

	@Test
	void listsDepartments() throws Exception {
		when(service.departments()).thenReturn(List.of("Engineering", "Sales"));

		mockMvc.perform(get("/api/employees/departments"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0]").value("Engineering"))
				.andExpect(jsonPath("$[1]").value("Sales"));
	}

	@Test
	void getsEmployeeById() throws Exception {
		when(service.get(1L)).thenReturn(response());

		mockMvc.perform(get("/api/employees/1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(1))
				.andExpect(jsonPath("$.name").value("Asha Rao"))
				.andExpect(jsonPath("$.country").value("INDIA"))
				.andExpect(jsonPath("$.currency").value("INR"))
				.andExpect(jsonPath("$.baseSalary").value(55000.00));
	}

	@Test
	void getReturns404WithErrorBodyWhenEmployeeIsUnknown() throws Exception {
		when(service.get(99L)).thenThrow(new EmployeeNotFoundException(99L));

		mockMvc.perform(get("/api/employees/99"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Employee not found: 99"))
				.andExpect(jsonPath("$.errors").isEmpty());
	}

	@Test
	void createReturns201WithLocationHeader() throws Exception {
		when(service.create(any(EmployeeRequest.class))).thenReturn(response());

		perform(post("/api/employees"), validBody())
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", "http://localhost/api/employees/1"))
				.andExpect(jsonPath("$.id").value(1));
	}

	@Test
	void createReturns409WhenEmailIsAlreadyInUse() throws Exception {
		when(service.create(any(EmployeeRequest.class))).thenThrow(new DuplicateEmailException("asha@acme.com"));

		perform(post("/api/employees"), validBody())
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.message").value("Email already in use: asha@acme.com"));
	}

	@Test
	void createReturns409WhenDatabaseConstraintIsViolated() throws Exception {
		// Two concurrent requests can both pass the service's email check; the unique index then rejects the second.
		when(service.create(any(EmployeeRequest.class)))
				.thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint \"uk_employee_email\""));

		perform(post("/api/employees"), validBody())
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.status").value(409))
				.andExpect(jsonPath("$.message").value("Request conflicts with existing data"))
				.andExpect(jsonPath("$.errors").isEmpty());
	}

	@Test
	void createRejectsBlankName() throws Exception {
		Map<String, Object> body = validBody();
		body.put("name", " ");

		assertFieldError(perform(post("/api/employees"), body), "name");
	}

	@Test
	void createRejectsInvalidEmail() throws Exception {
		Map<String, Object> body = validBody();
		body.put("email", "not-an-email");

		assertFieldError(perform(post("/api/employees"), body), "email");
	}

	@Test
	void createRejectsNegativeSalary() throws Exception {
		Map<String, Object> body = validBody();
		body.put("baseSalary", -1);

		assertFieldError(perform(post("/api/employees"), body), "baseSalary");
	}

	@Test
	void createRejectsMissingCountry() throws Exception {
		Map<String, Object> body = validBody();
		body.remove("country");

		assertFieldError(perform(post("/api/employees"), body), "country");
	}

	@Test
	void createRejectsUnknownCountryValue() throws Exception {
		Map<String, Object> body = validBody();
		body.put("country", "FRANCE");

		perform(post("/api/employees"), body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("Malformed request body"));
	}

	@Test
	void updateReturns200() throws Exception {
		when(service.update(eq(1L), any(EmployeeRequest.class))).thenReturn(response());

		perform(put("/api/employees/1"), validBody())
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(1));
	}

	@Test
	void updateReturns404WhenEmployeeIsUnknown() throws Exception {
		when(service.update(eq(99L), any(EmployeeRequest.class))).thenThrow(new EmployeeNotFoundException(99L));

		perform(put("/api/employees/99"), validBody())
				.andExpect(status().isNotFound());
	}

	@Test
	void updateRejectsInvalidBody() throws Exception {
		Map<String, Object> body = validBody();
		body.put("name", "");

		assertFieldError(perform(put("/api/employees/1"), body), "name");
	}

	@Test
	void deleteReturns204() throws Exception {
		mockMvc.perform(delete("/api/employees/1"))
				.andExpect(status().isNoContent());

		verify(service).delete(1L);
	}

	@Test
	void deleteReturns404WhenEmployeeIsUnknown() throws Exception {
		doThrow(new EmployeeNotFoundException(99L)).when(service).delete(99L);

		mockMvc.perform(delete("/api/employees/99"))
				.andExpect(status().isNotFound());
	}

	private void assertFieldError(ResultActions result, String field) throws Exception {
		result.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("Validation failed"))
				.andExpect(jsonPath("$.errors[?(@.field == '" + field + "')]").exists());
	}

	private ResultActions perform(MockHttpServletRequestBuilder request,
			Map<String, Object> body) throws Exception {
		return mockMvc.perform(request.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)));
	}

	private Map<String, Object> validBody() {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("name", "Asha Rao");
		body.put("email", "asha@acme.com");
		body.put("department", "Engineering");
		body.put("jobTitle", "Software Engineer");
		body.put("country", "INDIA");
		body.put("baseSalary", 55000.00);
		return body;
	}

	private EmployeeResponse response() {
		return new EmployeeResponse(1L, "Asha Rao", "asha@acme.com", "Engineering", "Software Engineer",
				Country.INDIA, "INR", new BigDecimal("55000.00"));
	}
}
