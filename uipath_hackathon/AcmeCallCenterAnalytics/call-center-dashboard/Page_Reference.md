# Escalations Page — Components, UI Layout & Backend API Reference

Covers only the Escalations route (`/escalations`, `EscalationsPage.tsx`) in full detail: every component it renders, the exact on-screen layout, and every backend endpoint it calls.

---

## 1. Page-level data fetching

`EscalationsPage.tsx` issues 3 React Query calls on load:

| Hook | API client call | Backend endpoint | Re-fetches on |
|---|---|---|---|
| `byAgent` | `analyticsApi.escalationByAgent({start_date, end_date})` | `GET /api/analytics/escalations/by-agent` | `start`, `end` only |
| `trend` | `analyticsApi.escalationTrend(filters)` | `GET /api/analytics/escalations/trend` | `start`, `end`, `agent` |
| `rootCause` | `analyticsApi.escalationRootCause(filters)` | `GET /api/analytics/escalations/root-cause` | `start`, `end`, `agent` |

`filters = { start_date: start, end_date: end, agent }` from `presetRange(preset)` (default index `0`) + the agent dropdown.

Note: `byAgent` does not accept an `agent` filter at all — neither the frontend client function nor the backend route definition has an `agent` parameter for `/escalations/by-agent`. It always returns all agents regardless of the page's selected agent filter. `trend` and `rootCause` both respect the agent filter.

`intentData` (derived, not a query) = `(rootCause.data?.by_intent ?? []).map(i => ({ label: i.intent, value: i.escalation_count }))` — reshapes the root-cause response for `HorizontalBarChart`.

---

## 2. On-screen layout (top → bottom)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ FilterBar — date-range preset pills + agent dropdown                     │
├──────────────────────────────────────────────────────────────────────────┤
│ (i) "How are escalation metrics calculated?" — collapsible link/button   │
│      (purple text, Info icon + chevron, collapsed by default)            │
│      ▼ When expanded, 2-section methodology panel:                       │
│        1. Escalation Rate        (AlertTriangle icon, amber)             │
│        2. Escalations by Intent  (BarChart2 icon, red)                   │
├──────────────────────────────────────────────────────────────────────────┤
│ ROW 1 — 2-column grid (lg:grid-cols-2):                                  │
│  ┌─ GlassPanel ────────────────────┐ ┌─ GlassPanel ─────────────────────┐│
│  │ "Escalation Rate by Agent"      │ │ "Escalation Trend"               ││
│  │ subtitle: "Benchmark: 10%       │ │ subtitle: "Monthly escalation %  ││
│  │  (amber line)"                  │ │  over time"                      ││
│  │ EscalationByAgentChart          │ │ TrendLineChart (line, 1 series,  ││
│  │ (horizontal bars, dashed        │ │  amber dashed 10% benchmark line)││
│  │  benchmark line at 10%)         │ │                                  ││
│  │ + ChartInsight                  │ │ + ChartInsight                   ││
│  └──────────────────────────────────┘ └───────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────────────┤
│ GlassPanel: "Escalations by Intent"                                      │
│   subtitle: "Which call types drive escalations"                        │
│   HorizontalBarChart (amber bars, one per intent, no benchmark line)     │
│   or EmptyState (message="No intent data") if rootCause has no rows      │
│   + ChartInsight                                                         │
├──────────────────────────────────────────────────────────────────────────┤
│ GlassPanel: "Agent Escalation Summary"  — full-width table                │
│   Columns: Agent | Total Calls | Escalated | Escalation %                │
│   (EmptyState shown if no rows, colSpan=4)                               │
└──────────────────────────────────────────────────────────────────────────┘
```

Each panel shows a `LoadingSpinner` in place of its chart/table while its own query is loading (`byAgent.isLoading`, `trend.isLoading`, `rootCause.isLoading` respectively — independent per panel).

---

## 3. Component inventory

### 3.1 Page-owned (defined inline in `EscalationsPage.tsx`)

| Logic | Purpose |
|---|---|
| Methodology toggle (`showMetricInfo` state) | Expand/collapse the "How are escalation metrics calculated?" banner |
| `intentData` (plain expression, not `useMemo`) | Maps `rootCause.data.by_intent` to `{ label, value }` shape consumed by the generic `HorizontalBarChart` |

### 3.2 Imported components rendered on this page

| Component | File | Role on this page |
|---|---|---|
| `FilterBar` | `components/shared/FilterBar.tsx` | Date-range preset + agent selector at the top |
| `GlassPanel` | `components/shared/GlassPanel.tsx` | Wraps all 4 panels (2 charts, intent chart, agent table); supports `title`, `subtitle`, `info` (hover tooltip) |
| `EscalationByAgentChart` | `components/charts/EscalationByAgentChart.tsx` | Horizontal bar chart, escalation % per agent, with a 10% benchmark reference line |
| `TrendLineChart` | `components/charts/TrendLineChart.tsx` | Generic reusable line chart (shared across pages) — here configured with one series (`escalation_pct`) and a 10% benchmark line |
| `HorizontalBarChart` | `components/charts/HorizontalBarChart.tsx` | Generic reusable horizontal bar chart (shared across pages) — here configured for escalation counts by intent, no benchmark |
| `ChartInsight` | `components/shared/ChartInsight.tsx` | AI-generated narrative blurb under each of the 3 charts (on-demand, calls `POST /api/ai/ask`) |
| `LoadingSpinner` | `components/shared/LoadingSpinner.tsx` | Shown per-panel while its query is loading |
| `EmptyState` | `components/shared/EmptyState.tsx` | Shown when a chart/table has no data |

### 3.3 Methodology banner — exact content (collapsed by default)

Toggled by clicking the `Info`-icon button (purple `text-purple-400`, `text-xs font-medium`, with `ChevronDown`/`ChevronUp` flipping on expand). When open, renders a bordered panel (`rounded-xl border border-white/8 bg-white/3`) with 2 sections separated by a thin divider:

| # | Icon | Color | Heading | Formula / Rule |
|---|---|---|---|---|
| 1 | `AlertTriangle` | amber | Escalation Rate | `escalation_flag = 'Yes' ÷ total calls × 100`. A call is escalated when the agent transfers it to a supervisor/specialist because they cannot resolve it independently. Benchmark ≤10% — red above, green at/below |
| 2 | `BarChart2` | red | Escalations by Intent | Absolute `count` of escalated calls grouped by `call_intent1`. High counts on a specific intent indicate a structural friction point — the process/product for that intent is too complex for front-line agents |

### 3.4 Chart panel 1 — "Escalation Rate by Agent"

- Subtitle: "Benchmark: 10% (amber line)"
- Panel `info` tooltip: "Percentage of each agent's calls that were escalated to a supervisor. Benchmark is ≤10%. Agents above the line may need coaching, better scripts, or reduced complexity in call routing."
- `EscalationByAgentChart`: Recharts `BarChart`, `layout="vertical"` (horizontal bars). Height = `max(240, rows*44 + 20)` px. Y-axis width dynamically sized to longest agent name (`max(100, maxLen*7.5)`). X-axis ticks formatted as `${v}%`. Dashed amber (`#F59E0B`) `ReferenceLine` at `x=10` labeled "10%" above the line. Bars: `dataKey="escalation_pct"`, rounded right corners (`radius=[0,4,4,0]`), `maxBarSize={24}`, opacity 0.85. Per-bar `Cell` color: **red `#EF4444`** if `escalation_pct > benchmark (10)`, else the page's brand color (`brandColor()` util). Tooltip shows Escalation Rate (1dp %) and Escalated Calls (`count / total`).
- `ChartInsight` question: *"Which agents have the highest escalation rates? Who exceeds the 10% benchmark and what specific coaching or process changes would reduce escalations?"* — data context = raw `byAgent.data`.

### 3.5 Chart panel 2 — "Escalation Trend"

- Subtitle: "Monthly escalation % over time"
- Panel `info` tooltip: "Monthly escalation rate over the selected period. Spikes may indicate product issues, system outages, or high-complexity call months. The amber dashed line marks the 10% benchmark — sustained periods above it warrant investigation."
- `TrendLineChart` (generic, shared component): Recharts `LineChart`, default height 260px. X-axis = `date` field reformatted via `date-fns` to `"MMM ''yy"` (handles both `yyyy-MM` and `yyyy-MM-dd` input). Single series: `escalation_pct`, label "Escalation %", stroke `#EF4444`, smooth monotone line, no dots (only on hover, `activeDot r=4`). Dashed amber (`#F59E0B`) `ReferenceLine` at `y=10` labeled "10% bench". Legend rendered bottom of chart top-right area, 12px gray text. Tooltip shows each series' value with a colored dot matching the line stroke, value suffixed `%` by default `yFormatter`.
- `ChartInsight` question: *"Analyse the monthly escalation rate trend. Are escalations improving or worsening? What months show concerning spikes and what might be driving them?"* — data context = raw `trend.data`.

### 3.6 Chart panel 3 — "Escalations by Intent"

- Subtitle: "Which call types drive escalations"
- Panel `info` tooltip: "Number of escalated calls broken down by call intent. Intents with high escalation counts are structural friction points — they may need process redesign, better agent training, or self-service alternatives."
- `HorizontalBarChart` (generic, shared component): Recharts `BarChart`, `layout="vertical"`. Height = `max(220, intentData.length*38)` px (page overrides the component's own default). Y-axis width sized to longest intent label (`max(120, maxLen*7.5)`), custom right-aligned tick text (`#9CA3AF`, 11px). Bars: `dataKey="value"`, color fixed to `#F59E0B` (amber) for every bar (page passes `color="#F59E0B"`, no `benchmark` prop so the component's red-above-benchmark logic never triggers here), rounded right corners, `maxBarSize={22}`, opacity 0.85, raw value `LabelList` to the right of each bar. `valueFormatter` passed as `(v) => String(v)` so axis/tooltip/labels show plain counts, not `%`. Renders `EmptyState message="No intent data"` (page-level check on `intentData.length`, not the component's own internal empty check) if there are no intent rows.
- `ChartInsight` question: *"Which call intent types are driving the most escalations? Are these structural problems or agent skill gaps? What process changes would reduce escalations for the top intents?"* — data context = `rootCause.data?.by_intent` (raw, pre-reshape — not the `intentData` array used for the chart itself).

### 3.7 "Agent Escalation Summary" table

Full-width `GlassPanel`, no `info`/`onExport`. Columns (left→right): **Agent** (white, bold) · **Total Calls** (gray) · **Escalated** (gray, raw `escalation_count`) · **Escalation %** (color-coded: red if `>10`, else emerald, 1dp). Rows hover-highlight (`hover:bg-white/3`). `EmptyState` spans all 4 columns if no agent rows. Uses the same `byAgent.data` as chart panel 1 — no separate query.

---

## 4. Backend API Endpoints used by this page (consolidated)

| Method | Path | Called by | Purpose | Response shape |
|---|---|---|---|---|
| GET | `/api/analytics/escalations/by-agent` | `EscalationsPage` (`byAgent` query) | Per-agent: `agent_name`, `total_calls`, `escalation_count`, `escalation_pct` — feeds both chart panel 1 and the summary table. Accepts only `start_date`/`end_date` (no `agent` param exists on this route) | `List[EscalationByAgent]` |
| GET | `/api/analytics/escalations/trend` | `EscalationsPage` (`trend` query) | Monthly: `date`, `escalation_pct` — feeds chart panel 2. Accepts `start_date`, `end_date`, `agent` | `List[TrendPoint]` |
| GET | `/api/analytics/escalations/root-cause` | `EscalationsPage` (`rootCause` query) | `by_intent: [{intent, escalation_count}]` — feeds chart panel 3. Accepts `start_date`, `end_date`, `agent` | `EscalationRootCause` |
| POST | `/api/ai/ask` | `ChartInsight` (×3 panels, on-demand) | Natural-language AI commentary generated from each chart's own data context | `AiAnswer { question, answer, data_context }` |

Backend source: all three routes are defined in `backend/routers/analytics.py` (prefix `/analytics`, section comment `# ── 2. Escalations`), delegating to `svc.get_escalation_by_agent(db, start_date, end_date)`, `svc.get_escalation_trend(db, start_date, end_date, agent)`, and `svc.get_escalation_root_cause(db, start_date, end_date, agent)` respectively.
