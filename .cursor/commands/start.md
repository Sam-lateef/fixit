Execute **SESSION START** protocol (FixIt):

## 0. Rules first (auto-loaded, but confirm)

- Skim **`.cursor/rules/*.mdc`** — especially `alwaysApply` rules (e.g. mobile Google / Expo).

## 1. Single source of truth

- Read **`AGENTS.md`** at the repo root (full read).

## 2. Session guide + docs (order)

1. `docs/_SESSION-GUIDE.md`
2. `docs/project.md`
3. `docs/specs.md`
4. `docs/progress.md` — last 2–3 dated entries
5. `docs/todos.md` — High priority section
6. `docs/debugs.md` — Open issues
7. `docs/decisions.md` — last 1–2 entries (if any)
8. **`docs/chatSummaries.md` — last 2–3 sessions at the TOP**
9. `docs/_CONNECTIONS.md` — if today’s task touches mobile ↔ API ↔ auth

## 3. Deep spec (on demand)

- For product/UI/schema detail: **`docs/fixit_implementation_guide (1).md`** — read relevant sections only, not the whole file unless the task requires it.

## 4. Summarize back

In 5–10 bullets:

- What FixIt is (one line)
- What shipped recently (`progress` / `chatSummaries`)
- Open todos / bugs
- Any **non-negotiable** from `AGENTS.md` or rules that applies today (e.g. Google = dev build)

## 5. Prompt the human

Ask: **“What would you like to work on today?”**

## 6. Close

End with: `--- SESSION READY ---`
