---
target: src/app/dashboard.tsx (Chore Board dashboard)
total_score: 18
p0_count: 3
p1_count: 2
timestamp: 2026-07-02T22-18-07Z
slug: src-app-dashboard-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Checkbox toggle, delete, and duplicate give zero feedback (no toast/flash) — success and failure look identical. |
| 2 | Match System / Real World | 3/4 | Tab title says "Chore List," on-page header says "CHORE BOARD" — product disagrees with itself. |
| 3 | User Control and Freedom | 2/4 | No undo anywhere. Chore delete is instant; room delete uses a native `window.confirm()` that breaks the app's visual language. |
| 4 | Consistency and Standards | 1/4 | Delete is a bare underlined text link in Rooms list, a full bordered button in the chore modal. `+ ROOM` bypasses `.btn` classes entirely. |
| 5 | Error Prevention | 1/4 | Chore deletion: one click, zero confirmation, zero undo — more dangerous than the room-delete flow next to it. |
| 6 | Recognition Rather Than Recall | 2/4 | Room color name only shown via hover tooltip; unreachable by keyboard/touch, invisible once picked. |
| 7 | Flexibility and Efficiency of Use | 2/4 | No bulk actions, no keyboard shortcuts, no filter/search — fine today, ceiling is low. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Three dense stacked sections front-load the page; same chores appear twice on screen (Room of the Day + full list) with no link between them. |
| 9 | Error Recovery | 2/4 | Errors surface with the glitch-red token consistently, but show raw Supabase error strings, not user-friendly copy. |
| 10 | Help and Documentation | 1/4 | Zero onboarding beyond two empty-state lines; acceptable only if the UI is fully self-explanatory, which the unlabeled color grid and silent Room-of-the-Day threshold are not. |
| **Total** | | **18/40** | **Below average — real friction in error prevention, consistency, and documentation.** |

## Anti-Patterns Verdict

**LLM assessment**: This wouldn't be dismissed as crude "AI slop" — the retro-terminal identity (VT323 display type, hard-offset shadows, chromatic checkbox states) is genuinely considered and, where it's applied, well executed. The failure mode is the product-register one: strangeness without purpose, produced by not consistently using the system that was built. The `+ ROOM` button reinvents its own flat, shadowless style instead of using `.btn`. "Delete" renders as two different affordances depending which screen you're on. A 20-color neon swatch grid sits awkwardly next to an otherwise-disciplined "one accent per surface" system. None of these individually screams AI-generated, but together they're exactly what a Linear/Notion-fluent user would catch within a minute of clicking around.

**Deterministic scan**: The CLI scan (`detect.mjs` against `dashboard.tsx`) returned 10 advisory findings, all genuine, no false positives:
- **4× `design-system-color`** (lines 57, 239, 269, 502): default room-swatch value hardcoded as `#FFFF00`, which does not match the design system's documented primary yellow `#FFE600` — looks like a typo, not a deliberate second yellow.
- **6× `design-system-radius`** (lines 592, 684, 838, 956, 1065, 1358): room-color swatch squares use `1px`/`2px` radii that don't match any token in the `rounded` scale (`sm: 6px` is the smallest defined step).

**Visual overlays**: injected into a live tab and confirmed on-page. 32 findings surfaced:
- **30× low-contrast**, overwhelmingly the design system's own muted-text token `#7A776E` on `#F4EFE2` (3.9:1) and `#FFFDF5` (4.4:1) — both **below** the 4.5:1 AA minimum the system's own DESIGN.md commits to for body text. Manually confirmed via computed styles: this pairing is used on the "7 pending · 0 done" subtitle, the "ROOM OF THE DAY" label, every room tag, and every recurrence tag — pervasive, not isolated.
- **1× severe low-contrast** at 1.3:1 — the Room of the Day heading rendered in the room's raw color (`#00FF00` green) directly against the cream card surface. This independently corroborates the design review's P0 finding below; two isolated assessments landed on the same defect from different methods.
- **1× cream-palette flag** and **1× monotonous-spacing flag** (a single ~4px spacing value used in 83% of measured gaps).

No false positives were found in either pass. Additionally, the detector run surfaced a genuine responsive bug outside its own findings list: at a 375px mobile viewport, the page overflows horizontally by 162px, traced to the Room of the Day card's room/recurrence tag columns not wrapping or compressing.

## Overall Impression

The bones are good — a genuinely distinctive retro-terminal identity with one well-crafted signature moment (the checkbox). The problem is execution discipline: the app doesn't consistently apply its own design system, and in doing so it breaks its own accessibility commitment in a pervasive, easily-fixed way (one muted-text color pairing used dozens of times, failing AA by a small margin) and in one severe way (colored heading text that's nearly unreadable). Both issues are cheap to fix and would meaningfully move the heuristics score.

## What's Working

1. **The checkbox interaction** — chromatic red/blue offset shadow on check, voltage-yellow fill, immediate strikethrough/dim/re-sort — is the one place the brand voice fully shows up as designed, and it's the core interaction of the whole app.
2. **Empty states are calm and instructive**, not gamified or apologetic ("Rooms organize your chores. Click '+ Room' to get started.") — matches the "honest, practical, not gamified" brand principle better than most to-do apps.
3. **Native `<select>` for Room/Recurrence** — a real restraint win against reinventing standard form affordances, which the product register explicitly warns against.

## Priority Issues

**[P0] Systemic muted-text contrast failure across the entire app**
- **Why it matters**: The design system's own secondary text color (`#7A776E`) fails WCAG AA (3.9–4.4:1 vs. the 4.5:1 the system's own DESIGN.md commits to) against both background surfaces it's paired with. This isn't one bad component — it's the token itself, used 30 times across subtitles, section labels, room tags, and recurrence text. Every one of those reads is legally and practically a contrast failure.
- **Fix**: Darken the muted-text token slightly (toward the ink end of the ramp) until it clears 4.5:1 on both `#F4EFE2` and `#FFFDF5`, then it's fixed everywhere at once.
- **Suggested command**: `/impeccable audit` (to get exact corrected hex values) or `/impeccable polish`

**[P0] Room-of-the-Day heading uses raw room color as text color — measured 1.3:1 contrast**
- **Why it matters**: `todayRoom.color` is applied directly as the `<h2>` text color, card border, and checkbox accent. Confirmed independently by both the design review (1.35:1) and the live detector overlay (1.3:1) for green; several palette colors (Peach, Lavender, Mint) would be equally or more unreadable. This is the single worst accessibility defect found.
- **Fix**: Never use raw room color as text-on-surface. Reserve it for small non-text accents (a swatch dot, a border), and use the system's neutral ink color for the heading text itself.
- **Suggested command**: `/impeccable colorize` or `/impeccable polish`

**[P0] Chore deletion has no confirmation or undo, unlike the adjacent room-delete flow**
- **Why it matters**: One click inside the chore detail modal permanently deletes, sitting directly below Edit/Duplicate in identical button styling except border color. Room deletion, one screen away, at least confirms with an affected-item count. A misclick loses data instantly with zero recovery path — the single most emotionally risky moment in the app is also the least protected.
- **Fix**: Add a lightweight two-step confirm (button becomes "Confirm Delete?" for a few seconds) or a toast with Undo — cheaper to build than `window.confirm()` and stays on-brand.
- **Suggested command**: `/impeccable harden`

**[P1] Mobile layout overflows horizontally by 162px at 375px viewport width**
- **Why it matters**: The Room of the Day card's room/recurrence tag columns don't wrap or compress on narrow viewports, causing real horizontal scroll/clipping on phone-sized screens — a hard functional break, not a taste issue.
- **Fix**: Make the tag columns stack or truncate below a breakpoint instead of holding fixed widths.
- **Suggested command**: `/impeccable adapt`

**[P1] Delete affordance and room-color selection both lack consistent, legible signifiers**
- **Why it matters**: "Delete" renders as a bare underlined text link in the Rooms list and a fully-chromed danger button in the chore modal — same destructive verb, two different visual weights, no stated reason. Separately, the 20-color room swatch grid shows the color name only via a hover-only native tooltip (unreachable by keyboard/touch) and includes several near-indistinguishable pairs (Coral/Salmon/Orange) — worsening both P0 contrast issues by making it easy to pick an unreadable color without realizing it.
- **Fix**: Standardize Delete on one treatment (recommend the bordered-button version — destructive actions shouldn't be visually minimized). Show the selected color's name as always-visible text next to the swatch grid, and cut the palette to ~8-10 mutually distinct, pre-vetted-for-contrast colors.
- **Suggested command**: `/impeccable clarify` then `/impeccable polish`

## Persona Red Flags

**"The person who just wants to check things off without thinking"**: Lands on a page where the checklist — their actual goal — is the third section down, behind Room of the Day and Rooms management. Their featured chores ("water plants," "clean bird cages") appear twice on screen (once featured, once in the full list below) with no visual link between the two instances, so it's unclear whether checking one affects the other (it does — same state — but nothing signals that). One row below Edit/Duplicate in the same modal sits an undefended, one-click Delete: a person moving fast to check something off is exactly the person who fat-fingers that button next.

**"The person setting up rooms for the first time"**: Hits the 20-color neon swatch grid with no names visible and has to pick among several near-duplicate options, with no indication the choice is easily reversible later. If they pick anything outside a saturated primary — Lavender, Peach, Mint Green — that room's "Room of the Day" heading may become nearly unreadable (P0 above) with no warning. They also get zero explanation for why the Room of the Day section simply doesn't render until a second room exists — it's a silent gate, not a communicated one.

## Minor Observations

- Browser tab title reads "Chore List | Glitchtype" while the on-page header says "CHORE BOARD" — inconsistent product naming.
- Default room-swatch color is hardcoded `#FFFF00`, one bit off from the design system's actual primary `#FFE600` — likely a typo (detector-confirmed, 4 instances).
- Room-color swatch squares use `1px`/`2px` border-radius values that don't match any token in the defined `rounded` scale.
- `.chip`/`.chip-voltage` and `.terminal` components exist fully built in `glitchtype.css` but are never used in the dashboard — the `.terminal` component in particular is the system's stated "signature" element and is entirely absent from the actual product.
- Emoji (🏠, 📋, ✕) are used for iconography despite DESIGN.md specifying Phosphor Icons (which is imported in `globals.css` but unused in the dashboard) — a direct, verifiable design-system violation.
- Detector flagged monotonous spacing: a single ~4px value accounts for 83% of measured gaps, suggesting reliance on ad-hoc pixel values over the system's own spacing scale tokens.
- `getRoomName` falls back to literal placeholder strings `'(No room)'` / `'(Unknown room)'` — functional but reads like a debug artifact rather than considered copy.

## Questions to Consider

1. If this app is confirmed single-user now, does "Room of the Day" — seemingly designed to rotate visibility/fairness across roommates — still earn first billing on the page, or is it multi-user-era complexity that should be demoted below the main checklist?
2. Would the product be meaningfully worse if room "color" were dropped from all text-bearing contexts (headings, borders) and used only as a small non-text swatch dot — eliminating the root cause of both P0 contrast issues at once?
3. Three near-identical modal structures (Add Room, Edit Room, Create/Edit Chore) share copy-pasted layout code — worth extracting a shared `<Modal>` primitive before a fourth CRUD surface makes the duplication compound?
