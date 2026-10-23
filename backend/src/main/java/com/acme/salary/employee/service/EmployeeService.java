package com.acme.salary.employee.service;

import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.dto.EmployeeResponse;

public interface EmployeeService {

	EmployeeResponse create(EmployeeRequest request);

	EmployeeResponse get(Long id);

	EmployeeResponse update(Long id, EmployeeRequest request);

	void delete(Long id);
}
