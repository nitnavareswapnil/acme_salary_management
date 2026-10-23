package com.acme.salary.employee.repository;

import com.acme.salary.employee.entity.Country;
import com.acme.salary.employee.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

	boolean existsByEmail(String email);

	boolean existsByEmailAndIdNot(String email, Long id);

	// `search` is a lower-case LIKE pattern (never null; "%" matches all). A null country or department means no filter.
	@Query("""
			SELECT e FROM Employee e
			WHERE (LOWER(e.name) LIKE :search OR LOWER(e.email) LIKE :search)
			  AND (:country IS NULL OR e.country = :country)
			  AND (:department IS NULL OR e.department = :department)
			""")
	Page<Employee> search(@Param("search") String search, @Param("country") Country country,
			@Param("department") String department, Pageable pageable);

	@Query("SELECT DISTINCT e.department FROM Employee e ORDER BY e.department")
	List<String> findDistinctDepartments();
}
