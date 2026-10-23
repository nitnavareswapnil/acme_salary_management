package com.acme.salary.common.exception;

import com.acme.salary.employee.exception.DuplicateEmailException;
import com.acme.salary.employee.exception.EmployeeNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
		List<ErrorResponse.FieldError> errors = exception.getBindingResult().getFieldErrors().stream()
				.map(error -> new ErrorResponse.FieldError(error.getField(), error.getDefaultMessage()))
				.toList();
		return respond(HttpStatus.BAD_REQUEST, "Validation failed", errors);
	}

	// Unparseable JSON or a value outside an enum (e.g. an unsupported country).
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleUnreadable() {
		return respond(HttpStatus.BAD_REQUEST, "Malformed request body", List.of());
	}

	@ExceptionHandler(EmployeeNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleNotFound(EmployeeNotFoundException exception) {
		return respond(HttpStatus.NOT_FOUND, exception.getMessage(), List.of());
	}

	@ExceptionHandler(DuplicateEmailException.class)
	public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException exception) {
		return respond(HttpStatus.CONFLICT, exception.getMessage(), List.of());
	}

	// Safety net for races the service-level checks cannot see (e.g. two requests with the same new email).
	// The generic message is deliberate: the database error text would leak schema details.
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ErrorResponse> handleDataIntegrity() {
		return respond(HttpStatus.CONFLICT, "Request conflicts with existing data", List.of());
	}

	private ResponseEntity<ErrorResponse> respond(HttpStatus status, String message, List<ErrorResponse.FieldError> errors) {
		return ResponseEntity.status(status).body(new ErrorResponse(status.value(), message, errors));
	}
}
