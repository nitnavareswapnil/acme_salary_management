package com.acme.salary.common.exception;

import java.util.List;

// The single error body returned by every failing endpoint; `errors` is empty unless a field failed validation.
public record ErrorResponse(int status, String message, List<FieldError> errors) {

	public record FieldError(String field, String message) {
	}
}
