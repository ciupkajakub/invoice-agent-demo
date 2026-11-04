# Invoice calculator

A small invoice calculator: line items, a VAT rate, and net, VAT and gross totals. It exists to demo a coding agent that takes work from a Slack thread and opens a pull request.

```bash
npm test
npm start   # http://localhost:3000
```

Requires Node 24. No dependencies.

## Set up your own Slack agent

[`setup-prompt.md`](setup-prompt.md) sets up a basic team agent like the one that works on this repo: a Hermes Agent people tag in a Slack thread, which opens a pull request for a human to review. Copy the whole file (the **Copy raw file** button above it) into Claude Code, Codex or another coding agent on the machine that will host the agent.

You need a Slack workspace, a GitHub repo and access to an AI model (a ChatGPT plan or an API key). The prompt walks you through the rest in about 1.5 hours and ends with seven acceptance tests. [What the setup prompt does](docs/setup-details.md) explains each stage, the configuration it writes and the guardrails for the setup agent.

## Support

For support, contact [help@example.test](mailto:help@example.test).
