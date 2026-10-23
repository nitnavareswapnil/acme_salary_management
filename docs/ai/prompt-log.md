# AI Prompt Log

Format: see `prompt-template.md`.

### 4. Scaffold backend  (commit: chore(backend): scaffold Spring Boot project with PostgreSQL, Flyway)
**Prompt:** "Read .local/CONTEXT.md, CLAUDE.md and docs/ first, then continue from the next step." (next step: scaffold backend with one smoke test)
**AI output:** Maven project (Spring Boot 3.5.16, Java 17) with Web, JPA, Validation, Actuator, Flyway, PostgreSQL, Testcontainers; env-based datasource config; one smoke test that boots the context against a real PostgreSQL container.
**My review:** TODO (author). Points to check: start.spring.io only offers Boot 4.x now, so the parent was pinned to 3.5.x by hand to keep the documented decision; first run failed only because Docker was not running; the Flyway "no migrations" warning is expected until the Employee migration.
**Result:** `./mvnw test` passes (1 test).
