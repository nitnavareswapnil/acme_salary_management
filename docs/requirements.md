# Requirements: ACME Corp Salary Platform

## 1. Goal
ACME's HR team manages salaries for 10,000 employees across several countries in spreadsheets. This web app lets the HR Manager (single trusted user) manage employee records and see how the organisation pays people, by country and by job title.

## 2. Scope

**Must-have**
| ID | Feature | Detail |
|---|---|---|
| F1 | Employee directory | Server-side paginated list; add, view, update, delete. Search by name/email and filter by country and department, so 10,000 rows stay usable. |
| F2 | Salary insights | Min, max, average base salary and headcount per country. Average base salary per job title within a country. |
| F3 | Automated seeding | On first startup, 10,000 realistic employees (US, India, UK) are created automatically. Repeatable: safe to restart (no duplicates) and deterministic (same data on every fresh database). No UI trigger. |

**If time allows**
- F4: CSV export of the filtered employee list and insights.
- F5: CSV/Excel import with a staging preview before committing records.

## 3. Deliberately left out (and why)
| Item | Reason |
|---|---|
| Authentication / roles | Single trusted HR session assumed (team decision); keeps focus on core value. |
| Bonus, allowances, full CTC | Annual gross base salary answers the core questions; components add schema and UI with little insight gain. |
| Payroll summaries and payout totals | The goal is salary insight, not payroll processing. |
| Revision history / audit trail | Valuable, but not needed to answer pay questions; listed as a future improvement. |
| Currency conversion | Rates change constantly. Salaries stay in local currency (USD, INR, GBP shown as a label derived from country); insights are per country, so nothing is mixed. |
| Tax, bank payouts, self-service portal | Outside the HR-manager persona and the problem statement. |

## 4. Data model
Flat `Employee`: id, name, email (unique), department, job title, country, base salary (annual gross).

## 5. Non-functional requirements
- **Precision:** `BigDecimal` in Java, `DECIMAL(15,2)` in PostgreSQL; no floating point for money.
- **Performance:** aggregation in the database with indexes on country and job title; list and insights respond in well under a second on 10,000 rows.
- **Quality:** built test-first (JUnit 5, Mockito, Testcontainers); fast, deterministic tests.
- **Security:** parameterised queries only; validated input; no secrets in the repo.

## 6. Success criteria
HR can find, edit and add an employee in seconds, and answer "what do we pay a Software Engineer in India versus the UK?" from the insights page. The system is live at a public URL.
