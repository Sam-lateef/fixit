Execute **CHECKPOINT** protocol (FixIt) — mid-session, lightweight:

## 1. Capture (from current chat)

- 3–7 bullets: what works now, what is in progress, blockers (if any).
- Optional: one-line **“do not regress”** (e.g. “Google: dev build only”).

## 2. Write to disk

1. **`docs/progress.md`** — append a small dated subsection at the **TOP** (below the title / template), e.g. `### YYYY-MM-DD HH:mm checkpoint (mid-session)`.
2. If there is a **user-visible decision** worth remembering: add 2–3 lines to **`docs/decisions.md`** at the top **or** note “see progress checkpoint”.
3. **Do not** duplicate a full `/end` summary into `chatSummaries.md` unless the user asks — checkpoints are **progress breadcrumbs**, not full session reports.

## 3. Confirm

- List files updated.

End with: `--- CHECKPOINT SAVED ---`
