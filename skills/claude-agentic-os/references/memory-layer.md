# Memory Layer

The memory layer gives Claude persistent context between sessions. Without it, every session starts from zero — the AI has no knowledge of past decisions, active goals, preferred patterns, or project state.

---

## Why a Memory Layer Matters

Claude Code has a large context window within a session, but nothing carries over automatically. The memory layer is a human-readable, file-based store that Claude reads at session start to reconstruct relevant context. It serves three purposes:

1. **Project state** — what has been built, what is in progress, what decisions were made and why.
2. **User preferences** — working style, code conventions, communication tone, recurring shortcuts.
3. **Workflow history** — which skills ran, what outputs were produced, what the next step is.

---

## Option 1: CLAUDE.md (Recommended Minimum)

Every project should have a `CLAUDE.md` file in the repository root. Claude Code reads this file automatically at session start.

**Recommended structure:**

```markdown
# Project: <name>

## Current State
- What is built and working
- What is in progress
- Blockers or open questions

## Goals
- Short-term (this session / this week)
- Longer-term milestones

## Decisions
- Key architectural or workflow decisions and their rationale
- "We chose X over Y because..."

## Preferences
- Code style, naming conventions, preferred libraries
- Communication preferences (concise vs. detailed explanations)
- Automation triggers ("always run tests before committing")

## Active Skill Packs
- List of installed skills and their purpose

## Integrations
- Connected MCP servers and what they provide
```

Keep `CLAUDE.md` short and current. Stale context is worse than no context because it misleads without signaling its own staleness. Archive old entries by moving them to a `CLAUDE.archive.md` file rather than deleting them.

---

## Option 2: Obsidian Vault

Obsidian is a local, Markdown-based knowledge base that works well as a memory layer for power users who want richer organization, linking, and search.

### Recommended Vault Structure

```
vault/
  daily/           # Daily notes — session logs, decisions, ideas
    2026-05-01.md
  projects/        # One note per project or client
    project-name.md
  skills/          # Notes about custom workflows and skill configurations
  context/         # Standing context that feeds into CLAUDE.md
    preferences.md
    conventions.md
  archive/         # Completed projects and superseded notes
```

### Connecting Obsidian to Claude Code

1. Point the vault to a directory inside (or alongside) your working repository.
2. At the start of each session, ask Claude to read the relevant daily note and project note:
   ```
   Read vault/daily/2026-05-01.md and vault/projects/my-project.md to load context.
   ```
3. At session end, ask Claude to write a brief session summary to today's daily note:
   ```
   Write a 3-bullet session summary to vault/daily/2026-05-01.md.
   ```

### Linking Vault Notes to CLAUDE.md

Keep `CLAUDE.md` as a short index that points into the vault for details:

```markdown
## Memory Layer
Full context lives in vault/projects/my-project.md and vault/daily/.
Last updated: 2026-05-01
```

---

## Option 3: Distributed CLAUDE.md Files

For monorepos or multi-component projects, use a hierarchy of `CLAUDE.md` files:

```
CLAUDE.md              # Root — project-wide context
backend/CLAUDE.md      # Backend-specific state and conventions
frontend/CLAUDE.md     # Frontend-specific state and conventions
infra/CLAUDE.md        # Infrastructure context
```

Claude Code reads the root `CLAUDE.md` and any `CLAUDE.md` it finds as it navigates into subdirectories.

---

## Session Start Pattern

Establish a consistent session-start ritual to warm up the context:

1. Ask Claude to read `CLAUDE.md` (or the vault notes for the current project).
2. Ask Claude to summarize the current project state in 3 bullets.
3. Confirm or correct the summary before beginning work.

This takes 30 seconds and significantly improves the quality and relevance of the session.

---

## Session End Pattern

Before closing a session, record what happened:

1. Ask Claude to update `CLAUDE.md` with any new decisions, completed tasks, or changed state.
2. If using Obsidian, append a session note to today's daily file.
3. Commit the updated `CLAUDE.md` alongside any code changes so memory and code stay in sync.

---

## What NOT to Store in the Memory Layer

- Secrets, API keys, or credentials — use environment variables or a secrets manager.
- Large binary files or generated artifacts — these belong in the build output or a dedicated store.
- Exhaustive logs or raw AI outputs — summarize to the essential decisions and outcomes only.
- Anything that changes every session without affecting future work — ephemeral outputs add noise.
