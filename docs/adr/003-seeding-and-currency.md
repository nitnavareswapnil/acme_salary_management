# ADR 003: Seeding and currency

**Status:** Accepted

## Decision
- Seeding uses a `CommandLineRunner` (per team feedback), not Flyway: migrations define schema; data generation is code that can be tested.
- Repeatable = idempotent (runs only when the table is empty) and deterministic (fixed random seed).
- Inserts use JDBC batches in one transaction to stay fast; JPA per-row saves would be much slower.
- Salaries stay in local currency; currency (USD/INR/GBP) is a label derived from country. No FX conversion, no extra column.

## Future path for global insights
Add an `exchange_rate` table in a new migration and convert at query time (`AVG(salary * rate)`), never storing converted values.

## Consequences
Per-country insights are exact. Cross-country comparison is deferred deliberately because rates change and are out of scope.
