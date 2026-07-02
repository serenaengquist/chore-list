---
target: src/app/dashboard.tsx (Chore Board dashboard)
total_score: 32
p0_count: 0
p1_count: 1
timestamp: 2026-07-02T23-18-21Z
slug: src-app-dashboard-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | No loading skeleton, but state changes (checkbox, delete-confirm) are immediate and unambiguous. |
| 2 | Match System / Real World | 4/4 | Domain-natural vocabulary throughout, no jargon. |
| 3 | User Control and Freedom | 3/4 | Two-step chore delete is good; room delete via native `window.confirm()` offers only OK/Cancel with no visual escape. No undo anywhere. |
| 4 | Consistency and Standards | 3/4 | Chore delete (in-place two-step) and room delete (native browser dialog) are two different confirmation paradigms for the same conceptual action. |
| 5 | Error Prevention | 3/4 | Required-field validation exists; clicking the modal backdrop silently discards a dirty form with no warning. |
| 6 | Recognition Rather Than Recall | 4/4 | Color name shown as live text now; room swatches shown inline on every row — nothing requires memorization. |
| 7 | Flexibility and Efficiency of Use | 2/4 | No keyboard shortcuts, bulk actions, or search — thin, though acceptable at this scale. |
| 8 | Aesthetic and Minimalist Design | 4/4 | Consistently retro-terminal, one accent color respected throughout, no decorative bloat. |
| 9 | Error Recovery | 3/4 | Errors render in a styled card, but show the raw Supabase error string — fine for a developer, opaque for the target persona. |
| 10 | Help and Documentation | 3/4 | Empty states double as micro-onboarding; no help affordance elsewhere, but arguably not needed at this scope. |
| **Total** | | **32/40** | **Up from 18/40 — a real, verified jump.** |

## Anti-Patterns Verdict

**LLM assessment**: This no longer reads as AI slop in any pejorative sense. The button vocabulary is now consistent — bordered pills for destructive and secondary actions, solid voltage-yellow for primary CTAs — and a Linear/Notion-fluent user would recognize the interaction patterns immediately. Where it still wobbles: room deletion drops into a native `window.confirm()` in the middle of an otherwise fully-themed app — the one moment that still breaks the illusion of a considered product.

**Deterministic scan**: Re-run correctly from the project root (the first attempt silently skipped `design-system-*` rules due to a cwd issue — worth knowing for future runs). Results:
- `design-system-color` (`#FFFF00` vs `#FFE600`): **confirmed fixed** — zero occurrences of the old value anywhere in the codebase.
- `design-system-radius`: **still open, 8 findings** — the small color-swatch-dot radius (`1-2px`, used for room-color indicator squares throughout the app) was never touched. This was listed only as a *minor observation* in the original critique, not one of the fixes taken on this round, so this isn't a regression — just a real, still-open item worth flagging clearly now.
- `src/lib/rooms.ts`: clean.
- **New**: `DESIGN.md` itself is stale — it still documents the muted-text color as `#7A776E`, not the `#6B685F` now shipped in code. The design system's source of truth and the implementation have drifted apart in the opposite direction from before.

**Visual overlays**: Zero `low-contrast` findings from the injected detector in this pass (a real change from 30 findings last time). It surfaced two items outside the original scope: a **skipped heading level** (h1 "CHORE BOARD" jumps straight to h3 "ROOMS" with no h2 in between — a real, if minor, accessibility structure issue), and a `cream-palette` flag (cosmetic, expected, not a defect).

**Manual verification (independently corroborated by both assessments)**:
- `--color-mute` confirmed as `#6B685F` via computed style. Actual measured contrast: **4.85:1** on the page background, **5.47:1** on card surfaces — both clear AA with real margin.
- Mobile overflow: **0px** at 375px width (was 162px), measured identically by both assessments.
- Room of Day heading: confirmed at the source level to carry no `color` override — text inherits the neutral ink color; room color lives only in a small swatch square.
- Color palette: exactly 10 swatches, name shown as live text, first entry "Voltage Yellow" = `#FFE600`.
- **New, found independently by both assessments**: Delete-button red (`#FF3344`) as text/border on the cream/white surfaces measures **3.55:1** — fails AA for normal-size text. This is a pre-existing issue (the red token itself, used since the first Delete button was built), not something this round's fixes touched, but it's now been flagged twice by two separate methods.
- One false positive: the detector overlay's own dark-mode toggle button was flagged at 1.15:1 contrast — that's the tool's own UI, not app content.

## Overall Impression

This is a legitimate before/after: 18/40 → 32/40, with every claimed fix independently verified by two isolated methods rather than taken on faith. The three P0s and two P1s from last time are genuinely gone. What's left is smaller and more precise: one confirmation-flow inconsistency (room delete), one rough edge in something this round *built* (the 3-second auto-revert), one contrast gap the fix didn't fully cover (a third background variant), and one pre-existing contrast issue on the red Delete text that neither round has touched yet.

## What's Working

1. **The Room of the Day heading fix is clean and complete** — verified both visually (renders in ink-black with a small bordered swatch) and at the source level (no color override on the heading element at all).
2. **The mobile flex-wrap fix genuinely eliminates the overflow** — 0px at 375px, confirmed by direct measurement in both assessments, with graceful two-line wrapping rather than clipping.
3. **The two-step chore-delete pattern was hands-on tested and works exactly as designed** — first click flips the button to a high-contrast "CONFIRM DELETE?" state, second click deletes and updates the list correctly. It's the right amount of friction for this product register.

## Priority Issues

**[P1] Room deletion still uses a native `window.confirm()` dialog** — This was flagged in the original critique's emotional-journey notes but wasn't one of the 5 issues selected for the first fix pass (that pass fixed the Delete *button's visual treatment*, not the *confirmation mechanism*). Deleting a room is the more consequential of the two delete actions in the app — it cascades to untag every chore in that room — yet it gets the lower-effort, unstyled system dialog while the lower-stakes chore delete got a custom in-brand pattern. *Fix*: apply the same two-step in-context confirm pattern already built and proven for chores. → `/impeccable harden`

**[P2] The chore delete-confirm auto-reverts after 3 seconds, which is tight** — Discovered through hands-on testing: a user who pauses to reread the chore name before confirming can plausibly miss the window and have to click Delete twice more. *Fix*: extend to 5-6 seconds, or drop the timer entirely and rely on the existing revert-on-modal-close/switch behavior instead. → `/impeccable clarify`

**[P2] Muted text still fails AA on a third background the fix didn't cover** — `--color-mute` (`#6B685F`) was verified to pass against the page background and card surface, but computes to **4.43:1** against `--color-surface-sunk` (`#EBE5D4`) — the background used for "done" chore rows and hover states, exactly where room/recurrence secondary text sits. *Fix*: darken `--color-surface-sunk` slightly, or swap to `--color-ink-soft` for text specifically on that background. → `/impeccable audit`

**[P3] Glitch-red Delete text fails AA at 3.55:1** — Pre-existing, found independently by both assessments this round. Affects every unconfirmed-state Delete button in the app (the confirmed/filled state is fine — white-on-red is high contrast). *Fix*: darken the red slightly for text/border use. → `/impeccable audit`

**[P3] DESIGN.md is now out of sync with the shipped code** — still documents the muted color as `#7A776E`; the actual token is `#6B685F`. *Fix*: update the source-of-truth doc alongside the next design-system touch. → `/impeccable document`

## Persona Red Flags

**"Living alone, low executive-function bandwidth day"**: The room-delete `window.confirm()` would likely read as a "did I break something?" moment for this persona — native browser dialogs feel system-level and scarier than the app's own UI. The two-step chore delete is exactly right for them; the room-delete flow undermines that same instinct one screen away.

**"Tinkerer who reorganizes rooms occasionally"**: Someone who renames or deletes rooms as their space changes hits the *unfixed* room-delete flow far more than the *fixed* chore-delete flow — so the remaining inconsistency lands squarely on the one workflow this persona actually exercises repeatedly.

## Minor Observations

- A heading level is skipped (h1 → h3, no h2) — flagged by the detector, not part of the original scope, worth a quick fix.
- The small color-swatch-dot radius (1-2px) throughout the app is still off the design system's token scale — never claimed as fixed, remains open as a low-priority polish item.
- Modal close icon uses a raw `✕` Unicode character rather than the Phosphor icon set already imported for the rest of the app.
- Error messages still surface raw Supabase text (`err.message`) rather than a human-readable fallback.

## Questions to Consider

1. If chore deletion earned a custom two-step in-app pattern, why does room deletion — strictly higher-stakes, since it cascades to every chore in that room — still get the *lower-effort* native dialog? Worth closing that gap now that the pattern already exists and is proven.
2. Is the 3-second auto-revert solving a real risk for a confirmed single-user local app, or is it a leftover assumption from a multi-user mental model?
3. Now that both P0-tier contrast issues are fixed, is it worth a single pass to catch the remaining narrower gaps (surface-sunk background, red Delete text) in one go, or handle them opportunistically as you touch those components next?
