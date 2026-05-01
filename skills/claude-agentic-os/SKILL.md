---
name: claude-agentic-os
description: A modular framework for assembling a personalized AI workflow environment around Claude Code. Use this skill when a user wants to set up, extend, or reason about their agentic OS — combining a memory layer, custom skill packs, repeatable automations, and a one-click dashboard into a single operating layer.
---

# Overview

The Claude Code Agentic OS is not a single product — it is a pattern for assembling a personalized, observable, and extensible AI workflow environment. It has four core components that work together:

| Component | Role |
|---|---|
| **Claude Code** | The execution core — runs skills, tools, and automations |
| **Memory Layer** | Persistent context store (e.g., Obsidian vault, CLAUDE.md files) |
| **Skill Packs** | Modular instruction sets that encode repeatable workflows |
| **Dashboard** | One-click surface that exposes skills and gauges to the user |

The goal is a system that can **store context across sessions**, **run repeatable workflows on demand**, and **adapt to how each individual user works** — rather than forcing users to adapt to the tool.

---

# Setup Checklist

Work through these steps once to establish the OS foundation. Record completed steps in the project's `CLAUDE.md` so future sessions skip them.

## 1. Establish the Memory Layer

The memory layer gives Claude persistent context between sessions. Without it, each session starts cold.

- Choose a memory backend. Obsidian is the recommended default (local vault, plain markdown, easy to inspect). See [references/memory-layer.md](references/memory-layer.md) for setup.
- Create or update the project `CLAUDE.md` with the current project state, active goals, and preferred working style.
- Verify the memory layer is reachable: ask Claude to read back a stored note and confirm it reflects recent work.

## 2. Install Skill Packs

Skill packs are the "apps" of the agentic OS. Each skill encodes a workflow that Claude can execute consistently.

- Identify which domains the user works in (Firebase, Google Workspace, research, content creation, etc.).
- Install the matching skill packs using the Agent Skills CLI or manually. See [references/skill-packs.md](references/skill-packs.md).
- For custom workflows not covered by existing skills, build a new skill following the authoring guide in [references/skill-packs.md](references/skill-packs.md).

## 3. Wire Up Integrations

Integrations extend Claude's reach into external systems via MCP servers and APIs.

- Review [references/integrations.md](references/integrations.md) for integration recipes covering Google Workspace, research tools, and content pipelines.
- Add required MCP server entries to `.mcp.json` for any integrations the user needs.
- Confirm each integration by running a smoke-test task (e.g., list Google Drive files, fetch a calendar event).

## 4. Configure the Dashboard

The dashboard turns skills and automations into one-click tools.

- Define the user's most frequent tasks as named automations or Claude Code hooks.
- Build a `DASHBOARD.md` in the project root that lists available one-click commands, their shortcuts, and what each does. See [references/dashboard.md](references/dashboard.md).
- Optionally configure usage gauges so the user can observe token consumption, session frequency, and workflow coverage.

---

# Core Principles

1. **Vault-first context**: Always read the memory layer at session start before doing any substantive work. A cold start without context produces generic, lower-quality results.
2. **Skills over prompts**: Encode any workflow you repeat more than twice into a skill. Ad-hoc prompts drift; skills stay consistent.
3. **Observability over magic**: Every automation should have a visible trace — a log entry, a dashboard update, or a vault note — so the user can inspect and audit what ran.
4. **Incremental adoption**: Do not try to set up all four components at once. Start with the memory layer and one skill pack. Add components as they become useful.
5. **Customization is a feature**: There is no "correct" agentic OS. The value comes from adapting the system to the user's actual workflow, not from following a prescribed configuration.

---

# References

- **Memory Layer**: See [references/memory-layer.md](references/memory-layer.md) for Obsidian vault structure, CLAUDE.md conventions, and cross-session context patterns.
- **Skill Packs**: See [references/skill-packs.md](references/skill-packs.md) for how to install, author, and test custom skills.
- **Dashboard**: See [references/dashboard.md](references/dashboard.md) for one-click automation setup, hooks configuration, and usage gauges.
- **Integrations**: See [references/integrations.md](references/integrations.md) for Google Workspace, Notebook LLM, and other integration recipes.
