package com.acme.salary.employee.service;

import com.acme.salary.common.dto.PageResponse;
import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;
import com.acme.salary.employee.exception.DuplicateEmailException;
import com.acme.salary.employee.exception.EmployeeNotFoundException;
import com.acme.salary.employee.exception.InvalidFilterException;
import com.acme.salary.employee.repository.EmployeeRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

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
		String email = normalise(request.email());
		if (repository.existsByEmail(email)) {
			throw new DuplicateEmailException(email);
		}
		Employee employee = new Employee(request.name(), email, request.department(),
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
	public PageResponse<EmployeeResponse> list(String search, Country country, String department, BigDecimal minSalary,
			BigDecimal maxSalary, int page, int size) {
		validateSalaryRange(country, minSalary, maxSalary);
		PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), LIST_ORDER);
		return PageResponse.from(repository.search(toPattern(search), country, blankToNull(department), minSalary,
				maxSalary, pageable)
				.map(EmployeeResponse::from));
	}

	@Override
	@Transactional(readOnly = true)
	public List<String> departments() {
		return repository.findDistinctDepartments();
	}

	@Override
	@Transactional(readOnly = true)
	public List<String> jobTitles() {
		return repository.findDistinctJobTitles();
	}

	@Override
	@Transactional
	public EmployeeResponse update(Long id, EmployeeRequest request) {
		Employee employee = find(id);
		String email = normalise(request.email());
		// Excluding this employee's own row lets them keep their email.
		if (repository.existsByEmailAndIdNot(email, id)) {
			throw new DuplicateEmailException(email);
		}
		employee.update(request.name(), email, request.department(),
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

	// All-or-nothing: every id is checked before anything is deleted, then one DELETE statement removes them,
	// all inside this transaction. A missing id therefore leaves every row untouched.
	@Override
	@Transactional
	public void deleteAll(List<Long> ids) {
		List<Long> requested = ids.stream().distinct().toList();
		List<Long> existing = repository.findExistingIds(requested);
		List<Long> missing = requested.stream().filter(id -> !existing.contains(id)).toList();
		if (!missing.isEmpty()) {
			throw new EmployeeNotFoundException(missing);
		}
		repository.deleteAllByIdInBatch(requested);
	}

	// Salaries in different currencies cannot be compared, so a range only makes sense inside one country.
	private void validateSalaryRange(Country country, BigDecimal minSalary, BigDecimal maxSalary) {
		if (country == null && (minSalary != null || maxSalary != null)) {
			throw new InvalidFilterException("minSalary and maxSalary require a country");
		}
		if (minSalary != null && maxSalary != null && minSalary.compareTo(maxSalary) > 0) {
			throw new InvalidFilterException("minSalary must not exceed maxSalary");
		}
	}

	// Bound as a parameter, so user input never becomes part of the query text.
	private String toPattern(String search) {
		String term = blankToNull(search);
		return term == null ? "%" : "%" + term.toLowerCase() + "%";
	}

	// Emails are stored lower-case so the unique index also catches addresses that differ only by case.
	private String normalise(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private Employee find(Long id) {
		return repository.findById(id).orElseThrow(() -> new EmployeeNotFoundException(id));
	}
}
