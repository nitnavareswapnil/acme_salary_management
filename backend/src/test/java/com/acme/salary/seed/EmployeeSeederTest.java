package com.acme.salary.seed;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class EmployeeSeederTest {

	@Container
	@ServiceConnection
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

	@Autowired
	private EmployeeSeeder seeder;

	@Autowired
	private JdbcTemplate jdbc;

	// The seeder already ran once when the context started, so every test begins from an empty table.
	@BeforeEach
	void emptyTable() {
		jdbc.execute("TRUNCATE TABLE employee RESTART IDENTITY");
	}

	@Test
	void seedsExactlyTenThousandEmployeesIntoAnEmptyTable() throws Exception {
		seeder.run();

		assertThat(count()).isEqualTo(10_000);
		assertThat(jdbc.queryForObject("SELECT COUNT(DISTINCT email) FROM employee", Long.class)).isEqualTo(10_000);
	}

	@Test
	void secondRunAddsNothing() throws Exception {
		seeder.run();
		seeder.run();

		assertThat(count()).isEqualTo(10_000);
	}

	@Test
	void leavesAPrePopulatedTableUntouched() throws Exception {
		jdbc.update("INSERT INTO employee (name, email, department, job_title, country, base_salary) "
				+ "VALUES ('Existing Person', 'existing@acme.com', 'Finance', 'Accountant', 'UK', 50000.00)");

		seeder.run();

		assertThat(count()).isEqualTo(1);
		assertThat(jdbc.queryForObject("SELECT name FROM employee", String.class)).isEqualTo("Existing Person");
	}

	@Test
	void seedsTheSameDataOnEveryFreshDatabase() throws Exception {
		seeder.run();
		String first = fingerprint();

		jdbc.execute("TRUNCATE TABLE employee RESTART IDENTITY");
		seeder.run();

		assertThat(fingerprint()).isEqualTo(first);
	}

	private long count() {
		return jdbc.queryForObject("SELECT COUNT(*) FROM employee", Long.class);
	}

	// Hash of every row in id order: equal fingerprints mean identical data.
	private String fingerprint() {
		return jdbc.queryForObject("SELECT md5(string_agg(name || email || department || job_title || country || base_salary, ',' ORDER BY id)) FROM employee",
				String.class);
	}
}
