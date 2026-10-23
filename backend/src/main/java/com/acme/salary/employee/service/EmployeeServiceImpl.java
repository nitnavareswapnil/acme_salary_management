package com.acme.salary.employee.service;

import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.entity.Employee;
import com.acme.salary.employee.exception.DuplicateEmailException;
import com.acme.salary.employee.exception.EmployeeNotFoundException;
import com.acme.salary.employee.repository.EmployeeRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeServiceImpl implements EmployeeService {

	private final EmployeeRepository repository;

	public EmployeeServiceImpl(EmployeeRepository repository) {
		this.repository = repository;
	}

	@Override
	@Transactional
	public EmployeeResponse create(EmployeeRequest request) {
		if (repository.existsByEmail(request.email())) {
			throw new DuplicateEmailException(request.email());
		}
		Employee employee = new Employee(request.name(), request.email(), request.department(),
				request.jobTitle(), request.country(), request.baseSalary());
		return EmployeeResponse.from(repository.save(employee));
	}

	@Override
	@Transactional(readOnly = true)
	public EmployeeResponse get(Long id) {
		return EmployeeResponse.from(find(id));
	}

	@Override
	@Transactional
	public EmployeeResponse update(Long id, EmployeeRequest request) {
		Employee employee = find(id);
		// Excluding this employee's own row lets them keep their email.
		if (repository.existsByEmailAndIdNot(request.email(), id)) {
			throw new DuplicateEmailException(request.email());
		}
		employee.update(request.name(), request.email(), request.department(),
				request.jobTitle(), request.country(), request.baseSalary());
		// No save(): the entity is managed, so the transaction flushes the change.
		return EmployeeResponse.from(employee);
	}

	@Override
	@Transactional
	public void delete(Long id) {
		if (!repository.existsById(id)) {
			throw new EmployeeNotFoundException(id);
		}
		repository.deleteById(id);
	}

	private Employee find(Long id) {
		return repository.findById(id).orElseThrow(() -> new EmployeeNotFoundException(id));
	}
}
