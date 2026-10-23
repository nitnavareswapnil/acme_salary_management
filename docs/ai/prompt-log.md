# AI Prompt Log

Format: see `prompt-template.md`.

### 4. Scaffold backend  (commit: chore(backend): scaffold Spring Boot project with PostgreSQL, Flyway)
**Prompt:** "Read .local/CONTEXT.md, CLAUDE.md and docs/ first, then continue from the next step." (next step: scaffold backend with one smoke test)
**AI output:** Maven project (Spring Boot 3.5.16, Java 17) with Web, JPA, Validation, Actuator, Flyway, PostgreSQL, Testcontainers; env-based datasource config; one smoke test that boots the context against a real PostgreSQL container.
**My review:** TODO (author). Points to check: start.spring.io only offers Boot 4.x now, so the parent was pinned to 3.5.x by hand to keep the documented decision; first run failed only because Docker was not running; the Flyway "no migrations" warning is expected until the Employee migration.
**Result:** `./mvnw test` passes (1 test).

### 5 Employee persistence  (commit: feat(backend): Employee entity, migration, indexes)
**Prompt:** Plan step 5: `Country` enum with currency, `V1__create_employee.sql` (unique email index; country, job_title, department indexes), Testcontainers `EmployeeRepositoryTest`, then entity and repository.
**My review:** TODO (author). Points to check: RED was a compile failure (classes did not exist); entity has no setters yet (added when update is built in step 6); `Country` stored as a string so the currency stays derived; the "duplicate key" ERROR line in the test output is the expected rejection.
**Result:** `./mvnw test` passes (6 tests).

### 6 Employee service  (commit: feat(backend): EmployeeService CRUD with duplicate-email and not-found handling)
**Prompt:** Plan step 6: request/response records, `EmployeeNotFoundException`, `DuplicateEmailException`, Mockito `EmployeeServiceTest`, then the service. Deviation: re-run with layer sub-packages (`dto`, `entity`, `exception`, `repository`, `service`) and an `EmployeeService` interface with `EmployeeServiceImpl`.
**My review:** TODO (author). Points to check: RED was a compile failure; duplicate checks use `existsByEmail` (create) and `existsByEmailAndIdNot` (update) so an employee can keep their own email; update relies on dirty checking inside the transaction instead of `save()`; the DB unique index still backs this up against races; Bean Validation annotations are exercised in the step 7 controller tests; layer sub-packages sit inside the `employee` feature package; the interface has a single implementation, a convention rather than a need.
**Result:** `./mvnw test` passes (16 tests, 10 new).

### 7 Controller and error handling  (commit: feat(backend): EmployeeController, DTOs, global exception handler)
**Prompt:** Plan step 7: `GlobalExceptionHandler` (400/404/409, one body shape), `EmployeeController` (GET by id, POST 201, PUT 200, DELETE 204), `@WebMvcTest` slice tests first.
**My review:** TODO (author). Points to check: RED was a compile failure; the handler lives in `common.exception` because it is cross-cutting; POST returns a `Location` header; unknown enum values and bad JSON map to 400 "Malformed request body"; the unique-email race (`DataIntegrityViolationException`) was mapped to 409 in a follow-up prompt, with a generic message so no DB details leak.
**Result:** `./mvnw test` passes (30 tests, 14 new).

### 8 Filtered, paginated list  (commit: feat(backend): paginated, filtered employee list and departments endpoint)
**Prompt:** Plan step 8: JPQL search (name/email, country, department) with named parameters, `GET /api/employees` with paging (size capped at 100, sort by name then id), `GET /api/employees/departments`; repository fixtures plus service and controller tests first.
**My review:** TODO (author). Points to check: RED was a compile failure; the search term becomes a lower-case `%term%` pattern in the service (never null, so Postgres never has to type a null string); null country/department mean "no filter"; invalid paging is clamped rather than rejected; `PageResponse` is our own record, not Spring's `PageImpl`; an unknown `country` value returns the standard 400 body (new handler); `%` and `_` typed by the user act as wildcards, left as is.
**Result:** `./mvnw test` passes (48 tests, 17 new).

### 9 Country insights  (commit: feat(backend): salary-by-country insights)
**Prompt:** Plan step 9: `CountrySalaryStats`, JPQL `GROUP BY` in `EmployeeRepository`, `InsightsService`/`Impl`, `GET /api/insights/countries`; tests first.
**My review:** TODO (author). Points to check: RED was a compile failure; the query returns min/max/sum/count and the service divides (sum / count, 2 dp HALF_UP) because JPQL `AVG` returns a `Double`, which would put floating point into money; a tie case (100.05 / 2 = 50.025 -> 50.03) proves HALF_UP rather than HALF_EVEN; countries with no employees produce no group, so the divisor is never zero; the aggregate query sits in `EmployeeRepository` (as asked) with its row record in `employee.dto`.
**Result:** `./mvnw test` passes (56 tests, 8 new).

### 10 Job-title insights  (commit: feat(backend): average salary by job title within a country)
**Prompt:** Plan step 10: `JobTitleAverage`, JPQL `GROUP BY jobTitle` for one country sorted by average descending, service method, `GET /api/insights/countries/{country}/job-titles`; tests first.
**My review:** TODO (author). Points to check: RED was a compile failure; same sum / count approach as step 9 (no `Double`), now shared through one private `average` helper; `ORDER BY SUM / COUNT DESC` sorts on the exact average in the database, job title breaks ties; unknown country returns 400 through the existing type-mismatch handler, no new error code; the repository test uses data where sort-by-average differs from alphabetical and from headcount order.
**Result:** `./mvnw test` passes (63 tests, 7 new).

### 11 Data generator  (commit: feat(backend): deterministic employee data generator)
**Prompt:** Plan step 11: `EmployeeDataGenerator` with fixed-seed `Random`, name/department/job-title pools, country-based salary ranges, unique emails, US/INDIA/UK only; unit tests first.
**My review:** TODO (author). Points to check: RED was a compile failure; a new `Random(SEED)` per call makes output identical on every fresh database; countries are listed explicitly, not `Country.values()`, so a future country cannot change the seed data; salary is integer maths (baseline x job-title level x +/-15%), no floating point; the running index in the email guarantees uniqueness even when names repeat; `seed` stays flat because it has no controller, service or DTO layers.
**Result:** `./mvnw test` passes (70 tests, 7 new).

### 12 Seeder  (commit: feat(backend): seed 10,000 employees on first startup)
**Prompt:** Plan step 12: `EmployeeSeeder` `CommandLineRunner`, skip when the table has data, `JdbcTemplate.batchUpdate`, log elapsed time; Testcontainers tests first.
**My review:** TODO (author). Points to check: RED was a compile failure; the whole seed runs in one `@Transactional` so a failure leaves the table empty and the next start retries (a half-filled table would look "already seeded"); emptiness check is `EXISTS`, not `COUNT`; the `@SpringBootTest` contexts now seed on startup, so each seeder test truncates first; a fingerprint test proves two fresh databases get identical data; seeding took about 75 ms for 10,000 rows locally (logged, not asserted, to keep the test deterministic).
**Result:** `./mvnw test` passes (74 tests, 4 new).
