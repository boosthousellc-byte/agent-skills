# Skill Packs

Skill packs are the core unit of repeatable work in the agentic OS. A skill is a Markdown file that encodes a workflow — setup steps, principles, decision rules, and references — so Claude can execute it consistently across sessions without being re-prompted from scratch each time.

---

## Installing Existing Skill Packs

### Via Agent Skills CLI (recommended)

```bash
# Install a published skill pack by source
npx skills add firebase/skills

# Install from a local directory
npx skills add /path/to/local/skills

# Update installed skills
npx skills experimental_install
```

### Via Claude Plugin

```bash
# Add a marketplace and install a plugin
claude plugin marketplace add firebase/skills
claude plugin install firebase@firebase
```

### Manually

Copy the skill's `SKILL.md` (and any `references/` folder) into the appropriate directory for your agent tool:

| Tool | Location |
|---|---|
| Cursor | `.cursor/rules/` |
| Windsurf | `.windsurfrules/` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Claude Code | `CLAUDE.md` or a skill registry |

---

## Authoring a Custom Skill

Create a new directory under `skills/` with a `SKILL.md` file. The file uses YAML frontmatter followed by Markdown content.

### Frontmatter

```yaml
---
name: my-skill-name
description: >
  One or two sentences describing when to use this skill and what it does.
  The description is what the agent reads to decide whether to invoke the skill,
  so make it specific about the trigger condition ("use this when...").
---
```

**Tips for writing good descriptions:**
- State the trigger condition explicitly: "Use this skill when the user asks to deploy to production."
- Include the domain: "...for any task involving the Stripe API..."
- Avoid vague descriptions like "A skill for doing things" — they won't trigger correctly.

### Skill Body

Structure the body to match how a human expert would think through the task:

```markdown
# Prerequisites
Steps that must be true before the skill can proceed. Checks to run,
credentials to verify, environment state to confirm.

# Workflow
Step-by-step instructions for executing the core task.
Use numbered lists for sequential steps.
Use conditional blocks ("If X, do Y; otherwise do Z") for branching logic.

# Principles
Non-negotiable rules and best practices that apply throughout the skill.
These prevent common mistakes.

# Common Issues
Known failure modes and their fixes. Include specific error messages
and their resolutions where possible.

# References
Links to deeper reference files for tasks that need more detail.
```

### Reference Files

For skills that cover large domains, break detail out into `references/` subdirectories:

```
skills/my-skill/
  SKILL.md              # Entry point — overview, workflow, principles
  references/
    setup.md            # Detailed setup steps
    api-reference.md    # API signatures, options, examples
    troubleshooting.md  # Extended error catalog
    examples.md         # Worked examples
```

Reference files are read on demand — link to them from `SKILL.md` rather than inlining everything. This keeps the main skill file concise and lets Claude load detail only when needed.

---

## Skill Design Patterns

### Trigger-Action Pattern

Write the description as a trigger condition. The agent reads the description to decide when to invoke the skill.

```yaml
description: >
  Use this skill whenever the user mentions deploying, shipping, or going to
  production. It enforces the pre-deploy checklist and selects the correct
  deployment target based on the active branch.
```

### Checklist Pattern

For setup or onboarding tasks, use a numbered checklist with verification steps:

```markdown
# Setup
1. Run `tool --version` to confirm the CLI is installed.
2. Run `tool auth status` to confirm you are authenticated.
3. If either check fails, see [references/setup.md](references/setup.md).
```

### Decision Tree Pattern

For skills that branch based on context:

```markdown
# Deployment Target
- If the current branch is `main`: deploy to production using `deploy --env prod`.
- If the branch is `staging`: deploy to staging using `deploy --env staging`.
- Otherwise: ask the user which environment they intend to target before proceeding.
```

### Red Team Pattern

For auditing or review skills, adopt a skeptical adversarial posture:

```markdown
# Audit Mode
You are a security auditor. Do not assume correctness because something looks
reasonable. Actively look for the flaw. Check every assumption.
```

---

## Skill Token Budget

Skill files are loaded into context at invocation time. Keep them lean:

| File type | Recommended max |
|---|---|
| `SKILL.md` | ~500 tokens |
| Individual reference file | ~800 tokens |
| Total skill pack (all files) | ~3,000 tokens |

Use the `scripts/skill-token-counter` tool in this repository to measure a skill's token footprint:

```bash
node scripts/skill-token-counter/index.js skills/my-skill/SKILL.md
```

---

## Testing a New Skill

1. Install the skill into a test project.
2. Start a fresh Claude Code session (no accumulated context from prior work).
3. Give a task that should trigger the skill and verify Claude invokes it.
4. Walk through the full workflow once and note any steps that are ambiguous or produce incorrect results.
5. Revise the skill and re-test until the workflow runs cleanly from a cold start.

---

## Sharing Skills

Skills are plain Markdown — they can be committed to any repository and shared via:

- GitHub repositories (public or private)
- Agent Skills marketplace (`agentskills.io`)
- Internal team wikis or knowledge bases
- Package managers (skills registry via `npx skills`)
