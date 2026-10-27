# ADR 004: Deployment topology

**Status:** Accepted (verify free-tier terms at sign-up)

## Decision
Same repo, two independently deployed parts:
- Backend: Docker image on Render (free web service).
- Database: Neon PostgreSQL (free tier).
- Frontend: static Angular build on Vercel (Hobby). Netlify was the first choice but its account was suspended on sign-up,
  so the routing rewrite and security headers moved from `_redirects`/`_headers` to `frontend/vercel.json`.
Configuration through environment variables (DB URL, allowed CORS origin, API base URL); no secrets in the repo.

## Alternatives considered
- AWS: more setup and billing risk than this prototype needs.
- Bundling Angular into the Spring Boot jar: one service and no CORS, but couples the two parts.

## Consequences
Free tier cold-starts the backend after inactivity; documented in the README. CORS must allow the frontend origin.
