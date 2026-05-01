# Dashboard

The dashboard is the control surface of the agentic OS. It turns frequently-used skills and automations into named, one-click commands — so users can invoke complex workflows without remembering prompts, flags, or multi-step sequences.

---

## What a Dashboard Is (and Isn't)

In the agentic OS, a "dashboard" is not a web UI. It is a combination of:

1. **A `DASHBOARD.md` file** — a human-readable index of available one-click commands.
2. **Claude Code hooks** — shell commands that fire automatically on specific events (session start, pre-commit, file save, etc.).
3. **Named automations** — short prompts or slash commands wired to specific skills.
4. **Usage gauges** — lightweight metrics that let users observe their own workflow patterns.

The goal is observability and repeatability: every common task should have a name, a trigger, and a visible trace.

---

## DASHBOARD.md

Create a `DASHBOARD.md` file in the repository root. This file serves as the user's command reference — a single place to see every available one-click operation.

### Template

```markdown
# Agentic OS Dashboard

## Daily Workflow
| Command | What It Does |
|---|---|
| `/start-day` | Load memory layer, summarize project state, list today's goals |
| `/end-day` | Update CLAUDE.md, write session summary to vault, stage changes |
| `/focus <task>` | Set a focused task context; suppress unrelated suggestions |

## Development
| Command | What It Does |
|---|---|
| `/review` | Run the code review skill on staged changes |
| `/security-check` | Run the security review skill on the current branch |
| `/deploy-staging` | Run the staging deployment workflow |
| `/deploy-prod` | Run the production deployment checklist and deploy |

## Research & Content
| Command | What It Does |
|---|---|
| `/research <topic>` | Run a structured research workflow and store notes in vault |
| `/draft <type>` | Generate a content draft using the content creation skill |
| `/summarize` | Summarize the current document or the last N messages |

## Maintenance
| Command | What It Does |
|---|---|
| `/update-skills` | Check for and install skill pack updates |
| `/health-check` | Verify all integrations are connected and responding |
| `/usage` | Show token usage and session frequency for the current period |

## Gauges
- **Sessions this week**: tracked in vault/daily/
- **Skills invoked**: tracked in CLAUDE.md → Activity Log
- **Token budget**: visible via `/usage`
```

Customize this table to match the actual skills and automations installed in the user's environment.

---

## Claude Code Hooks

Hooks are shell commands that Claude Code runs automatically in response to events. They are configured in `.claude/settings.json`.

### Common Hook Patterns

#### Session Start Hook — Load Memory

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "cat CLAUDE.md"
          }
        ]
      }
    ]
  }
}
```

This surfaces `CLAUDE.md` at session start so Claude loads project context without being asked.

#### Pre-Commit Hook — Enforce Checklist

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Running pre-commit checks...'"
          }
        ]
      }
    ]
  }
}
```

#### Post-Task Hook — Update Memory

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Session complete. Remember to update CLAUDE.md.'"
          }
        ]
      }
    ]
  }
}
```

Configure hooks via the `update-config` skill or by editing `.claude/settings.json` directly.

---

## Named Automations

Named automations map short commands to full skill workflows. In Claude Code, these are typically defined as custom slash commands in `.claude/commands/`.

### Creating a Custom Slash Command

Create a Markdown file in `.claude/commands/`:

```
.claude/commands/
  start-day.md
  end-day.md
  research.md
  deploy-staging.md
```

Each file is a prompt template that Claude executes when the command is invoked.

**Example: `.claude/commands/start-day.md`**

```markdown
Load my agentic OS context for the day:

1. Read CLAUDE.md and summarize the current project state in 3 bullets.
2. List today's goals if any are recorded.
3. Check if any integrations need attention (run /health-check if needed).
4. Ask me what I want to focus on today.
```

**Example: `.claude/commands/end-day.md`**

```markdown
Wrap up the session:

1. Summarize what was accomplished in 3-5 bullets.
2. Update CLAUDE.md with any new decisions, completed tasks, or changed state.
3. If vault/ exists, append a session note to vault/daily/<today's date>.md.
4. List any open questions or blockers to address next session.
```

---

## Usage Gauges

Gauges give users visibility into their own workflow. They do not require external tooling — a simple activity log in `CLAUDE.md` is sufficient to start.

### Activity Log in CLAUDE.md

Add an activity section to `CLAUDE.md`:

```markdown
## Activity Log
| Date | Skills Used | Notes |
|---|---|---|
| 2026-05-01 | firebase-basics, security-review | Deployed to staging |
| 2026-04-30 | research, draft | Wrote product spec |
```

Ask Claude to append a row at session end.

### Token Usage Awareness

Claude Code reports token usage per session. To surface this in the dashboard:

1. After significant tasks, note the token cost in the activity log.
2. Over time, identify which workflows are token-heavy and consider optimizing them (shorter prompts, smaller reference files, more targeted skill invocations).

### Session Frequency

Track session dates in the activity log. A pattern of daily sessions with logged outcomes is a signal that the agentic OS is providing value. Gaps or sessions with no logged output may indicate friction worth investigating.

---

## Choosing Usage Windows

Different users need different granularity of observation:

| Usage Window | Best For |
|---|---|
| Per-session log in `CLAUDE.md` | Most users — low overhead, always visible |
| Daily note in Obsidian vault | Power users — richer history, linkable |
| Weekly summary in `CLAUDE.md` | Managers or operators — high-level overview |
| Per-task token tracking | Optimizers building cost-sensitive pipelines |

Start with per-session logging. Add finer granularity only when the user wants to optimize a specific workflow.
