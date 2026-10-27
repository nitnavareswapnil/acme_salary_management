package com.acme.salary.common;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RequestLoggingFilterTest {

	private final RequestLoggingFilter filter = new RequestLoggingFilter();
	private final Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
	private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

	@BeforeEach
	void capture() {
		logger.setLevel(Level.INFO);
		appender.start();
		logger.addAppender(appender);
	}

	@AfterEach
	void release() {
		logger.detachAppender(appender);
	}

	@Test
	void logsMethodPathStatusAndDuration() throws Exception {
		filter.doFilter(new MockHttpServletRequest("GET", "/api/employees/5"), new MockHttpServletResponse(),
				(request, response) -> ((MockHttpServletResponse) response).setStatus(404));

		assertThat(appender.list).hasSize(1);
		assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.INFO);
		assertThat(appender.list.get(0).getFormattedMessage()).matches("GET /api/employees/5 -> 404 \\(\\d+ ms\\)");
	}

	@Test
	void neverLogsTheQueryStringBecauseItHoldsSearchTermsAndSalaries() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/employees");
		request.setQueryString("search=asha%40acme.com&country=INDIA&minSalary=1764000");

		filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> { });

		String message = appender.list.get(0).getFormattedMessage();
		assertThat(message).doesNotContain("asha").doesNotContain("1764000").doesNotContain("?");
	}

	@Test
	void logsAFailureAsA500AndStillRethrows() {
		assertThatThrownBy(() -> filter.doFilter(new MockHttpServletRequest("POST", "/api/employees"),
				new MockHttpServletResponse(), (request, response) -> {
					throw new IllegalStateException("boom");
				})).isInstanceOf(IllegalStateException.class);

		assertThat(appender.list.get(0).getFormattedMessage()).startsWith("POST /api/employees -> 500");
	}

	@Test
	void keepsHealthChecksOutOfTheInfoLogBecauseTheHostPingsThemConstantly() throws Exception {
		filter.doFilter(new MockHttpServletRequest("GET", "/actuator/health"), new MockHttpServletResponse(),
				(request, response) -> { });

		assertThat(appender.list).isEmpty();
	}

	@Test
	void stillLogsHealthChecksWhenDebugIsSwitchedOn() throws Exception {
		logger.setLevel(Level.DEBUG);

		filter.doFilter(new MockHttpServletRequest("GET", "/actuator/health"), new MockHttpServletResponse(),
				(request, response) -> { });

		assertThat(appender.list).hasSize(1);
		assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.DEBUG);
	}
}
