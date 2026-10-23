package com.acme.salary.common.dto;

import org.springframework.data.domain.Page;

import java.util.List;

// Own page shape instead of serialising Spring's PageImpl, whose JSON structure is not a stable contract.
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

	public static <T> PageResponse<T> from(Page<T> page) {
		return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
				page.getTotalElements(), page.getTotalPages());
	}
}
