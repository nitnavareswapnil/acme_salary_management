# AI Prompt Log

Tool: Claude Code, one small step per prompt, test first (failing tests shown, then the code). The standing rules
(stack, layering, no over-engineering, TDD) live in `CLAUDE.md`; prompts only state what is specific to the step.
Format: `prompt-template.md`. "Review" is what I checked, changed or rejected.

## Backend

### 4. Scaffold backend (`chore(backend): scaffold Spring Boot project with PostgreSQL, Flyway`)
**Prompt:** Scaffold the backend with one smoke test that boots against a real PostgreSQL container.
**Review:** start.spring.io only offers Boot 4.x, so I pinned 3.5.x by hand to keep ADR 001. The first run failed only because Docker was not running.
**Result:** 1 test passing.

### 5. Employee persistence (`feat(backend): Employee entity, migration, indexes`)
**Prompt:** `Country` enum with currency, Flyway `V1` (unique email, country/job title/department indexes), Testcontainers repository tests, then entity and repository.
**Review:** Country is stored as a string, so the currency stays derived. The "duplicate key" ERROR line in the test output is the expected rejection.
**Result:** 6 tests passing.

### 6. Employee service (`feat(backend): EmployeeService CRUD with duplicate-email and not-found handling`)
**Prompt:** DTO records, not-found and duplicate-email exceptions, Mockito tests, then the service. I asked for a re-run with layer sub-packages and an interface/implementation pair.
**Review:** Duplicate checks use `existsByEmailAndIdNot` on update, so an employee can keep their own email. Update relies on dirty checking. The unique index still guards against races.
**Result:** 16 tests passing.

### 7. Controller and error handling (`feat(backend): EmployeeController, DTOs, global exception handler`)
**Prompt:** One `@ControllerAdvice` (400/404/409, one body shape), the CRUD controller, `@WebMvcTest` tests first.
**Review:** The handler sits in `common.exception` because it is cross-cutting. POST returns a `Location` header. The unique-email race was mapped to 409 in a follow-up, with a generic message so no database detail leaks.
**Result:** 30 tests passing.

### 8. Filtered, paginated list (`feat(backend): paginated, filtered employee list and departments endpoint`)
**Prompt:** JPQL search (name/email, country, department) with named parameters, paging capped at 100, departments endpoint.
**Review:** The search term becomes a lower-case `%term%` in the service. Null filters mean "no filter". Invalid paging is clamped, not rejected. `%` and `_` typed by a user act as wildcards, which I accepted.
**Result:** 48 tests passing.

### 9. Country insights (`feat(backend): salary-by-country insights`)
**Prompt:** JPQL `GROUP BY` per country, service, `GET /api/insights/countries`.
**Review:** JPQL `AVG` returns a `Double`, which would put floating point into money. The query returns sum and count and the service divides (2 dp, HALF_UP). A tie case (100.05 / 2 = 50.03) proves HALF_UP.
**Result:** 56 tests passing.

### 10. Job-title insights (`feat(backend): average salary by job title within a country`)
**Prompt:** Average salary per job title for one country, highest first.
**Review:** Same sum/count approach. The database sorts on the exact average. The repository test uses data where average order differs from alphabetical and from headcount order.
**Result:** 63 tests passing.

### 11. Data generator (`feat(backend): deterministic employee data generator`)
**Prompt:** Fixed-seed generator, name/department/job-title pools, salary ranges per country, unique emails, US/India/UK only.
**Review:** A new `Random(SEED)` per call gives identical data on every fresh database. Countries are listed explicitly so a future enum value cannot change the seed. Salary uses integer maths.
**Result:** 70 tests passing.

### 12. Seeder (`feat(backend): seed 10,000 employees on first startup`)
**Prompt:** `CommandLineRunner`, skip when the table has data, JDBC batch insert, log the elapsed time.
**Review:** The whole seed runs in one transaction, so a failure leaves the table empty and the next start retries. The emptiness check is `EXISTS`, not `COUNT`. A fingerprint test proves two fresh databases get identical data. Seeding took about 75 ms locally (logged, not asserted).
**Result:** 74 tests passing.

### Backend hardening and audit fixes (`feat(backend): CORS configuration and health endpoint`, `fix(backend): lower-case emails and standard error body for all failures`)
**Prompt:** Final backend audit: CORS, health endpoint, full clean test run, look for anything missed. Then fix the two findings.
**Review:** I booted the real app and called every endpoint by hand. Two findings: emails differing only in case were accepted, and 405/500 responses used Spring's default body. Fixes: emails are trimmed and lower-cased in the service (the existing unique index now blocks case variants, no migration); the handler extends `ResponseEntityExceptionHandler`, so framework errors keep the right status but share one error body; unexpected exceptions return a generic message.
**Result:** 89 tests passing. Real run: startup 1.7 s, seeding 113 ms, list page 19 ms, country insights 5 ms.

## Frontend

### 13. Scaffold (`chore(frontend): scaffold Angular app with Material, routing, environment config`)
**Prompt:** Angular standalone app with routing, Material and environment files.
**Review:** Angular 21, not 22, because 22 needs Node 22.22+ and this machine has Node 20.20. npm 10.8 crashed on `jsdom`'s optional `canvas`, so I installed with `npx npm@11` (lockfile is normal). Routes lazy-load. One form component serves add and edit.
**Result:** 8 specs passing.

### 14. Employee directory (`feat(frontend): employee directory with server-side paging, search and filters`)
**Prompt:** Service, Material table, 300 ms debounced search, country/department filters, server-side paginator, empty and error states.
**Review:** One `query` signal is the single source of truth, and every filter change resets to page 0 in the same update, so it never sends two requests. `switchMap` stops a slow old response overwriting a newer one. A failed departments call only empties the dropdown. I tried it in the browser; it looked fine for a skeleton and I planned to polish later.
**Result:** 24 specs passing.

### 15. Add, edit, delete (`feat(frontend): employee form and delete with confirmation`)
**Prompt:** Reactive form for add and edit with the backend's rules, delete behind a confirmation dialog.
**Review:** Client validators mirror the backend so most mistakes never reach the server. A 400 puts messages on the fields, a 409 on the email field. Deleting the only row of a later page steps back one page. I noted that dropdowns were still needed, which became 15b and 15c.
**Result:** 52 specs passing.

### 15b / 15c. Form refinements (`feat(frontend): department suggestions and stricter form validation`, `feat(frontend): department as a strict dropdown`)
**Prompt:** Department as a dropdown from the departments endpoint; stricter validation.
**Review:** I first built an autocomplete, then reversed it into a strict select to stop typos like "Enginering". Cost: a new department cannot be added from the UI. Whitespace-only text is rejected client-side (Angular's `required` accepts it, the backend's `@NotBlank` does not). Open point I raised: departments and job titles are not linked, so inconsistent pairs are possible; it needs backend and database work, so it is a later item.
**Result:** 63 specs passing.

### 16. Insights page (`feat(frontend): salary insights page`)
**Prompt:** Country statistics table, job-title averages for a chosen country, loading, empty and error states.
**Review:** Sections load, fail and retry independently. The currency label comes from the statistics response, not a second country-to-currency table. A test caught a stale currency after switching country: a `computed` read a plain form value, which is not a signal.
**Result:** 76 specs passing.

## Polish phase

### P1. Job titles and bulk delete (`feat(backend): job titles list and bulk delete`)
**Prompt:** `GET /api/employees/job-titles` and bulk `DELETE` by ids in one transaction.
**Review:** Ids travel in the body (no URL length limit), capped at 100. All ids are checked first and then one `DELETE ... WHERE id IN` runs, so a missing id leaves every row untouched, which an HTTP-level Testcontainers test proves.
**Result:** 106 tests passing.

### P2. Salary range filter and department averages (`feat(backend): salary range filter and department averages`)
**Prompt:** `minSalary`/`maxSalary` on the list (400 without a country), average salary per department.
**Review:** A range across USD, INR and GBP means nothing, so the rule lives in the service. I added one rule beyond the task: min above max is a 400 rather than an empty page. Department figures are averages, never totals (payroll totals are out of scope).
**Result:** 126 tests passing.

### P3. Job title autocomplete and two-card form (`feat(frontend): job title autocomplete and two-column form`)
**Prompt:** Job title autocomplete, form regrouped into two cards.
**Review:** Unlike department, job title stays a suggestion list, so a new role can still be typed. Suggestions are filtered in the browser from one fetch. Layout breakpoints cannot be tested in jsdom, so specs check structure.
**Result:** 89 specs passing.

### P4. Row selection, bulk delete, salary range (`feat(frontend): bulk delete and salary range filter in the employee list`)
**Prompt:** Checkbox column, bulk bar with confirmation, min/max salary filters.
**Review:** Selection is per page and cleared on every reload, so "N selected" never includes rows the user cannot see. Salary inputs stay disabled until a country is chosen, and any country change clears them (40,000 INR is not 40,000 GBP). A `0` bound is sent. I also fixed two weak test patterns found on the way.
**Result:** 114 specs passing.
**Observation I raised:** with Country USA and a huge minimum the list still showed everyone. Cause: my running backend predated the new code. Restarting it fixed it, and the lesson is to restart after backend changes.

### P4b. Total count (`feat(frontend): show total employee count above the list`)
**Prompt:** Show how many records exist and keep it correct under filters.
**Review:** It uses the backend's `totalElements`, so no extra request. It reads "10,000 employees" unfiltered and "3,314 employees match the filters" when filtered, and stays hidden until the first page arrives. On my request it sits in its own highlighted row below the filters, where the Export button will go later. One test of mine leaked open requests and broke 44 others; fixed.
**Result:** 124 specs passing.

### P5. Theme and brand link (`feat(frontend): enterprise theme and brand link to the employee list`)
**Prompt:** Material theme, typography, consistent cards and buttons, brand links to the list.
**Review:** I used Material's built-in blue and cyan palettes rather than inventing tones by hand; the blue is vivid, and a custom palette is the next step if I want it more muted. Cards are outlined everywhere. The brand is a real keyboard-focusable link. Colours cannot be tested in jsdom.
**Result:** 126 specs passing.

### P5b. Grid styling (`feat(frontend): light-shade themed employee grid`)
**Prompt:** Light shades from the theme, easier to use.
**Review:** Shades come from the theme's own container token, so a palette change restyles the grid. Header, zebra rows, hover, and ticked rows with an accent bar. I checked a screenshot with rows ticked. Not done: sticky header, the same styling on the insights tables.
**Result:** 185 specs passing.

### P6. Insights charts (`feat(frontend): insights charts with table alternatives`)
**Prompt:** Headcount donut, top roles chart, department chart, tables kept as text alternatives. I approved a charting dependency.
**Review:** `chart.js` 4.6.1 directly, because `ng2-charts` 11 needs Angular 22. Only the parts used are registered, and they land in the lazy insights chunk. Chart configs are pure functions, so specs check data and colours without a canvas. Each country keeps one fixed colour (checked for colour-blindness), with a legend showing counts. Looking at the real page found a clipped value on the longest bar; fixed with a margin and a spec. Not done: dark mode.
**Result:** 159 specs passing.

### P6b. Collapsible insights sections (`feat(frontend): collapsible insights sections`)
**Prompt:** Add a collapse/expand arrow ("two tabs").
**Review:** The page has three sections, so I made all three collapsible for consistency. I used Material's expansion panel, with no new dependency. The country selector moved to its own row so collapsing one card never hides a control another section uses.
**Result:** 166 specs passing.

### P7. Job title comparison (`feat(frontend): compare a job title across countries`)
**Prompt:** Pick a job title and see its average in every country, each in its own currency.
**Review:** No backend change: three small requests to the existing endpoint. If any country fails, the whole comparison fails with Retry, so I never compare two countries while three are expected. Amounts show the ISO code, are not converted, and are not ranked or charted on one scale, since that would treat USD, INR and GBP as one unit. A real-browser check found right-aligned amounts leaking in from a table rule; fixed. A single backend endpoint is the cleaner alternative.
**Result:** 181 specs passing.

## Deployment

### P8. Hardening and deployment configuration (`feat: production hardening, Dockerfile and deployment guide`)
**Prompt:** Pre-check both suites, security headers, request logging, environment-based configuration, Dockerfile, production API URL, deployment guide with free-tier limits.
**Review:** Two plain servlet filters instead of Spring Security (there is no login). Security headers go on every response; request logging never records query strings (they hold search terms and salary bounds) or bodies. I built the image and ran it: health, headers, CORS (allowed origin 200, other origin 403) and `/actuator/env` 404 all checked. My first CSP broke the app because Angular's production build inlines an `onload` handler; fixed by turning off critical-CSS inlining and re-checked in headless Chrome. Render's health check would have queried the database every few seconds and kept Neon awake all day, so health checks use the liveness probe (test first). Free-tier numbers come from the providers' pages, listed in `docs/deployment.md`.
**Result:** 140 backend tests, 185 frontend specs, builds clean.

### P8b. Free-tier guard rails
**Prompt:** Make sure no service runs out of its free tier; list dashboard steps.
**Review:** All three providers stop service instead of billing when no card is on file, so I never added one. Other controls: cap Neon compute at 0.25 CU, deploy Render by hand if needed, check usage pages. Not done: rate limiting (a new feature outside the requirements).

### P8c. Netlify to Vercel
**Prompt:** Netlify suspended my account at sign-up, so move the frontend to Vercel and record why.
**Review:** Routing rewrite, security headers and CSP moved into `frontend/vercel.json`; the CSP is identical to the old one (checked by script). `docs/deployment.md` and ADR 004 now say why.

### P8d. Getting the live site working
**Prompt:** Debug the deploy errors I pasted.
**Review:** Four separate faults: (1) Render built an old commit because P8 was not pushed yet; (2) `DB_URL` contained the username and password, which the driver rejects; (3) the name `acme-salary-api` was already taken on Render, so the real address is `acme-salary-api-xawz`, and the frontend was calling a stranger's service until I compared responses with curl and corrected `environment.ts` and the CSP; (4) CORS returned 403 until `CORS_ALLOWED_ORIGINS` held the exact Vercel address. A database password pasted in chat and in a log was rotated.

### E1. Clear filters (`feat(frontend): clear filters button in the employee list`)
**Prompt:** A "Clear filters" button beside the filter options.
**Review:** Five failing specs first. One request clears search, country, department and salary range, and keeps the page size. The search debounce now compares with the applied term instead of the previous keystroke, so clearing while still typing sends nothing. Layout not yet checked in a browser.
**Result:** 190 specs passing.
