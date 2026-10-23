package com.acme.salary.employee;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.math.BigDecimal;

@Entity
public class Employee {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private String name;

	private String email;

	private String department;

	private String jobTitle;

	@Enumerated(EnumType.STRING)
	private Country country;

	@Column(precision = 15, scale = 2)
	private BigDecimal baseSalary;

	protected Employee() {
		// required by JPA
	}

	public Employee(String name, String email, String department, String jobTitle, Country country, BigDecimal baseSalary) {
		this.name = name;
		this.email = email;
		this.department = department;
		this.jobTitle = jobTitle;
		this.country = country;
		this.baseSalary = baseSalary;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getEmail() {
		return email;
	}

	public String getDepartment() {
		return department;
	}

	public String getJobTitle() {
		return jobTitle;
	}

	public Country getCountry() {
		return country;
	}

	public BigDecimal getBaseSalary() {
		return baseSalary;
	}
}
