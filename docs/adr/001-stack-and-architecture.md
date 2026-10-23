# ADR 001: Stack and architecture

**Status:** Accepted

## Context
Java/Angular role; a small, well-tested app for one HR user. The brief rewards good judgement over complexity.

## Decision
- Backend: Java 17, Spring Boot 3, Spring Data JPA, Maven.
- Layered MVC, packaged by feature: controller -> service -> repository -> database. DTO records at the API boundary; Bean Validation; one `@ControllerAdvice` for errors.
- Frontend: Angular (standalone components, signals) with Angular Material.
- Monorepo: `backend/`, `frontend/`, `docs/`.

## Alternatives considered
- Hexagonal/CQRS: rejected - extra structure with no benefit for four small use cases (YAGNI).
- Gradle: equivalent; Maven is already installed and simpler and familiar to use.
- React: the role specifies Angular.

## Consequences
Familiar structure any reviewer can navigate; each layer is testable in isolation. Business logic stays in services, so it can move behind a different API later.
