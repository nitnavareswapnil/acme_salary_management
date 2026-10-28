# Development Plan (LLD and build order)

Scope: `docs/requirements.md`. Decisions: `docs/adr/`. Each step is one commit, test first (CLAUDE.md supplies the rules). Written before and during the build; `docs/ai/prompt-log.md` records what was actually done and why plans changed.

## 1. Low-level design

### Backend, package `com.acme.salary`, by feature
| Package | Class | Responsibility |
|---|---|---|
| `employee` | `Country` (enum) | `US`, `INDIA`, `UK`, each with its currency code (USD, INR, GBP). Currency is derived, never stored. |
| | `Employee` (entity) | `id`, `name`, `email` (unique), `department`, `jobTitle`, `country`, `baseSalary` (`BigDecimal`, `DECIMAL(15,2)`). |
| | `EmployeeRepository` | `JpaRepository` plus a filtered page query (search on name/email, optional country and department) using JPQL with named parameters; distinct departments query. |
| | `EmployeeRequest` (record) | Input DTO with Bean Validation (not blank, valid email, salary > 0, country required). |
| | `EmployeeResponse` (record) | Output DTO: all fields plus `currency`. |
| | `EmployeeService` | CRUD and filtered list; maps entity to DTO; throws `EmployeeNotFoundException` and `DuplicateEmailException`. |
| | `EmployeeController` | Thin REST layer, see API below. |
| `common` | `GlobalExceptionHandler` (`@ControllerAdvice`) | One error body `{status, message, errors[]}` for validation (400), not found (404), duplicate email (409). |
| `insights` | `CountrySalaryStats`, `JobTitleAverage` (records) | Output DTOs. |
| | `InsightsRepository` | JPQL `GROUP BY` queries returning the DTOs. Average rounded to 2 dp HALF_UP. |
| | `InsightsService`, `InsightsController` | Read-only service and thin controller. |
| `seed` | `EmployeeDataGenerator` | Pure class, `Random(fixed seed)`, builds 10,000 realistic employees. Deterministic and unit-testable without a DB. |
| | `EmployeeSeeder` (`CommandLineRunner`) | Runs only when the table is empty; writes via `JdbcTemplate.batchUpdate`. |

### Database (Flyway)
- `V1__create_employee.sql`: table `employee`, unique index on `email`, indexes on `country`, `job_title`, `department`.

### API
| Method and path | Purpose |
|---|---|
| `GET /api/employees?page&size&search&country&department` | Paginated, filtered list |
| `GET /api/employees/{id}` | One employee |
| `POST /api/employees` | Create (201) |
| `PUT /api/employees/{id}` | Update |
| `DELETE /api/employees/{id}` | Delete (204) |
| `GET /api/employees/departments` | Distinct departments for the filter dropdown |
| `GET /api/insights/countries` | Min, max, average, headcount per country |
| `GET /api/insights/countries/{country}/job-titles` | Average salary per job title in a country |

### Frontend, `frontend/src/app`
| Item | Responsibility |
|---|---|
| `environments/` | `apiBaseUrl` per environment. |
| `core/employee.service.ts`, `core/insights.service.ts` | `HttpClient` wrappers and typed models. |
| `employees/employee-list` | Material table, `MatPaginator` (server-side), debounced search, country and department filters, delete with confirm. |
| `employees/employee-form` | Reactive form for add and edit, shows server validation errors. |
| `insights/insights-page` | Country stats table; country selector driving the job-title averages table. |
| `app.routes.ts` | `/employees`, `/employees/new`, `/employees/:id/edit`, `/insights`. |

## 2. Build order

| # | Commit | Depends on |
|---|---|---|
| 4 | Backend scaffold (done) | |
| 5 | Repository tests + `V1` migration + entity | 4 |
| 6 | Employee service | 5 |
| 7 | Exception handler + controller | 6 |
| 8 | Filtered, paginated list (repository, service, controller) | 7 |
| 9 | Country insights | 5 |
| 10 | Job-title insights | 9 |
| 11 | Data generator | 5 |
| 12 | Seeder | 11 |
| 13 | Frontend scaffold | 7 |
| 14 | Employee directory | 13, 8 |
| 15 | Add, edit, delete forms | 14 |
| 16 | Insights page | 13, 10 |
| 17 | Dockerfile, CORS, deploy config | 12, 16 |
| 18 | README final pass | all |
| 19 | Stretch: CSV export, then import with preview | all |

Backend steps 9 to 12 are independent of 6 to 8; reorder if useful.

Steps 17 to 19 are now sequenced after section 4 (Enterprise Polish phase); its step P8 replaces step 17.

## 3. Implementation checklist (in order)

**Step 5: Employee persistence**
- `Country` enum (US, INDIA, UK) with currency code.
- `V1__create_employee.sql`: table, unique index on email, indexes on country, job_title, department.
- `Employee` entity and `EmployeeRepository`.
- Tests (Testcontainers): save and find; salary keeps 2 dp; duplicate email rejected; Hibernate `validate` passes.

**Step 6: Employee service**
- `EmployeeRequest` (validated) and `EmployeeResponse` (with derived currency) records.
- `EmployeeService`: create, get, update, delete; `@Transactional` per CLAUDE.md.
- `EmployeeNotFoundException`, `DuplicateEmailException`.
- Tests (Mockito): unknown id throws; another employee's email throws; own email allowed on update; currency derived.

**Step 7: Controller and errors**
- `EmployeeController`: GET by id, POST (201), PUT, DELETE (204).
- `GlobalExceptionHandler`: one body shape for 400, 404, 409.
- Tests (`@WebMvcTest`): each status code; field errors for blank name, bad email, salary <= 0, missing country.

**Step 8: Filtered, paginated list**
- JPQL query: search on name/email (case-insensitive), optional country and department, AND-combined, named parameters.
- `GET /api/employees` with page, size (max 100), stable sort by name then id.
- `GET /api/employees/departments`.
- Tests: fixture rows for filters and paging (repository), param passing (service, controller).

**Step 9: Country insights**
- `CountrySalaryStats` record; JPQL `GROUP BY` for min, max, avg, count per country; avg 2 dp HALF_UP.
- `InsightsService`, `InsightsController`: `GET /api/insights/countries`.
- Tests: known rows, a rounding-up case, empty countries absent, currency included.

**Step 10: Job-title insights**
- `JobTitleAverage` record; `GET /api/insights/countries/{country}/job-titles`.
- Only that country, 2 dp HALF_UP, sorted by average descending.
- Tests: unknown country gives 400; no data gives empty list.

**Step 11: Data generator**
- `EmployeeDataGenerator`: `Random(fixed seed)`, fixed department and job-title lists, plausible salaries per country, unique emails.
- Tests (plain unit): same seed gives same output; 10,000 unique emails; only US, INDIA, UK.

**Step 12: Seeder**
- `EmployeeSeeder` `CommandLineRunner`: skip if table non-empty; `JdbcTemplate.batchUpdate`.
- Tests (Testcontainers): exactly 10,000 rows; second run adds none; non-empty table untouched; log the elapsed time.

**Step 13: Frontend scaffold**
- Angular standalone app via `npx @angular/cli`, strict, routing, Material.
- `environments` with `apiBaseUrl`; four placeholder routes.
- `npm test` and `npm run build` pass. Ask before any extra dependency.

**Step 14: Employee directory**
- `core/employee.service.ts` and typed models.
- `employee-list`: Material table, server-side paginator, debounced search (300 ms, resets to page 0), country and department filters, empty and error states.
- Specs with `HttpTestingController`.

**Step 15: Add, edit, delete**
- `employee-form`: reactive form with the backend's rules, pre-fill on edit, show server 400/409 messages.
- Delete with confirmation, then refresh; save returns to the list.

**Step 16: Insights page**
- `core/insights.service.ts`; country stats table with currency.
- Country selector loads job-title averages; loading, empty and error states.

**Step 17: Deployment**
- Multi-stage backend `Dockerfile` (Java 17).
- CORS origin from an environment variable; production config from `DB_*` variables.
- Frontend production environment file.
- Verify current free-tier terms; write the manual Render, Neon and Netlify steps.

**Step 18: README**
- Run, test, deploy, architecture, trade-offs, future improvements.
- Every command works as written; no claim without matching code or test.

**Step 19 (stretch): CSV export, then import with preview**
- Export uses the list's filters, streamed, header row, escaped values.
- Import with staging preview only after export is merged.

## 4. Phase: Enterprise Polish and Deployment Readiness

Runs after step 16. It **absorbs step 17** (deployment as P8); steps 18 (README) and 19 (stretch) follow. Each item is one commit, test first. Decisions taken: **no normalization** (requirements section 4 stays "Flat Employee"), **charts may add one dependency** (approved), **no JaCoCo**.

### 4.1 Review of the proposal against `docs/requirements.md`

| Proposed item | Verdict | Reason |
|---|---|---|
| Normalize departments and job roles | **Dropped** (decided) | Requirements say flat `Employee`; the cost (V2 data migration, seeder, queries, DTOs) outweighs the benefit at this scope. Recorded as a future improvement for the README. |
| Department-to-job-title validation | **Dropped** | Needs the reference data above; a hard-coded Java map would be worse than free text. |
| Cascading dropdowns | **Replaced** | Job title becomes an autocomplete fed by `GET /api/employees/job-titles` (distinct titles, read-only). Department stays the strict dropdown. |
| Bulk operations | **Trimmed** | Bulk delete by ids in one transaction only. Bulk create is the F5 import stretch. |
| Indexes on email, department, country | **Already done** | `V1` has all of them (plus job title). Only `EXPLAIN` on 10,000 rows; add an index only if a query needs one. |
| Theme, two-column form cards, clickable title | **Kept** | Frontend only. Title links to `/employees` (no separate dashboard exists). |
| Per-column filters | **Dropped** | Not in requirements; over-engineering. |
| Salary range filter | **Kept, trimmed** | `minSalary`/`maxSalary`, only valid together with `country` (ranges across USD, INR, GBP are meaningless). |
| Multi-select and bulk delete | **Kept** | Confirm dialog, uses the bulk endpoint. |
| Department payroll chart | **Changed** | Payroll totals are out of scope. Use average salary by department within one country. |
| Headcount donut, top-earning roles | **Kept** | Headcount is F2 data; top roles come from the existing job-title averages. |
| Cross-filtering | **Trimmed** | One job title compared across countries, each in local currency, no conversion. Answers "Software Engineer in India versus the UK". |
| Hardening | **Trimmed** | Error body and CORS exist. Add security headers via a small servlet filter (no Spring Security) and request logging without emails or salaries. |
| Coverage | **Dropped** | See 4.3. |

### 4.2 Steps (in order)

| # | Commit |
|---|---|
| P1 | Backend: `GET /api/employees/job-titles`; bulk `DELETE /api/employees` by ids (one `@Transactional`, all-or-nothing, 404 if any id missing) |
| P2 | Backend: `minSalary`/`maxSalary` list filters (400 without `country`); backend: average salary by department for a country (JPQL `GROUP BY`) |
| P3 | Form: job title autocomplete from the endpoint; two-column card layout |
| P4 | List: row selection, bulk delete with confirm, salary range inputs |
| P5 | Theme and typography (Material custom palette); toolbar title as `routerLink` to `/employees` |
| P6 | Insights charts: headcount donut, top roles, average by department. Add one chart dependency (see 4.4); keep the tables as the text alternative |
| P7 | Insights comparison: one job title across countries, local currency, labelled per country |
| P8 | Hardening + deployment (old step 17): security headers filter, request logging, Dockerfile, `DB_*` and `CORS_ALLOWED_ORIGINS`, frontend production `apiBaseUrl`, Netlify `_headers`, verify free-tier terms, manual Render/Neon/Netlify steps |
| P9 | Final verification: `./mvnw clean test`, `npm test`, `npm run build`, fresh database run, deployed smoke test, timings recorded for the README |

### 4.3 Test and coverage approach (no JaCoCo)

- Backend: JUnit 5 + Mockito (service), `@WebMvcTest` (controller), Testcontainers PostgreSQL (repository, seeder), run by `./mvnw test`.
- Frontend: Vitest + jsdom with `HttpTestingController`, run by `npm test`; strict TypeScript and `npm run build` are the type-safety check.
- No coverage percentage is measured or claimed. Each feature's behaviours are listed per step (Acceptance) and the README names any known untested path.

### 4.4 Chart dependency

Proposed: `chart.js` used directly through a small wrapper component, not `ng2-charts`, to avoid Angular-version compatibility risk with a third-party wrapper. Before installing: check the latest `chart.js` release and the bundle size impact (lazy-loaded with the insights route), then confirm with you.

### 4.5 Additions

- Render free-tier cold start: first request after idle can be slow; clear loading state and a README note (verify current terms).
- Accessibility pass: labelled selects, dialog focus, chart data also shown as tables.
- Measured timings (list, insights, bulk delete on 10,000 rows) in the README instead of claims.
- One prompt-log entry per P-step.
