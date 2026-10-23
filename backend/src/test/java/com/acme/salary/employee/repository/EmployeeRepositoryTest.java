package com.acme.salary.employee.repository;

import com.acme.salary.employee.dto.CountrySalaryAggregate;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Real PostgreSQL, and ddl-auto=validate so Flyway creates the schema and Hibernate only checks it.
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class EmployeeRepositoryTest {

	@Container
	@ServiceConnection
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

	@Autowired
	private EmployeeRepository repository;

	@Autowired
	private TestEntityManager entityManager;

	@Test
	void entityMatchesFlywaySchema() {
		// Context start-up fails if Hibernate validation finds a mismatch with the migration.
		assertThat(repository.count()).isZero();
	}

	@Test
	void savesAndFindsEmployeeById() {
		Employee saved = repository.save(employee("asha@acme.com", "55000.00"));
		entityManager.flush();
		entityManager.clear();

		Employee found = repository.findById(saved.getId()).orElseThrow();

		assertThat(found.getName()).isEqualTo("Asha Rao");
		assertThat(found.getEmail()).isEqualTo("asha@acme.com");
		assertThat(found.getDepartment()).isEqualTo("Engineering");
		assertThat(found.getJobTitle()).isEqualTo("Software Engineer");
		assertThat(found.getCountry()).isEqualTo(Country.INDIA);
	}

	@Test
	void keepsSalaryAtTwoDecimalPlaces() {
		Employee saved = repository.save(employee("asha@acme.com", "1234.5"));
		entityManager.flush();
		entityManager.clear();

		BigDecimal salary = repository.findById(saved.getId()).orElseThrow().getBaseSalary();

		assertThat(salary).isEqualTo(new BigDecimal("1234.50"));
		assertThat(salary.scale()).isEqualTo(2);
	}

	@Test
	void rejectsDuplicateEmail() {
		repository.saveAndFlush(employee("asha@acme.com", "55000.00"));

		assertThatThrownBy(() -> repository.saveAndFlush(employee("asha@acme.com", "60000.00")))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void mapsEachCountryToItsCurrency() {
		assertThat(Country.US.getCurrency()).isEqualTo("USD");
		assertThat(Country.INDIA.getCurrency()).isEqualTo("INR");
		assertThat(Country.UK.getCurrency()).isEqualTo("GBP");
	}

	@Test
	void searchWithoutFiltersReturnsEveryone() {
		saveFixtures();

		Page<Employee> page = repository.search("%", null, null, PageRequest.of(0, 10));

		assertThat(page.getTotalElements()).isEqualTo(5);
	}

	@Test
	void searchMatchesNameCaseInsensitively() {
		saveFixtures();

		Page<Employee> page = repository.search("%asha%", null, null, PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getEmail)
				.containsExactlyInAnyOrder("asha@acme.com", "asha.rao2@acme.com");
	}

	@Test
	void searchMatchesEmail() {
		saveFixtures();

		Page<Employee> page = repository.search("%ben@acme%", null, null, PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getName).containsExactly("Ben Carter");
	}

	@Test
	void filtersByCountry() {
		saveFixtures();

		Page<Employee> page = repository.search("%", Country.INDIA, null, PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getCountry).containsOnly(Country.INDIA);
		assertThat(page.getTotalElements()).isEqualTo(2);
	}

	@Test
	void filtersByDepartment() {
		saveFixtures();

		Page<Employee> page = repository.search("%", null, "Sales", PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getDepartment).containsOnly("Sales");
		assertThat(page.getTotalElements()).isEqualTo(3);
	}

	@Test
	void combinesSearchAndFiltersWithAnd() {
		saveFixtures();

		Page<Employee> page = repository.search("%asha%", Country.UK, "Sales", PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getEmail).containsExactly("asha.rao2@acme.com");
	}

	@Test
	void pagesInStableOrderByNameThenId() {
		saveFixtures();
		Sort sort = Sort.by("name", "id");

		Page<Employee> first = repository.search("%", null, null, PageRequest.of(0, 3, sort));
		Page<Employee> second = repository.search("%", null, null, PageRequest.of(1, 3, sort));

		// The two "Asha Rao" rows tie on name, so id decides their order.
		assertThat(first.getContent()).extracting(Employee::getEmail)
				.containsExactly("asha@acme.com", "asha.rao2@acme.com", "ben@acme.com");
		assertThat(second.getContent()).extracting(Employee::getName).containsExactly("Chitra Iyer", "Dan Smith");
		assertThat(first.getTotalPages()).isEqualTo(2);
		assertThat(first.getTotalElements()).isEqualTo(5);
	}

	@Test
	void listsDistinctDepartmentsAlphabetically() {
		saveFixtures();

		List<String> departments = repository.findDistinctDepartments();

		assertThat(departments).containsExactly("Engineering", "Sales");
	}

	@Test
	void aggregatesSalariesPerCountryOrderedByCountry() {
		saveFixtures();

		List<CountrySalaryAggregate> aggregates = repository.aggregateByCountry();

		assertThat(aggregates).extracting(CountrySalaryAggregate::country)
				.containsExactly(Country.INDIA, Country.UK, Country.US);
		CountrySalaryAggregate india = aggregates.get(0);
		assertThat(india.minSalary()).isEqualTo(new BigDecimal("40000.00"));
		assertThat(india.maxSalary()).isEqualTo(new BigDecimal("55000.00"));
		assertThat(india.totalSalary()).isEqualTo(new BigDecimal("95000.00"));
		assertThat(india.employeeCount()).isEqualTo(2);
		CountrySalaryAggregate us = aggregates.get(2);
		assertThat(us.totalSalary()).isEqualTo(new BigDecimal("160000.00"));
		assertThat(us.employeeCount()).isEqualTo(2);
	}

	@Test
	void aggregateOmitsCountriesWithoutEmployees() {
		repository.save(employee("asha@acme.com", "55000.00"));
		entityManager.flush();
		entityManager.clear();

		assertThat(repository.aggregateByCountry()).extracting(CountrySalaryAggregate::country)
				.containsExactly(Country.INDIA);
	}

	@Test
	void aggregateIsEmptyWithoutEmployees() {
		assertThat(repository.aggregateByCountry()).isEmpty();
	}

	private void saveFixtures() {
		repository.saveAll(List.of(
				new Employee("Asha Rao", "asha@acme.com", "Engineering", "Software Engineer", Country.INDIA, new BigDecimal("55000.00")),
				new Employee("Ben Carter", "ben@acme.com", "Engineering", "Software Engineer", Country.US, new BigDecimal("90000.00")),
				new Employee("Chitra Iyer", "chitra@acme.com", "Sales", "Account Manager", Country.INDIA, new BigDecimal("40000.00")),
				new Employee("Asha Rao", "asha.rao2@acme.com", "Sales", "Account Manager", Country.UK, new BigDecimal("50000.00")),
				new Employee("Dan Smith", "dan@acme.com", "Sales", "Sales Lead", Country.US, new BigDecimal("70000.00"))));
		entityManager.flush();
		entityManager.clear();
	}

	private Employee employee(String email, String salary) {
		return new Employee("Asha Rao", email, "Engineering", "Software Engineer", Country.INDIA, new BigDecimal(salary));
	}
}
