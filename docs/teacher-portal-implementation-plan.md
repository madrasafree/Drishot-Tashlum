# Teacher Portal — Implementation Plan

Companion to `docs/teacher-portal-direct-monday-architecture.md` (the what/why) and
`docs/teacher-portal-monday-mappings.md` (board/column IDs). Agent ownership follows
`docs/teacher-portal-agent-status.md`.

## Guiding constraints

- Strictly additive. Existing payment flow files (`app/page.tsx`, `app/submit/*`,
  `app/api/monday/*`, `lib/payment/*`, `lib/monday/{client,constants,queries,types,mock}.ts`)
  are not rewritten.
- No database of any kind. Monday GraphQL from server code only.
- Missing Monday mappings = typed `null` placeholders + Hebrew runtime config errors + admin
  diagnostics. Never guessed.
- Preview mode (no `MONDAY_API_TOKEN`) keeps every portal screen usable via `portal-mock.ts`.
- Hebrew RTL everywhere.

## Phases

### Phase 0 — Discovery & contracts (Agent 0 Coordinator + Agent 1 Docs, Agent 2 Auth contract)

- Inventory existing code (done — see architecture doc section 1).
- Freeze contracts: `lib/monday/portal-types.ts` (**already in repo**) — `CurrentUser`,
  `CurrentUserResult`, `PortalCourse`, `PortalMeeting`, `AttendancePayload`,
  `PrivateCourseNotebook`, `MaterialLink`, `MappingDiagnostic`, `PortalConfigurationError`.
- Create `lib/monday/portal-mappings.ts`: every portal board/column ID, typed `null` for unknowns,
  `PORTAL_MEETINGS_BOARD_ID` env override, `getPortalMappingDiagnostics()`.
- Write the four docs (this set).
- Exit criteria: contracts compile; docs merged; no runtime behavior change.

### Phase 1 — Auth + portal shell (Agent 2 auth, Agent 4 shell)

- `lib/auth/current-user.ts`: Cloudflare Access header resolution (`Cf-Access-Authenticated-User-Email`),
  Monday Teachers-board email lookup, role resolution from `PORTAL_ADMIN_EMAILS` /
  `PORTAL_TRAINING_MANAGER_EMAILS`, all failure states (`unauthenticated`, `not_found`,
  `duplicate_email`, `pending`, `blocked`, `inactive`, `config_error`, `monday_error`).
- Preview identity (`AUTH_MODE=preview` / no token): `PORTAL_PREVIEW_EMAIL`, `PORTAL_PREVIEW_ROLE`,
  preview role-switcher cookie; honored only when no real token/Cloudflare context.
- `app/(portal)/layout.tsx` server layout: resolve user, gate, redirect to
  `/pending` / `/blocked` / `/unauthorized`; RTL nav shell. Status pages `app/pending`,
  `app/blocked`, `app/unauthorized`.
- New env names added to `lib/runtime-env.ts` alias map and `.env.example`.
- Exit criteria: preview login works end-to-end; all failure states reachable in preview.

### Phase 2 — Monday portal services (Agent 3)

- `lib/monday/teachers.ts` (email lookup, duplicate detection, lists),
  `courses.ts`, `meetings.ts` (real items from Meetings board, `PORTAL_MEETINGS_BOARD_ID`),
  `attendance.ts` (write guarded by mapping checks), `materials.ts` (links board + local fallback),
  `private-lessons.ts` (notebook), `portal-mock.ts` (preview data for every screen).
- Caching per architecture doc section 9 (tagged `unstable_cache`; writes invalidate).
- Exit criteria: every service returns normalized types, throws `PortalConfigurationError` for
  unmapped paths in real mode, returns mocks in preview.

### Phase 3 — Dashboard, courses, meetings (Agent 4)

- `/dashboard` (upcoming meetings, quick links), `/courses`, `/courses/[courseId]`,
  `/meetings/[meetingId]`. Role-scoped server-side queries (teacher=own, mentor=assigned,
  manager/admin=all).
- Exit criteria: pages render in preview with mock meetings; real mode shows mapping error for
  Meetings board until configured.

### Phase 4 — Attendance (Agent 4)

- `/attendance/[meetingId]` checklist UI + server action; server-side ownership check;
  `submittedByTeacherItemId` set from `CurrentUser`.
- Real write path behind mapping guard (clear Hebrew config error when unmapped);
  storage-model decision (columns / subitems / connected board / long_text JSON) deferred to
  real-board discovery — abstracted behind `submitAttendance`.
- Exit criteria: preview submit works (`storedInMonday: false`); unauthorized submit rejected
  server-side.

### Phase 5 — Payments integration (Agent 5)

- `/payments` (own requests read view, no amounts), `/payments/new` (seeds existing flow with
  `currentUser.teacherItemId`; no open teacher dropdown).
- Server-side submit guard: in authenticated mode `submitterId` must equal the authenticated
  teacher's item id (403 otherwise). Additive — open flow behavior unchanged.
- Exit criteria: regression checklist payment sections pass unchanged; spoofed `submitterId`
  rejected in authenticated mode.

### Phase 6 — Private student notebook (Agent 4)

- `/private-students/[courseId]`: course-level fields + per-meeting summaries; Monday-preferred
  storage; unmapped fields → typed placeholders, config error on real-mode write, working preview.
- Exit criteria: notebook usable in preview; diagnostics list missing notebook mappings.

### Phase 7 — Materials, admin, calendar (Agent 6)

- `/materials` + local fallback; `/admin` (`users`, `mappings`, `materials`, `diagnostics`)
  built diagnostics-first on `getPortalMappingDiagnostics()`.
- `app/api/calendar/course/[courseId]/route.ts`, `app/api/calendar/my-upcoming/route.ts` — `.ics`
  from real Monday meeting items, authorized against current user.
- Exit criteria: diagnostics page reflects every placeholder; `.ics` downloads validate in a
  calendar client (preview uses mock meetings).

### Phase 8 — Hardening & QA (Agent 7 + Coordinator)

- Full regression run: `docs/teacher-portal-regression-checklist.md`.
- `npm run lint`, `npm run build`, `npm run test:meetings`, preview smoke, security greps (below).
- Document `CLOUDFLARE_ACCESS_AUD` JWT validation; verify behavior when Access is absent.
- Final QA report: `docs/teacher-portal-final-qa-report.md`.

## Agent ownership (from the status board)

| # | Agent | File ownership |
|---|---|---|
| 0 | Lead Coordinator | integration, `docs/teacher-portal-agent-status.md` |
| 1 | Architecture / Docs | this doc + architecture + mappings docs |
| 2 | Auth / Current User | `lib/auth/*` (contract held by Coordinator) |
| 3 | Monday Portal Services | `lib/monday/portal-*`, `teachers.ts`, `courses.ts`, `meetings.ts`, `attendance.ts`, `materials.ts`, `private-lessons.ts` |
| 4 | Portal Shell + Core Pages | `app/(portal)/layout.tsx`, `dashboard`, `courses`, `meetings`, `attendance`, `private-students`, `components/portal/*`, `app/pending`, `app/blocked`, `app/unauthorized` |
| 5 | Payments Integration | `app/(portal)/payments/*` |
| 6 | Materials + Admin + Calendar | `app/(portal)/materials`, `app/(portal)/admin/*`, `app/api/calendar/*` |
| 7 | QA / Regression Guardian | regression checklist + final QA report |

## Integration order

1. Phase 0 contracts + docs (blocking everything).
2. Phase 1 auth + shell, Phase 2 services (parallel after contracts freeze).
3. Phases 3–7 in parallel (disjoint file ownership), integrating against mocks first.
4. Phase 8 QA gate before push.

## Risk points

| Risk | Mitigation |
|---|---|
| **Regression of the payment flow** (highest) | zero edits to existing flow files; additive guard only; regression checklist run before merge; `test:meetings` stays green |
| **Monday rate limits** (portal multiplies read volume) | tagged short-TTL caches; existing client retry/backoff on 429 (`lib/monday/client.ts`); scoped `items_page` queries with `query_params` rules instead of full-board scans |
| **Missing mappings** (Meetings board unknown; Teachers role/access/mentor columns unknown) | typed null placeholders; `PortalConfigurationError` with Hebrew message in real mode; mock fallback in preview; `/admin/diagnostics` makes gaps visible; `PORTAL_MEETINGS_BOARD_ID` unblocks without redeploy of mappings |
| **Cloudflare header spoofing** if Access is not enforced on the route | document that the portal must only run behind Access in `cloudflare` mode; never honor preview identity when a token exists; `CLOUDFLARE_ACCESS_AUD` JWT validation as hardening; `source` field exposed in diagnostics |
| Duplicate teacher emails in Monday | `duplicate_email` failure blocks login safely; surfaced in `/admin/diagnostics` |
| Stale cache leaking authorization | authorization on writes always re-checked fresh; failure results never cached |

## Test strategy

- `npm run lint` — must pass (eslint is ignored during builds, so run explicitly).
- `npm run build` — Next build + OpenNext Cloudflare build.
- `npm run test:meetings` — existing meetings validation/amount tests must stay green.
- **Preview smoke**: with no `MONDAY_API_TOKEN`, walk every portal route and the full existing
  flow with `?preview=1` (see regression checklist).
- **Security greps** (must return nothing problematic):
  - `grep -rn "MONDAY_API_TOKEN" app components` → no client-component usage.
  - `grep -rn "NEXT_PUBLIC" .` → no secrets.
  - `grep -rln "use client" app lib | xargs grep -l "monday.com\|fetchQuery\|fetchMutation"` → empty
    (no Monday GraphQL from client components).
  - `grep -rn "supabase\|prisma\|postgres\|drizzle" package.json lib app` → empty.
- Manual: spoofed `submitterId` POST to submit path in authenticated mode → 403.

## Rollback strategy

The portal is **additive**. Full rollback = delete the additions; the original payment app is
restored exactly:

```
git rm -r app/(portal) app/pending app/blocked app/unauthorized \
          app/api/calendar lib/auth components/portal \
          lib/monday/portal-mappings.ts lib/monday/portal-types.ts \
          lib/monday/teachers.ts lib/monday/courses.ts lib/monday/meetings.ts \
          lib/monday/attendance.ts lib/monday/materials.ts lib/monday/private-lessons.ts \
          lib/monday/portal-mock.ts
# revert the small additive diffs (runtime-env aliases, .env.example lines, submit guard)
```

No data migration to undo (no DB), no Monday schema rollback required (new columns, if created,
are simply unused). Partial rollback per feature is equally safe because each feature owns
disjoint files.
