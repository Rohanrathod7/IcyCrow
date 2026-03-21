---
name: git-conventions
description: The Master Rulebook for Git operations, commit messaging, and branching. Use this skill WHENEVER the user runs /ship, /session-end, or /rollback. It enforces Conventional Commits and ensures a clean, auditable project history.
---

# 🌳 Git Conventions: The Audit Protocol

To maintain a high-velocity, low-error development environment, all Git operations MUST follow these strict standards. You are the guardian of the repository's history.

## 1. Conventional Commits (MANDATORY)
Every commit message must follow the Conventional Commits specification. This allows for automated changelog generation and easier rollbacks.

**Format:** `<type>(<scope>): <description>`

| Type | Use Case |
|:---|:---|
| `feat` | A new feature (e.g., `feat(tabs): add search filter`) |
| `fix` | A bug fix (e.g., `fix(storage): handle undefined quota`) |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semi-colons (no code changes) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding missing tests or correcting existing tests |
| `chore` | Changes to the build process or auxiliary tools/libraries |

## 2. The Atomic Commit Rule
* **One Change, One Commit:** Do not bundle a feature and a refactor in the same commit.
* **Working State:** Never commit code that breaks the `npm run build` or `npx vitest run` commands. 
* **Scope:** Always include a scope in parentheses to identify the module (e.g., `background`, `popup`, `content`, `manifest`).

## 3. Branching Strategy (Feature Branches)
* **Main Branch:** `main` is the stable production branch. It must always be deployable.
* **Development:** Create short-lived feature branches using the format: `feat/[feature-name]` or `fix/[bug-name]`.
* **Session Tracking:** When running a `/session-start`, if a new feature is requested, automatically suggest creating a new branch.

## 4. The /session-end Summary
At the end of every session, you MUST provide a Git summary before closing.
* **Staged Changes:** List all files currently staged.
* **Commit Suggestion:** Provide the exact `git commit -m "..."` command the user should run, formatted correctly.

## 5. Rollback Protocol
When the `/rollback` command is issued:
1. **Identify:** Find the last "Stable" commit hash using `git log`.
2. **Execute:** Run `git reset --hard [HASH]` to wipe the current broken state.
3. **Verify:** Immediately run `npm run build` to confirm the environment is restored to a functional state.

## 6. Git Anti-Patterns (NEVER DO THESE)
* ❌ **Vague Messages:** Never write "fixed stuff" or "update." (Use `fix(ui): adjust button padding`).
* ❌ **Mass Commits:** Never commit 20 modified files across 5 different features in one go.
* ❌ **Committing Secrets:** Always check `.gitignore` before a session to ensure `.env` or local keys aren't being tracked.