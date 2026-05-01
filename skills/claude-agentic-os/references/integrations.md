# Integrations

Integrations extend the agentic OS into external systems. Each integration is wired up via an MCP (Model Context Protocol) server, which exposes tools that Claude can call directly — no manual copy-paste or context switching required.

---

## How Integrations Work

Claude Code discovers MCP servers via the `.mcp.json` file in the repository root (or user-level config). Each server entry exposes a set of tools that Claude can invoke as part of any skill or workflow.

**Basic `.mcp.json` structure:**

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@scope/mcp-server-name"],
      "env": {
        "API_KEY": "${ENV_VAR_NAME}"
      }
    }
  }
}
```

After adding a server, restart Claude Code and verify the tools are available by asking: "What tools do you have access to from the `server-name` MCP server?"

---

## Google Workspace

Google Workspace integration brings Docs, Sheets, Gmail, Calendar, and Drive into the agentic OS. Use cases include drafting documents, reading spreadsheet data, scheduling from Claude, and filing research into Drive.

### Setup

1. Install the Google Workspace MCP server:
   ```bash
   npx -y @google/workspace-mcp-server setup
   ```
2. Add to `.mcp.json`:
   ```json
   {
     "mcpServers": {
       "google-workspace": {
         "command": "npx",
         "args": ["-y", "@google/workspace-mcp-server"],
         "env": {
           "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
           "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}"
         }
       }
     }
   }
   ```
3. Authenticate: follow the OAuth flow the server prompts on first run.

### Common Workflows

**Drafting a document from a skill output:**
```
Run the /draft skill for a product spec, then create a new Google Doc titled
"Product Spec — <feature name>" in the Projects folder with the output.
```

**Reading a planning spreadsheet:**
```
Read the "Q2 Roadmap" sheet from the team Drive and summarize the items
marked as "In Progress".
```

**Calendar awareness:**
```
Check my calendar for today and list any meetings I need to prepare for,
then add relevant context from CLAUDE.md to my prep notes.
```

---

## NotebookLM / Research Tools

For research-heavy workflows, integrate a research tool that can ingest sources and answer questions grounded in those sources. NotebookLM works well as the dedicated research layer.

### Pattern: Source-Grounded Research

1. Upload sources (PDFs, web pages, notes) to a NotebookLM notebook for a research topic.
2. Use the NotebookLM interface to generate a source summary and key questions.
3. Export the summary to the Obsidian vault or a Google Doc.
4. Reference the summary in `CLAUDE.md` so future sessions can use it without re-reading the raw sources.

### Pattern: Iterative Research Loop

```
1. Identify the research question.
2. Ask Claude to search for relevant sources and outline what is known.
3. Upload the identified sources to NotebookLM.
4. Ask NotebookLM to answer the research question with citations.
5. Store the grounded answer in vault/research/<topic>.md.
6. Return to Claude Code to use the research output in a skill workflow.
```

### MCP-Based Research Tools

Some research MCP servers provide direct search and retrieval:

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
```

Use search tools for current-information queries. Use NotebookLM for deep, source-grounded analysis of a fixed document set.

---

## Slack

Slack integration enables Claude to read channel history, post updates, and receive workflow triggers from team activity.

### Setup

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
      }
    }
  }
}
```

### Common Workflows

**Daily standup from Slack:**
```
Read the #standup channel for the last 24 hours and summarize what the team
shipped. Add blockers to CLAUDE.md as open questions.
```

**Post a deployment summary:**
```
After deploying, post a 3-bullet summary of what shipped to #deploys.
```

---

## GitHub

GitHub integration enables Claude to read issues, review PRs, check CI status, and create branches — all without leaving the agentic OS.

### Setup

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Common Workflows

**Triage open issues:**
```
List open issues in the repository, group them by label, and add the top 3
priority items to CLAUDE.md as current goals.
```

**PR review skill integration:**
```
When the /review skill runs, also fetch the PR diff from GitHub and include
it in the review context.
```

---

## Firebase

Firebase integration is covered in depth by the `firebase-basics` skill pack. See that skill for full setup and workflow guidance.

For the agentic OS context, the key integration point is the Firebase MCP server:

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "experimental:mcp"]
    }
  }
}
```

---

## Adding a New Integration

When adding any new integration to the agentic OS:

1. Find or build an MCP server that exposes the external system's API as tools.
2. Add the server entry to `.mcp.json` with required environment variables.
3. Store secret values in environment variables, never in `.mcp.json` directly.
4. Add a smoke-test workflow to `DASHBOARD.md` (e.g., `/health-check` runs a read operation against each integration).
5. Document the integration and its intended use cases in `CLAUDE.md` under the **Integrations** section.
6. Consider building a dedicated skill if the integration has a complex multi-step workflow.

---

## Integration Anti-Patterns

- **Chaining integrations without a memory checkpoint**: If a workflow touches three external systems, store intermediate outputs in the vault or `CLAUDE.md`. If the workflow fails mid-way, the checkpoint allows resumption without re-running completed steps.
- **Using integrations for everything**: Not every external lookup needs an MCP tool. Simple, infrequent lookups are fine as manual steps. Invest in integration only for workflows you repeat often.
- **Storing credentials in config files**: Always use environment variables. Never commit API keys, tokens, or secrets to `.mcp.json` or `CLAUDE.md`.
