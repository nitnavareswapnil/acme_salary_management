package com.acme.salary.insights.service;

import com.acme.salary.employee.dto.CountrySalaryAggregate;
import com.acme.salary.employee.dto.JobTitleAggregate;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.repository.EmployeeRepository;
import com.acme.salary.insights.dto.CountrySalaryStats;
import com.acme.salary.insights.dto.JobTitleAverage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InsightsServiceTest {

	@Mock
	private EmployeeRepository repository;

	@InjectMocks
	private InsightsServiceImpl service;

	@Test
	void mapsAggregateToStatsWithCurrencyAndAverage() {
		when(repository.aggregateByCountry()).thenReturn(List.of(
				aggregate(Country.INDIA, "40000.00", "55000.00", "95000.00", 2)));

		List<CountrySalaryStats> stats = service.countryStats();

		assertThat(stats).hasSize(1);
		CountrySalaryStats india = stats.get(0);
		assertThat(india.country()).isEqualTo(Country.INDIA);
		assertThat(india.currency()).isEqualTo("INR");
		assertThat(india.minSalary()).isEqualTo(new BigDecimal("40000.00"));
		assertThat(india.maxSalary()).isEqualTo(new BigDecimal("55000.00"));
		assertThat(india.avgSalary()).isEqualTo(new BigDecimal("47500.00"));
		assertThat(india.employeeCount()).isEqualTo(2);
	}

	@Test
	void roundsAverageHalfUpToTwoDecimals() {
		when(repository.aggregateByCountry()).thenReturn(List.of(
				// 100.05 / 2 = 50.025: a tie, which HALF_UP sends to 50.03 (HALF_EVEN would give 50.02).
				aggregate(Country.UK, "50.00", "50.05", "100.05", 2),
				// 100.01 / 3 = 33.3366...: rounds to 33.34.
				aggregate(Country.US, "33.00", "34.00", "100.01", 3)));

		List<CountrySalaryStats> stats = service.countryStats();

		assertThat(stats.get(0).avgSalary()).isEqualTo(new BigDecimal("50.03"));
		assertThat(stats.get(1).avgSalary()).isEqualTo(new BigDecimal("33.34"));
	}

	@Test
	void returnsEmptyListWhenThereAreNoEmployees() {
		when(repository.aggregateByCountry()).thenReturn(List.of());

		assertThat(service.countryStats()).isEmpty();
	}

	@Test
	void jobTitleAveragesAreRoundedHalfUpAndKeepRepositoryOrder() {
		when(repository.aggregateByJobTitle(Country.INDIA)).thenReturn(List.of(
				// 100.05 / 2 = 50.025, a tie that HALF_UP sends to 50.03.
				new JobTitleAggregate("Account Manager", new BigDecimal("100.05"), 2),
				new JobTitleAggregate("Software Engineer", new BigDecimal("100.01"), 3)));

		List<JobTitleAverage> averages = service.jobTitleAverages(Country.INDIA);

		assertThat(averages).extracting(JobTitleAverage::jobTitle).containsExactly("Account Manager", "Software Engineer");
		assertThat(averages.get(0).avgSalary()).isEqualTo(new BigDecimal("50.03"));
		assertThat(averages.get(0).employeeCount()).isEqualTo(2);
		assertThat(averages.get(1).avgSalary()).isEqualTo(new BigDecimal("33.34"));
	}

	@Test
	void jobTitleAveragesAreEmptyForCountryWithoutEmployees() {
		when(repository.aggregateByJobTitle(Country.US)).thenReturn(List.of());

		assertThat(service.jobTitleAverages(Country.US)).isEmpty();
	}

	private CountrySalaryAggregate aggregate(Country country, String min, String max, String total, long count) {
		return new CountrySalaryAggregate(country, new BigDecimal(min), new BigDecimal(max), new BigDecimal(total), count);
	}
}
