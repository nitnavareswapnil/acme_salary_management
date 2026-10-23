package com.acme.salary.employee.service;

import com.acme.salary.common.dto.PageResponse;
import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;
import com.acme.salary.employee.exception.DuplicateEmailException;
import com.acme.salary.employee.exception.EmployeeNotFoundException;
import com.acme.salary.employee.repository.EmployeeRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EmployeeServiceImpl implements EmployeeService {

	private static final int MAX_PAGE_SIZE = 100;

	// Name alone is not unique, so id breaks ties and keeps pages stable.
	private static final Sort LIST_ORDER = Sort.by("name", "id");

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
	@Transactional(readOnly = true)
	public PageResponse<EmployeeResponse> list(String search, Country country, String department, int page, int size) {
		PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), LIST_ORDER);
		return PageResponse.from(repository.search(toPattern(search), country, blankToNull(department), pageable)
				.map(EmployeeResponse::from));
	}

	@Override
	@Transactional(readOnly = true)
	public List<String> departments() {
		return repository.findDistinctDepartments();
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

	// Bound as a parameter, so user input never becomes part of the query text.
	private String toPattern(String search) {
		String term = blankToNull(search);
		return term == null ? "%" : "%" + term.toLowerCase() + "%";
	}

	private String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private Employee find(Long id) {
		return repository.findById(id).orElseThrow(() -> new EmployeeNotFoundException(id));
	}
}
