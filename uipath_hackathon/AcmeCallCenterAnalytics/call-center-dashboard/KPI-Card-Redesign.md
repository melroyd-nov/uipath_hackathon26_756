# KPI Glow Cards — Style Reference
> Bright, soft-shadow stat cards with per-metric color glow; sparkline/ring data-viz, minimal chrome, airy depth.

**Theme:** Light

These cards live on a soft off-white canvas and use saturated, glowing gradients to differentiate each metric — graphite-and-cyan for revenue, bright emerald for daily sales, magenta/green rings for compact percentage stats, and a purple-to-orange radial glow for the hero progress card. Numerals are large and high-contrast against translucent dark or saturated gradient fills; supporting data-viz (sparkline, bar spark, progress ring) is rendered in low-opacity white so it reads as texture rather than competing with the headline number. Labels are small, muted, and sit at the bottom of each card — the number always leads. The gradient cards stay vivid and self-contained "islands" of color floating on the light page, rather than blending into it.

---

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Canvas BG | `#F5F4F2` | `--color-surface-canvas` | Page / app background |
| Canvas Glow | `radial-gradient(circle at 50% 30%, rgba(220,200,170,0.25), transparent 70%)` | `--color-canvas-glow` | Ambient warm glow behind cards |
| Card Graphite | `linear-gradient(180deg,#3A3A3A 0%,#262626 100%)` | `--color-card-graphite` | Revenue card top section |
| Card Cyan | `linear-gradient(135deg,#4DD8E8 0%,#2BB8D4 100%)` | `--color-card-cyan` | Revenue card bottom section |
| Card Emerald | `linear-gradient(135deg,#22A35F 0%,#0E6B3A 100%)` | `--color-card-emerald` | Daily-sales glow card |
| Card Purple-Orange | `linear-gradient(160deg,#B26FE0 0%,#D98CB4 45%,#F2A06A 100%)` | `--color-card-purple-orange` | Hero radial-progress card |
| Pill Surface | `#FFFFFF` | `--color-pill-bg` | Compact ring-stat pill background |
| Ring Green | `#2FBE6F` | `--color-ring-green` | Progress ring — positive metric |
| Ring Magenta | `#E84DC4` | `--color-ring-magenta` | Progress ring — secondary metric |
| Ring Track (on pill) | `#ECEAE6` | `--color-ring-track-light-surface` | Unfilled ring track on white pill |
| Ring Track (on gradient) | `rgba(255,255,255,0.30)` | `--color-ring-track-on-gradient` | Unfilled ring track on gradient card |
| Content On-Dark | `#FFFFFF` | `--color-content-on-dark` | Headline numerals on graphite/gradient cards |
| Content On-Dark Muted | `rgba(255,255,255,0.65)` | `--color-content-on-dark-muted` | Card meta labels on gradient/graphite cards |
| Content On-Light Primary | `#1A1A1A` | `--color-content-on-light-primary` | Numerals/text on white pill surfaces |
| Content On-Light Muted | `#8A8A86` | `--color-content-on-light-muted` | Meta labels on white pill surfaces |
| Badge BG | `rgba(255,255,255,0.25)` | `--color-badge-bg` | "Sales" pill badge fill (on cyan section) |
| Badge Text | `#FFFFFF` | `--color-badge-text` | Pill badge label |
| Sparkline Stroke | `rgba(255,255,255,0.70)` | `--color-sparkline-stroke` | Line sparkline on graphite card |
| Bar Spark Fill | `rgba(255,255,255,0.60)` | `--color-bar-spark-fill` | Bar sparkline on emerald card |

---

## Tokens — Typography

### [TODO — font family not visually determinable from reference]
- **Substitute:** system-ui, -apple-system, sans-serif
- **Token:** `--font-display`
- **Weights:** 500, 600, 700 (numerals appear semibold/bold; labels appear medium)
- **Role:** All card text — headline numerals, meta labels, pill text

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token / Class |
|------|------|-------------|----------------|---------------|
| Headline numeral (large card) | 28px – 32px | leading-none | tracking-tight | `text-[28px]`–`text-[32px]` |
| Headline numeral (hero ring %) | 22px | leading-none | tracking-tight | `text-[22px]` |
| Pill numeral (compact ring card) | 16px | leading-none | normal | `text-[16px]` |
| Card meta label | 11px | leading-tight | normal | `text-[11px]` |
| Pill meta label | 10px | leading-tight | normal | `text-[10px]` |
| Badge / pill chip text | 11px | leading-none | normal | `text-[11px]` |

---

## Tokens — Spacing & Shapes

**Base unit:** 4px
**Density:** Comfortable — generous internal padding relative to card size; few elements per card.

### Spacing Scale

| Name | Value | Token / Class |
|------|-------|---------------|
| 1 | 4px | `gap-1` |
| 2 | 8px | `gap-2`, `p-2` |
| 3 | 12px | `gap-3`, `p-3` |
| 4 | 16px | `p-4` |
| 5 | 20px | `p-5` |
| 6 | 24px | `p-6` |

### Border Radius

| Element | Value |
|---------|-------|
| Compact ring pill | `rounded-full` (9999px) |
| Badge / chip | `rounded-full` (9999px) |
| Standard KPI card | `rounded-[24px]` |
| Stacked card (top + bottom sections) | `rounded-[24px]` outer, `rounded-t-[24px]` / `rounded-b-[24px]` per section |
| Hero glow card | `rounded-[28px]` |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| Card ambient glow (cyan) | `0 10px 28px rgba(45,184,212,0.30)` | _(inline)_ |
| Card ambient glow (emerald) | `0 10px 28px rgba(20,120,70,0.28)` | _(inline)_ |
| Card ambient glow (purple-orange) | `0 14px 36px rgba(200,120,160,0.28)` | _(inline)_ |
| Card ambient glow (graphite) | `0 8px 22px rgba(0,0,0,0.18)` | _(inline)_ |
| Pill subtle lift | `0 2px 10px rgba(0,0,0,0.08)` | _(inline)_ |

### Layout

| Property | Value |
|----------|-------|
| Card grid gap | `gap-4`–`gap-5` (16px–20px) |
| Card padding | `p-5` (20px) |
| Pill padding | `px-4 py-3` |
| Stacked card section split | ~60% top (graphite) / 40% bottom (cyan) |

---

## Components

### KPICard — Stacked Dual-Tone (Revenue)
- **Role:** Primary revenue figure with trend sparkline, plus a secondary percentage section
- **Top section:** `bg-[linear-gradient(180deg,#3A3A3A,#262626)] rounded-t-[24px] p-5 shadow-[0_8px_22px_rgba(0,0,0,0.18)]`
  - Numeral: `text-[30px] font-semibold text-white tracking-tight` with `$` prefix at reduced weight
  - Sparkline: thin white-on-transparent line chart, `stroke-[rgba(255,255,255,0.70)]`, no axis/grid
  - Label: `text-[11px] text-[rgba(255,255,255,0.65)]` bottom-left, e.g. "New Sales Last Period"
- **Bottom section:** `bg-[linear-gradient(135deg,#4DD8E8,#2BB8D4)] rounded-b-[24px] p-5 -mt-2` (slight overlap to read as "stacked")
  - Numeral: `text-[26px] font-semibold text-white` (percentage)
  - Badge: pill chip, `bg-[rgba(255,255,255,0.25)] text-white text-[11px] rounded-full px-3 py-1`, right-aligned

### KPICard — Glow (Emerald, Bar Spark)
- **Role:** Single-metric card with bar-style sparkline texture
- **Spec:** `bg-[linear-gradient(135deg,#22A35F,#0E6B3A)] rounded-[24px] p-5 shadow-[0_10px_28px_rgba(20,120,70,0.28)]`
- **Numeral:** `text-[28px] font-semibold text-white tracking-tight`, `$` prefix
- **Bar spark:** row of vertical bars, varying height, `bg-[rgba(255,255,255,0.60)] rounded-[2px]`, positioned mid-card
- **Label:** `text-[11px] text-[rgba(255,255,255,0.70)]` bottom-left, e.g. "Sales by Day"

### KPIPill — Compact Ring Stat
- **Role:** Small horizontal stat with circular progress ring, used for secondary metrics in a vertical stack
- **Spec:** `bg-white rounded-full flex items-center gap-3 px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.08)] border border-[#ECEAE6]`
- **Ring:** `w-9 h-9` circular progress (SVG stroke), track `stroke-[#ECEAE6]`, fill `stroke-[#2FBE6F]` (green variant) or `stroke-[#E84DC4]` (magenta variant), `stroke-width-[3px] stroke-linecap-round`
- **Numeral:** `text-[16px] font-semibold text-[#1A1A1A]`
- **Label:** `text-[10px] text-[#8A8A86]`, stacked under numeral

### KPICard — Hero Radial Glow
- **Role:** Large single-metric "hero" card, dominant circular progress ring with centered percentage
- **Spec:** `bg-[linear-gradient(160deg,#B26FE0_0%,#D98CB4_45%,#F2A06A_100%)] rounded-[28px] p-6 shadow-[0_14px_36px_rgba(200,120,160,0.28)] flex flex-col items-center justify-center aspect-[4/5]`
- **Ring:** large circular progress, multi-ring/segmented look, track `stroke-[rgba(255,255,255,0.30)]`, fill `stroke-white`, `stroke-width-[6px] stroke-linecap-round`
- **Numeral:** centered inside ring, `text-[22px] font-bold text-white`
- **Label:** `text-[11px] text-[rgba(255,255,255,0.75)]` bottom-center, e.g. "Sales by Day"

---

## Do's and Don'ts

### Do's
- Give every card its own saturated glow color tied to the metric it represents — don't reuse the same gradient across two cards.
- Keep the headline numeral the single largest, highest-contrast element on the card; everything else (sparkline, ring, label) is supporting texture.
- Render sparklines/bar-sparks/rings in translucent white (`rgba(255,255,255,0.18–0.70)`) over gradient or graphite fills rather than introducing a third color.
- Use `rounded-full` consistently for compact pill stats and badges; reserve large radii (`rounded-[24px]`–`[28px]`) for the bigger cards.
- Pair each gradient card with a matching brand-tinted ambient shadow (not neutral black) to sell the "glow" against the light canvas.
- Give white pill surfaces a hairline border (`#ECEAE6`) since a soft shadow alone won't separate white-on-near-white.

### Don'ts
- Don't put a dark numeral on a gradient card or a light numeral on the white pill surface — contrast must stay numeral-vs-background maximal at all times.
- Don't add grid lines, axis labels, or tick marks to sparklines/rings — they're ambient texture, not analytical charts.
- Don't mix more than one accent ring color inside a single pill or card.
- Don't let the canvas get bright enough to wash out card edges — keep the off-white canvas (`#F5F4F2`) rather than pure white, so gradient cards still read as elevated.
- Don't crowd a card with more than one numeral + one supporting visual + one label — these cards read as glanceable, not dense.

---

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Canvas | `#F5F4F2` | Base app background |
| 1 | Graphite Card Section | `linear-gradient(180deg,#3A3A3A,#262626)` | Revenue card top section |
| 1 | Pill Surface | `#FFFFFF` | Compact ring-stat pills |
| 2 | Cyan Glow Section | `linear-gradient(135deg,#4DD8E8,#2BB8D4)` | Revenue card bottom section |
| 2 | Emerald Glow Card | `linear-gradient(135deg,#22A35F,#0E6B3A)` | Daily sales card |
| 2 | Purple-Orange Glow Card | `linear-gradient(160deg,#B26FE0,#D98CB4,#F2A06A)` | Hero progress card |

---

## Elevation

| Tier | Shadow | Used On |
|------|--------|---------|
| Flush | none | Labels, ring tracks |
| Pill lift | `0 2px 10px rgba(0,0,0,0.08)` | Compact ring-stat pills |
| Card glow (graphite) | `0 8px 22px rgba(0,0,0,0.18)` | Revenue card top section |
| Card glow (cyan) | `0 10px 28px rgba(45,184,212,0.30)` | Revenue card bottom section |
| Card glow (emerald) | `0 10px 28px rgba(20,120,70,0.28)` | Daily sales card |
| Card glow (purple-orange) | `0 14px 36px rgba(200,120,160,0.28)` | Hero progress card |

---

## Imagery

- **Sparklines:** single thin line, smooth/curved interpolation, no markers, `stroke-[rgba(255,255,255,0.70)]`, no fill beneath.
- **Bar sparks:** simple vertical bar series, uneven heights, `rgba(255,255,255,0.60)`, no axis.
- **Progress rings:** SVG circle with `stroke-dasharray` for percentage fill, rounded line caps, no center icon — center reserved for the numeral.
- **Icons:** [TODO — no icon usage visible in reference besides the badge chip text]
- No raster images, no avatars, no photography — entirely gradient + vector data-viz.

---

## Layout

```
┌───────────────────────┬───────────────────────┐
│ KPICard — Stacked      │ KPICard — Emerald     │
│  (Graphite + Cyan)     │  (Bar Spark Glow)     │
│  rounded-[24px]        │  rounded-[24px]       │
├───────────────────────┼───────────────────────┤
│ KPIPill — Ring (green) │                       │
│ KPIPill — Ring (magenta)│ KPICard — Hero Radial │
│  rounded-full, stacked │  (Purple→Orange Glow) │
│                        │  rounded-[28px]       │
└───────────────────────┴───────────────────────┘
```

- **Grid:** 2-column on desktop; cards vary in height (hero card taller, pills compact).
- **Card sizing:** Stacked/Emerald cards roughly square-ish (~1:0.85); Hero card portrait (~4:5); pills are short fixed-height rows.
- **Gap:** `gap-4`–`gap-5` between cards in the grid.

---

## Agent Prompt Guide

### Quick Color Reference

| Intent | Value | When to Use |
|--------|-----|--------------|
| Canvas | `#F5F4F2` | App/page background behind all cards |
| Revenue card (top) | `linear-gradient(180deg,#3A3A3A,#262626)` | Graphite section, large $ figure + sparkline |
| Revenue card (bottom) | `linear-gradient(135deg,#4DD8E8,#2BB8D4)` | Cyan section, percentage + badge |
| Daily sales card | `linear-gradient(135deg,#22A35F,#0E6B3A)` | Emerald glow, $ figure + bar spark |
| Hero progress card | `linear-gradient(160deg,#B26FE0,#D98CB4,#F2A06A)` | Purple→orange glow, large ring + % |
| Ring — positive | `#2FBE6F` | Green progress ring fill |
| Ring — secondary | `#E84DC4` | Magenta progress ring fill |
| Text on gradient/graphite | `#FFFFFF` | All numerals and labels on colored cards |
| Text on white pill | `#1A1A1A` | Numerals on compact ring pills |
| Muted label on white pill | `#8A8A86` | Meta labels on compact ring pills |

### Example Component Prompts

**1. Stacked revenue card (graphite + cyan):**
```
rounded-[24px] overflow-hidden
[top section]: bg-[linear-gradient(180deg,#3A3A3A,#262626)] p-5 shadow-[0_8px_22px_rgba(0,0,0,0.18)]
  text-[30px] font-semibold text-white tracking-tight
[bottom section]: bg-[linear-gradient(135deg,#4DD8E8,#2BB8D4)] p-5 -mt-2
  text-[26px] font-semibold text-white
```

**2. Emerald bar-spark glow card:**
```
bg-[linear-gradient(135deg,#22A35F,#0E6B3A)] rounded-[24px] p-5
shadow-[0_10px_28px_rgba(20,120,70,0.28)]
text-[28px] font-semibold text-white tracking-tight
```

**3. Compact ring-stat pill:**
```
bg-white border border-[#ECEAE6] rounded-full flex items-center gap-3 px-4 py-3
shadow-[0_2px_10px_rgba(0,0,0,0.08)]
ring: stroke-[#2FBE6F] stroke-width-[3px] stroke-linecap-round track-[#ECEAE6]
text-[16px] font-semibold text-[#1A1A1A]
```

**4. Hero radial-glow card:**
```
bg-[linear-gradient(160deg,#B26FE0_0%,#D98CB4_45%,#F2A06A_100%)]
rounded-[28px] p-6 shadow-[0_14px_36px_rgba(200,120,160,0.28)]
aspect-[4/5] flex flex-col items-center justify-center
ring: stroke-white stroke-width-[6px] track-[rgba(255,255,255,0.30)]
text-[22px] font-bold text-white
```

**5. Badge / pill chip (on cyan section):**
```
bg-[rgba(255,255,255,0.25)] text-white text-[11px] rounded-full px-3 py-1
```

---

## Similar Brands

- **Apple Fitness rings / widgets (light mode)** — same glassy, glowing-ring, percentage-forward visual language on a light backdrop
- **Mint (light mode)** — comparable light-canvas + single accent-glow card treatment for financial figures
- **Oura Ring app (light mode)** — shared use of large circular progress rings with centered percentage on gradient cards
- **Stripe Dashboard (light mode)** — similar use of sparklines as ambient texture under a dominant numeral
- **Notion dashboards w/ colorful widget cards** — comparable saturated gradient "hero" cards on a light, neutral base

---

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Surfaces */
  --color-surface-canvas: #F5F4F2;
  --color-canvas-glow: radial-gradient(circle at 50% 30%, rgba(220,200,170,0.25), transparent 70%);

  /* Card gradients */
  --color-card-graphite: linear-gradient(180deg, #3A3A3A 0%, #262626 100%);
  --color-card-cyan: linear-gradient(135deg, #4DD8E8 0%, #2BB8D4 100%);
  --color-card-emerald: linear-gradient(135deg, #22A35F 0%, #0E6B3A 100%);
  --color-card-purple-orange: linear-gradient(160deg, #B26FE0 0%, #D98CB4 45%, #F2A06A 100%);

  /* Pill */
  --color-pill-bg: #FFFFFF;
  --color-pill-border: #ECEAE6;

  /* Rings */
  --color-ring-green: #2FBE6F;
  --color-ring-magenta: #E84DC4;
  --color-ring-track-light-surface: #ECEAE6;
  --color-ring-track-on-gradient: rgba(255, 255, 255, 0.30);

  /* Content */
  --color-content-on-dark: #FFFFFF;
  --color-content-on-dark-muted: rgba(255, 255, 255, 0.65);
  --color-content-on-light-primary: #1A1A1A;
  --color-content-on-light-muted: #8A8A86;

  /* Badge / data-viz */
  --color-badge-bg: rgba(255, 255, 255, 0.25);
  --color-badge-text: #FFFFFF;
  --color-sparkline-stroke: rgba(255, 255, 255, 0.70);
  --color-bar-spark-fill: rgba(255, 255, 255, 0.60);

  /* Fonts */
  --font-display: system-ui, -apple-system, sans-serif; /* [TODO: confirm actual brand font] */
}
```

### Tailwind v4

```css
@theme {
  /* Surfaces */
  --color-surface-canvas: #F5F4F2;

  /* Card gradients (as flat fallback colors; use inline gradient classes for the actual gradient) */
  --color-card-graphite-start: #3A3A3A;
  --color-card-graphite-end: #262626;
  --color-card-cyan-start: #4DD8E8;
  --color-card-cyan-end: #2BB8D4;
  --color-card-emerald-start: #22A35F;
  --color-card-emerald-end: #0E6B3A;
  --color-card-purple-start: #B26FE0;
  --color-card-purple-mid: #D98CB4;
  --color-card-orange-end: #F2A06A;

  /* Pill */
  --color-pill-bg: #FFFFFF;
  --color-pill-border: #ECEAE6;

  /* Rings */
  --color-ring-green: #2FBE6F;
  --color-ring-magenta: #E84DC4;
  --color-ring-track-light-surface: #ECEAE6;
  --color-ring-track-on-gradient: rgba(255, 255, 255, 0.30);

  /* Content */
  --color-content-on-dark: #FFFFFF;
  --color-content-on-dark-muted: rgba(255, 255, 255, 0.65);
  --color-content-on-light-primary: #1A1A1A;
  --color-content-on-light-muted: #8A8A86;

  /* Badge / data-viz */
  --color-badge-bg: rgba(255, 255, 255, 0.25);
  --color-sparkline-stroke: rgba(255, 255, 255, 0.70);
  --color-bar-spark-fill: rgba(255, 255, 255, 0.60);

  /* Fonts */
  --font-family-display: system-ui, -apple-system, sans-serif; /* [TODO: confirm actual brand font] */
}
```
