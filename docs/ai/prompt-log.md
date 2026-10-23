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
