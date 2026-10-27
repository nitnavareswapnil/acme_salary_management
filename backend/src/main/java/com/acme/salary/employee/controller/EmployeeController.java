package com.acme.salary.employee.controller;

import com.acme.salary.common.dto.PageResponse;
import com.acme.salary.employee.dto.BulkDeleteRequest;
import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.service.EmployeeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

	private final EmployeeService service;

	public EmployeeController(EmployeeService service) {
		this.service = service;
	}

	@GetMapping
	public PageResponse<EmployeeResponse> list(
			@RequestParam(required = false) String search,
			@RequestParam(required = false) Country country,
			@RequestParam(required = false) String department,
			@RequestParam(required = false) BigDecimal minSalary,
			@RequestParam(required = false) BigDecimal maxSalary,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return service.list(search, country, department, minSalary, maxSalary, page, size);
	}

	@GetMapping("/departments")
	public List<String> departments() {
		return service.departments();
	}

	@GetMapping("/job-titles")
	public List<String> jobTitles() {
		return service.jobTitles();
	}

	@GetMapping("/{id}")
	public EmployeeResponse get(@PathVariable Long id) {
		return service.get(id);
	}

	@PostMapping
	public ResponseEntity<EmployeeResponse> create(@Valid @RequestBody EmployeeRequest request) {
		EmployeeResponse created = service.create(request);
		return ResponseEntity
				.created(ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(created.id()).toUri())
				.body(created);
	}

	@PutMapping("/{id}")
	public EmployeeResponse update(@PathVariable Long id, @Valid @RequestBody EmployeeRequest request) {
		return service.update(id, request);
	}

	// Ids travel in the body: a URL holding a page of ids can exceed proxy length limits.
	@DeleteMapping
	public ResponseEntity<Void> deleteAll(@Valid @RequestBody BulkDeleteRequest request) {
		service.deleteAll(request.ids());
		return ResponseEntity.noContent().build();
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		service.delete(id);
		return ResponseEntity.noContent().build();
	}
}
