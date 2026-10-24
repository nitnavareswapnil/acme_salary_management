package com.acme.salary.common;

import com.acme.salary.employee.controller.EmployeeController;
import com.acme.salary.employee.service.EmployeeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Every failure, including ones Spring raises before reaching a controller, must use the {status, message, errors} body.
@WebMvcTest(EmployeeController.class)
class ErrorResponseShapeTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private EmployeeService service;

	@Test
	void unsupportedMethodReturns405InStandardShape() throws Exception {
		mockMvc.perform(patch("/api/employees/1"))
				.andExpect(status().isMethodNotAllowed())
				.andExpect(jsonPath("$.status").value(405))
				.andExpect(jsonPath("$.message").isNotEmpty())
				.andExpect(jsonPath("$.errors").isEmpty());
	}

	@Test
	void unsupportedMediaTypeReturns415InStandardShape() throws Exception {
		mockMvc.perform(post("/api/employees").contentType(MediaType.TEXT_PLAIN).content("hello"))
				.andExpect(status().isUnsupportedMediaType())
				.andExpect(jsonPath("$.status").value(415))
				.andExpect(jsonPath("$.errors").isEmpty());
	}

	@Test
	void unknownRouteReturns404InStandardShape() throws Exception {
		mockMvc.perform(get("/api/does-not-exist"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.errors").isEmpty());
	}

	@Test
	void nonNumericPagingParameterReturns400InStandardShape() throws Exception {
		mockMvc.perform(get("/api/employees").param("size", "abc"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("Invalid value for parameter 'size'"));
	}

	@Test
	void unexpectedFailureReturns500WithoutLeakingDetails() throws Exception {
		when(service.get(1L)).thenThrow(new IllegalStateException("password=secret at db-host-7"));

		mockMvc.perform(get("/api/employees/1"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.status").value(500))
				.andExpect(jsonPath("$.message").value("Unexpected error"))
				.andExpect(jsonPath("$.errors").isEmpty());
	}
}
