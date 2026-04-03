# Living Pantry Virtual Team — Usage Guide

## Quick Start

### Full autonomous session (the whole team)
```
/deep-work on <area>          # e.g., /deep-work on offline sync
/deep-work continue           # pick up from last session's handoff
```

### Talk to individual agents
```
"what should we build next"       # feature-strategist
"review the add item flow"        # ux-reviewer
"implement the pantry feature"    # implementation-lead
"security audit"                  # security-auditor
"sync specs"                      # spec-tracker
"run tests"                       # test-runner
```

---

## The Team (6 agents)

### Strategy Layer — decide what to build
| Agent | Role | Model | When to use |
|-------|------|-------|-------------|
| `feature-strategist` | Product manager, roadmap maintainer | Sonnet | Starting a session, "what's next", coverage audit |
| `ux-reviewer` | Senior mobile UX designer | Opus | Reviewing flows, auditing modals, dark mode check |

### Build Layer — create the product
| Agent | Role | Model | When to use |
|-------|------|-------|-------------|
| `implementation-lead` | Staff fullstack engineer | Sonnet | Building features, adding endpoints, fixing bugs |

### Quality Layer — validate what's built
| Agent | Role | Model | When to use |
|-------|------|-------|-------------|
| `security-auditor` | AppSec specialist | Opus | After code changes, before merging, full security audit |
| `spec-tracker` | Technical writer | Sonnet | After any code change to sync docs/spec/ with code |
| `test-runner` | QA engineer | Sonnet | After implementation, coverage audits, writing new tests |

---

## Deep Work Session Flow

```
PLAN → DESIGN → IMPLEMENT → QUALITY GATE → TEST → WRAP-UP
  ↑                                                    |
  +----------------------------------------------------+
```

- **PLAN (cycle 1)**: feature-strategist sets session priorities
- **DESIGN**: ux-reviewer audits affected flows before implementation starts
- **IMPLEMENT**: implementation-lead builds in a git worktree
- **QUALITY GATE (mandatory, parallel)**: security-auditor + spec-tracker + ux-reviewer run simultaneously. CRITICAL findings block TEST.
- **TEST**: test-runner runs 3-layer test strategy. Layer failures block subsequent layers.
- **WRAP-UP**: Session Report + Action Items + Next Session Brief. Roadmap updated.

---

## Session Output

Every autonomous session ends with three deliverables:

### 1. Session Report
What was built, files changed, test results, security findings, spec updates, git commands.

### 2. Action Items
Security advisory items, UX findings to review, architectural decisions needing your input.

### 3. Next Session Brief
Ready-to-paste command + full context for next session. No re-reading needed.

---

## All Triggers

### Strategy Layer
| You say | Agent | What happens |
|---------|-------|-------------|
| "what should we build next" | feature-strategist | Scans specs + tests, returns prioritized backlog |
| "update roadmap" | feature-strategist | Refreshes .planning/feature-roadmap.md |
| "coverage audit" | feature-strategist | Cross-references all 14 specs with test coverage |
| "what's missing from specs" | feature-strategist | Gap analysis only |

### UX Layer
| You say | Agent | What happens |
|---------|-------|-------------|
| "review the add item flow" | ux-reviewer | Traces the full add-item user flow |
| "audit all modal interactions" | ux-reviewer | Reviews all 14+ modals for choreography issues |
| "dark mode audit" | ux-reviewer | Checks every screen for dark mode parity |
| "review UX for <screen>" | ux-reviewer | Screen-specific flow and state audit |
| "check empty states" | ux-reviewer | Audits loading/error/empty state coverage |

### Build Layer
| You say | Agent | What happens |
|---------|-------|-------------|
| "implement <feature>" | implementation-lead | Builds from spec in a worktree |
| "fix bug: <description>" | implementation-lead | Debugs and fixes |
| "add endpoint for <operation>" | implementation-lead | Adds backend route + frontend call |
| "add modal for <feature>" | implementation-lead | Creates new modal component + wires up |

### Quality Layer
| You say | Agent | What happens |
|---------|-------|-------------|
| "security audit" | security-auditor | Scans changed files for auth/access issues |
| "full security audit" | security-auditor | Full codebase security audit |
| "review auth flow" | security-auditor | Focused audit of auth + session + password reset |
| "sync specs" / "update specs" | spec-tracker | Diffs code vs docs/spec/, updates stale sections |
| "full spec audit" | spec-tracker | Audits all 14 spec files against codebase |
| "run tests" | test-runner | Runs Layer 1 + 2 (or all 3 at end of session) |
| "coverage audit" | test-runner | Reports all untested endpoints and modules |
| "write tests for <feature>" | test-runner | Writes backend_test.py + Jest tests |

### Chaining
```
"security audit then sync specs"               → security-auditor then spec-tracker
"implement X and run tests after"              → implementation-lead then test-runner
"what should we build next, then build it"     → feature-strategist then implementation-lead
```

---

## Key Files

| File | Purpose |
|------|---------|
| `.planning/feature-roadmap.md` | Living priorities (feature-strategist maintains) |
| `.planning/session-reports/` | Historical session reports |
| `docs/spec/*.md` | 14 spec files — source of truth for design intent |
| `backend/server.py` | Entire backend (routes, models, helpers) |
| `frontend/contexts/AuthContext.tsx` | All frontend state + API calls |
| `backend_test.py` | Backend integration tests |
| `.claude/agents/*.md` | Agent definitions (6 files) |
| `.claude/skills/deep-work/SKILL.md` | Orchestration logic |

---

## Tips

- **Starting fresh?** Say "what should we build next" — the strategist scans specs + tests and gives a prioritized list
- **Short on time?** Say "security audit" or "sync specs" — targeted quality agents run without building anything
- **Want it all?** Say `/deep-work on <area>` — the full team activates autonomously
- **Before merging?** Always run security-auditor + spec-tracker + test-runner — the quality gate
- **Resume where you left off?** The "Next Session Brief" at the end of every session gives an exact command to paste
