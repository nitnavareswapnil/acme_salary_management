package com.acme.salary.common;

import com.acme.salary.employee.controller.EmployeeController;
import com.acme.salary.employee.service.EmployeeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EmployeeController.class)
@Import(CorsConfig.class)
class CorsConfigTest {

	private static final String ALLOWED_ORIGIN = "http://localhost:4200";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private EmployeeService service;

	@Test
	void allowsPreflightFromTheConfiguredFrontendOrigin() throws Exception {
		mockMvc.perform(options("/api/employees")
						.header("Origin", ALLOWED_ORIGIN)
						.header("Access-Control-Request-Method", "POST")
						.header("Access-Control-Request-Headers", "content-type"))
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN))
				.andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("POST")));
	}

	@Test
	void allowsPutAndDeleteFromTheFrontendOrigin() throws Exception {
		for (String method : new String[] {"PUT", "DELETE"}) {
			mockMvc.perform(options("/api/employees/1")
							.header("Origin", ALLOWED_ORIGIN)
							.header("Access-Control-Request-Method", method))
					.andExpect(status().isOk());
		}
	}

	@Test
	void addsAllowOriginHeaderToNormalResponses() throws Exception {
		mockMvc.perform(get("/api/employees/departments").header("Origin", ALLOWED_ORIGIN))
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN));
	}

	@Test
	void rejectsPreflightFromAnyOtherOrigin() throws Exception {
		mockMvc.perform(options("/api/employees")
						.header("Origin", "http://evil.example")
						.header("Access-Control-Request-Method", "POST"))
				.andExpect(status().isForbidden());
	}
}
