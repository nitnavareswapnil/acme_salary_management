package com.acme.salary.seed;

import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class EmployeeDataGeneratorTest {

	private static final int COUNT = 10_000;

	private final EmployeeDataGenerator generator = new EmployeeDataGenerator();

	@Test
	void generatesTheRequestedNumberOfEmployees() {
		assertThat(generator.generate(COUNT)).hasSize(COUNT);
	}

	@Test
	void producesIdenticalDataOnEveryRun() {
		List<String> first = describe(generator.generate(COUNT));
		List<String> second = describe(new EmployeeDataGenerator().generate(COUNT));

		assertThat(second).isEqualTo(first);
	}

	@Test
	void generatesUniqueEmails() {
		Set<String> emails = generator.generate(COUNT).stream().map(Employee::getEmail).collect(Collectors.toSet());

		assertThat(emails).hasSize(COUNT);
	}

	@Test
	void usesOnlyUsIndiaAndUkAndAllThreeAppear() {
		Set<Country> countries = generator.generate(COUNT).stream().map(Employee::getCountry).collect(Collectors.toSet());

		assertThat(countries).containsExactlyInAnyOrder(Country.US, Country.INDIA, Country.UK);
	}

	@Test
	void fillsEveryFieldWithUsableValues() {
		for (Employee employee : generator.generate(COUNT)) {
			assertThat(employee.getName()).isNotBlank();
			assertThat(employee.getDepartment()).isNotBlank();
			assertThat(employee.getJobTitle()).isNotBlank();
			assertThat(employee.getEmail()).matches("[a-z]+\\.[a-z]+\\d+@acme\\.com");
		}
	}

	@Test
	void keepsSalariesAtTwoDecimalPlacesWithinPlausibleRangePerCountry() {
		List<Employee> employees = generator.generate(COUNT);

		assertThat(employees).allSatisfy(employee -> assertThat(employee.getBaseSalary().scale()).isEqualTo(2));
		assertSalariesBetween(employees, Country.US, "40000", "180000");
		assertSalariesBetween(employees, Country.UK, "25000", "110000");
		assertSalariesBetween(employees, Country.INDIA, "600000", "2500000");
	}

	@Test
	void givesEachJobTitleASingleDepartment() {
		Map<String, Set<String>> departmentsByTitle = generator.generate(COUNT).stream().collect(
				Collectors.groupingBy(Employee::getJobTitle,
						Collectors.mapping(Employee::getDepartment, Collectors.toSet())));

		assertThat(departmentsByTitle.values()).allSatisfy(departments -> assertThat(departments).hasSize(1));
		assertThat(departmentsByTitle.keySet().size()).isGreaterThan(10);
	}

	// Employee has no equals(), so compare a flat text form of every field.
	private List<String> describe(List<Employee> employees) {
		return employees.stream()
				.map(employee -> String.join("|", employee.getName(), employee.getEmail(), employee.getDepartment(),
						employee.getJobTitle(), employee.getCountry().name(), employee.getBaseSalary().toPlainString()))
				.toList();
	}

	private void assertSalariesBetween(List<Employee> employees, Country country, String min, String max) {
		assertThat(employees).filteredOn(employee -> employee.getCountry() == country)
				.isNotEmpty()
				.allSatisfy(employee -> assertThat(employee.getBaseSalary())
						.isBetween(new BigDecimal(min), new BigDecimal(max)));
	}
}
