package com.acme.salary.employee.repository;

import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;
import org.junit.jupiter.api.Test;
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

	private Employee employee(String email, String salary) {
		return new Employee("Asha Rao", email, "Engineering", "Software Engineer", Country.INDIA, new BigDecimal(salary));
	}
}
