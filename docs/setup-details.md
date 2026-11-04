# What the setup prompt does

[The setup prompt](https://gist.github.com/ciupkajakub/4b6373f731b70d0a5f16677d09cdc186) sets up a team agent in Slack. This page is for technical readers who want to know what it changes before they run it. The prompt takes about an hour and a half, in eight stages:

1. **Check the machine.** Git, the GitHub CLI, version managers, and whether the machine sleeps.
2. **Install Hermes and connect a model.** The installer runs without its own wizard, and you log in with the plan you already pay for.
3. **Give the agent its own GitHub account.** It gets write access to one repo, a token, and a separate home folder, so it never pushes as you. Branch protection (one approval, a fresh approval after any new push, no bypassing for admins) stops it from merging.
4. **Give it a workspace.** A clone of the repo, with a check that the tests pass the way the agent will run them, and a "Slack thread" field in the pull request template.
5. **Create the Slack app.** From a manifest that Hermes generates, with Socket Mode, so the machine needs no public URL.
6. **Make the thread the unit of work.** One allowed channel, shared thread sessions, approvals for risky commands, and the channel instructions, including the thread link in every pull request.
7. **Start the agent** as a background service.
8. **Run the acceptance test** at the end of this page.

## Before you run it: keep the setup agent out of your secrets

The setup prompt tells the coding agent never to read tokens, and to check them only through `hermes config get`, which masks them. A prompt is a request, not a rule. If you run the setup in Claude Code, add two guardrails that enforce it. In our run the hook stopped the agent from reading the Hermes secrets file twice. Both times it switched to Hermes's own commands or asked us to run the check ourselves.

**1. Deny rules** in `~/.claude/settings.json` stop Claude Code's own file tools from opening secrets:

```json
{
  "permissions": {
    "deny": [
      "Read(//**/.env*)",
      "Read(//**/*.key)",
      "Read(//**/secrets/**)",
      "Edit(//**/.env*)",
      "Edit(//**/secrets/**)"
    ]
  }
}
```

**2. A hook** covers the shell, which the deny rules don't: `cat ~/.hermes/.env` would otherwise still work. Save this as `~/.claude/hooks/block-env-reads.sh`:

```bash
#!/bin/bash
# PreToolUse hook for Bash: blocks commands that name a .env file (.env, .env.local, .envrc, ...).
# .env.example, .env.sample and .env.template stay allowed.
# A guardrail, not a wall: `grep -r X .` or an obfuscated name still gets through.
cmd=$(jq -r '.tool_input.command // empty')
cmd=${cmd//.env.example/}
cmd=${cmd//.env.sample/}
cmd=${cmd//.env.template/}
if printf '%s' "$cmd" | grep -qE '(^|[^[:alnum:]_])\.env[[:alnum:]_.-]*([^[:alnum:]_.-]|$)'; then
  echo "Blocked: the command names a .env file. Ask the user instead of reading it." >&2
  exit 2
fi
exit 0
```

and register it in the same `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "bash \"$HOME/.claude/hooks/block-env-reads.sh\"" }]
      }
    ]
  }
}
```

Exit code 2 blocks the command and shows the message to the agent, so it asks you instead of retrying. The hook needs `jq`.

What it does with typical commands:

| Command | Result |
|---|---|
| `cat ~/.hermes/.env` | blocked |
| `grep -c SLACK ~/.hermes/.env` | blocked |
| `source .envrc` | blocked |
| `cp .env.example .env` | blocked (it names the real file) |
| `cat .env.example` | allowed |
| `node -e "console.log(process.env.HOME)"` | allowed |
| `hermes config get SLACK_BOT_TOKEN` | allowed, and Hermes prints the token masked |
| `grep -r TOKEN ~/.hermes` | allowed: the hook only sees file names, not what a search reaches |

It's a guardrail, not a wall. It stops the agent from reading secrets by accident, which is the common case. Against an agent that tries to get around it, the real protection is keeping secrets out of reach: tokens in the agent's own config with tight file permissions, and nothing on the machine the agent doesn't need.

## The key settings

The settings the prompt writes to the agent's `~/.hermes/config.yaml`; the prompt fills in the placeholders. They are what makes the thread the unit of work:

```yaml
approvals:
  mode: manual            # risky commands wait for a person in the thread
  deny:
    - "git push *--force*"
    - "git push -f*"
    - "git push * -f"
    - "git push * -f *"
    - "gh pr merge*"
    - "gh api *merge*"

slack:
  allowed_channels: ["<CHANNEL_ID>"]   # the agent's channel only
  channel_prompts:
    "<CHANNEL_ID>": |
      You are the team's coding agent for <owner/name>. Your working copy
      is <absolute path of the workspace>. In your shell, ~ is your own
      home, not the user's, so always use absolute paths.
      One task per thread. Read the whole thread before you start and ask
      in the thread when the request is unclear.
      Start each task on a new branch from the latest <base branch>, never
      commit to <base branch> itself. Run the repo's tests and linters
      before you open a pull request.
      Open the pull request with gh pr create --base <base branch> and post
      its link in the thread.
      In the pull request description add a "Slack thread" section with a
      link to this thread and a 2-3 sentence summary of what was decided
      here. Build the link from the channel and thread IDs in your session
      context: https://<workspace>.slack.com/archives/<channel ID>/p<thread
      timestamp without the dot>. If the IDs are missing, ask for the link
      in the thread. Refer to people by name, never with a guessed pronoun.
      Never merge. A human reviews and merges.
```

And the field in the repo's pull request template that the instructions fill. If the repo has no such field, the prompt offers to add it in stage 4:

```markdown
## Slack thread

<!-- Link to the thread where this was requested, and 2-3 sentences on what was decided there. -->
```

## Acceptance test

The agent is ready when all seven checks pass:

- [ ] A mention in a thread gets a reply in that thread.
- [ ] A detail posted later in the thread, without a tag, ends up in the pull request.
- [ ] The pull request comes from the agent's GitHub account, on a new branch, with a working link to the thread and a summary of what it decided.
- [ ] CI runs on the pull request.
- [ ] A risky command (`rm -r` on a throwaway folder) waits for a person to click **Allow Once** in the thread.
- [ ] A person outside the allowlist tags the agent, and it doesn't act.
- [ ] Asked to merge its own pull request, the agent refuses or gets blocked, and a person reviews and merges.
