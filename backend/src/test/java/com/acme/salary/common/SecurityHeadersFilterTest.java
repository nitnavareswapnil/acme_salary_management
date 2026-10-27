package com.acme.salary.common;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityHeadersFilterTest {

	private final SecurityHeadersFilter filter = new SecurityHeadersFilter();

	@Test
	void addsTheBrowserSecurityHeadersToEveryResponse() throws Exception {
		MockHttpServletResponse response = run("/api/employees");

		assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
		assertThat(response.getHeader("X-Frame-Options")).isEqualTo("DENY");
		assertThat(response.getHeader("Referrer-Policy")).isEqualTo("no-referrer");
		assertThat(response.getHeader("Strict-Transport-Security")).isEqualTo("max-age=31536000");
	}

	@Test
	void forbidsLoadingAnythingFromAnApiResponse() throws Exception {
		// The API only returns JSON, so a response that tries to act as a page may not load or embed anything.
		assertThat(run("/api/employees").getHeader("Content-Security-Policy"))
				.isEqualTo("default-src 'none'; frame-ancestors 'none'");
	}

	@Test
	void keepsSalaryDataOutOfCaches() throws Exception {
		assertThat(run("/api/insights/countries").getHeader("Cache-Control")).isEqualTo("no-store");
	}

	@Test
	void leavesCachingOfNonApiPathsToTheirOwnHandlers() throws Exception {
		assertThat(run("/actuator/health").getHeader("Cache-Control")).isNull();
	}

	@Test
	void letsTheRequestContinueDownTheChain() throws Exception {
		MockFilterChain chain = new MockFilterChain();

		filter.doFilter(new MockHttpServletRequest("GET", "/api/employees"), new MockHttpServletResponse(), chain);

		assertThat(chain.getRequest()).isNotNull();
	}

	@Test
	void setsTheHeadersBeforeHandlingSoTheyAlsoCoverFailures() {
		MockHttpServletResponse response = new MockHttpServletResponse();

		assertThatThrownBy(() -> filter.doFilter(new MockHttpServletRequest("GET", "/api/employees"), response,
				(request, res) -> {
					throw new ServletException("boom");
				})).isInstanceOf(ServletException.class);

		assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
	}

	private MockHttpServletResponse run(String path) throws Exception {
		MockHttpServletResponse response = new MockHttpServletResponse();
		filter.doFilter(new MockHttpServletRequest("GET", path), response, new MockFilterChain());
		return response;
	}
}
