package com.acme.salary.common.exception;

import com.acme.salary.employee.exception.DuplicateEmailException;
import com.acme.salary.employee.exception.EmployeeNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.List;

// Extends Spring's base handler so framework errors (405, 415, 404, missing parameters...) keep their correct
// status codes; handleExceptionInternal below puts all of them into the same ErrorResponse body.
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException exception,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		List<ErrorResponse.FieldError> errors = exception.getBindingResult().getFieldErrors().stream()
				.map(error -> new ErrorResponse.FieldError(error.getField(), error.getDefaultMessage()))
				.toList();
		return body(status, "Validation failed", errors);
	}

	// Unparseable JSON or a value outside an enum (e.g. an unsupported country).
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException exception,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		return body(status, "Malformed request body", List.of());
	}

	// Single place that renders every other framework exception handled by the base class.
	@Override
	protected ResponseEntity<Object> handleExceptionInternal(Exception exception, Object body, HttpHeaders headers,
			HttpStatusCode status, WebRequest request) {
		// Client errors carry Spring's own short message; server errors stay generic.
		String message = status.is4xxClientError() ? exception.getMessage() : "Unexpected error";
		return ResponseEntity.status(status).headers(headers).body(new ErrorResponse(status.value(), message, List.of()));
	}

	// A query/path value of the wrong type, e.g. an unsupported country.
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<Object> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
		return body(HttpStatus.BAD_REQUEST, "Invalid value for parameter '" + exception.getName() + "'", List.of());
	}

	@ExceptionHandler(EmployeeNotFoundException.class)
	public ResponseEntity<Object> handleNotFound(EmployeeNotFoundException exception) {
		return body(HttpStatus.NOT_FOUND, exception.getMessage(), List.of());
	}

	@ExceptionHandler(DuplicateEmailException.class)
	public ResponseEntity<Object> handleDuplicateEmail(DuplicateEmailException exception) {
		return body(HttpStatus.CONFLICT, exception.getMessage(), List.of());
	}

	// Safety net for races the service-level checks cannot see (e.g. two requests with the same new email).
	// The generic message is deliberate: the database error text would leak schema details.
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<Object> handleDataIntegrity() {
		return body(HttpStatus.CONFLICT, "Request conflicts with existing data", List.of());
	}

	// Last resort: log the cause for operators, tell the client nothing about it.
	@ExceptionHandler(Exception.class)
	public ResponseEntity<Object> handleUnexpected(Exception exception) {
		log.error("Unhandled exception", exception);
		return body(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error", List.of());
	}

	private ResponseEntity<Object> body(HttpStatusCode status, String message, List<ErrorResponse.FieldError> errors) {
		return ResponseEntity.status(status).body(new ErrorResponse(status.value(), message, errors));
	}
}
