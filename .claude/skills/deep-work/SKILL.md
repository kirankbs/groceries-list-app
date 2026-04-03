---
name: deep-work
description: "Living Pantry autonomous build sessions with a 6-agent virtual team. Triggers on: \"deep work\", \"work autonomously\", \"build session\", \"I'm going to sleep\", \"work while I'm away\", \"keep working\", \"unattended\", \"run overnight\", \"autonomous mode\", \"/deep-work\". Also responds to standalone agent triggers: \"what should we build next\", \"update roadmap\", \"coverage audit\", \"review the flow\", \"dark mode audit\", \"audit modals\", \"implement\", \"fix bug\", \"add endpoint\", \"security audit\", \"review auth\", \"sync specs\", \"update specs\", \"run tests\", \"write tests for\"."
---

# Living Pantry Deep Work

Autonomous build sessions for the Living Pantry grocery list app. Orchestrates a 6-agent virtual team across strategy, build, and quality layers.

## Quick Reference

```
/deep-work on <area>          full autonomous session (e.g., /deep-work on offline sync)
/deep-work continue           resume from last session's handoff
/deep-work help               show usage guide (.claude/AGENTS-GUIDE.md)
```

### Standalone Agent Triggers

```
"what should we build next"       → feature-strategist
"update roadmap"                  → feature-strategist
"coverage audit"                  → feature-strategist or test-runner
"review the <flow> flow"          → ux-reviewer
"dark mode audit"                 → ux-reviewer
"audit modal interactions"        → ux-reviewer
"implement <feature>"             → implementation-lead
"fix bug: <description>"          → implementation-lead
"add endpoint for <operation>"    → implementation-lead
"security audit"                  → security-auditor
"full security audit"             → security-auditor
"review auth flow"                → security-auditor
"sync specs" / "update specs"     → spec-tracker
"full spec audit"                 → spec-tracker
"run tests"                       → test-runner
"write tests for <feature>"       → test-runner
```

## The Team

All agents are registered in `.claude/agents/`. Dispatch by name using the Agent tool.

### Strategy Layer
| Agent | Model | Job |
|-------|-------|-----|
| `feature-strategist` | sonnet | Roadmap, coverage analysis, session prioritization |
| `ux-reviewer` | opus | Flow audits, modal choreography, dark mode parity |

### Build Layer
| Agent | Model | Job |
|-------|-------|-----|
| `implementation-lead` | sonnet | Fullstack implementation in worktrees, tests |

### Quality Layer
| Agent | Model | Job |
|-------|-------|-----|
| `security-auditor` | opus | Auth, access control, IDOR, session tokens |
| `spec-tracker` | sonnet | Syncs docs/spec/ with code after changes |
| `test-runner` | sonnet | 3-layer testing, coverage audits, test writing |

## Trigger Mapping

When the user says something that matches a standalone trigger (outside a `/deep-work` session), dispatch the corresponding subagent by name using the Agent tool. Pass the user's message as context.

When chaining is requested ("security audit then sync specs"), dispatch agents sequentially, passing output of one as input to the next.

## The Loop

Each cycle follows this sequence. Run as many cycles as possible.

```
PLAN → DESIGN → IMPLEMENT → QUALITY GATE → TEST → WRAP-UP
  ↑                                                    |
  +----------------------------------------------------+
```

---

### Phase: PLAN (cycle 1 only)

Dispatch the `feature-strategist` subagent with:
- The target area from the user's arguments
- Instruction to read `.planning/feature-roadmap.md` (if it exists) + `docs/spec/*.md`
- If no roadmap exists, do a full scan and create it

**Output**: Prioritized list of what to build this session.

**Skipped in later cycles** — priorities are locked for the session.

---

### Phase: DESIGN

Consume the strategist's output. For each work item, determine:
- Which backend endpoints change (reference `docs/spec/api.md`)
- Which frontend files change (reference `docs/spec/screens.md`)
- Which data models change (reference `docs/spec/data-models.md`)
- Offline sync implications (reference `docs/spec/offline.md`)
- Auth/access control implications (reference `docs/spec/auth.md`, `docs/spec/business-logic.md`)

For UI-touching work, dispatch `ux-reviewer` on the affected flows **before** implementation starts:
- Dispatch with `scope=flow:<flow-name>` for specific flows
- Or `scope=changed-files:<list>` for targeted review
- Collect UX requirements and constraints

---

### Phase: IMPLEMENT

Dispatch `implementation-lead` as foreground subagent with:
- The work item from PLAN phase
- Design output: which files change, which patterns to follow
- UX reviewer constraints (if any)
- Instruction to work in a git worktree at `.worktrees/<branch-name>`

The agent:
1. Creates worktree: `git fetch origin && git pull origin main` then `git worktree add .worktrees/<branch> -b <branch>`
2. Reads existing patterns before writing
3. Implements backend changes in `server.py`
4. Implements frontend changes in screens/modals/context
5. Writes tests
6. Runs linters: `cd backend && flake8 server.py` and `cd frontend && yarn lint`

---

### Phase: QUALITY GATE (mandatory, parallel)

**THIS PHASE IS MANDATORY. Cannot proceed to TEST without completing it.**

Dispatch three agents in parallel:

1. **`security-auditor`** as foreground with:
   - `changed_files` = list of all files changed by implementation-lead
   - `mode=scan`

2. **`spec-tracker`** as foreground with:
   - `changed_files` = list of all files changed
   - `mode=sync`

3. **`ux-reviewer`** as background (only if frontend files changed) with:
   - `scope=changed-files:<list>`

Wait for all to complete.

**Gate checks:**
- If `security-auditor` returns FAIL (any CRITICAL finding) → fix each critical, re-dispatch security-auditor on fixed files. Block TEST until PASS.
- If `spec-tracker` updates specs → collect list of updated spec files for session report
- If `ux-reviewer` returns FAIL → fix blocking UX issues, re-dispatch ux-reviewer

**Completion gate before TEST:**
- Zero CRITICAL security findings
- Spec drift addressed (specs updated or items marked [PLANNED])
- Zero blocking UX findings

---

### Phase: TEST

Dispatch `test-runner` with:
- `changed_files` = all files modified in this cycle
- `session_phase` = `mid-session` (run Layers 1+2) or `end-of-session` (run all 3 layers)
- `mode=run`

Layer failures:
- Layer 1 (Jest) failure → fix, re-run before Layer 2
- Layer 2 (backend integration) failure → fix, re-run before proceeding
- Layer 3 (Maestro) failure at end-of-session → report failures, do not block commit

If new features were added without test coverage, dispatch `test-runner` with `mode=write` first, then `mode=run`.

---

### Phase: WRAP-UP

Step back and review:
1. Was everything in the PLAN phase built?
2. Are there open security advisories the user should know about?
3. Are there UX warnings to flag for review?
4. What is the remaining backlog?

Update `.planning/feature-roadmap.md` with session progress. Append to the session history table.

---

## Session End

When cycles complete, save session report to `.planning/session-reports/{YYYY-MM-DD}-{area}.md` and produce three deliverables:

### 1. Session Report

```markdown
## Session Report — {YYYY-MM-DD}

### Built
- [list of features/fixes implemented]
- Files changed: [list]

### Quality Gate
- Security: PASS | FAIL with {N advisory items}
  - [list any CRITICAL findings that were fixed]
  - [list advisory items]
- Spec tracker: [N spec files updated]
  - [list which specs changed and what was updated]
- UX review: PASS | WARN with [N warnings]
  - [list warnings for review]

### Test Results
- Jest unit tests: {N}/{N} passing
- Backend integration: PASS | FAIL
- Maestro E2E: {N}/{N} passing | SKIPPED

### Ready to commit
\`\`\`
cd .worktrees/<branch>
git add <files>
git commit -m "<message>"
git push origin <branch>
\`\`\`
```

### 2. Action Items

```markdown
## Action Items

### Decisions Needed
1. [SECURITY] {advisory item needing a decision}
2. [UX] {UX warning to review}
3. [ARCH] {architectural decision, if any}

### Open Questions
- {anything requiring product/design input}
```

### 3. Next Session Brief

```markdown
## Next Session

### Command
/deep-work continue {area}

### Context
- Last session: {summary}
- Remaining backlog: {what's next, in priority order}
- Open advisory items: {list}

### Ready to start
- Roadmap updated at .planning/feature-roadmap.md
- Last session report at .planning/session-reports/{date}-{area}.md
```

---

## Project Context

- **Stack**: Expo React Native (SDK 54) + FastAPI (Python 3.11+) + MongoDB (Motor async)
- **Backend**: single file `backend/server.py` — all routes, models, helpers
- **Frontend**: `frontend/app/index.tsx` (modal state), `frontend/app/screens/*.tsx` (4 screens), `frontend/components/modals/*.tsx` (14+ modals), `frontend/contexts/AuthContext.tsx` (central state)
- **Specs**: `docs/spec/*.md` — 14 files, source of truth for design intent
- **Tests**: `backend_test.py` (integration), `frontend/__tests__/` (28 Jest tests), `maestro/flows/` (4 E2E flows)
- **CI**: `.github/workflows/ci.yml` — Layer 1 + 2 on every PR
- **No git push** — always provide git commands for the user to run
- **Worktrees**: `.worktrees/` directory, already gitignored
- **Key terminology**: Workspace (code) = Household (UI)
