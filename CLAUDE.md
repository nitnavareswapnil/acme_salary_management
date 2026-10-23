# CLAUDE.md - ACME Corp Salary Platform

## Project Overview
A lean salary management platform (Spring Boot backend + Angular frontend) for an HR Manager to manage 10,000 global employees and query core salary insights. Source of truth for scope: `docs/requirements.md`.

## Core Engineering Directives
1. **No over-engineering (YAGNI):** Minimal, direct code for current requirements only. No speculative abstractions, helper layers, or unrequested features.
2. **TDD:** Write failing tests first, run them (RED), implement the minimum (GREEN), then refactor. Prefer meaningful, fast, deterministic tests over coverage numbers.
3. **SOLID, simple:** Single-responsibility classes, constructor injection, no field injection.
4. **Transactions:** `@Transactional` on service methods that change state; `readOnly = true` for reads.
5. **Consistency:** Match the surrounding code's naming, structure, and comment density. Comments explain *why*, not *what*.
6. **Scope discipline:** If a task needs something outside `docs/requirements.md` or a new dependency, stop and ask first.

## Architecture & Conventions
- **Backend layers:** controller -> service -> repository -> DB. Package by feature (`employee`, `insights`, `seed`).
- Controllers are thin; business logic lives in services. Never expose JPA entities in the API - use DTO records.
- Validate input with Bean Validation; handle errors in one `@ControllerAdvice` with a consistent error body.
- Schema changes only via Flyway migrations (`src/main/resources/db/migration`); never rely on `ddl-auto` to create schema.
- Insights are computed in the database (JPQL `GROUP BY`), not in Java memory.
- Seeding: `CommandLineRunner`, runs only when the table is empty, uses JDBC batch insert (10,000 rows < 1s).
- **Frontend:** Angular standalone components, signals/reactive forms, Angular Material, server-side pagination. API base URL comes from environment config, never hard-coded.

## Tech Stack & Domain Rules
- **Stack:** Java 17, Spring Boot 3, JPA, PostgreSQL, Flyway, Maven; Angular. Tests: Mockito (service), Testcontainers (repository), `@WebMvcTest` (controller).
- **Money:** `BigDecimal` in Java, `DECIMAL(15,2)` in SQL. No `float`/`double` for money. Averages rounded to 2 dp (HALF_UP).
- **Domain scope:** Annual gross base salary only. No bonus/allowance breakdown, payroll totals, audit trail, or approval workflows.
- **Security:** No authentication (single trusted HR session). Use parameterized queries only; never concatenate SQL. No secrets in the repo - use environment variables.

## Commands
- Backend test: `cd backend && ./mvnw test`
- Backend run: `cd backend && ./mvnw spring-boot:run`
- Frontend test: `cd frontend && npm test`
- Frontend build: `cd frontend && npm run build`

## Working Agreement
- One small task per prompt; show the failing tests before the implementation.
- Briefly explain the reasoning and trade-offs behind each design choice
- Never run `git commit` or `git push`; the author commits. Do not add AI co-author lines to commit messages.
- Do not touch `.local/` (private notes).
