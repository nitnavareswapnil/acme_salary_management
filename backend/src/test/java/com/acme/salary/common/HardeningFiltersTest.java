package com.acme.salary.common;

import com.acme.salary.employee.controller.EmployeeController;
import com.acme.salary.employee.service.EmployeeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Checks the filters are registered in the real MVC stack, not just correct in isolation.
@WebMvcTest(EmployeeController.class)
class HardeningFiltersTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private EmployeeService service;

	@Test
	void apiResponsesCarrySecurityHeaders() throws Exception {
		when(service.departments()).thenReturn(List.of("Engineering"));

		mockMvc.perform(get("/api/employees/departments"))
				.andExpect(status().isOk())
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(header().string("X-Frame-Options", "DENY"))
				.andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"));
	}

	@Test
	void errorResponsesCarryThemToo() throws Exception {
		mockMvc.perform(get("/api/employees/not-a-number"))
				.andExpect(status().isBadRequest())
				.andExpect(header().string("X-Content-Type-Options", "nosniff"))
				.andExpect(header().string("Cache-Control", "no-store"));
	}
}
