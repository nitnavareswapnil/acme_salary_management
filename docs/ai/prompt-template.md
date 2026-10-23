# Prompt Template

Constraints (stack, layering, no over-engineering, no new dependencies, match existing style) and the TDD process (RED, GREEN, refactor, show failing tests first) live in `CLAUDE.md`, which is loaded in every session. Prompts therefore state only what is specific to the step.

```
Step <n>: <one-line task>   (one commit's worth)
Context: <files / ADRs / requirement IDs this builds on>
Acceptance: <observable behaviours and edge cases the tests must cover>
```

## Prompt log entry (`docs/ai/prompt-log.md`)

```
### <n> <title>  (commit: <message>)
**Prompt:** <step number in the plan, plus any deviation>
**My review:** <what I checked, changed or rejected, and why>
**Result:** <tests passing, behaviour verified>
```

The "My review" line is the valuable part: it shows judgement, not just tool use.
