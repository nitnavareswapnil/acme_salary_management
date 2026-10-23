# ADR 004: Deployment topology

**Status:** Accepted (verify free-tier terms at sign-up)

## Decision
Same repo, two independently deployed parts:
- Backend: Docker image on Render (free web service).
- Database: Neon PostgreSQL (free tier).
- Frontend: static Angular build on Netlify or Vercel.
Configuration through environment variables (DB URL, allowed CORS origin, API base URL); no secrets in the repo.

## Alternatives considered
- AWS: more setup and billing risk than this prototype needs.
- Bundling Angular into the Spring Boot jar: one service and no CORS, but couples the two parts.

## Consequences
Free tier cold-starts the backend after inactivity; documented in the README. CORS must allow the frontend origin.
