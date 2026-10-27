package com.acme.salary.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// One line per request: method, path, status, duration. The query string is deliberately left out because it
// carries search terms (names, emails) and salary bounds, and bodies are never read, so no personal data is logged.
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

	private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		long start = System.nanoTime();
		// Assume the worst: if the chain throws, the container will answer 500 after this filter has unwound.
		int status = HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
		try {
			chain.doFilter(request, response);
			status = response.getStatus();
		}
		finally {
			long millis = (System.nanoTime() - start) / 1_000_000;
			// The host pings /actuator/health every few seconds; that would drown the real traffic at INFO.
			if (request.getRequestURI().startsWith("/actuator")) {
				log.debug("{} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(), status, millis);
			}
			else {
				log.info("{} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(), status, millis);
			}
		}
	}
}
