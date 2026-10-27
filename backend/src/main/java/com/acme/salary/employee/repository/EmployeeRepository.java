package com.acme.salary.employee.repository;

import com.acme.salary.employee.dto.CountrySalaryAggregate;
import com.acme.salary.employee.dto.DepartmentAggregate;
import com.acme.salary.employee.dto.JobTitleAggregate;
import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

	boolean existsByEmail(String email);

	boolean existsByEmailAndIdNot(String email, Long id);

	// `search` is a lower-case LIKE pattern (never null; "%" matches all). A null country, department or salary bound
	// means no filter; the service only allows salary bounds together with a country.
	@Query("""
			SELECT e FROM Employee e
			WHERE (LOWER(e.name) LIKE :search OR LOWER(e.email) LIKE :search)
			  AND (:country IS NULL OR e.country = :country)
			  AND (:department IS NULL OR e.department = :department)
			  AND (:minSalary IS NULL OR e.baseSalary >= :minSalary)
			  AND (:maxSalary IS NULL OR e.baseSalary <= :maxSalary)
			""")
	Page<Employee> search(@Param("search") String search, @Param("country") Country country,
			@Param("department") String department, @Param("minSalary") BigDecimal minSalary,
			@Param("maxSalary") BigDecimal maxSalary, Pageable pageable);

	@Query("SELECT DISTINCT e.department FROM Employee e ORDER BY e.department")
	List<String> findDistinctDepartments();

	@Query("SELECT DISTINCT e.jobTitle FROM Employee e ORDER BY e.jobTitle")
	List<String> findDistinctJobTitles();

	// Ids only, so checking up to a page of ids before a bulk delete does not load whole entities.
	@Query("SELECT e.id FROM Employee e WHERE e.id IN :ids")
	List<Long> findExistingIds(@Param("ids") List<Long> ids);

	// SUM and COUNT instead of AVG: JPQL's AVG returns a Double, which would put floating point into money.
	@Query("""
			SELECT new com.acme.salary.employee.dto.CountrySalaryAggregate(
			    e.country, MIN(e.baseSalary), MAX(e.baseSalary), SUM(e.baseSalary), COUNT(e))
			FROM Employee e
			GROUP BY e.country
			ORDER BY e.country
			""")
	List<CountrySalaryAggregate> aggregateByCountry();

	// Ordered by the exact average (total / count, no rounding) with job title as tie-break for a stable order.
	@Query("""
			SELECT new com.acme.salary.employee.dto.JobTitleAggregate(e.jobTitle, SUM(e.baseSalary), COUNT(e))
			FROM Employee e
			WHERE e.country = :country
			GROUP BY e.jobTitle
			ORDER BY SUM(e.baseSalary) / COUNT(e) DESC, e.jobTitle
			""")
	List<JobTitleAggregate> aggregateByJobTitle(@Param("country") Country country);

	// Same shape and ordering as the job-title query, grouped by department.
	@Query("""
			SELECT new com.acme.salary.employee.dto.DepartmentAggregate(e.department, SUM(e.baseSalary), COUNT(e))
			FROM Employee e
			WHERE e.country = :country
			GROUP BY e.department
			ORDER BY SUM(e.baseSalary) / COUNT(e) DESC, e.department
			""")
	List<DepartmentAggregate> aggregateByDepartment(@Param("country") Country country);
}
