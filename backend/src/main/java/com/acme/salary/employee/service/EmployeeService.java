package com.acme.salary.employee.service;

import com.acme.salary.common.dto.PageResponse;
import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.entity.Country;

import java.math.BigDecimal;
import java.util.List;

public interface EmployeeService {

	EmployeeResponse create(EmployeeRequest request);

	EmployeeResponse get(Long id);

	PageResponse<EmployeeResponse> list(String search, Country country, String department, BigDecimal minSalary,
			BigDecimal maxSalary, int page, int size);

	List<String> departments();

	List<String> jobTitles();

	EmployeeResponse update(Long id, EmployeeRequest request);

	void delete(Long id);

	void deleteAll(List<Long> ids);
}
