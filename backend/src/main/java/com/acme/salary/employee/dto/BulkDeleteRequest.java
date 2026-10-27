package com.acme.salary.employee.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

// The cap equals the list's maximum page size, so "select all on this page" always fits.
public record BulkDeleteRequest(@NotEmpty @Size(max = 100) List<@NotNull Long> ids) {
}
