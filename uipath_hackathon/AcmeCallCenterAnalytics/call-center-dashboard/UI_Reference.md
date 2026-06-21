# UI & API Reference — Manulife Call Center Analytics Dashboard

Single-reference doc for: (1) frontend menu items / routes, (2) UI layout structure, (3) backend API endpoints.

---

## 1. UI Layout

### 1.1 Page shell

Every authenticated page is rendered inside `MainLayout` (`frontend/src/components/layout/MainLayout.tsx`):

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar (fixed, left)   │ TopBar (fixed, top, height 56px)       │
│ width: 240px expanded   │  - Page title (derived from route)    │
│        64px collapsed   │  - DB health badge (online/offline)   │
│                         │  - Live date indicator                │
│  [Logo: novigo]         │  - "Clear Cache" button (AI insights) │
│  "Self Service BI"      │  - Theme toggle (dark/light)           │
│                         │  - Admin pill                          │
│  [Nav items...]         │  - Logout                              │
│                         ├─────────────────────────────────────────┤
│  [AI usage badge]       │                                         │
│  [Collapse toggle]      │   Main content area                    │
│                         │   (margin-left = sidebar width,        │
│                         │    padding: 24px / p-6)                │
│                         │   <Outlet /> → routed page              │
│                         │                                         │
│                         │   Page transitions: fade-in 0.18s,      │
│                         │   keyed by pathname                     │
└─────────────────────────────────────────────────────────────────┘
         (floating, bottom-right, all pages)
         [AiCopilot] — chat widget, orb icon trigger
```

- **Sidebar** — `Sidebar.tsx`. Fixed-position, collapsible (240px ↔ 64px), holds the nav menu, an AI usage badge, and a collapse toggle.
- **TopBar** — `TopBar.tsx`. Fixed-position, left edge follows sidebar width. Shows a route-derived title, a live DB health check (`GET /health`, polled every 60s), today's date, a button to clear the local AI insight cache (`localStorage` keys prefixed `ai_cache_v1_`), dark/light theme toggle, an "Admin" pill, and logout (clears `cc_auth` from `localStorage` and redirects to `/login`).
- **Main content** — `<Outlet />` wrapped in `<Suspense>` (loading spinner) since every page is lazy-loaded; shifts right by the sidebar width and down by the topbar height.
- **AiCopilot** — floating chat widget mounted once in `MainLayout`, available from any authenticated page.
- **Auth gate** — `RequireAuth` wrapper checks `localStorage.cc_auth`; if absent, redirects to `/login` (`LoginPage`, the only route outside `MainLayout`).

### 1.2 Sidebar nav-item anatomy (exact, from `Sidebar.tsx`)

Each menu entry is a single `<NavLink>` row. Structure, left to right:

```
┌─ row: flex, items-center, gap-3 (12px gap), padding 16px L/R · 10px T/B,
│        8px outer margin L/R, rounded-lg corners ─────────────────────┐
│                                                                        │
│   [ Icon 18×18px ]  ←12px→  [ Label text, text-sm, truncate ]        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

Exact values (Tailwind classes from the source):

| Property | Value |
|---|---|
| Row layout | `flex items-center gap-3` — icon and label horizontally aligned, 12px gap between them |
| Row padding | `px-4 py-2.5` — 16px left/right, 10px top/bottom |
| Row outer margin | `mx-2` — 8px left/right margin from sidebar edge |
| Row corner radius | `rounded-lg` |
| Row font | `text-sm` |
| Icon | always rendered first (left), fixed size **18×18px** (`size={18}`), `flex-shrink-0` |
| Label | rendered second (right of icon) as `<span className="truncate">`; **omitted entirely when sidebar is collapsed** (64px width) — only the icon shows, centered by the row's flex layout |
| Icon color — active route | `text-brand-red-light` (brand red accent) |
| Icon color — inactive | `text-gray-500`, brightens to `text-gray-300` on row hover |
| Label/row color — active route | `text-white` on `bg-white/10` row background |
| Label/row color — inactive | `text-gray-400`, brightens to `text-gray-100` on `bg-white/5` row hover background |
| Active-route detection | exact match for `/` (`end={to === '/'}`), prefix match for all other routes |

Sidebar-wide structure (top to bottom):
1. **Logo block** — `novigo-logo-white.svg` (26px tall expanded / 20px collapsed) + "Self Service BI" label (12px gray text, left border divider), `16px` horizontal padding, `24px` vertical padding, bottom border divider.
2. **Nav list** — the 14 `<NavLink>` rows described above, in fixed order, scrollable if overflowing (`overflow-y-auto`), `12px` top/bottom padding on the `<nav>` container.
3. **AI usage badge** (`AiUsageBadge`) — sits below the nav list, above the collapse button.
4. **Collapse toggle** — bottom-most element, `40px` tall row, chevron icon (16px) + "Collapse" label (12px text, hidden when collapsed), `12px` side margin, `12px` bottom margin.

### 1.3 Reusable UI building blocks

| Component | Location | Used for |
|---|---|---|
| `GlassPanel` | `components/shared/` | Glass-morphism card wrapper (title, subtitle, info tooltip) — the base container on almost every page |
| `FilterBar` | `components/shared/` | Date-range preset + agent filter, drives most analytics pages |
| `ChartInsight` | `components/shared/` | AI-generated narrative blurb shown under a chart |
| `LoadingSpinner`, `Skeleton`, `EmptyState` | `components/shared/` | Loading / empty states |
| `BenchmarkIndicator` | `components/shared/` | Green/amber/red marker vs. KPI target |
| `KpiCard`, `AgentProfileCard` | `components/cards/` | KPI tiles and agent summary cards |
| Charts (Recharts-based) | `components/charts/` | `SentimentTrendChart`, `SentimentDonutChart`, `AgentSentimentChart`, `IntentParetoChart`, `AgentScorecardChart`, `AgentRadarChart`, `CallVolumeTrendChart`, `AvgHandleTimeChart`, `EscalationByAgentChart`, `ComplianceByAgentChart`, `KpiHealthTrendChart`, `ResolutionDonutChart`, `TriggerWordCloud`, `TriggerTreemapChart`, `OutcomeMixChart`, `TrendLineChart`, `HorizontalBarChart` |
| `AiCopilot`, `AiChatMessage`, `SuggestedQuestions`, `AiOrbIcon`, `AiThinkingState`, `TypewriterText`, `AiBadge` | `components/ai/` | Floating Q&A chat and AI-themed indicators |
| `TranscriptAnalysis`, `AiAgentPanel` | `components/call/` | Transcript viewer + AI analysis panel on Call Detail |
| `HealthGauge`, `KpiHeroCard`, `AiCommandCenter`, `FollowupStatusWidget` | `components/dashboard/` | Dashboard-only widgets |

---

## 2. Frontend Menu Items / Routes

Sidebar nav order, from `Sidebar.tsx` (`NAV_ITEMS`), mapped to routes in `App.tsx`:

Row order = render order top→bottom. Each row: **[icon, 18px, left]** → 12px gap → **[label, text-sm, right]**, per §1.2.

| # | lucide-react icon | Menu Label (exact text) | Route | Page Component | Page Purpose |
|---|---|---|---|---|---|
| 1 | `LayoutDashboard` | Dashboard | `/` | `DashboardPage` | KPI hero cards, health gauge, sentiment/volume trends, AI command center |
| 2 | `TrendingUp` | Sentiment | `/sentiment` | `SentimentPage` | Sentiment trend (daily/monthly), sentiment-by-agent, donut breakdown |
| 3 | `Target` | Intents | `/intents` | `IntentsPage` | Call intent Pareto + trend |
| 4 | `AlertTriangle` | Escalations | `/escalations` | `EscalationsPage` | Escalation rate by agent, trend, root cause |
| 5 | `ShieldCheck` | Compliance | `/compliance` | `CompliancePage` | Compliance failure rate by agent and over time |
| 6 | `CheckCircle` | Resolution | `/resolution` | `ResolutionPage` | Resolution rate overview and trend |
| 7 | `Zap` | Trigger Words | `/triggers` | `TriggerWordsPage` | Trigger word counts and trend |
| 8 | `Flame` | Friction Points | `/friction` | `FrictionPage` | Friction points mined from transcripts |
| 9 | `BarChart3` | Marketing | `/marketing` | `MarketingPage` | Marketing/cross-sell opportunity detection |
| 10 | `Users` | Agents | `/agents` | `AgentsPage` | Agent list ranked by composite KPI score |
| — | — | (no nav entry) | `/agents/:name` | `AgentDetailPage` | Single agent profile, KPIs, radar chart, feedback |
| 11 | `PhoneCall` | Call Log | `/calls` | `CallLogPage` | Paginated, filterable list of calls |
| — | — | (no nav entry) | `/calls/:id` | `CallDetailPage` | Full call detail: transcript, AI analysis, flags |
| — | — | (no nav entry) | `/calls/:id/followups` | `FollowupsPage` | Follow-up management for one specific call |
| 12 | `ListChecks` | Follow-ups | `/followups` | `FollowupsOverviewPage` | Global follow-up pipeline (pending/approved/in-progress/completed/overdue) |
| 13 | `Brain` | AI Insights | `/ai` | `AiInsightsPage` | AI Q&A chat with suggested questions |
| 14 | `Phone` | Call | `/call` | `LiveCallPage` | Live call simulation (incoming → active → ended → AI analysis) |
| — | — | (no nav entry) | `/login` | `LoginPage` | Auth gate; checks/sets `localStorage.cc_auth` |

Notes:
- Items 1–14 are the complete, exact contents of `NAV_ITEMS` in `Sidebar.tsx`, in source order — this is the literal top-to-bottom order rendered in the sidebar.
- When the sidebar is **collapsed** (64px), every row still renders — only the label `<span>` is suppressed; the icon remains visible, centered in the row by the same `flex items-center` layout.
- `/agents/:name`, `/calls/:id`, `/calls/:id/followups` are drill-down detail routes reached by clicking a row/card — they have no dedicated sidebar entry and no icon.
- All routes except `/login` are wrapped in `RequireAuth` + `MainLayout`.
- Every page is code-split via `React.lazy()`.

---

## 3. Backend API Endpoints

Base URL: `/api` (mounted in `backend/main.py`). All routers are included with `prefix="/api"`.

### 3.1 Calls — `backend/routers/calls.py` (prefix `/calls`)

| Method | Path | Purpose | Response model |
|---|---|---|---|
| GET | `/api/calls` | List calls, paginated, filterable (`agent`, `sentiment`, `escalation`, `intent`, `repeat_call`, `start_date`, `end_date`, `page`, `limit`) | `PaginatedCalls` |
| GET | `/api/calls/{call_id}` | Full call detail incl. transcript | `CallRecordDetail` |

### 3.2 Dashboard — `dashboard.py` (prefix `/dashboard`)

| Method | Path | Purpose | Response model |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Overall KPI summary vs. benchmarks | `KpiSummary` |
| GET | `/api/dashboard/sentiment-trend` | Daily sentiment counts | `List[SentimentTrendPoint]` |
| GET | `/api/dashboard/sentiment-monthly` | Monthly sentiment aggregates | `List[SentimentMonthlyPoint]` |
| GET | `/api/dashboard/kpi-trends` | Monthly KPI trend lines | `List[KpiTrendPoint]` |
| GET | `/api/dashboard/agent-summary` | Per-agent call counts & sentiment | `List[AgentSummary]` |

### 3.3 Agents — `agents.py` (prefix `/agents`)

| Method | Path | Purpose | Response model |
|---|---|---|---|
| GET | `/api/agents` | List all agents with KPIs | `List[AgentDetail]` |
| GET | `/api/agents/{agent_name}` | Single agent profile + KPIs | `AgentDetail` |
| GET | `/api/agents/{agent_name}/feedback` | List feedback entries for agent | `List[FeedbackEntry]` |
| POST | `/api/agents/{agent_name}/feedback` | Add a feedback entry | `FeedbackEntry` |

### 3.4 Analytics — `analytics.py` (prefix `/analytics`)

All accept optional `start_date`, `end_date`, `agent` query filters.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/analytics/intents/pareto` | Intent volume ranking + cumulative % |
| GET | `/api/analytics/intents/trend` | Intent trend over time |
| GET | `/api/analytics/escalations/by-agent` | Escalation % by agent |
| GET | `/api/analytics/escalations/trend` | Escalation trend |
| GET | `/api/analytics/escalations/root-cause` | Root-cause breakdown (intents/triggers) |
| GET | `/api/analytics/compliance/by-agent` | Compliance fail % by agent |
| GET | `/api/analytics/compliance/trend` | Compliance trend |
| GET | `/api/analytics/resolution/overview` | Resolution summary stats |
| GET | `/api/analytics/resolution/trend` | Resolution trend |
| GET | `/api/analytics/trigger-words/counts` | Trigger word frequency |
| GET | `/api/analytics/trigger-words/trend` | Trigger word trend |
| GET | `/api/analytics/preverified/trend` | Pre-verified flag trend |
| GET | `/api/analytics/repeat-calls/trend` | Repeat call trend |
| GET | `/api/analytics/repeat-calls/by-agent` | Repeat call % by agent |
| GET | `/api/analytics/friction-points` | Friction points mined from transcripts |
| GET | `/api/analytics/sentiment/by-agent` | Sentiment score by agent |
| GET | `/api/analytics/marketing-opportunities` | Marketing/cross-sell opportunities |

### 3.5 AI — `ai.py` (prefix `/ai`)

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/ai/ask` | Ask a natural-language question about the data | `AiQuestion { question }` | `AiAnswer { question, answer, data_context }` |
| GET | `/api/ai/suggested-questions` | Preset suggested questions | — | `SuggestedQuestions { questions[] }` |
| GET | `/api/ai/usage` | AI usage counters | — | `AiUsageOut { calls_today, total_calls, period_date, last_call_at, last_reset_at, last_model, last_endpoint }` |
| POST | `/api/ai/usage/reset` | Reset today's usage counter | — | `AiUsageOut` |

### 3.6 Follow-ups (per-call) — `followups.py` (prefix `/calls/{call_id}/followups`)

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | `/api/calls/{call_id}/followups` | List follow-ups for one call | `FollowupsResponse { call_id, summary, items[] }` |
| POST | `/api/calls/{call_id}/followups` | Create a manual follow-up (201) | `FollowupOut` |
| PATCH | `/api/calls/{call_id}/followups/{followup_id}` | Update a follow-up | `FollowupOut` |
| POST | `/api/calls/{call_id}/followups/{followup_id}/approve` | Approve | `FollowupOut` |
| POST | `/api/calls/{call_id}/followups/{followup_id}/reject` | Reject | `FollowupOut` |
| POST | `/api/calls/{call_id}/followups/{followup_id}/status` | Change status (in_progress/completed) | `FollowupOut` |
| DELETE | `/api/calls/{call_id}/followups/{followup_id}` | Delete (204) | — |

### 3.7 Follow-ups (global) — `followups.py` (`global_router`, prefix `/followups`)

| Method | Path | Purpose | Response |
|---|---|---|---|
| GET | `/api/followups` | All follow-ups, paginated/filterable (`status`, `source`, `priority`, `agent`, `overdue`, `start_date`, `end_date`, `search`, `page`, `limit`) | `PaginatedFollowups` |
| GET | `/api/followups/summary` | Pipeline-wide counts (pending/approved/in_progress/completed/rejected/overdue/due_soon/completion_rate) | `GlobalSummary` |

### 3.8 Misc

| Method | Path | Purpose |
|---|---|---|
| GET | `/health`, `/api/health` | DB connectivity check + record count (polled by TopBar every 60s) |
| GET | `/` | API root info, points to `/docs` (Swagger UI) |

CORS is configured via `CORS_ORIGINS` env var (`backend/config.py`); credentials, all methods, all headers allowed.

---

## 4. Frontend → Backend Mapping (API client)

`frontend/src/api/` modules wrap the endpoints above via a shared Axios instance (`client.ts`, `baseURL: /api`):

| Module | Wraps |
|---|---|
| `calls.ts` | §3.1 |
| `dashboard.ts` | §3.2 |
| `agents.ts` | §3.3 |
| `analytics.ts` | §3.4 |
| `ai.ts` | §3.5 |
| `followups.ts` | §3.6 + §3.7 |
