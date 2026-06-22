# Follow-ups Pages — Full Reference

Routes: `/followups` (global overview) | `/calls/:id/followups` (per-call management)  
Components: `frontend/src/pages/FollowupsOverviewPage.tsx` · `frontend/src/pages/FollowupsPage.tsx`

---

## 1. Data Fetching

### 1.1 FollowupsOverviewPage (`/followups`)

| Query Key | API Client Call | Backend Endpoint | Response Type |
|---|---|---|---|
| `['followups', 'summary']` | `followupsApi.summary()` | `GET /followups/summary` | `GlobalFollowupSummary` |
| `['followups', 'list', statusFilter, source, priority, agent, search, page]` | `followupsApi.listAll(filters)` | `GET /followups` | `PaginatedFollowups` |

**`filters` object derivation** (note the `statusFilter` → two backend params mapping):

| Page state | Sent as |
|---|---|
| `statusFilter === 'all'` or `'overdue'` | `status: null` |
| `statusFilter === 'overdue'` | `overdue: true` |
| any other `statusFilter` value | `status: statusFilter`, `overdue: null` |
| `source`, `priority`, `agent`, `search` | passed through as-is, or `null` if empty string |
| `page` | current page; `limit` fixed at `25` |

**Notes:**
- `'overdue'` is a **client-side-only pseudo-status** — it isn't a real `FollowupStatus` value, it maps to the backend's `overdue=true` query param instead.
- No `isFetching` indicator anywhere on this page — only `isLoading` is checked (no "Updating…" pattern like Call Log page).
- Summary query has no filter dependencies — always reflects the global all-time counts, independent of the list filters/pagination.
- Every filter chip/input `onChange` also resets `page` to `1`.

---

### 1.2 FollowupsPage (`/calls/:id/followups`)

| Query Key | API Client Call | Backend Endpoint | Response Type |
|---|---|---|---|
| `['call', id]` | `callsApi.get(callId)` | `GET /calls/:id` | `CallRecordDetail` |
| `['followups', callId]` | `followupsApi.list(callId)` | `GET /calls/:call_id/followups` | `FollowupsResponse` |

**Mutations** (all invalidate `['followups', callId]` on success):

| Mutation | API Call | Backend Endpoint |
|---|---|---|
| `approve` | `followupsApi.approve(callId, fid, { approved_by, priority, due_date })` | `POST /calls/:call_id/followups/:id/approve` |
| `reject` | `followupsApi.reject(callId, fid, { approved_by })` | `POST /calls/:call_id/followups/:id/reject` |
| `changeStatus` | `followupsApi.changeStatus(callId, fid, { status, actor, completion_notes })` | `POST /calls/:call_id/followups/:id/status` |
| `remove` | `followupsApi.remove(callId, fid)` | `DELETE /calls/:call_id/followups/:id` |
| (in `AddFollowupForm`) `mutation` | `followupsApi.create(callId, { text, reason, priority, due_date })` | `POST /calls/:call_id/followups` |

**Notes:**
- `supervisor = localStorage.getItem('cc_user') || 'Supervisor'` — there is **no login/auth system** backing this; the "actor" name for approvals is just whatever string is in `localStorage`, defaulting to the literal string `"Supervisor"`.
- `data.items` (from the single `['followups', callId]` query) is split into 3 client-side buckets — `pending`, `active` (`approved` + `in_progress`), `finished` (`completed` + `rejected`) — no separate queries per bucket.
- `enabled: !!id` / `enabled: !!callId` guards both queries.
- `if (isLoading || !data) return <LoadingSpinner />` — whole-page blocking spinner, no skeleton state.
- The `AddFollowupForm`'s own mutation invalidates `['followups', callId]` directly (not via the parent's shared `invalidate()` helper, though it's functionally identical).

---

## 2. UI Layout (ASCII)

### 2.1 FollowupsOverviewPage (`/followups`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [glass header]                                                               │
│  ☑ Follow-ups Overview                                                       │
│  Review, approve and track every AI-suggested or supervisor-added follow-up..│
│  ┌─────┬─────────┬─────────┬─────────┬─────────┬─────────┬───────────────┐  │
│  │Total│ Needs   │Approved │In Prog. │Completed│Overdue  │Completion Rate│  │
│  │ NNN │ Review  │  NNN    │  NNN    │  NNN    │  NNN ⚠  │    NN.N%      │  │
│  └─────┴─────────┴─────────┴─────────┴─────────┴─────────┴───────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│ [GlassPanel "Filters"]                                                        │
│  [All•NNN] [Needs Review•NNN] [Approved•NNN] [In Progress•NNN]              │
│  [Completed•NNN] [Rejected•NNN] [Overdue•NNN]      ← pill filter chips        │
│  [🔍 Search follow-up text…] [Agent name] [Any source ▾] [Any priority ▾]   │
│  [Clear filters] (only shown if any filter active)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ [GlassPanel title="NNN follow-ups" subtitle="Page N of M"]                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │▌[Needs Review][AI][high] ⚠Overdue·3d           [Manage →]              │ │
│  │▌ "Call back customer regarding premium dispute"                        │ │
│  │▌ Call #4821·22 Jun 2026  Agent: Sam  Caller: John Tan POL-5591          │ │
│  │▌ Due: 19 Jun 2026 (3d late)                                             │ │
│  │▌ [Billing] [Sentiment: Negative] [Escalated]                           │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │▌ ... (next row)                                                        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  (italic empty message if no rows match)                                    │
│  [← Previous]            N / M            [Next →]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 FollowupsPage (`/calls/:id/followups`)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Follow-ups  ›  #4821  ›  Manage          (breadcrumb)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ [glass header]                                                               │
│  [← Back]                                          [📞View call details]    │
│  Follow-ups for Call #4821                          [+ Add follow-up]       │
│  Sam · 22 Jun 2026 · John Tan                                                │
│  ┌─────────┬─────────┬───────────┬───────────┬───────────────────┐          │
│  │ Pending │Approved │In Progress│ Completed │ Completion Rate   │          │
│  │  NNN    │  NNN    │   NNN     │   NNN     │      NN.N%        │          │
│  └─────────┴─────────┴───────────┴───────────┴───────────────────┘          │
├─────────────────────────────────────────────────────────────────────────────┤
│ [glass "Call Context"]                                                       │
│  John Tan  POL-5591  ● Negative  Unresolved  Escalated                      │
│  🎯 [Billing] [Premium Dispute]                                             │
│  ✨ AI Summary: "Customer called regarding..."                              │
│  ▸ Show transcript (collapsible)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ [AddFollowupForm] (only if showAdd)                                          │
│  [textarea: Describe the follow-up action...]                               │
│  [textarea: Why is this follow-up needed? (optional)]                       │
│  Priority[▾] Due date[date]              [Cancel] [+ Add follow-up]         │
├─────────────────────────────────────────────────────────────────────────────┤
│ [GlassPanel "Awaiting supervisor approval" — N AI-suggested need review]    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ [Pending][AI][high] Due 25 Jun 2026                          [🗑]       │ │
│  │ "Call back customer regarding premium dispute"                         │ │
│  │ Why this follow-up: "customer asked us to call back next week"        │ │
│  │ ─────────────────────────────────────────────────────────────────────  │ │
│  │ [✓ Approve] [✗ Reject]   Review this AI-generated follow-up            │ │
│  │  (expanded) Priority[▾] Due date[date]  [✓ Confirm approval] [Cancel] │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ [GlassPanel "Active follow-ups" — N in flight]                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ [Approved][Manual][medium]                                              │ │
│  │ "..."                                                                   │ │
│  │ ─────────────────────────────────────────────────────────────────────  │ │
│  │ [▶ Mark in progress] [✓ Mark completed]                                │ │
│  ├─────────────────────────────────────────────────────────────────────────┤ │
│  │ [In Progress][AI][low]                                                 │ │
│  │ "..."                                                                   │ │
│  │ ─────────────────────────────────────────────────────────────────────  │ │
│  │ [NOVA · AI Agent — Live·Processing]         [progress ring NN%]        │ │
│  │  ✓ Draft confirmation email      Done   [▸ logs]                       │ │
│  │  ✓ Validate email address        Done   [▸ logs]                       │ │
│  │  ⏱ Follow-up call to customer    Needs human                           │ │
│  │ [textarea: Completion notes (optional)...]                             │ │
│  │ [✓ Mark completed]                                                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ [GlassPanel "History" — N completed · N rejected] (only if finished.length) │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ [Completed][AI][medium]                                                │ │
│  │ "..."                            Approved by Sam · ... · Completed · ..│ │
│  │ Notes: "..."                                                            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Inventory

### 3.1 FollowupsOverviewPage — Header & Summary Tiles

Container: `glass p-5`. Title row: `ListChecks` icon (20px, `text-brand-green`) + `"Follow-ups Overview"` (`text-xl font-bold text-white`). Subtitle: `text-gray-400 text-xs`.

**Summary tiles** (`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3`), each via `SummaryTile`:

| Tile | Color | `alert` |
|---|---|---|
| Total | `#9CA3AF` | no |
| Needs Review | `#F59E0B` | no |
| Approved | `#38BDF8` | no |
| In Progress | `#A78BFA` | no |
| Completed | `#34D399` | no |
| Overdue | `#EF4444` | **yes** — stronger border opacity |
| Completion Rate | `#6366F1` | no |

`SummaryTile`: `rounded-xl px-3 py-2.5 border`, background `{color}0D` (light) / `{color}14` (dark). Label `text-[10px] uppercase tracking-wider font-bold`. Value `text-xl font-extrabold` with `fontFeatureSettings: "'tnum' 1"` (tabular numerals).

---

### 3.2 FollowupsOverviewPage — Filters Panel

`GlassPanel title="Filters"`.

**Status filter chips** (`FilterChip` component, `flex flex-wrap gap-2`): All, Needs Review, Approved, In Progress, Completed, Rejected, Overdue. Each chip shows a live count badge from the `summary` query (`summary?.pending`, etc.) — **note Overdue's count comes from `summary.overdue`, a different field than any `STATUS_META` entry**.

`FilterChip` styling: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border`. Active state uses the chip's own `color` for background tint (`{color}18` light / `{color}2A` dark), border, and text; count badge inverts to solid `color` background with white text when active.

**Secondary filter row** (`flex flex-wrap items-center gap-3`):
- Search input (`Search` icon 12px absolute-positioned) — placeholder `"Search follow-up text…"`, width `w-52`.
- Agent name text input — width `w-36`, free text (not a dropdown, unlike Call Log page's agent select).
- Source `<select>`: Any source / AI suggested (`ai_generated`) / Manual.
- Priority `<select>`: Any priority / High / Medium / Low.
- `"Clear filters"` link-style button — only rendered if any of `search`, `agent`, `source`, `priority` is set, or `statusFilter !== 'all'`. Resets all 6 state vars + page.

All inputs share: `text-xs bg-white/5 border border-white/10 rounded-md focus:outline-none focus:border-emerald-500/40`.

---

### 3.3 FollowupsOverviewPage — Results Panel & `FollowupRow`

`GlassPanel` with dynamic `title` (`"Loading…"` or `"{total} follow-up(s)"`) and `subtitle` (`"Page {page} of {pages}"`).

**Empty state:** plain centered italic text (not the shared `<EmptyState />` component) — `"No follow-ups match the current filters."`, `text-sm text-gray-500 italic py-6 text-center`.

**`FollowupRow`** — one card per follow-up, `rounded-xl border` with a 1px-wide colored left accent bar (`STATUS_META[status].color`/`colorLight`) spanning the full card height.

Row background/border conditional on `f.is_overdue`: overdue rows get a red tint (`rgba(239,68,68,0.08)` dark / `rgba(254,226,226,0.5)` light) vs. the default near-transparent white tint.

**Top row:** `StatusPill` + `SourceDot` + `OverduePill` (if overdue) + uppercase priority text, with a `"Manage →"` link (`ArrowUpRight` icon) to `/calls/{call_id}/followups` with `state={{ from: '/followups' }}` — this state is what powers the "smart back" logic on the destination page (§3.7).

**Follow-up text:** `text-[13px] leading-relaxed font-medium`.

**Context grid** (`grid` with `gridTemplateColumns: 'auto 1fr auto 1fr'` — 2-column label/value pairs wrapping into a 4-col grid): Call (`#id` link + date), Agent, Caller (+ policy number, conditional), Due date (conditional, red if overdue with "(Nd late)" suffix), Approved by (conditional).

**Bottom row** (conditional on having any of: intents, resolved flag, escalation, sentiment): up to 3 intent badges (purple pill) + `SentimentChip` + `OutcomeChips` (Resolved/Unresolved + Escalated).

**Sub-components specific to this page** (all distinct from `FollowupsPage`'s versions):
- `StatusPill` — uses `STATUS_META` with **different labels** than `FollowupsPage`'s own `STATUS_META` (`pending` → `"Needs Review"` here vs `"Pending"` on the detail page).
- `OverduePill` — red badge, `AlertTriangle` icon, shows `"Overdue · Nd"` if `days` provided.
- `SentimentChip` — text-only (no background), `Smile`/`Frown`/`Meh` icons (10px).
- `OutcomeChips` — `CheckCheck` icon for resolved/unresolved, `ShieldAlert` for escalated; only escalated=Yes renders a chip (no "Not Escalated" chip).
- `SourceDot` — `Sparkles` (purple, "AI") or `User` (blue, "Manual"), text-only, no background.

---

### 3.4 FollowupsOverviewPage — Pagination

Simple prev/next text links (not numbered page buttons like Call Log page): `"← Previous"` / `"Next →"`, center label `"{page} / {pages}"`. Only rendered if `data.pages > 1`.

---

### 3.5 FollowupsPage — Header & Breadcrumb

**Breadcrumb:** `Follow-ups` (link to `/followups`) `›` `#{callId}` (link to `/calls/{callId}`, `font-mono`) `›` `Manage` (current, not a link).

**Header card** (`glass p-5`):
- `handleBack()` — "smart back" logic: if `location.state.from` exists (set when navigating here via a `Link state={{from: ...}}`, e.g. from the Overview page's row, or from `CallDetailPage`'s "Manage follow-ups" button), navigate there explicitly. Else if `document.referrer` includes `/followups` (but not the current call), or browser history has entries, use `navigate(-1)`. Otherwise fall back to `/followups`.
- Title: `"Follow-ups for Call #{callId}"`. Subline (only if `call` loaded): `"{agent_name} · {formatDate(call_date)} · {caller_name}"`.
- Action buttons: `"View call details"` (`Phone` + `ExternalLink` icons, links to `/calls/{callId}`) and `"Add follow-up"` (`Plus` icon, toggles `showAdd`).
- **Summary stats** (`grid grid-cols-2 md:grid-cols-5 gap-3`): Pending, Approved, In Progress, Completed, Completion Rate — via `SummaryStat` (same visual pattern as Overview's `SummaryTile` but `text-2xl` instead of `text-xl`, and only 5 columns instead of 7 — no "Total" or "Overdue" tile here).

---

### 3.6 FollowupsPage — `CallContextPanel`

`glass p-5 space-y-3`. Purpose: lets a supervisor triage without leaving this page to open the full call detail.

- Header: `FileText` icon (purple) + `"Call Context"` + `"Background for triaging these follow-ups"` caption.
- Quick facts row: caller name, policy number (mono blue), sentiment dot+label, resolved/unresolved, escalated (conditional, orange).
- Intents row: `Target` icon + up to 3 intent pill badges (purple).
- AI Summary box (conditional on `call.call_summary`): `Sparkles` icon + `"AI SUMMARY"` label + summary text — distinct visual treatment from the animated-gradient AI summary block on `CallDetailPage` (this one is a plain bordered box, no animation).
- Transcript toggle (conditional on `call.transcript`): `"Show transcript"` / `"Hide transcript"` text button with rotating `ChevronRight` (90°), reveals a `max-h-60 overflow-y-auto` scrollable box.

---

### 3.7 FollowupsPage — `AddFollowupForm`

Rendered conditionally when `showAdd` is true. Own `useMutation` (`followupsApi.create`) — separate from the parent's 4 shared mutations.

- Container: `rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5`.
- Two textareas: follow-up text (required, 2 rows) and optional "reason" (1 row, placeholder gives an example).
- Priority `<select>` (default `'medium'`) + Due date `<input type="date">`.
- `"Add follow-up"` button — `Plus` icon, disabled when `!text.trim()` or `mutation.isPending`.
- On success: invalidates `['followups', callId]` and calls `onDone()` (closes the form via `setShowAdd(false)`).
- Backend auto-sets `source: "manual"` and `status: "approved"` — **manually-added follow-ups skip the pending-approval step entirely** (see §4).

---

### 3.8 FollowupsPage — `FollowupCard`

The workhorse component, rendered identically across all three sections (Pending/Active/History) with different action controls shown based on `f.status`.

**Header row:** `StatusPill` (own `STATUS_META`, labels: Pending/Approved/In Progress/Completed/Rejected — note `"Pending"` here vs `"Needs Review"` on the Overview page for the same status value) + `SourceBadge` (pill with border, vs Overview's borderless `SourceDot`) + `PriorityPill` (`AlertTriangle` icon, colored by `PRIORITY_META`) + due date (if set).

**Body:** follow-up text (`text-gray-200 text-sm`). If `f.reason` present: indigo-tinted callout box — `"Why this follow-up: "` + italicized quoted reason text (curly quotes `&ldquo;…&rdquo;`).

**Metadata line** (conditional): `"Approved by {name} · {datetime}"` and/or `"Completed · {datetime}"`.

**Completion notes** (conditional on `f.completion_notes`): emerald-tinted box, `"Notes:"` label + text.

**Delete button:** top-right `Trash2` icon, shown only when `f.source === 'manual' || f.status !== 'pending'` — i.e. **AI-generated pending follow-ups cannot be deleted directly; they must be rejected instead**.

**Status-specific action area** (`mt-3 pt-3 border-t`):

| Status | Controls |
|---|---|
| `pending` | Collapsed: `[Approve]` (emerald) + `[Reject]` (red) buttons + hint text. Expanded (`expanded` state, after clicking Approve): Priority `<select>` + Due date input + `[Confirm approval]` + `[Cancel]`, plus `"Supervisor: {name}"` label on the right |
| `approved` | `[Mark in progress]` (violet) + `[Mark completed]` (emerald, calls `onComplete(id, '')` — empty notes) |
| `in_progress` | Renders `<AiAgentPanel followup={f} />` (§3.9) + a notes `<textarea>` + `[Mark completed]` (passes the typed notes) |
| `completed` / `rejected` | No action area — card is read-only, shown only in the History section |

**Approve flow nuance:** clicking "Approve" doesn't immediately call the mutation — it expands an inline form to optionally set priority/due-date first, and only fires `onApprove` when "Confirm approval" is clicked. "Reject" has no such intermediate step — it fires immediately.

---

### 3.9 AiAgentPanel — "NOVA · AI Agent" Simulation

File: `frontend/src/components/call/AiAgentPanel.tsx`

**This is a fully deterministic, client-side mock — there is no real AI agent or backend call involved.** It exists purely as a UI simulation of "AI executing the follow-up" once a card transitions to `in_progress`.

**`generateSubtasks(followup)`** — seeded by `followup.id * 7 + 31` via a linear-congruential `seededRandom()` (deterministic per follow-up, stable across re-renders):
1. Scans `followup.text.toLowerCase()` against 8 keyword groups (`AI_TASKS`) — e.g. "email/send/notify" → 3 email-drafting tasks; "policy/amend/renewal" → 3 policy tasks; "claim/lodge/submit" → 3 claims tasks; "callback/call back/ring" → 2 scheduling tasks; "escalat/supervisor/urgent" → 3 escalation tasks; "document/letter/pdf" → 3 document tasks; "crm/record/log" → 2 CRM tasks; "verify/check/compliance" → 2 compliance tasks. Multiple groups can match and all their tasks are appended.
2. If fewer than 2 tasks matched, backfills from `GENERIC_TASKS` (3 generic CRM/summary/notification tasks).
3. Maybe appends **one** `human_required` task (`PhoneOff`/`UserRound` icon) — triggered if the text contains "call" or "document" (matching keyword-specific human tasks), or with 35% random probability, or (fallback) 50% chance of the generic "Follow-up call to customer" task.
4. Sorts: human-required task always last; completed tasks ordered by their fake `completedAt` timestamp.

Each generated task has a fixed canned `output` string (realistic-looking but entirely hardcoded — e.g. `"Email drafted · Subject: ... · Tone: professional & empathetic"`).

**Visual treatment:**
- Outer card: animated rotating gradient border (`borderGlow 6s` keyframe, purple→cyan→pink→amber), opacity reduces to 0.30 once `allAiDone` vs 0.45 while running.
- Header: `AiOrbIcon` (38px, `variant="orb"`) + gradient-text `"NOVA · AI Agent"` + status badge — `"Mission complete"` (emerald, `CheckCircle2`) once all non-human tasks are `completed`, else `"Live · Processing"` (purple, pulsing dot, `ai-scanline` animation class).
- 6 floating particle dots (`particleFloat` keyframe) scattered across the header as ambient decoration.
- Task count line: `"{completedCount}/{totalAiTasks} tasks executed"` + `"· N needs human"` (amber) if any.
- `AgentProgressRing` — circular SVG progress ring (44px, gradient stroke purple→cyan→pink while running, emerald gradient + `Zap` icon when 100%).
- Shimmering progress bar below the header — animated gradient fill with a sweeping highlight overlay (`aiScanline` keyframe).

**`SubtaskRow`:**
- Staggered reveal: each row fades in `index * 400 + 200`ms after mount (skeleton placeholder shown before reveal).
- Status icon: `CheckCircle2` (completed, glowing drop-shadow), `Clock` (human_required), or `PulsingDot` (running — not actually used here since all generated AI tasks start as `'completed'` in the mock).
- Click anywhere on the row toggles an expandable "logs" panel showing the canned `output` string rendered with a `TypewriterText` effect (character-by-character reveal at configurable speed, default 20ms/char, 8ms/char in this panel — with a blinking `▊` cursor while typing).
- Completed rows show a timestamp + simulated duration in ms (`"{completedAt} · {durationMs}ms"`).

**Footer:** `Terminal` icon + monospace `"nova-agent-v2.4 · execution_id: FA-{followup.id padded to 4 digits}"` + (conditional) `"{N} tasks require supervisor action"` warning in amber.

---

## 4. Backend Endpoints

### Per-call router — `prefix="/calls/{call_id}/followups"`

File: `backend/routers/followups.py`

#### `GET /calls/{call_id}/followups`
- 404 if `call_id` doesn't exist in `call_records`.
- Calls `_seed_ai_items(db, call_id)` first — **lazy seeding**: on first read for a call, copies any non-empty `followup_item1/2/3` from `call_records` into `call_followups` rows with `source='ai_generated'`, `status='pending'`. If AI rows already exist, instead backfills `reason` for any that are missing one (via `_extract_reason`).
- Returns `FollowupsResponse { call_id, summary, items }` — `items` ordered `source DESC` (ai_generated before manual) then `created_at ASC`.
- `_extract_reason(transcript, followup_text)`: keyword-matches words >3 chars from the follow-up text against transcript lines, joins up to 3 matching lines with `" … "`, truncates to 500 chars. Returns `None` if no transcript or no matches.

#### `POST /calls/{call_id}/followups`
- Body: `FollowupCreate` (`text`, `reason?`, `priority?`, `assigned_to?`, `due_date?`).
- 404 if call doesn't exist.
- **Always creates with `source="manual"`, `status="approved"`** — manually added follow-ups skip the pending/approval step entirely (matches the frontend behavior noted in §3.7).
- Returns `201` + the created `FollowupOut`.

#### `PATCH /calls/{call_id}/followups/{followup_id}`
- Body: `FollowupUpdate` — partial update via `model_dump(exclude_unset=True)`. **Not used anywhere in the frontend** for this page (no direct field-edit UI) — exists in the API but unreferenced by `FollowupsPage.tsx`.

#### `POST /calls/{call_id}/followups/{followup_id}/approve`
- Body: `FollowupApprove` (`approved_by`, `priority?`, `assigned_to?`, `due_date?`).
- Sets `status='approved'`, `approved_by`, `approved_at=utcnow()`. Optional fields only overwritten if provided (`is not None` check).

#### `POST /calls/{call_id}/followups/{followup_id}/reject`
- Same body shape as approve. Sets `status='rejected'`, `approved_by`, `approved_at` — **rejection reuses the `approved_by`/`approved_at` columns** rather than separate reject-tracking fields.

#### `POST /calls/{call_id}/followups/{followup_id}/status`
- Body: `FollowupStatusUpdate` (`status`, `actor?`, `completion_notes?`).
- **Guard:** if current status is `pending` and the target status isn't `approved`/`rejected`, returns `400` — "Pending follow-ups must be approved or rejected before changing status." This is why the frontend never wires a "start" or "complete" button directly to a pending card.
- If target status is `completed`: sets `completed_at=utcnow()` and `completion_notes` (if provided).
- **Note:** `actor` is accepted in the schema but not persisted anywhere in this handler (no column is set from it) — it's effectively unused server-side for this endpoint.

#### `DELETE /calls/{call_id}/followups/{followup_id}`
- Hard-deletes the row. `204` on success, `404` if not found.

---

### Global router — `prefix="/followups"`

#### `GET /followups`

File: `backend/routers/followups.py` line 330

| Param | Type | SQL effect |
|---|---|---|
| `status` | `str` | `f.status = :status` |
| `source` | `str` | `f.source = :source` |
| `priority` | `str` | `f.priority = :priority` |
| `agent` | `str` | `LOWER(cr.agent_name) = LOWER(:agent)` |
| `overdue` | `bool` | `true` → due_date < today AND not completed/rejected; `false` → inverse |
| `start_date` / `end_date` | `str` | filters on `cr.call_date` (the **call's** date, not the follow-up's `due_date` or `created_at`) |
| `search` | `str` | `LOWER(f.text) LIKE LOWER(:search)` wrapped in `%` |
| `page` / `limit` | `int` | default page 1, limit 25, max 100 |

- Calls `_seed_all_missing(db, batch=100)` first on **every request** — a batched sweep that seeds AI-generated follow-ups for any call missing them, up to 100 calls per request. This is how follow-ups eventually get seeded for calls a supervisor never visited the detail page for.
- Joins `call_followups f LEFT JOIN call_records cr` — all the call-context fields in `GlobalFollowupOut` (agent, caller, intents, sentiment, etc.) come from this join.
- `is_overdue` / `days_overdue` computed inline via `CASE` expressions: overdue requires `due_date IS NOT NULL AND due_date < today AND status NOT IN ('completed','rejected')`. `days_overdue = today - due_date`.
- **Sort order:** `is_overdue DESC` (overdue first), then a manual status rank (`pending=0, in_progress=1, approved=2, completed=3, rejected=4`), then `COALESCE(due_date, call_date) DESC`, then `id DESC`.
- Returns `PaginatedFollowups { items, total, page, pages }`.

#### `GET /followups/summary`

File: `backend/routers/followups.py` line 430

- No params — always global, all-time.
- Single aggregate SQL query with `COUNT(*) FILTER (WHERE ...)` per status, plus `overdue` and `due_soon` (due within next 3 days, not completed/rejected — **`due_soon` is computed by the backend but not surfaced anywhere in the frontend UI for this page**).
- `completion_rate = completed / (approved + in_progress + completed) × 100`, rounded to 1 decimal, or `0.0` if the denominator is 0. **Identical formula** to the per-call `_build_summary()` used by the detail page — `pending` and `rejected` are excluded from the denominator in both places.

---

## 5. Type Definitions

```ts
// frontend/src/api/followups.ts
type FollowupStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed'
type FollowupSource = 'ai_generated' | 'manual'
type FollowupPriority = 'low' | 'medium' | 'high'

interface Followup {
  id: number
  call_id: number
  text: string
  reason: string | null
  source: FollowupSource
  status: FollowupStatus
  priority: FollowupPriority | null
  assigned_to: string | null
  due_date: string | null
  approved_by: string | null
  approved_at: string | null
  completed_at: string | null
  completion_notes: string | null
  created_at: string
  updated_at: string
}

interface FollowupSummary {
  total: number; pending: number; approved: number
  rejected: number; in_progress: number; completed: number
  completion_rate: number
}

interface FollowupsResponse {
  call_id: number
  summary: FollowupSummary
  items: Followup[]
}

// Global (overview) variant — extends Followup with joined call context
interface GlobalFollowup extends Followup {
  agent_name: string | null
  call_date: string | null
  is_overdue: boolean
  days_overdue: number | null
  caller_name: string | null
  policy_number: string | null
  call_intent1: string | null
  call_intent2: string | null
  call_intent3: string | null
  call_summary: string | null
  call_sentiment: number | null
  escalation_flag: string | null
  compliance_flag: string | null
  call_resolved_flag: string | null
}

interface PaginatedFollowups {
  items: GlobalFollowup[]
  total: number; page: number; pages: number
}

interface GlobalFollowupSummary {
  total: number; pending: number; approved: number; in_progress: number
  completed: number; rejected: number; overdue: number; due_soon: number
  completion_rate: number
}
```

### Backend model — `CallFollowup` (`backend/models.py`)

```python
class CallFollowup(Base):
    __tablename__ = "call_followups"
    id               = Column(Integer, primary_key=True, autoincrement=True)
    call_id          = Column(BigInteger, index=True, nullable=False)
    text             = Column(String(500), nullable=False)
    reason           = Column(Text, nullable=True)
    source           = Column(String(20), nullable=False, default="ai_generated")
    status           = Column(String(20), nullable=False, default="pending")
    priority         = Column(String(10), nullable=True)
    assigned_to      = Column(String(50), nullable=True)
    due_date         = Column(Date, nullable=True)
    approved_by      = Column(String(50), nullable=True)
    approved_at      = Column(DateTime, nullable=True)
    completed_at     = Column(DateTime, nullable=True)
    completion_notes = Column(Text, nullable=True)
    created_at       = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at       = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
```

Note: `text` is capped at 500 chars and `assigned_to`/`approved_by` at 50 chars at the DB layer — not enforced client-side in either form.

---

## 6. `followupsApi` Client (`frontend/src/api/followups.ts`)

```ts
export const followupsApi = {
  list: (callId) => GET /calls/{callId}/followups
  listAll: (filters) => GET /followups
  summary: () => GET /followups/summary
  create: (callId, body) => POST /calls/{callId}/followups
  approve: (callId, id, body) => POST /calls/{callId}/followups/{id}/approve
  reject: (callId, id, body) => POST /calls/{callId}/followups/{id}/reject
  changeStatus: (callId, id, body) => POST /calls/{callId}/followups/{id}/status
  remove: (callId, id) => DELETE /calls/{callId}/followups/{id}
}
```

`clean(params)` for `listAll` strips `null`, `undefined`, **and empty string** values (stricter than `agentsApi`'s/`callsApi`'s `clean()`, which only strip `null`/`undefined`) — relevant because several of this page's filter states default to `''` rather than `null`.
