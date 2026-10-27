# Deployment guide

The app is three free-tier pieces. The browser loads the static frontend from Netlify; the frontend calls the
Spring Boot API on Render; the API stores data in Neon (PostgreSQL).

```
Browser --> Netlify (Angular, static) --> Render (Docker, Spring Boot) --> Neon (PostgreSQL)
```

Do the steps in this order: **Neon, Render, Netlify, then go back to Render** to tell it the Netlify address.

Free-tier figures below were read from the providers' own pages on **2026-10-27** (sources at the end). They change,
so check the pages again before relying on a number.

## What the repository already contains

| File | Purpose |
|---|---|
| `backend/Dockerfile`, `backend/.dockerignore` | Multi-stage build: Maven and a full JDK to compile, then a small JRE image running as a non-root user |
| `backend/src/main/resources/application.properties` | Reads `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `CORS_ALLOWED_ORIGINS` and `PORT` from the environment |
| `SecurityHeadersFilter`, `RequestLoggingFilter` | Security headers on every response; one log line per request without query strings or bodies |
| `frontend/src/environments/environment.ts` | Production `apiBaseUrl` (the development file replaces it for `ng serve`) |
| `frontend/public/_redirects`, `_headers` | Client-side routing rewrite and browser security headers, copied to the site root by the build |
| `netlify.toml` | Base directory, build command, publish directory and Node version for Netlify |

No secret is committed; credentials exist only as environment variables on the hosts.

## 1. Neon: the database

1. Sign up at neon.com (the GitHub login is fine) and create a **project**. Name it `acme-salary`, choose
   **Postgres 16**, and pick a region on the same continent as the Render region you will choose in step 2.
2. Open the project dashboard and click **Connect**. Turn **Connection pooling off**, so the host name has no
   `-pooler` in it. The app keeps a handful of connections itself, and Flyway takes a lock while it migrates, which is
   safest on a direct connection.
3. Copy the connection string. It looks like this:

   ```
   postgresql://neondb_owner:PASSWORD@ep-example-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

4. Split it into the three variables Render needs. JDBC wants the user and password separate and a `jdbc:` prefix:

   | Variable | Value |
   |---|---|
   | `DB_URL` | `jdbc:postgresql://ep-example-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require` |
   | `DB_USERNAME` | `neondb_owner` (the part before the first `:`) |
   | `DB_PASSWORD` | the password between `:` and `@` |

   Keep `sslmode=require`: Neon accepts only encrypted connections. If the string you copied also has
   `channel_binding=require`, leave that one out; it is a libpq option, not a JDBC one.

You do not create tables or load data by hand: on first start the app runs the Flyway migration and the seeder adds
10,000 employees (about a second). Later restarts add nothing.

## 2. Render: the API

1. Sign up at render.com with GitHub and allow it to read the repository.
2. **New, Web Service**, select the repository, then:

   | Setting | Value |
   |---|---|
   | Name | `acme-salary-api` (gives `https://acme-salary-api.onrender.com`; see the note below if it is taken) |
   | Language | Docker |
   | Branch | `main` |
   | Root Directory | `backend` |
   | Dockerfile Path / Build Context | `Dockerfile` and `.` (both are relative to the Root Directory) |
   | Region | same continent as the Neon project |
   | Instance Type | Free |
   | Health Check Path | `/actuator/health/liveness` |

3. Under **Environment**, add:

   | Key | Value |
   |---|---|
   | `DB_URL` | from step 1 |
   | `DB_USERNAME` | from step 1 |
   | `DB_PASSWORD` | from step 1 |
   | `CORS_ALLOWED_ORIGINS` | `https://acme-salary.netlify.app` for now; fixed in step 4 |

   Do not set `PORT`; Render sets it and the app listens on it.
4. **Create Web Service.** The first build takes several minutes. When the log shows `Started SalaryApplication`,
   open `https://acme-salary-api.onrender.com/actuator/health`: it should answer `{"status":"UP"}`. Then try
   `/api/insights/countries`: three countries with about 3,300 employees each.

Why the health check path is not `/actuator/health`: that one also queries the database. Render calls the check every
few seconds, which would keep Neon awake around the clock and use up its free compute hours (see the limits below).
`/actuator/health/liveness` answers without touching the database.

**If the name is taken**, Render adds a suffix to the address. Change the new address in two places and push:
`frontend/src/environments/environment.ts` and `connect-src` in `frontend/public/_headers`. `CORS_ALLOWED_ORIGINS`
names the frontend, not the API, so it does not change.

## 3. Netlify: the frontend

1. Sign up at netlify.com with GitHub. **Add new site, Import an existing project**, pick the repository.
2. The settings come from `netlify.toml`, so the form should already show these (fill them in if it does not):

   | Setting | Value |
   |---|---|
   | Base directory | `frontend` |
   | Build command | `npm ci && npm run build` |
   | Publish directory | `frontend/dist/frontend/browser` |
   | Environment variable | `NODE_VERSION` = `22` |

3. Before deploying, open **Site configuration, Change site name** and use `acme-salary` if it is free, so the address
   is `https://acme-salary.netlify.app`. Any other name works; use it in step 4.
4. **Deploy.** When it finishes, open the site: the employee list should load.

`_redirects` makes every path serve the app, so a reload on `/insights` or a shared link works. `_headers` adds the
browser security headers and long caching for the hashed script and style files.

### Back to Render: allow the Netlify address

Set `CORS_ALLOWED_ORIGINS` on the Render service to the exact address of the Netlify site: scheme included, no
trailing slash, for example `https://acme-salary.netlify.app`. Save; Render restarts the service. Several origins can
be given separated by commas.

## 4. Check that it all works

| Check | Expected |
|---|---|
| `curl -s https://acme-salary-api.onrender.com/actuator/health` | `{"status":"UP"}` |
| `curl -si "https://acme-salary-api.onrender.com/api/employees?size=1"` | `200` with `X-Content-Type-Options`, `Cache-Control: no-store` and `Content-Security-Policy` headers |
| Preflight from the site: `curl -si -X OPTIONS https://acme-salary-api.onrender.com/api/employees -H "Origin: https://acme-salary.netlify.app" -H "Access-Control-Request-Method: GET"` | `200` and `Access-Control-Allow-Origin: https://acme-salary.netlify.app` |
| Same preflight with `-H "Origin: https://evil.example"` | `403` |
| Netlify site: Employees page | 10,000 employees, filters, paging |
| Netlify site: Insights page | charts and the three tables |
| Reload on `/insights` | the page, not a 404 |
| Browser console on both pages | no red errors |

| Symptom | Likely cause |
|---|---|
| Page loads but the list shows "Could not load employees" and the console says CORS | `CORS_ALLOWED_ORIGINS` on Render does not exactly equal the site address |
| Console says a request was blocked by Content Security Policy | the API address in `environment.ts` and in `connect-src` of `_headers` differ |
| Render deploy fails at start with a connection or SSL error | wrong `DB_URL`, or `sslmode=require` missing, or `channel_binding` left in |
| First request after a quiet period hangs for a minute | the free API instance was asleep; see below |

## Free-tier limits and sleep behaviour

| | Render, free web service | Neon, free plan | Netlify, free plan |
|---|---|---|---|
| Compute or build allowance | 750 free instance hours per month per workspace; services are suspended when they run out until next month | 100 compute-hours (CU-hours) per project per month (0.25 CU for 400 hours) | 300 credits per month, a hard limit |
| Sleeps when idle? | Yes: after 15 minutes without inbound requests; waking takes about a minute and browsers see a loading page | Yes: compute suspends after 5 minutes idle and cannot be switched off; waking takes "a few hundred milliseconds" | No: static files are served always |
| Storage | Ephemeral filesystem, no persistent disk (the data is in Neon, so this does not matter) | 1 GB per project | n/a |
| Transfer | not stated on the page | 5 GB public transfer per project per month | bandwidth costs 20 credits per GB |
| What a deploy or request costs | n/a | n/a | 15 credits per production deploy; 2 credits per 10,000 requests; failed deploys and rollbacks are free |
| When the allowance is gone | web services are suspended until next month | compute suspended until next month; stored data is not deleted | all sites paused ("Site not available") until credits renew; more credits cannot be bought on Free |
| Other | one instance, no SSH, no edge caching, ports 25, 465 and 587 blocked | 10 branches per project | credits are shared by deploys, bandwidth and requests |

Render also offers a free PostgreSQL, but it expires 30 days after creation, which is why the database is on Neon.

### What this means in practice

- **After 15 quiet minutes the first request is slow**, around a minute for Render to start the container, then
  a fraction of a second more while Neon wakes. Open the site once a few minutes before showing it to anyone.
- **Do not keep the service warm with constant pings to `/actuator/health`.** That endpoint queries the database,
  so Neon would never sleep: 24 hours a day on 0.25 CU is about 6 compute-hours a day, so the 100 CU-hours last about
  17 days. A ping to `/actuator/health/liveness` keeps only Render awake: an always-on instance needs about 744 of the
  750 monthly hours, which just fits.
- **Netlify credits go mostly on deploys.** Each push to `main` that deploys costs 15 credits, so 300 credits is
  about 20 production deploys a month, and traffic is cheap by comparison.
- **The seed runs once.** If the Neon database is ever emptied, the next Render start seeds it again.

## Sources (read 2026-10-27)

- Render free instances: https://render.com/docs/free
- Render monorepo settings: https://render.com/docs/monorepo-support
- Render health checks: https://render.com/docs/health-checks
- Neon plans: https://neon.com/docs/introduction/plans
- Neon scale to zero: https://neon.com/docs/introduction/scale-to-zero
- Neon connection strings: https://neon.com/docs/connect/connect-from-any-app
- Netlify credits: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
