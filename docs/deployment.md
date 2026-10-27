# Deployment guide

The app is three free-tier pieces. The browser loads the static frontend from Vercel; the frontend calls the
Spring Boot API on Render; the API stores data in Neon (PostgreSQL).

```
Browser --> Vercel (Angular, static) --> Render (Docker, Spring Boot) --> Neon (PostgreSQL)
```

Do the steps in this order: **Neon, Render, Vercel, then go back to Render** to tell it the Vercel address.

**Why Vercel and not Netlify:** the frontend was planned for Netlify, but Netlify suspended the new account at
sign-up (a support request is open). The app is a plain static build, so any static host works; Vercel's Hobby plan
is free, needs no card, and reads the same kind of settings from a file in the repo (`frontend/vercel.json`).

Free-tier figures below were read from the providers' own pages on **2026-10-27** (sources at the end). They change,
so check the pages again before relying on a number.

## What the repository already contains

| File | Purpose |
|---|---|
| `backend/Dockerfile`, `backend/.dockerignore` | Multi-stage build: Maven and a full JDK to compile, then a small JRE image running as a non-root user |
| `backend/src/main/resources/application.properties` | Reads `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `CORS_ALLOWED_ORIGINS` and `PORT` from the environment |
| `SecurityHeadersFilter`, `RequestLoggingFilter` | Security headers on every response; one log line per request without query strings or bodies |
| `frontend/src/environments/environment.ts` | Production `apiBaseUrl` (the development file replaces it for `ng serve`) |
| `frontend/vercel.json` | Client-side routing rewrite (`/(.*)` to `/index.html`; real files win), browser security headers, install command and output directory for Vercel |

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
   | Name | `acme-salary-api` (the address is `https://<name>.onrender.com`; the name was already taken for this project, so Render added a suffix: see the note below) |
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
   | `CORS_ALLOWED_ORIGINS` | `https://acme-salary.vercel.app` for now; fixed in step 3 |

   Do not set `PORT`; Render sets it and the app listens on it.
4. **Create Web Service.** The first build takes several minutes. When the log shows `Started SalaryApplication`,
   open `https://acme-salary-api-xawz.onrender.com/actuator/health`: it should answer `{"status":"UP"}`. Then try
   `/api/insights/countries`: three countries with about 3,300 employees each.

Why the health check path is not `/actuator/health`: that one also queries the database. Render calls the check every
few seconds, which would keep Neon awake around the clock and use up its free compute hours (see the limits below).
`/actuator/health/liveness` answers without touching the database.

**If the name is taken**, Render adds a suffix to the address. Change the new address in two places and push:
`frontend/src/environments/environment.ts` and `connect-src` in `frontend/vercel.json`. `CORS_ALLOWED_ORIGINS`
names the frontend, not the API, so it does not change.

## 3. Vercel: the frontend

1. Sign up at vercel.com with GitHub, choosing the **Hobby** plan (free, personal and non-commercial use only).
   Do not add a card.
2. **Add New, Project**, import the repository, then set:

   | Setting | Value |
   |---|---|
   | Project Name | `acme-salary` (any free name; it becomes `https://<name>.vercel.app`) |
   | Framework Preset | Angular (detected) |
   | Root Directory | `frontend` (click Edit and pick the folder) |
   | Build Command | leave the default (`npm run build`) |
   | Output Directory, Install Command | taken from `vercel.json`; leave as shown |

3. Before deploying, open **Settings, Build and Deployment, Node.js Version** (it can also be set later and
   redeployed) and choose **22.x**. Angular 21 needs Node 20.19+, 22.12+ or 24+.
4. **Deploy.** When it finishes, open the address Vercel shows: the employee list should load. If the name was taken,
   Vercel gives a different address; use the one it shows in the next step.

`vercel.json` makes every path serve the app (a reload on `/insights` or a shared link works; real files such as the
scripts are served as they are, because Vercel checks files before applying rewrites) and adds the browser security
headers. Vercel serves static files with its own caching, so no cache headers are set here.

### Back to Render: allow the Vercel address

Set `CORS_ALLOWED_ORIGINS` on the Render service to the exact address of the Vercel site: scheme included, no
trailing slash, for example `https://acme-salary.vercel.app`. Save; Render restarts the service. Several origins can
be given separated by commas. Vercel also creates preview addresses for other branches; they are not allowed unless
you list them, which is the intent.

## 4. Check that it all works

| Check | Expected |
|---|---|
| `curl -s https://acme-salary-api-xawz.onrender.com/actuator/health` | `{"status":"UP"}` |
| `curl -si "https://acme-salary-api-xawz.onrender.com/api/employees?size=1"` | `200` with `X-Content-Type-Options`, `Cache-Control: no-store` and `Content-Security-Policy` headers |
| Preflight from the site: `curl -si -X OPTIONS https://acme-salary-api-xawz.onrender.com/api/employees -H "Origin: https://acme-salary.vercel.app" -H "Access-Control-Request-Method: GET"` | `200` and `Access-Control-Allow-Origin: https://acme-salary.vercel.app` |
| Same preflight with `-H "Origin: https://evil.example"` | `403` |
| Vercel site: Employees page | 10,000 employees, filters, paging |
| Vercel site: Insights page | charts and the three tables |
| Reload on `/insights` | the page, not a 404 |
| Browser console on both pages | no red errors |

| Symptom | Likely cause |
|---|---|
| Page loads but the list shows "Could not load employees" and the console says CORS | `CORS_ALLOWED_ORIGINS` on Render does not exactly equal the site address |
| Console says a request was blocked by Content Security Policy | the API address in `environment.ts` and in `connect-src` of `frontend/vercel.json` differ |
| Render deploy fails at start with a connection or SSL error | wrong `DB_URL`, or `sslmode=require` missing, or `channel_binding` left in |
| First request after a quiet period hangs for a minute | the free API instance was asleep; see below |

## Free-tier limits and sleep behaviour

| | Render, free web service | Neon, free plan | Vercel, Hobby plan |
|---|---|---|---|
| Compute or build allowance | 750 free instance hours per month per workspace; services are suspended when they run out until next month. 500 pipeline (build) minutes a month | 100 compute-hours (CU-hours) per project per month (0.25 CU for 400 hours) | 100 deployments per day |
| Sleeps when idle? | Yes: after 15 minutes without inbound requests; waking takes about a minute and browsers see a loading page | Yes: compute suspends after 5 minutes idle and cannot be switched off; waking takes "a few hundred milliseconds" | No: static files are served always |
| Storage | Ephemeral filesystem, no persistent disk (the data is in Neon, so this does not matter) | 1 GB per project | n/a |
| Transfer | 5 GB outbound a month | 5 GB public transfer per project per month | 100 GB Fast Data Transfer and 1,000,000 CDN requests a month |
| When the allowance is gone | web services are suspended until next month; with a card on file, bandwidth is billed instead | compute suspended until next month; stored data is not deleted | the feature is blocked until 30 days have passed; no bill on Hobby |
| Other | one instance, no SSH, no edge caching, ports 25, 465 and 587 blocked | 10 branches per project | non-commercial use only; a commercial use can get the account paused |

Render also offers a free PostgreSQL, but it expires 30 days after creation, which is why the database is on Neon.

### What this means in practice

- **After 15 quiet minutes the first request is slow**, around a minute for Render to start the container, then
  a fraction of a second more while Neon wakes. Open the site once a few minutes before showing it to anyone.
- **Do not keep the service warm with constant pings to `/actuator/health`.** That endpoint queries the database,
  so Neon would never sleep: 24 hours a day on 0.25 CU is about 6 compute-hours a day, so the 100 CU-hours last about
  17 days. A ping to `/actuator/health/liveness` keeps only Render awake: an always-on instance needs about 744 of the
  750 monthly hours, which just fits.
- **Vercel has a lot of room for a static site.** The bundle is under 1 MB, so 100 GB of transfer is far more than
  this project will use, and 100 deployments a day cannot be reached by hand. Keep the account on Hobby with no card,
  so nothing can be billed.
- **No card anywhere.** Without one, Render, Neon and Vercel stop a service when its allowance runs out instead of
  charging for it.
- **The seed runs once.** If the Neon database is ever emptied, the next Render start seeds it again.

## Sources (read 2026-10-27)

- Render free instances: https://render.com/docs/free
- Render monorepo settings: https://render.com/docs/monorepo-support
- Render health checks: https://render.com/docs/health-checks
- Neon plans: https://neon.com/docs/introduction/plans
- Neon scale to zero: https://neon.com/docs/introduction/scale-to-zero
- Neon connection strings: https://neon.com/docs/connect/connect-from-any-app
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- Vercel project configuration: https://vercel.com/docs/project-configuration/vercel-json
- Vercel paused accounts: https://vercel.com/kb/guide/why-is-my-account-deployment-blocked
- Render build pipeline minutes: https://render.com/docs/build-pipeline
- Render outbound bandwidth: https://render.com/docs/outbound-bandwidth
