---
name: branch-and-pr
description: Reusable git workflow for creating branches, commits, and pull requests. Handles branch naming with initials, Linear ticket IDs, pre-commit hook retries, and PR generation.
---

# Branch, Commit, and Pull Request Workflow

## Workflow Steps

1. **Determine engineer's initials**
   - Run `git config user.name` to get full name
   - Extract initials, lowercase (e.g., "Phil Labrum" → "pl")

2. **Generate branch name**
   - With Linear ticket: `<initials>/<ticket-id>/<feature-description-in-kebab-case>`
   - Without ticket: `<initials>/<feature-description-in-kebab-case>`
   - Examples: `pl/SLQ-42/add-vessel-rls`, `pl/fix-media-state`

3. **Create and checkout branch**
   ```bash
   git checkout -b <branch-name>
   ```

4. **Stage relevant changes**
   - Prefer staging specific files over `git add .`
   - Never stage `.env`, lockfiles, or generated artifacts

5. **Create commit**
   - With ticket: `SLQ-42: <imperative description>`
   - Without ticket: `<imperative description>`
   - Use heredoc format:
   ```bash
   git commit -m "$(cat <<'EOF'
   <commit-message>

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```

6. **Handle pre-commit hooks**
   - If commit fails due to hook auto-formatting (ruff, prettier), stage the reformatted files and retry:
   ```bash
   git add -u
   # then retry commit
   ```
   - Never skip hooks (`--no-verify`)

7. **Rebase onto main before pushing**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

8. **Push to remote**
   ```bash
   git push -u origin <branch-name>
   ```

9. **Create pull request**
   ```bash
   gh pr create --title "<title>" --body "$(cat <<'EOF'
   ## Summary
   - ...

   ## Test plan
   - [ ] ...

   Closes https://linear.app/sloopquest/issue/<TICKET-ID>
   EOF
   )"
   ```
   Omit the Closes line if there's no Linear ticket.

10. **Return the PR URL**

## Conventions

- Branch initials always lowercase
- Commit messages imperative mood ("add", "fix", "remove" — not "added")
- Rebase, never merge — linear history, no merge commits
- Direct push to main is OK after rebasing if no PR is needed
