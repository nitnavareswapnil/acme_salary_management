package com.acme.salary.seed;

import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

// Builds realistic demo employees. A fixed seed makes every fresh database identical, so runs are repeatable.
@Component
public class EmployeeDataGenerator {

	private static final long SEED = 42L;
	private static final String EMAIL_DOMAIN = "@acme.com";

	// Listed explicitly (not Country.values()) so adding a country later cannot change the seeded data.
	private static final List<Country> COUNTRIES = List.of(Country.US, Country.INDIA, Country.UK);

	private record JobTitle(String name, int levelPercent) {
	}

	private record Department(String name, List<JobTitle> jobTitles) {
	}

	private record NamePool(List<String> firstNames, List<String> lastNames) {
	}

	private static final List<Department> DEPARTMENTS = List.of(
			new Department("Engineering", List.of(
					new JobTitle("Software Engineer", 100), new JobTitle("Senior Software Engineer", 140),
					new JobTitle("QA Engineer", 85), new JobTitle("DevOps Engineer", 110),
					new JobTitle("Engineering Manager", 180))),
			new Department("Sales", List.of(
					new JobTitle("Sales Executive", 80), new JobTitle("Account Manager", 100),
					new JobTitle("Sales Manager", 150))),
			new Department("Marketing", List.of(
					new JobTitle("Marketing Specialist", 80), new JobTitle("Content Strategist", 75),
					new JobTitle("Marketing Manager", 140))),
			new Department("Human Resources", List.of(
					new JobTitle("HR Executive", 75), new JobTitle("Recruiter", 80),
					new JobTitle("HR Manager", 130))),
			new Department("Finance", List.of(
					new JobTitle("Accountant", 85), new JobTitle("Financial Analyst", 105),
					new JobTitle("Finance Manager", 150))),
			new Department("Operations", List.of(
					new JobTitle("Operations Analyst", 85), new JobTitle("Operations Manager", 140))),
			new Department("Customer Support", List.of(
					new JobTitle("Support Agent", 60), new JobTitle("Support Lead", 100))),
			new Department("Product", List.of(
					new JobTitle("Business Analyst", 105), new JobTitle("Product Manager", 150))));

	// Typical annual gross base salary for a 100% job title, in each country's own currency.
	private static final long US_BASELINE = 85_000;
	private static final long UK_BASELINE = 52_000;
	private static final long INDIA_BASELINE = 1_200_000;

	private static final NamePool US_NAMES = new NamePool(
			List.of("james", "mary", "john", "patricia", "robert", "jennifer", "michael", "linda", "william", "elizabeth",
					"david", "barbara", "richard", "susan", "joseph", "jessica", "thomas", "sarah", "daniel", "karen"),
			List.of("smith", "johnson", "williams", "brown", "jones", "garcia", "miller", "davis", "rodriguez", "martinez",
					"hernandez", "lopez", "wilson", "anderson", "taylor", "moore", "jackson", "martin", "lee", "thompson"));

	private static final NamePool INDIA_NAMES = new NamePool(
			List.of("aarav", "vivaan", "aditya", "arjun", "rohan", "ananya", "diya", "priya", "isha", "kavya",
					"rahul", "neha", "sanjay", "pooja", "vikram", "meera", "karan", "sneha", "amit", "divya"),
			List.of("sharma", "patel", "singh", "kumar", "gupta", "reddy", "nair", "iyer", "mehta", "joshi",
					"desai", "kulkarni", "verma", "chopra", "bose", "rao", "pillai", "shah", "mishra", "yadav"));

	private static final NamePool UK_NAMES = new NamePool(
			List.of("oliver", "amelia", "george", "olivia", "harry", "isla", "jack", "emily", "charlie", "sophie",
					"thomas", "grace", "oscar", "lily", "henry", "ella", "william", "freya", "alfie", "chloe"),
			List.of("evans", "thomas", "roberts", "walker", "wright", "robinson", "thompson", "white", "hughes", "edwards",
					"green", "hall", "wood", "harris", "clarke", "patel", "jackson", "turner", "hill", "cooper"));

	public List<Employee> generate(int count) {
		Random random = new Random(SEED);
		List<Employee> employees = new ArrayList<>(count);
		for (int index = 1; index <= count; index++) {
			Country country = COUNTRIES.get(random.nextInt(COUNTRIES.size()));
			Department department = DEPARTMENTS.get(random.nextInt(DEPARTMENTS.size()));
			JobTitle jobTitle = department.jobTitles().get(random.nextInt(department.jobTitles().size()));
			NamePool names = namesFor(country);
			String firstName = names.firstNames().get(random.nextInt(names.firstNames().size()));
			String lastName = names.lastNames().get(random.nextInt(names.lastNames().size()));
			// +/-15% around the job title's typical pay.
			int variationPercent = 85 + random.nextInt(31);

			employees.add(new Employee(
					capitalize(firstName) + " " + capitalize(lastName),
					// The running index guarantees uniqueness even when two people share a name.
					firstName + "." + lastName + index + EMAIL_DOMAIN,
					department.name(),
					jobTitle.name(),
					country,
					salary(country, jobTitle, variationPercent)));
		}
		return employees;
	}

	// Whole-number integer maths, so no floating point ever touches a salary.
	private BigDecimal salary(Country country, JobTitle jobTitle, int variationPercent) {
		long amount = baselineFor(country) * jobTitle.levelPercent() * variationPercent / 10_000;
		return BigDecimal.valueOf(amount).setScale(2);
	}

	private long baselineFor(Country country) {
		return switch (country) {
			case US -> US_BASELINE;
			case UK -> UK_BASELINE;
			case INDIA -> INDIA_BASELINE;
		};
	}

	private NamePool namesFor(Country country) {
		return switch (country) {
			case US -> US_NAMES;
			case UK -> UK_NAMES;
			case INDIA -> INDIA_NAMES;
		};
	}

	private String capitalize(String word) {
		return Character.toUpperCase(word.charAt(0)) + word.substring(1);
	}
}
