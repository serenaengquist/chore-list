---
version: alpha
name: Glitchtype
description: A light, retro-terminal design system built on VT323 monospace voice, hairline ink borders, hard offset shadows, and chromatic RGB aberration on a paper-cream substrate.
theme: light
colors:
  primary: "#FFE600"
  on-primary: "#0B0B0B"
  secondary: "#0B0B0B"
  on-secondary: "#F4EFE2"
  tertiary: "#7A776E"
  neutral: "#F4EFE2"
  surface: "#FFFDF5"
  surface-sunk: "#EBE5D4"
  on-surface: "#0B0B0B"
  on-surface-muted: "#7A776E"
  border: "#0B0B0B"
  focus: "#FFE600"
  glitch-red: "#FF3344"
  glitch-green: "#10B25A"
  glitch-blue: "#2A5BFF"
  error: "#FF3344"
  success: "#10B25A"
  info: "#2A5BFF"
typography:
  display-xl:
    fontFamily: "VT323, monospace"
    fontSize: "clamp(3.75rem, 6.5vw + 1rem, 6rem)"
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    textTransform: "uppercase"
  display-lg:
    fontFamily: "VT323, monospace"
    fontSize: "clamp(2.75rem, 4.5vw + 1rem, 4.25rem)"
    lineHeight: 1.1
    textTransform: "uppercase"
  display-md:
    fontFamily: "VT323, monospace"
    fontSize: "clamp(2rem, 3vw + 1rem, 3rem)"
    lineHeight: 1.1
    textTransform: "uppercase"
  headline-lg:
    fontFamily: "VT323, monospace"
    fontSize: "2rem"
    lineHeight: 1.1
    textTransform: "uppercase"
  headline-md:
    fontFamily: "VT323, monospace"
    fontSize: "1.5rem"
    lineHeight: 1.1
    textTransform: "uppercase"
  headline-sm:
    fontFamily: "VT323, monospace"
    fontSize: "1.25rem"
    lineHeight: 1.25
    textTransform: "uppercase"
  body-lg:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.0625rem"
    lineHeight: 1.7
  body-md:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.9375rem"
    lineHeight: 1.5
  body-sm:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.8125rem"
    lineHeight: 1.5
  label-sm:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    lineHeight: 1.25
    letterSpacing: "0.16em"
    textTransform: "uppercase"
  label-micro:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.6875rem"
    lineHeight: 1.25
    letterSpacing: "0.16em"
    textTransform: "uppercase"
rounded:
  none: "0px"
  sm: "6px"
  md: "10px"
  lg: "15px"
  xl: "22px"
  full: "999px"
spacing:
  2xs: "0.25rem"
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
  3xl: "4.5rem"
  4xl: "6rem"
  gutter: "clamp(1rem, 3vw, 2.5rem)"
elevation:
  rest: "4px 4px 0 0 #0B0B0B"
  hover: "6px 6px 0 0 #0B0B0B"
  press: "0 0 0 0 #0B0B0B"
  chromatic: "-2px 0 0 0 #FF3344, 2px 0 0 0 #2A5BFF"
  chromatic-focus: "-3px -3px 0 0 #FF3344, 3px 3px 0 0 #2A5BFF"
  ring-focus: "0 0 0 3px #FFE600"
borders:
  hairline: "1px solid #0B0B0B"
  hairline-mute: "1px solid #7A776E"
  hairline-voltage: "1px solid #FFE600"
  dashed: "1px dashed #0B0B0B"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    border: "{borders.hairline}"
    typography: "{typography.headline-sm}"
    rounded: "{rounded.lg}"
    padding: "10px 13px"
    minWidth: "175px"
    elevation: "{elevation.rest}"
  button-primary-hover:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.primary}"
    border: "{borders.hairline}"
    elevation: "{elevation.hover}"
  button-primary-active:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    elevation: "{elevation.press}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    border: "{borders.hairline}"
    typography: "{typography.headline-sm}"
    rounded: "{rounded.lg}"
    padding: "10px 13px"
    elevation: "{elevation.rest}"
  button-secondary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    border: "{borders.hairline-voltage}"
    elevation: "{elevation.hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    border: "{borders.hairline}"
    rounded: "{rounded.lg}"
    elevation: "0 0 0 0 transparent"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    border: "{borders.hairline}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "10px 13px"
    elevation: "{elevation.rest}"
  input-field-focus:
    border: "{borders.hairline-voltage}"
    elevation: "{elevation.chromatic-focus}"
  input-field-invalid:
    border: "1px solid {colors.error}"
    elevation: "{elevation.chromatic}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    border: "{borders.hairline}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    elevation: "{elevation.rest}"
  card-feature:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    border: "{borders.hairline}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    elevation: "{elevation.rest}"
  checkbox:
    backgroundColor: "{colors.surface}"
    border: "{borders.hairline}"
    rounded: "{rounded.md}"
    size: "20px"
  checkbox-checked:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    border: "{borders.hairline}"
    elevation: "{elevation.chromatic-focus}"
  tabs:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.headline-sm}"
    border: "2px solid {colors.border}"
  tabs-active:
    textColor: "{colors.on-surface}"
    underline: "2px solid {colors.primary}"
    elevation: "{elevation.chromatic}"
  terminal-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    border: "{borders.hairline}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    elevation: "{elevation.rest}"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    border: "{borders.hairline}"
    rounded: "{rounded.full}"
    typography: "{typography.label-micro}"
    padding: "2px 8px"
iconography:
  library: "Phosphor Icons"
  url: "https://phosphoricons.com/"
  weight: "regular"
  license: "MIT"
---

## Overview

Glitchtype is a paper-bright, retro-terminal design system. It pairs the precise feel of a CRT console — VT323 display type, hairline ink borders, dotted rules, blinking carets — with a controlled chromatic-aberration motif borrowed from analog video noise. The palette runs on a warm cream substrate and reserves a single high-voltage yellow as the action color, ringed in red, green, and blue ghost offsets that fire on emphasis.

The system is framework-agnostic plain CSS. Token names map one-to-one to CSS custom properties in `css/system.css`, so the front matter above can drive code generation or design-tooling consumers without translation.

Anatomy at a glance:

- **Substrate:** cream paper (`#F4EFE2`) backgrounds with brighter cream surfaces.
- **Ink:** near-black 1px hairlines for borders, dotted rules, and type.
- **Signature:** voltage yellow (`#FFE600`) for primary actions, focus, and selection.
- **Aberration:** red/green/blue offsets used as hover and focus emphasis, not background noise.
- **Shape:** a fixed 15px outer radius across buttons, inputs, cards, tabs, and panels; 10px on inner controls.
- **Elevation:** hard offset ink shadows (no blur), shifting from 4px rest to 6px hover and flattening on press.

## Colors

The palette is a four-layer system: paper substrate, ink/mute neutrals, a single voltage accent, and three chromatic ghosts.

| Token | Hex | Role |
| --- | --- | --- |
| `neutral` | `#F4EFE2` | Primary page and surface background. |
| `surface` | `#FFFDF5` | Card, input, panel surface. |
| `surface-sunk` | `#EBE5D4` | Disabled fills, secondary wells. |
| `on-surface` | `#0B0B0B` | Primary text and hairline borders. |
| `on-surface-muted` | `#7A776E` | Secondary text, inactive UI. |
| `primary` | `#FFE600` | Action fill, focus, selection. |
| `on-primary` | `#0B0B0B` | Type and iconography on voltage fills. |
| `glitch-red` | `#FF3344` | Chromatic aberration, destructive cue. |
| `glitch-green` | `#10B25A` | Chromatic aberration, success cue. |
| `glitch-blue` | `#2A5BFF` | Chromatic aberration, info cue. |

Contrast: ink on paper measures roughly 17:1; voltage yellow is used only with ink-black text to keep WCAG AA pass. The mute gray (`#7A776E` on paper) is reserved for non-critical metadata and labels, not body copy.

The three glitch accents are never used as flat background fills. They appear as 2–3px offset ghosts on focus, on hover, and inside the signature terminal panel.

## Typography

Three families do distinct jobs:

- **VT323** — display, headlines, button labels, tab labels, terminal voice. Always uppercase, tracked tight.
- **JetBrains Mono** — body copy, UI labels, code, and dense rows.
- **Space Grotesk** — supportive long-form prose where monospace becomes tiring to read.

Display sizes step from `headline-sm` (1.25rem) up to `display-xl` (clamping to ~96px) using fluid `clamp()` values so the same tokens hold on small and large viewports. Body sits at 15px monospace, which is the readable baseline for VT-adjacent fonts.

Tracked uppercase labels use `letter-spacing: 0.16em` to read as proper micro-eyebrows. Reserve them for section markers, card headers, and terminal metadata.

## Layout

- **Container:** `1200px` max width with a fluid gutter `clamp(1rem, 3vw, 2.5rem)`.
- **Spacing:** the `2xs → 4xl` scale follows a 4-up rhythm (`0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem, 3rem, 4.5rem, 6rem`).
- **Grid:** prefer 2- or 3-column grids with `1.5rem` gap; collapse to a single column under `720px`.
- **Density:** comfortable but text-forward. Cards and panels breathe at `1.5rem` padding; inputs and buttons stay tight at `10px 13px` to honor the terminal voice.

Vertical sections use `padding-block: var(--space-3xl)` to give monospace headlines room to land. Avoid stacking more than one signature element (yellow card, terminal panel) per viewport.

## Elevation & Depth

The system is flat — no blur, no glass, no gradients. Depth comes from a single hard offset shadow language:

- **Rest:** `4px 4px 0 0 #0B0B0B` under buttons, inputs, cards, and panels.
- **Hover:** `6px 6px 0 0 #0B0B0B` paired with a 2px lift transform.
- **Press:** shadow removed, element snaps to its shadow position.
- **Focus:** `0 0 0 3px #FFE600` ring, layered above the hover shadow.
- **Chromatic:** red/blue offset pair (`elevation.chromatic`) replaces the ink shadow on focused inputs and checked checkboxes for emphasis.

A faint scanline overlay is reserved exclusively for the signature terminal panel, applied via a repeating linear gradient at 6% opacity. Do not paint scanlines across the page.

## Shapes

The shape language is anchored to the source radius (`15px`) and propagated as `rounded.lg`. Smaller controls echo with `rounded.md` (10px). Pills and chips use `rounded.full`. Square corners are not part of the system — even the smallest control rounds at `rounded.sm` (6px).

Borders are always crisp 1px ink hairlines. There are no soft strokes, double borders, or filled outlines. Dotted hairlines (`borders.dashed`) are reserved for card header/footer rules and terminal titlebars to signal structural divisions without changing material weight.

## Components

### Button

```html
<button class="btn btn-primary">
  <span class="btn-label">Boot Sequence</span>
  <span class="btn-caret">_</span>
</button>
```

Anchored to `headline-sm` VT323, `10px 13px` padding, `rounded.lg`, and a 1px ink border. The primary variant fills with voltage yellow; hover flips to ink-black background with voltage type and runs a 320ms RGB chromatic flicker on the label. Press flattens the shadow and snaps the button down 4px to meet it.

### Input

```html
<label class="field">
  <span class="field-label">Compile Target</span>
  <span class="input">
    <input type="text" placeholder="./build" />
  </span>
</label>
```

The `>` VT323 prompt is rendered as a `::before` pseudo-element so HTML stays clean. Focus shifts the border to voltage yellow and replaces the ink offset shadow with a chromatic red/blue pair, echoing the source's glitch motif at a controlled scale.

### Card

```html
<article class="card">
  <header class="card-header">
    <span class="card-eyebrow">// Module 01</span>
    <span class="chip chip-voltage">v0.42</span>
  </header>
  <h3 class="card-title">Static Compiler</h3>
  <p class="card-body">Builds a paper-bright artifact in one pass.</p>
  <footer class="card-footer">
    <span>READY</span><span>04:18</span>
  </footer>
</article>
```

Cards always use the dotted hairline for the header/footer rule and the solid ink hairline for the outer border. The feature variant trades the surface for voltage yellow — use sparingly, max one per row.

### Checkbox

```html
<label class="check">
  <input type="checkbox" checked />
  <span>Enable scanlines</span>
</label>
```

The 20px square uses `rounded.md` and an ink hairline. Checked state paints voltage yellow, stamps an ink check, and applies the chromatic-focus shadow so the box reads as energized at a glance.

### Tabs

```html
<div class="tabs" role="tablist">
  <button class="tab is-active" role="tab" aria-selected="true">Console</button>
  <button class="tab" role="tab">Variables</button>
  <button class="tab" role="tab">Network</button>
</div>
```

Underline-style tab strip. The active tab gets a 2-line voltage underline shadowed by a small chromatic offset, keeping the RGB motif legible without burning attention.

### Signature — GlitchTerminal Panel

```html
<section class="terminal">
  <header class="terminal-titlebar">
    <span class="terminal-dots"><span></span><span></span><span></span></span>
    <span class="terminal-title">glitchtype.sh</span>
    <span class="terminal-meta">SESSION 01</span>
  </header>
  <div class="terminal-body">
    <div class="terminal-line">
      <span class="terminal-cmd">run --paper-mode</span>
    </div>
    <div class="terminal-line is-out">
      <span class="terminal-out">compiled in 0.42s · 0 warnings</span>
    </div>
    <div class="terminal-prompt">
      <span class="terminal-caret"></span>
    </div>
  </div>
</section>
```

The terminal panel is the signature fifth element. A dotted titlebar carries three traffic-light dots (red, voltage, green), a VT323 filename, and a tracked metadata label. The body uses prompt-prefixed lines, a blinking voltage caret, and a faint scanline overlay that is unique to this panel.

### Iconography

This system uses **[Phosphor Icons](https://phosphoricons.com/)** (MIT). Use the regular weight only. Phosphor's geometric, slightly playful outline matches the brutalist-meets-CRT tone better than a strictly mechanical icon set.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/regular/style.css" />
<i class="ph ph-terminal-window" aria-hidden="true"></i>
```

Icons inherit `currentColor` so they pick up the surrounding type token automatically. Do not mix icon weights and do not substitute SVG paths from other libraries.

## Do's and Don'ts

**Do**

- Use voltage yellow as the single source of energy — one accent per surface beats three.
- Pair every hard offset shadow with a `translate` on hover so the depth visibly snaps.
- Reserve the RGB chromatic offset for emphasis moments: hover, focus, checked, signature headlines.
- Keep VT323 in uppercase. It is calibrated for caps and gets fragile in lowercase at small sizes.
- Use dotted rules inside cards and terminal panels, solid hairlines on the outside.

**Don't**

- Don't paint scanlines or chromatic noise across the whole page. The motif loses meaning when it is everywhere.
- Don't introduce soft shadows, blur, or glassmorphism — the system is flat-with-offset.
- Don't bend the 15px radius. Inner controls round at 10px; everything else outer at 15px.
- Don't combine more than one signature surface (voltage card + terminal panel) in the same viewport.
- Don't replace the icon library or mix Phosphor weights within the same screen.
