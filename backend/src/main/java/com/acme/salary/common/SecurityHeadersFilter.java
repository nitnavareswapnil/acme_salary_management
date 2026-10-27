package com.acme.salary.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Plain headers instead of Spring Security: there is no login, so the framework would add weight and nothing else.
// They are set before the request is handled, so error responses carry them too.
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class SecurityHeadersFilter extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		response.setHeader("X-Content-Type-Options", "nosniff");
		response.setHeader("X-Frame-Options", "DENY");
		response.setHeader("Referrer-Policy", "no-referrer");
		// Ignored over plain HTTP; applies once the host serves the API over HTTPS.
		response.setHeader("Strict-Transport-Security", "max-age=31536000");
		if (request.getRequestURI().startsWith("/api/")) {
			// The API only returns JSON, so nothing it sends may load or embed anything, and salary data is not cached.
			response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
			response.setHeader("Cache-Control", "no-store");
		}
		chain.doFilter(request, response);
	}
}
