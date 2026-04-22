Execute **SESSION END** protocol (FixIt):

## 1. Summarize

- Brief bullet list: what was accomplished, what was **not** finished, risks / follow-ups.

## 2. Update docs (edit in place; newest at top for logs)

| File | When to update |
|------|----------------|
| `docs/chatSummaries.md` | **Always** — add a new block at the **TOP** |
| `docs/progress.md` | Meaningful product or infra progress |
| `docs/todos.md` | Check off done items; add new follow-ups |
| `docs/debugs.md` | New bugs or **resolved** entries (move to Resolved with fix) |
| `docs/decisions.md` | Any decision that affects future work |
| `docs/specs.md` | If behavior diverged from the implementation guide (short delta) |
| `docs/_CONNECTIONS.md` | If module boundaries / dependencies changed |
| `docs/optimizations.md` | **Only** if performance work (create file if absent) |

## 3. List touched files

- Show paths you actually edited (code + docs).

## 4. Git (optional — ask first)

- If the repo uses git and the user wants a commit: suggest message; run `git add` / `git commit` **only if** they confirm.
- **Do not** `git push` unless they explicitly ask (network / branch policy).

Ask: **“Want me to stage a commit with these docs/changes? (y/n)”**

## 5. Close

End with: `--- SESSION COMPLETE ---`
