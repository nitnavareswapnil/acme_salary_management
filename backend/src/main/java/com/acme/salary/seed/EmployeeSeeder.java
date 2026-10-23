package com.acme.salary.seed;

import com.acme.salary.employee.entity.Employee;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class EmployeeSeeder implements CommandLineRunner {

	private static final Logger log = LoggerFactory.getLogger(EmployeeSeeder.class);

	private static final int EMPLOYEE_COUNT = 10_000;
	private static final int BATCH_SIZE = 1_000;
	private static final String INSERT_SQL = "INSERT INTO employee "
			+ "(name, email, department, job_title, country, base_salary) VALUES (?, ?, ?, ?, ?, ?)";

	private final JdbcTemplate jdbc;
	private final EmployeeDataGenerator generator;

	public EmployeeSeeder(JdbcTemplate jdbc, EmployeeDataGenerator generator) {
		this.jdbc = jdbc;
		this.generator = generator;
	}

	// One transaction: a failure part-way rolls everything back, so the table stays empty and the next start retries.
	// A half-filled table would count as "already seeded" and never be completed.
	@Override
	@Transactional
	public void run(String... args) {
		if (jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM employee)", Boolean.class)) {
			log.info("Employee table already has data, skipping seeding");
			return;
		}
		long start = System.nanoTime();
		List<Employee> employees = generator.generate(EMPLOYEE_COUNT);
		// Batched JDBC inserts bypass JPA's per-entity overhead; this is what keeps 10,000 rows fast.
		jdbc.batchUpdate(INSERT_SQL, employees, BATCH_SIZE, (statement, employee) -> {
			statement.setString(1, employee.getName());
			statement.setString(2, employee.getEmail());
			statement.setString(3, employee.getDepartment());
			statement.setString(4, employee.getJobTitle());
			statement.setString(5, employee.getCountry().name());
			statement.setBigDecimal(6, employee.getBaseSalary());
		});
		log.info("Seeded {} employees in {} ms", employees.size(), (System.nanoTime() - start) / 1_000_000);
	}
}
