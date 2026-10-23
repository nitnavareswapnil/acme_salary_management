# ADR 002: PostgreSQL, Flyway, Testcontainers

**Status:** Accepted

## Decision
- PostgreSQL in every environment; money as `DECIMAL(15,2)` mapped to `BigDecimal`.
- Schema only through Flyway migrations (versioned, reviewable). Indexes on `country` and `job_title`.
- Tests: Mockito for services, `@WebMvcTest` for controllers, Testcontainers PostgreSQL for repositories (Docker is available).
- Insights are `GROUP BY` queries in the database, not computed in Java.

## Alternatives considered
- H2 for tests: faster startup but dialect differences can hide real bugs; rejected for repositories.
- SQLite: allowed by the brief, but weaker types and not production-like.
- JPA `ddl-auto`: unversioned schema; rejected.

## Consequences
Tests need Docker and take a few seconds longer; one shared container per run keeps this small. Tests run on a throwaway container and never touch real data.
