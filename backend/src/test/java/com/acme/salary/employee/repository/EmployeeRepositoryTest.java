package com.acme.salary.employee.repository;

import com.acme.salary.employee.dto.CountrySalaryAggregate;
import com.acme.salary.employee.dto.DepartmentAggregate;
import com.acme.salary.employee.dto.JobTitleAggregate;
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

		Page<Employee> page = repository.search("%", null, null, null, null, PageRequest.of(0, 10));

		assertThat(page.getTotalElements()).isEqualTo(5);
	}

	@Test
	void searchMatchesNameCaseInsensitively() {
		saveFixtures();

		Page<Employee> page = repository.search("%asha%", null, null, null, null, PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getEmail)
				.containsExactlyInAnyOrder("asha@acme.com", "asha.rao2@acme.com");
	}

	@Test
	void searchMatchesEmail() {
		saveFixtures();

		Page<Employee> page = repository.search("%ben@acme%", null, null, null, null, PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getName).containsExactly("Ben Carter");
	}

	@Test
	void filtersByCountry() {
		saveFixtures();

		Page<Employee> page = repository.search("%", Country.INDIA, null, null, null, PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getCountry).containsOnly(Country.INDIA);
		assertThat(page.getTotalElements()).isEqualTo(2);
	}

	@Test
	void filtersByDepartment() {
		saveFixtures();

		Page<Employee> page = repository.search("%", null, "Sales", null, null, PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getDepartment).containsOnly("Sales");
		assertThat(page.getTotalElements()).isEqualTo(3);
	}

	@Test
	void combinesSearchAndFiltersWithAnd() {
		saveFixtures();

		Page<Employee> page = repository.search("%asha%", Country.UK, "Sales", null, null, PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getEmail).containsExactly("asha.rao2@acme.com");
	}

	@Test
	void pagesInStableOrderByNameThenId() {
		saveFixtures();
		Sort sort = Sort.by("name", "id");

		Page<Employee> first = repository.search("%", null, null, null, null, PageRequest.of(0, 3, sort));
		Page<Employee> second = repository.search("%", null, null, null, null, PageRequest.of(1, 3, sort));

		// The two "Asha Rao" rows tie on name, so id decides their order.
		assertThat(first.getContent()).extracting(Employee::getEmail)
				.containsExactly("asha@acme.com", "asha.rao2@acme.com", "ben@acme.com");
		assertThat(second.getContent()).extracting(Employee::getName).containsExactly("Chitra Iyer", "Dan Smith");
		assertThat(first.getTotalPages()).isEqualTo(2);
		assertThat(first.getTotalElements()).isEqualTo(5);
	}

	@Test
	void salaryRangeIsInclusiveOnBothEnds() {
		saveFixtures();

		Page<Employee> page = repository.search("%", Country.US, null, new BigDecimal("70000.00"),
				new BigDecimal("90000.00"), PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getEmail).containsExactlyInAnyOrder("ben@acme.com", "dan@acme.com");
	}

	@Test
	void minSalaryAloneHasNoUpperLimit() {
		saveFixtures();

		Page<Employee> page = repository.search("%", Country.US, null, new BigDecimal("80000.00"), null,
				PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getEmail).containsExactly("ben@acme.com");
	}

	@Test
	void maxSalaryAloneHasNoLowerLimit() {
		saveFixtures();

		Page<Employee> page = repository.search("%", Country.US, null, null, new BigDecimal("70000.00"),
				PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getEmail).containsExactly("dan@acme.com");
	}

	@Test
	void salaryRangeCombinesWithOtherFiltersAndStaysInsideTheCountry() {
		saveFixtures();

		// Chitra (India, 40000) and Asha (UK, 50000) are both in this numeric range; only the country filter separates them.
		Page<Employee> page = repository.search("%", Country.INDIA, "Sales", new BigDecimal("30000.00"),
				new BigDecimal("60000.00"), PageRequest.of(0, 10));

		assertThat(page.getContent()).extracting(Employee::getEmail).containsExactly("chitra@acme.com");
	}

	@Test
	void aggregatesDepartmentsForOneCountrySortedByAverageDescending() {
		repository.saveAll(List.of(
				new Employee("A", "a@acme.com", "Engineering", "Software Engineer", Country.INDIA, new BigDecimal("55000.00")),
				new Employee("B", "b@acme.com", "Engineering", "QA Engineer", Country.INDIA, new BigDecimal("45000.00")),
				new Employee("C", "c@acme.com", "Sales", "Account Manager", Country.INDIA, new BigDecimal("80000.00")),
				new Employee("D", "d@acme.com", "Sales", "Account Manager", Country.UK, new BigDecimal("1.00"))));
		entityManager.flush();
		entityManager.clear();

		List<DepartmentAggregate> aggregates = repository.aggregateByDepartment(Country.INDIA);

		// Sales averages 80000, Engineering 50000; the UK row must not leak into either.
		assertThat(aggregates).extracting(DepartmentAggregate::department).containsExactly("Sales", "Engineering");
		assertThat(aggregates.get(0).totalSalary()).isEqualTo(new BigDecimal("80000.00"));
		assertThat(aggregates.get(0).employeeCount()).isEqualTo(1);
		assertThat(aggregates.get(1).totalSalary()).isEqualTo(new BigDecimal("100000.00"));
		assertThat(aggregates.get(1).employeeCount()).isEqualTo(2);
	}

	@Test
	void departmentAggregateIsEmptyForCountryWithoutEmployees() {
		repository.saveAndFlush(employee("asha@acme.com", "55000.00"));

		assertThat(repository.aggregateByDepartment(Country.UK)).isEmpty();
	}

	@Test
	void listsDistinctDepartmentsAlphabetically() {
		saveFixtures();

		List<String> departments = repository.findDistinctDepartments();

		assertThat(departments).containsExactly("Engineering", "Sales");
	}

	@Test
	void listsDistinctJobTitlesAlphabetically() {
		saveFixtures();

		assertThat(repository.findDistinctJobTitles())
				.containsExactly("Account Manager", "Sales Lead", "Software Engineer");
	}

	@Test
	void findsOnlyTheIdsThatExist() {
		saveFixtures();
		Long first = repository.findAll().get(0).getId();

		assertThat(repository.findExistingIds(List.of(first, -1L))).containsExactly(first);
	}

	@Test
	void batchDeleteRemovesOnlyTheGivenIds() {
		saveFixtures();
		List<Employee> all = repository.findAll();
		List<Long> doomed = List.of(all.get(0).getId(), all.get(1).getId());

		repository.deleteAllByIdInBatch(doomed);
		entityManager.clear();

		assertThat(repository.count()).isEqualTo(3);
		assertThat(repository.findExistingIds(doomed)).isEmpty();
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

	@Test
	void aggregatesJobTitlesForOneCountrySortedByAverageDescending() {
		repository.saveAll(List.of(
				new Employee("A", "a@acme.com", "Engineering", "Software Engineer", Country.INDIA, new BigDecimal("55000.00")),
				new Employee("B", "b@acme.com", "Engineering", "Software Engineer", Country.INDIA, new BigDecimal("45000.00")),
				new Employee("C", "c@acme.com", "Sales", "Account Manager", Country.INDIA, new BigDecimal("80000.00")),
				new Employee("D", "d@acme.com", "Engineering", "Software Engineer", Country.UK, new BigDecimal("100000.00"))));
		entityManager.flush();
		entityManager.clear();

		List<JobTitleAggregate> aggregates = repository.aggregateByJobTitle(Country.INDIA);

		// Account Manager (80000) outranks Software Engineer (50000) although it has fewer people and sorts first alphabetically.
		assertThat(aggregates).extracting(JobTitleAggregate::jobTitle)
				.containsExactly("Account Manager", "Software Engineer");
		JobTitleAggregate engineers = aggregates.get(1);
		assertThat(engineers.totalSalary()).isEqualTo(new BigDecimal("100000.00"));
		assertThat(engineers.employeeCount()).isEqualTo(2);
	}

	@Test
	void jobTitleAggregateIsEmptyForCountryWithoutEmployees() {
		repository.saveAndFlush(employee("asha@acme.com", "55000.00"));

		assertThat(repository.aggregateByJobTitle(Country.UK)).isEmpty();
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
