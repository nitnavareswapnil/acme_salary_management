package com.acme.salary.employee.service;

import com.acme.salary.employee.dto.EmployeeRequest;
import com.acme.salary.employee.dto.EmployeeResponse;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;
import com.acme.salary.employee.exception.DuplicateEmailException;
import com.acme.salary.employee.exception.EmployeeNotFoundException;
import com.acme.salary.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

	@Mock
	private EmployeeRepository repository;

	@InjectMocks
	private EmployeeServiceImpl service;

	@Test
	void createsEmployeeAndDerivesCurrencyFromCountry() {
		when(repository.existsByEmail("asha@acme.com")).thenReturn(false);
		when(repository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

		EmployeeResponse response = service.create(request("asha@acme.com", Country.INDIA, "55000.00"));

		assertThat(response.name()).isEqualTo("Asha Rao");
		assertThat(response.email()).isEqualTo("asha@acme.com");
		assertThat(response.country()).isEqualTo(Country.INDIA);
		assertThat(response.currency()).isEqualTo("INR");
		assertThat(response.baseSalary()).isEqualTo(new BigDecimal("55000.00"));
	}

	@Test
	void createRejectsEmailAlreadyInUse() {
		when(repository.existsByEmail("asha@acme.com")).thenReturn(true);

		assertThatThrownBy(() -> service.create(request("asha@acme.com", Country.INDIA, "55000.00")))
				.isInstanceOf(DuplicateEmailException.class);
		verify(repository, never()).save(any());
	}

	@Test
	void getsEmployeeById() {
		when(repository.findById(1L)).thenReturn(Optional.of(employee("asha@acme.com", Country.UK)));

		EmployeeResponse response = service.get(1L);

		assertThat(response.email()).isEqualTo("asha@acme.com");
		assertThat(response.currency()).isEqualTo("GBP");
	}

	@Test
	void getThrowsWhenEmployeeDoesNotExist() {
		when(repository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(99L)).isInstanceOf(EmployeeNotFoundException.class);
	}

	@Test
	void updatesEmployeeFields() {
		Employee existing = employee("asha@acme.com", Country.INDIA);
		when(repository.findById(1L)).thenReturn(Optional.of(existing));
		when(repository.existsByEmailAndIdNot("asha.rao@acme.com", 1L)).thenReturn(false);

		EmployeeResponse response = service.update(1L, request("asha.rao@acme.com", Country.US, "90000.00"));

		assertThat(response.email()).isEqualTo("asha.rao@acme.com");
		assertThat(response.country()).isEqualTo(Country.US);
		assertThat(response.currency()).isEqualTo("USD");
		assertThat(response.baseSalary()).isEqualTo(new BigDecimal("90000.00"));
	}

	@Test
	void updateAllowsKeepingOwnEmail() {
		when(repository.findById(1L)).thenReturn(Optional.of(employee("asha@acme.com", Country.INDIA)));
		// The "not this id" check is what lets an employee keep their own email.
		when(repository.existsByEmailAndIdNot("asha@acme.com", 1L)).thenReturn(false);

		EmployeeResponse response = service.update(1L, request("asha@acme.com", Country.INDIA, "60000.00"));

		assertThat(response.baseSalary()).isEqualTo(new BigDecimal("60000.00"));
	}

	@Test
	void updateRejectsEmailOwnedByAnotherEmployee() {
		when(repository.findById(1L)).thenReturn(Optional.of(employee("asha@acme.com", Country.INDIA)));
		when(repository.existsByEmailAndIdNot("ravi@acme.com", 1L)).thenReturn(true);

		assertThatThrownBy(() -> service.update(1L, request("ravi@acme.com", Country.INDIA, "55000.00")))
				.isInstanceOf(DuplicateEmailException.class);
	}

	@Test
	void updateThrowsWhenEmployeeDoesNotExist() {
		when(repository.findById(99L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.update(99L, request("asha@acme.com", Country.INDIA, "55000.00")))
				.isInstanceOf(EmployeeNotFoundException.class);
	}

	@Test
	void deletesExistingEmployee() {
		when(repository.existsById(1L)).thenReturn(true);

		service.delete(1L);

		verify(repository).deleteById(1L);
	}

	@Test
	void deleteThrowsWhenEmployeeDoesNotExist() {
		when(repository.existsById(99L)).thenReturn(false);

		assertThatThrownBy(() -> service.delete(99L)).isInstanceOf(EmployeeNotFoundException.class);
		verify(repository, never()).deleteById(any());
	}

	private EmployeeRequest request(String email, Country country, String salary) {
		return new EmployeeRequest("Asha Rao", email, "Engineering", "Software Engineer", country, new BigDecimal(salary));
	}

	private Employee employee(String email, Country country) {
		return new Employee("Asha Rao", email, "Engineering", "Software Engineer", country, new BigDecimal("55000.00"));
	}
}
