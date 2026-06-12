# Teacher Portal — Direct Monday Architecture

Status: approved architecture. This document describes the decided design, not alternatives.
Companion docs: `docs/teacher-portal-implementation-plan.md`, `docs/teacher-portal-monday-mappings.md`,
`docs/teacher-portal-regression-checklist.md`, status board: `docs/teacher-portal-agent-status.md`.

## 1. What exists today (and must not break)

The repo is a Next.js 15 (App Router, TypeScript, RTL Hebrew) app deployed to Cloudflare Workers
via `@opennextjs/cloudflare` (`wrangler.jsonc`, `open-next.config.ts`). It implements the Madrasa
payment-request flow (דרישות תשלום) with **no database and no authentication**:

- `app/page.tsx` — open teacher selection (client component), supplier-file check, payment-type choice.
- `app/submit/course/page.tsx`, `app/submit/replacement/page.tsx`, `app/submit/private/page.tsx`,
  `app/submit/other/page.tsx` — the four submission routes; `app/success/page.tsx` — success page.
- `app/api/monday/{teachers,supplier-check,courses,course-meetings,private-lessons,replacements,check-duplicate,submit}/route.ts`
  — server route handlers that call Monday GraphQL.
- `lib/monday/client.ts` — Monday GraphQL client (retry, 10s timeout, per-request `react` `cache` for queries).
- `lib/monday/constants.ts` — board IDs + column IDs; `lib/monday/queries.ts` — typed queries/mutations
  (uses `unstable_cache` with 30s revalidate for course lists); `lib/monday/types.ts` — shared types;
  `lib/monday/mock.ts` — preview/mock data (active when `MONDAY_API_TOKEN` is missing or `?preview=1`).
- `lib/payment/config.ts` (route configs), `lib/payment/meetings.ts` (meetings validation + internal
  amount calculation), `lib/payment/meetings.test.ts` + `npm run test:meetings`.
- `lib/session.ts` — `sessionStorage` state between form steps. `lib/runtime-env.ts` — env resolution
  (process.env + Cloudflare context, with `Monday_API_TOKEN` aliases).

Product invariants that the portal must preserve:

- **Teachers never see amounts, rates, or balances.** Internal amounts are computed server-side in
  `lib/payment/meetings.ts` / `lib/monday/queries.ts` (`submitPaymentRequest`) or flagged for manual review.
- Missing Monday data is never guessed: it becomes a configuration error (`MondayConfigurationError`),
  a manual-review flag, or a system-notes fallback (`PAYMENT_REQUEST_MEETINGS_COLUMNS` null placeholders).
- Preview mode keeps the whole app usable with mock data when `MONDAY_API_TOKEN` is absent.

The portal is **strictly additive**. Files listed above are not rewritten (see Hard rules in
`docs/teacher-portal-agent-status.md`).

## 2. Core decision: Monday is the runtime data source. No database.

Monday.com is both the source of truth and the runtime data source.

- **No Supabase, no Prisma, no SQL/KV/D1 store, no sync layer.** There is nothing to migrate,
  nothing to drift, and no second copy of teacher/course/meeting data to reconcile.
- All Monday GraphQL reads/writes go through the existing server-side client
  (`lib/monday/client.ts` → `fetchQuery` / `fetchMutation`). Monday GraphQL is **never** called
  from client components; the token never reaches the browser.
- Latency and Monday rate limits are handled with **short-lived caching only**:
  `unstable_cache` (tagged, revalidate seconds) and per-request `react` `cache` (already used by
  `fetchQuery`). See section 9.

Rationale:

1. The office team works in Monday daily; any DB copy goes stale immediately and the staleness is
   worse than 30–120s cache windows.
2. The existing payment flow already proves the direct-read model works on Cloudflare Workers.
3. Data volume is small (hundreds of teachers/courses); Monday `items_page` queries with
   `query_params` rules (as in `getActiveTeachers`, `getCoursesForTeacher`) are sufficient.
4. Removing a whole storage tier removes a whole class of security/consistency work.

## 3. Authentication: Cloudflare Access

Production (`AUTH_MODE=cloudflare`):

1. Cloudflare Access sits in front of the Worker and authenticates the user (Google/OTP/etc.).
2. Access injects the `Cf-Access-Authenticated-User-Email` header into every request.
3. A server-side resolver — `lib/auth/current-user.ts` (new) — reads that header, looks the email up
   in the Monday **Teachers board (1179972988)** via the email column (`email`), and resolves a typed
   `CurrentUser` (contract already defined in `lib/monday/portal-types.ts`):

```ts
interface CurrentUser {
  teacherItemId: number;          // canonical identity = Monday item_id on Teachers board
  email: string;
  name: string;
  role: "teacher" | "mentor" | "training_manager" | "admin";
  appAccessStatus: "approved" | "pending" | "blocked" | "unknown";
  isActive: boolean;
  mentorTeacherIds: number[];     // populated for mentors once mapping exists
  supplierRelationId: number | null;
  supplierFileStatus: string;
  source: "cloudflare" | "preview";
}
```

The resolver returns `CurrentUserResult` — `{ ok: true, user }` or a typed failure:

| Failure reason | Meaning | UX |
|---|---|---|
| `unauthenticated` | No Access header (and not preview) | redirect to `/unauthorized` |
| `not_found` | Email not on Teachers board | `/unauthorized` with guidance to contact office |
| `duplicate_email` | Email matches 2+ teacher items — ambiguous identity, **blocks safely** | `/unauthorized` + admin diagnostic |
| `pending` | App-access status = pending | `/pending` |
| `blocked` | App-access status = blocked | `/blocked` |
| `inactive` | Teacher item not active (`color_mkq1g95v`) | `/blocked` |
| `config_error` | Required mapping/env missing | Hebrew config error; details in `/admin/diagnostics` |
| `monday_error` | Monday API failure | safe error page, no data leak |

Hardening note: header injection is only trustworthy when Cloudflare Access actually fronts the
Worker. `CLOUDFLARE_ACCESS_AUD` is documented (optional) for validating the `Cf-Access-Jwt-Assertion`
JWT audience as a production hardening step. **Never trust the email header in any deployment where
Access is not enforced.**

### Preview mode (`AUTH_MODE=preview` or no `MONDAY_API_TOKEN`)

- Identity is simulated via `PORTAL_PREVIEW_EMAIL` / `PORTAL_PREVIEW_ROLE` envs plus a preview
  role-switcher cookie (UI control, preview-only).
- Production security is unaffected: preview identity is only honored when there is no real
  token/Cloudflare header context. With `AUTH_MODE=cloudflare` and a token present, preview
  identity inputs are ignored.
- `CurrentUser.source` distinguishes `"cloudflare"` from `"preview"` and is shown in diagnostics.

## 4. Roles and permissions

Role source (interim): until a Monday "app role" column is mapped, roles come from env allowlists —
`PORTAL_ADMIN_EMAILS`, `PORTAL_TRAINING_MANAGER_EMAILS` (comma-separated). Every other email that
matches an **active** teacher item gets `role=teacher`. The app-access status column and mentor
relation column are **unmapped placeholders**: typed `null` in `lib/monday/portal-mappings.ts`, TODO
comments, and surfaced in `/admin/diagnostics`. Until mapped, `appAccessStatus` resolves to
`unknown` and active teachers are treated as approved (logged in diagnostics).

Visibility rules (enforced **server-side** in the service layer and server actions — client-side
filtering is never sufficient):

| Capability | teacher | mentor | training_manager | admin |
|---|---|---|---|---|
| Own dashboard / courses / meetings | yes (own only) | yes (own only) | yes | yes |
| Other teachers' courses/meetings | no | **assigned teachers only** (`mentorTeacherIds`) | all | all |
| Attendance submit | own meetings only | own meetings only | any (override) | any (override) |
| Private student notebook | own private courses | assigned teachers' | all | all |
| Payments (`/payments/new`) | self only (`submitterId === teacherItemId`) | self only | self only | self only |
| Materials | yes | yes | yes | yes + manage |
| `/admin/*` | no | no | diagnostics + users (read) | full |

## 5. Route structure

The portal lives in a new route group `app/(portal)/` so the existing routes (`/`, `/submit/*`,
`/success`, `/api/monday/*`) are untouched. The route group has a **server layout** that calls the
current-user resolver and redirects to `/pending`, `/blocked`, or `/unauthorized` as needed.

```
app/
  (portal)/
    layout.tsx                       # server layout: resolve CurrentUser, gate, nav shell (RTL)
    dashboard/page.tsx               # next meetings, open tasks, quick links
    courses/page.tsx                 # my courses (mentor/manager: scoped lists)
    courses/[courseId]/page.tsx      # course detail + meetings list
    meetings/[meetingId]/page.tsx    # meeting detail (real Monday item)
    attendance/[meetingId]/page.tsx  # attendance checklist (server action submit)
    payments/page.tsx                # my payment requests (read view)
    payments/new/page.tsx            # authenticated wrapper over existing submit flow
    materials/page.tsx               # external/Drive links
    private-students/[courseId]/page.tsx  # private student notebook
    admin/page.tsx
    admin/users/page.tsx
    admin/mappings/page.tsx
    admin/materials/page.tsx
    admin/diagnostics/page.tsx
  pending/page.tsx                   # access pending approval
  blocked/page.tsx                   # access blocked / inactive
  unauthorized/page.tsx              # not authenticated / not found / duplicate email
  api/
    calendar/course/[courseId]/route.ts   # .ics export for a course (auth-checked)
    calendar/my-upcoming/route.ts         # .ics export of my upcoming meetings
```

Calendar export builds `.ics` files from **real Monday meeting items** (no virtual meetings),
authorized against the current user.

## 6. New Monday service layer

New files under `lib/` (ownership per status board; existing files untouched):

```
lib/auth/current-user.ts        # CurrentUser resolver (Cloudflare / preview)
lib/monday/portal-mappings.ts   # all portal board/column IDs, typed null placeholders,
                                # getPortalMappingDiagnostics(), env overrides
lib/monday/portal-types.ts      # normalized portal contracts (ALREADY EXISTS in repo)
lib/monday/teachers.ts          # teacher lookup by email, teacher lists, duplicate-email check
lib/monday/courses.ts           # portal course reads (regular + private-lesson products)
lib/monday/meetings.ts          # meeting reads from the Meetings board
lib/monday/attendance.ts        # attendance read/write (guarded by mapping checks)
lib/monday/materials.ts         # links board reads + typed local config fallback
lib/monday/private-lessons.ts   # private notebook reads/writes
lib/monday/portal-mock.ts       # preview/mock data for every portal screen
```

Rules:
- UI never sees raw Monday GraphQL shapes — only the normalized types in `portal-types.ts`
  (`PortalCourse`, `PortalMeeting`, `AttendanceEntry`, `PrivateCourseNotebook`, `MaterialLink`,
  `MappingDiagnostic`, `PortalConfigurationError`).
- Every unmapped board/column is a typed `null` in `portal-mappings.ts` with a TODO, raises
  `PortalConfigurationError` (clear Hebrew message) in real mode, and appears in
  `getPortalMappingDiagnostics()`.
- In preview mode, unmapped features fall back to `portal-mock.ts` so every screen stays usable.

## 7. Monday board/column mapping (summary)

Full single-source-of-truth table: `docs/teacher-portal-monday-mappings.md`. Known IDs come from
`lib/monday/constants.ts`:

| Board | ID | Status |
|---|---|---|
| Payment Requests (דרישות תשלום) | `8396771037` | mapped (see `PAYMENT_REQUEST_COLUMNS`; V2 meeting columns still `null`) |
| Suppliers (ספקים) | `9101632052` | mapped (`SUPPLIER_COLUMNS`) |
| Teachers (מורים) | `1179972988` | partially mapped (`TEACHER_COLUMNS`); **missing: app-access status, app role, mentor relation** |
| Courses (קורסים) | `914870132` | partially mapped (`COURSE_COLUMNS`); **missing: location, zoom link, notebook fields** |
| Private Lessons (שיעורים פרטיים) | `18082848395` | partially mapped (`PRIVATE_LESSON_COLUMNS`); **missing: notebook fields** |
| **Meetings (מפגשים)** | **UNKNOWN — production blocker** | env override `PORTAL_MEETINGS_BOARD_ID` supported; otherwise mapping error in real mode + mock fallback in preview |
| Materials/Links | UNKNOWN — optional | typed local config fallback in `lib/monday/materials.ts` |

Every meeting shown by the portal is a **real Monday item** from the Meetings board. The portal
never generates virtual/synthetic meetings from course start date + lesson count.

## 8. Feature flows

### 8.1 Attendance (נוכחות)

- `/attendance/[meetingId]` renders a per-meeting checklist: per student
  `present | absent | late | excused | cancelled` + optional note, plus a general note
  (`AttendanceEntry` / `AttendancePayload` in `portal-types.ts`).
- Submit is a **server action**. Server-side authorization: the authenticated teacher must own the
  meeting (or be training_manager/admin). `submittedByTeacherItemId` is set server-side from
  `CurrentUser` — never trusted from the client.
- A real Monday write path exists in `lib/monday/attendance.ts` but is **guarded by mapping
  checks**: if the attendance storage columns are unmapped it fails with a clear Hebrew
  configuration error (and succeeds against mocks in preview, returning `storedInMonday: false`).
- **Candidate storage models** (decision pending inspection of the real Meetings board structure):
  1. Status/text columns directly on the meeting item (simplest; limited per-student detail).
  2. Subitems per student under the meeting item.
  3. A connected Attendance board (one item per student-per-meeting).
  4. A `long_text` JSON snapshot column on the meeting item (cheapest write; weak Monday-side reporting).
  The service layer abstracts behind `submitAttendance(payload)` so the model can be chosen later
  without UI changes.

### 8.2 Private student notebook (מחברת תלמיד פרטי)

- `/private-students/[courseId]` for private-lesson products (board `18082848395`).
- Course-level fields: learning goals, language background, general notes.
- Per-meeting summaries: date, topics covered, new words/phrases, homework, teacher notes
  (`PrivateCourseNotebook` in `portal-types.ts`).
- Monday storage is preferred; the exact fields are **unmapped** → typed placeholders in
  `portal-mappings.ts`, clear config error on write in real mode, fully working preview with mocks.
  `storedInMonday: false` flags mock-only data.

### 8.3 Payments integration

- The existing flow (`app/page.tsx`, `app/submit/*`, `app/api/monday/submit`, `lib/payment/*`)
  is **preserved untouched** and keeps working standalone.
- New authenticated wrapper: `/payments` (my requests, read-only — names/statuses, **no amounts**)
  and `/payments/new`, which seeds the flow with `currentUser.teacherItemId` instead of the open
  teacher dropdown.
- **Server-side submit guard**: in authenticated mode, `submitterId` must equal the authenticated
  teacher's item id; mismatch → 403. Implemented additively (the open flow keeps its current
  behavior where no authenticated context exists).
- Teachers continue to never see amounts/rates/balances — amounts remain computed internally
  server-side (`calculateInternalAmountsForCourseClaim`) exactly as today.

### 8.4 Materials (חומרי לימוד)

- `/materials` renders external/Google Drive links from an **optional** Monday links board.
- Board unmapped → typed local config fallback inside `lib/monday/materials.ts` (curated list in
  code, no DB). `/admin/materials` shows whether the board is configured and manages links when it is.

### 8.5 Admin — diagnostics-first

- `/admin/diagnostics`: output of `getPortalMappingDiagnostics()` (required vs configured
  boards/columns/envs), `AUTH_MODE` + identity source, duplicate-email detection across the
  Teachers board.
- `/admin/users`: teacher list with access status; pending approvals only when the Monday
  app-access mapping exists (otherwise "not configured").
- `/admin/mappings`: required vs configured board/column IDs, with fill-in instructions
  (mirrors `docs/teacher-portal-monday-mappings.md`).
- `/admin/materials`: link management or "not configured".

## 9. Cache strategy

Short-lived only; Monday remains the truth. Mechanisms: `unstable_cache` (tagged) +
per-request `react` `cache` (already in `fetchQuery`).

| Data | TTL | Notes |
|---|---|---|
| Current user profile (email → teacher) | 1–5 min | failure results are not cached |
| Course lists | 30–120s | matches existing `getCoursesForTeacher` (30s) |
| Meetings lists | 30–120s | |
| Meeting details / attendance state | 15–60s | freshest, feeds attendance UI |
| Materials | 10–60 min | near-static |
| Writes (attendance, notebook, payments) | bypass cache; invalidate relevant tags (`revalidateTag`) |
| Authorization checks | always fresh on writes — never decided from a stale cache alone |

## 10. Environment variables

| Var | Status | Purpose |
|---|---|---|
| `MONDAY_API_TOKEN` | existing | server-only Monday token; absence ⇒ preview mode |
| `MONDAY_API_URL` | existing | default `https://api.monday.com/v2` |
| `AUTH_MODE` | new | `cloudflare` \| `preview` |
| `PORTAL_PREVIEW_EMAIL` | new | simulated identity (preview only) |
| `PORTAL_PREVIEW_ROLE` | new | simulated role (preview only) |
| `PORTAL_ADMIN_EMAILS` | new | comma-separated admin allowlist (interim role source) |
| `PORTAL_TRAINING_MANAGER_EMAILS` | new | comma-separated allowlist (interim role source) |
| `PORTAL_MEETINGS_BOARD_ID` | new, optional | Meetings board override until hardcoded in mappings |
| `CLOUDFLARE_ACCESS_AUD` | new, optional | documented hardening: validate Access JWT audience |

**Never `NEXT_PUBLIC_*` for secrets.** All of the above are read server-side via
`lib/runtime-env.ts` (process.env + Cloudflare context); new names are added to its alias map.

## 11. Open mapping questions (production blockers; app degrades safely)

1. **Meetings board**: board ID + columns — course relation, teacher relation, date/time, duration,
   status, location, zoom link, students, attendance storage.
2. **Teachers board**: app-access status column, app role column, mentor relation column.
3. **Attendance storage model** (section 8.1) — depends on the real Meetings board structure.
4. **Private notebook fields** on courses/private-lessons and meetings.
5. **Materials/links board** (optional) — board ID + columns.

Each is tracked in `docs/teacher-portal-monday-mappings.md` and visible at `/admin/diagnostics`.
