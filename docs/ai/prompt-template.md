# Prompt Template (used for every AI-assisted step)

Every prompt in this project follows the same structure so results are reproducible and reviewable.

```
## Context
What exists already (module, files, decisions). Link relevant ADRs / requirements IDs (e.g. BF-2).

## Task
One small, single-purpose outcome. (One commit's worth of work.)

## Constraints
- Stack/conventions: Java 17, Spring Boot 3, layered (controller -> service -> repository), DTO records, BigDecimal for money.
- Do NOT: add features outside docs/requirements.md, introduce new dependencies without asking, over-engineer.
- Match existing code style and naming.

## Process (TDD)
1. Write failing tests first, show them, and run them (expect RED).
2. Implement the minimum to pass (GREEN).
3. Refactor without changing behaviour; tests stay green.

## Acceptance criteria
Bullet list of observable behaviours / edge cases the tests must cover.

## Output format
Files changed, test results, and a short rationale for any trade-off.
```

## Prompt Log entry format (append to `docs/ai/prompt-log.md` after each step)

```
### <step no.> <short title>  (commit: <hash or message>)
**Prompt:** <the prompt, or link to the file>
**AI output:** <what it produced, 1-2 lines>
**My review:** <what I checked, what I changed or rejected, and why>
**Result:** <tests passing, behaviour verified>
```

Rule of thumb: the "My review" line is the most valuable part - it shows judgement, not just tool use.
