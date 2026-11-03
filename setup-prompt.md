You are helping me set up a basic team agent: a Hermes Agent that people tag in a Slack thread, which works in one GitHub repo and opens a pull request for a human to review. Guide me one stage at a time.

## Rules for you

1. One stage at a time. Say what the stage does and roughly how long it takes, then wait for me to confirm before you move on.
2. I do everything in the browser (Slack, GitHub, logins). Give me the exact URL and the exact buttons to click. Assume I have never done this before.
3. You run the terminal commands, except the ones marked "I run". Those are interactive or take a secret: give me the exact command and I run it in a separate terminal tab.
4. Never ask me to paste a token, password or secret into this chat. Afterwards check only that the value exists, never its content.
5. Before you run any `hermes` command for the first time, check it with `hermes <command> --help`. If the official docs at https://hermes-agent.nousresearch.com/docs disagree with this prompt, follow the docs and tell me what differed.
6. Don't change anything outside `~/.hermes/` and the workspace folder from Stage 4 without asking me.
7. At the end of each stage, run its check. If the check fails, stop and fix it before the next stage.

## What I need before we start

First ask whether I have a Slack workspace, a GitHub repo and access to an AI model (a paid ChatGPT plan, or an API key from a provider Hermes supports). If one is missing, tell me how to get it before we go on. Then ask me for these and keep them in a short summary at the top of your replies:

- The Slack workspace URL (click the workspace name at the top left in Slack; it looks like `name.slack.com`), and whether I'm an admin there. If I'm not sure, we find out in Stage 5.
- The Slack channel for the agent. A new public channel is best: in Slack, **+ Add channels → Create a new channel**, for example `#agent-dev`.
- The GitHub repo (`owner/name`) and the base branch its pull requests should target (usually `main`, but any branch works). Check yourself with `gh repo view <owner/name> --json visibility,owner` whether it is public or private and whether the owner is an organization or a personal account, so I don't have to know.
- Nothing else. I can run every test in Stage 8 alone, with my own Slack account.

## Stage 1: Check the machine (5 min)

- Confirm the OS (macOS, Linux or WSL2), `git`, `gh` and `curl`. Offer to install what's missing.
- Find out which version managers I use for languages (asdf, mise, nvm, rbenv, pyenv) and where they keep their data. Stage 4 needs this, because the agent will run with a different `HOME`.
- On macOS, check the sleep setting with `pmset -g | grep -E '^ *sleep'`. If the Mac sleeps after a few minutes, tell me: the agent stops answering while it sleeps. I change it in **System Settings → Energy** (or **Battery → Options** on a laptop), or keep it awake with `caffeinate -s` while the agent works.
- Check whether Hermes is already installed (`command -v hermes`) and whether a gateway service already runs (`hermes gateway status`). If so, tell me, and in Stage 7 restart that service instead of starting a second one.
- Check: print the versions.

## Stage 2: Install Hermes and connect a model (10 min)

- Install, I run: `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --skip-setup`. Without `--skip-setup` the installer opens its own setup wizard, which steers to the paid Nous Portal subscription; we connect the model in the next step instead. If the wizard opens anyway, I press Ctrl+C: Hermes is installed by then. I don't log in to Nous Portal, and if it asks for a terminal backend, I keep **Local**, because the rest of this setup assumes the agent runs on this machine. Your shell may not see `hermes` yet, so run `source ~/.zshrc` (or `~/.bashrc`) in the same command as your next `hermes` call, or use the full path the installer printed.
- Model, I run: `hermes model`. Ask me which AI subscription or API key I have and tell me what to pick. With a ChatGPT plan (Plus or higher) it's **ChatGPT or Codex Subscription**, and I finish the device-code login in the browser. With Claude, a subscription works only on Max with purchased extra usage credits, and Hermes uses only those credits, not the Max allowance. Claude Pro doesn't work, so use an Anthropic API key instead (pay per token). Hermes needs a model with at least 64K context.
- Check: `hermes doctor`, then I ask one short question in `hermes` to confirm the model answers.

## Stage 3: Give the agent its own GitHub identity (15 min)

The agent gets its own GitHub account, so reviewers can tell its pull requests apart and the repo's review rules apply to it.

First ask me whether I already have an account for the agent. If I do, skip the steps I've done.

1. In a private browser window, so I stay signed in as myself in the normal one, I create a GitHub account for the agent at https://github.com/signup (for example `acme-agent`). It needs its own email address; a `+agent` alias of mine works.
2. In my normal window, as myself, I invite the agent with write access. Personal repo: `https://github.com/<owner/name>/settings/access` → **Add people**. Organization repo: an org owner adds it to a team with write access. On a paid plan the agent account takes a seat like any member, and if the org uses SAML single sign-on, the agent's token needs authorizing for it (GitHub shows **Configure SSO** next to the token).
3. In the private window, as the agent, I accept the invite at `https://github.com/<owner/name>/invitations`. Then I tell you the agent's username, and you confirm its access with `gh api repos/<owner/name>/collaborators/<agent login>/permission --jq .permission` (expect `write` or `admin`).
4. Still as the agent, I create a token. GitHub shows it only once, so I keep it until you ask for it. Which kind depends on who owns the repo:
   - **Organization repo:** a fine-grained token at https://github.com/settings/personal-access-tokens/new, resource owner = the organization, only this repo, **Contents: Read and write** and **Pull requests: Read and write**. If the org requires approval for fine-grained tokens, an owner approves it.
   - **Personal-account repo:** a classic token at https://github.com/settings/tokens/new with the `repo` and `read:org` scopes and an expiry date (30 or 90 days). `gh` refuses a classic token without `read:org`; that scope only reads organization membership. A fine-grained token covers one resource owner and doesn't reach a repo where the agent is only a collaborator. The agent account can see only this repo, so the classic token can't reach anything else.
5. Keep the agent's GitHub login apart from mine. Hermes runs tools with my normal `HOME` by default, so it would push as me. Give its tools a separate home:
   - `mkdir -p ~/.hermes/home`
   - `hermes config set terminal.home_mode profile`
   - I copy the token to the clipboard and run: `pbpaste | HOME=~/.hermes/home gh auth login --with-token --insecure-storage` (on Linux, `xclip -o -selection clipboard |` instead of `pbpaste |`). It finishes on its own: no typing, no Ctrl-D, and the token never shows on screen or in shell history. `--insecure-storage` keeps the token in `~/.hermes/home/.config/gh/` instead of the macOS keychain, so the background service can read it. If it says `missing required scope`, I add that scope to the token on GitHub and run it again.
   - You run `HOME=~/.hermes/home gh auth setup-git`, then set the commit identity: `HOME=~/.hermes/home git config --global user.name "<agent login>"` and `user.email` to the address from `HOME=~/.hermes/home gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"'`.
6. Stop the agent from merging. A token with write access can merge through the API, so the rule has to live in GitHub. As myself, I open `https://github.com/<owner/name>/settings/branches` → **Add classic branch protection rule**, type the base branch as the branch name pattern, tick **Require a pull request before merging** with **Require approvals: 1**, and save. As the repo owner I can still merge after approving. The agent's approval of its own PR doesn't count. GitHub offers this on public repos for free and on private repos only with Pro, Team or Enterprise. On a free private repo, tell me the merge guard is then only the deny rule from Stage 6 and the instructions, which the agent could get around with a raw API call.
- Check: `HOME=~/.hermes/home gh auth status` shows the agent's account, not mine. If I added protection: `gh api repos/<owner/name>/branches/<base branch>/protection --jq .required_pull_request_reviews` is not empty.

## Stage 4: Give the agent a workspace (5 min)

- Clone the repo for the agent, outside my own working copy: `HOME=~/.hermes/home gh repo clone <owner/name> ~/agent-workspace/<name>`.
- Point the gateway there: `hermes config set terminal.cwd ~/agent-workspace/<name>`.
- If the repo has an `AGENTS.md`, Hermes loads it automatically. If it doesn't, offer to draft one with the commands to install, test and lint the project. Don't commit it without asking me.
- Make the project's tools work for the agent. With `terminal.home_mode: profile` the agent's `HOME` is `~/.hermes/home`, so version managers that keep data in my real home stop finding it. For each one from Stage 1, set its data variable to the absolute path in my real home with `hermes config set` (for example `ASDF_DATA_DIR`, `MISE_DATA_DIR`, `NVM_DIR`, `RBENV_ROOT`, `PYENV_ROOT`). Set only the ones this project needs. Install the project's dependencies if it has any.
- Check, the way the agent will run it: `cd ~/agent-workspace/<name> && hermes -z "Run this project's test command and tell me whether it passed."` The tests must pass. If a tool is missing, fix the variables above and run the check again.

## Stage 5: Create the Slack app (15 min)

1. Ask me what the agent should be called in Slack (for example the team's name for it, such as `Genie`; up to 35 characters, default `Hermes`). Generate the manifest: `hermes slack manifest --agent-view --name "<agent name>" --write`. It writes `~/.hermes/slack-manifest.json` with the scopes, events, slash commands and Socket Mode. Show me which scopes and events it contains. The help warns that Agent view can't be reversed; that only matters for existing apps on Slack's older Assistant view, and new apps have to use Agent view anyway, so don't stop to ask about it.
2. I open https://api.slack.com/apps (the developer site, not the workspace's **Manage apps** page, which only lists apps already installed) → **Create New App** → **Paste a manifest** (older Slack UI: **From an app manifest**; ignore the templates and the "With a coding agent" option) → **Continue**, pick the workspace, switch the editor to **JSON**, replace its content with the file and click **Next → Create**. Tell me the app's display name from the manifest; I'll need it to invite the bot.
3. I create the app-level token: **Settings → Basic Information → App-Level Tokens → Generate Token and Scopes**, any name (for example `socket`), add the scope `connections:write`, **Generate**. It starts with `xapp-`. The manifest turns Socket Mode on but doesn't create this token.
4. I install the app: **Settings → Install App → Install to Workspace → Allow**, and keep the **Bot User OAuth Token** (`xoxb-`) at hand. If Slack says an admin must approve, I ask the admin and wait here.
5. I collect Member IDs of everyone allowed to use the agent (at least my own). Include everyone whose word should count in a thread, not only the people who tag the bot: Hermes still reads messages from people outside the list, but marks them `[unverified]` and treats them as background, not as requirements. To get an ID: click a person → **View full profile** → **⋮** → **Copy member ID**.
6. I run: `hermes gateway setup`, choose Slack, enter both tokens (hidden input) and the Member IDs when it asks for allowed user IDs. Left empty, Hermes denies everyone except users paired by DM.
- Check: `hermes config get SLACK_BOT_TOKEN`, `hermes config get SLACK_APP_TOKEN` and `hermes config get SLACK_ALLOWED_USERS` each return a value (the tokens come back masked). Don't read the Hermes secrets file directly.

## Stage 6: Make the thread the unit of work (10 min)

Show me each change before you write it. Scalars go through `hermes config set`. Lists and the multi-line prompt go straight into `~/.hermes/config.yaml`, because `config set` refuses values of the wrong shape. Before you edit the file, check which top-level blocks already exist (`grep -n -E '^(approvals|slack):' ~/.hermes/config.yaml`; `config set approvals.mode` creates `approvals:`) and add the new keys inside them. A second block with the same name breaks the file.

- **Shared thread session.** Hermes gives everyone in a thread one shared session by default. Confirm `thread_sessions_per_user` is not set to `true`.
- **Only the agent's channel.** I click the channel name at the top of the channel; the **Channel ID** (`C…`) is at the bottom of the **About** tab. Add it to `config.yaml`:

  ```yaml
  slack:
    allowed_channels:
      - "<CHANNEL_ID>"
  ```

- **Approvals.** `hermes config set approvals.mode manual`, so every dangerous command waits for a human in the thread (Slack shows buttons, or `!approve` / `!deny` as text). Add deny rules that nobody can approve:

  ```yaml
  approvals:
    deny:
      - "git push --force*"
      - "gh pr merge*"
  ```

- **Channel instructions.** Add a `channel_prompts` entry under the same `slack:` block:

  ```yaml
  slack:
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

- Check: `hermes config get approvals.mode`, `hermes config get approvals.deny`, `hermes config get slack.allowed_channels`, then `hermes doctor` to catch YAML mistakes.

## Stage 6b (optional): Let the agent search older threads (30 min)

Out of the box, Hermes reads the thread it was tagged in and nothing else. To find a decision from another thread, the agent needs a Slack search tool. Hermes detects any connected MCP server with "slack" in its name and tells the agent it can use it.

- Slack's MCP server works with internal apps, so the app from Stage 5 qualifies. Search uses a user token: each person signs in through OAuth with the app's client ID and secret, and the app needs the `search:read.*` scopes. A workspace admin enables Model Context Protocol in the app's **Agents & AI Apps** settings, then reinstalls the app.
- Walk me through connecting it as described in https://docs.slack.dev/ai/slack-mcp-server and the Hermes MCP docs (https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp). Name the server `slack`.
- On a free Slack plan, search only reaches the last 90 days of messages.
- Check: in a new thread, ask the agent to find a decision from another thread and return its link.

Skip this stage on the first run. The loop in Stage 8 works without it.

## Stage 7: Start the agent (5 min)

- Run the gateway as a background service, so it survives closed terminals and restarts after a crash or reboot. If `hermes gateway status` shows a service already, run `hermes gateway restart` so it picks up the new settings. Otherwise run `hermes gateway install` (launchd on macOS, a user service on Linux). Never start a second gateway next to a running one: two gateways on one bot token fight over messages.
- Read its log with `hermes logs gateway -n 40`. Check: it shows `Socket Mode connected`, `Gateway running with 1 platform(s)` and no auth errors.
- I invite the bot in the channel: `/invite @<app display name from Stage 5>`. The bot doesn't join channels by itself.
- Every later change to `config.yaml` or the Hermes secrets needs `hermes gateway restart` to take effect.

## Stage 8: Acceptance test (20 min)

Walk me through these in Slack one at a time, give me the exact message to post, and tick each one off. After each test, check the result yourself on GitHub or in `hermes logs gateway`.

1. **Mention.** I start a thread and tag the bot with a tiny task, such as fixing one wording in the README. It replies in the thread.
2. **Context from the thread.** In a new thread I tag the bot with a task but leave out one detail, and say I'll post it in the thread. Then I post the detail without tagging the bot, and tag it once more to go ahead. The PR uses that detail. Anyone on the allowlist can add context this way, not only the person who tagged the bot. Messages from people outside it the agent reads only as background.
3. **Pull request.** The PR from test 1 or 2 comes from the agent's GitHub account, on a new branch, with the "Slack thread" section filled in and a link that opens the thread. The agent posts the PR link in the thread.
4. **Checks.** If the repo has CI, it runs on the PR. If not, skip this one.
5. **Approval.** You create a throwaway folder inside the workspace, for example `<workspace>/tmp-approval-test`, and give me a message that asks the agent to delete it with `rm -r`, using that absolute path. The agent asks for approval in the thread. Check that the folder still exists, then I click **Allow Once** (never **Allow Session** or **Always Allow**), and you check that it's gone.
6. **Allowlist.** You set `SLACK_ALLOWED_USERS` to an empty value and restart the gateway. I tag the bot in a new thread, and it doesn't answer; the log shows `Early reject of unauthorized user`. Then you put my Member ID back, restart, and check that Slack reconnects.
7. **Human merge.** I ask the agent in a new thread to merge its own PR. It refuses or gets blocked. Then I review and merge it myself: **Files changed → Review changes → Approve → Submit review → Merge pull request**.

If all of them pass, summarize what we set up and where each setting lives.

## If something doesn't work

| Symptom | Fix |
|---|---|
| No reply to a mention in the channel | Check the `message.channels` and `app_mention` events and the `channels:history` scope, reinstall the app, `/invite` the bot |
| Silence in a private channel | Add `message.groups` and `groups:history`, reinstall, `/invite` |
| `not_authed` or `invalid_auth` | Regenerate the tokens and run `hermes gateway setup` again |
| `missing_scope` | Add the scope in the Slack app, reinstall |
| Changes in the Slack app have no effect | Reinstall the app after every scope or event change |
| Too many approval requests for harmless checks (for example `node -e` while running tests) | `manual` asks about every flagged command. `hermes config set approvals.mode smart` lets a helper model approve low-risk ones; the deny rules still apply |
| An approved command does nothing | It used `~`, which for the agent is `~/.hermes/home`. Ask again with an absolute path |
| The bot answers twice, or randomly not at all | Two gateways run on one bot token. Keep the service, stop any other with `hermes gateway stop` |
| The bot ignores the channel | The channel ID in `slack.allowed_channels` is wrong, or the bot wasn't invited |
| The PR comes from my account, not the agent's | `terminal.home_mode` isn't `profile`, or `gh` in `~/.hermes/home` isn't logged in as the agent |
| `git push` fails with 403 | The agent account hasn't accepted the repo invite, or the token lacks write access to contents |
| The agent stops mid-task with a usage message | The model plan hit its limit. Wait for the reset or move to a bigger plan |
| A tool works in my terminal but not for the agent | Repeat the tool setup and check from Stage 4. If it worked there but not in the service, the service started with an older `PATH`: run `hermes gateway install` again |
| Anything else | `hermes doctor`, then the Slack troubleshooting page in the Hermes docs |
