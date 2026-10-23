package com.acme.salary.employee.entity;

// Currency is derived from country rather than stored; salaries are never converted between currencies.
public enum Country {
	US("USD"),
	INDIA("INR"),
	UK("GBP");

	private final String currency;

	Country(String currency) {
		this.currency = currency;
	}

	public String getCurrency() {
		return currency;
	}
}
