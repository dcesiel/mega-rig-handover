---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split, then start one separate agent per issue. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold, then runs one separate agent
per issue. Easiest with `gh`, authenticated, in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by · model.
   One issue per unit of work. Pick the model per issue: the strongest for logic, a cheaper one
   for views and tests (AGENTS.md).
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Ask the human what every issue here must carry (fields, labels, wording), unless it is
   already written down in this session or in the repo. Write the answer into this file under
   "Every issue carries" so the next session does not ask again.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --label "plan:<plan name>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.
7. **Start one separate agent per issue** (next section).

## One agent per issue

Never work two issues in one agent, and never let the planning agent build an issue itself.

1. Start from a git repo. Worktree isolation needs the agent's working folder to be inside one;
   if it is not, `cd` into the repo or stop and tell the human.
2. For each issue with nothing open in "Blocked by", start one child agent (`delegate_task` in T3
   Code, or your harness's own subagent tool) with:
   - the issue's model, from the split table
   - its own checkout: `isolation: "worktree"` (or a git worktree on branch `issue-<n>`)
   - a self-contained task, because children get no parent history: repo URL, issue number and
     how to read it (`gh issue view <n>`), the rules from AGENTS.md and `docs/styleguide.md`,
     "work only this issue", "commit with `closes #<n>`", and the closing-comment shape below
   - instructions to run the tests and typecheck before reporting
3. Issues with nothing between them run at the same time. Start a blocked issue only after the
   issue it waits on is merged.
4. Do not poll. Wait for each child's report, then merge its branch, check "Done when" yourself,
   and close the issue with the closing comment.
5. A child that cannot start (for example "Unable to resolve the parent checkout commit") is a
   failure to report to the human. Do not silently build the issue in the planning agent.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

```
done: <what changed, one line>
worker: <harness> · <model> · <effort>
commit: <sha or "none">
```

The `worker:` line names the agent that did the issue, not the planning agent.

## Every issue carries

- First line: `Source: plan.md § <n>`
- Label `plan:<plan name>`
- Sections: Scope, Done when, Blocked by, Suggested model, Closing comment shape

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push. One agent per issue still applies.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
- Don't copy this folder into other places: link to it.
