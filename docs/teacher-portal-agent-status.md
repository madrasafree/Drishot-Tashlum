# Teacher Portal — Agent Status Board

Coordinator-owned document. Tracks workstreams, ownership boundaries, and integration state.

## Operating model

Lead Coordinator (this session) owns integration, contracts, and final QA signoff.
Work is split into agents/workstreams with strict file ownership. No agent rewrites
payment logic, adds a database, or exposes `MONDAY_API_TOKEN` to the client.

## Workstreams

| # | Agent | Scope (file ownership) | Status |
|---|-------|------------------------|--------|
| 0 | Lead Coordinator | integration, `docs/teacher-portal-agent-status.md`, conflict resolution | done |
| 1 | Architecture / Docs | `docs/teacher-portal-direct-monday-architecture.md`, `docs/teacher-portal-implementation-plan.md`, `docs/teacher-portal-monday-mappings.md` | done |
| 2 | Auth / Current User (done by Coordinator for contract stability) | `lib/auth/*` | done |
| 3 | Monday Portal Services | `lib/monday/portal-*`, `lib/monday/teachers.ts`, `courses.ts`, `meetings.ts`, `attendance.ts`, `materials.ts`, `private-lessons.ts` | done |
| 4 | Portal Shell + Core Pages | `app/(portal)/layout.tsx`, `app/(portal)/dashboard`, `courses`, `meetings`, `attendance`, `private-students`, `components/portal/*`, `app/pending`, `app/blocked`, `app/unauthorized` | done |
| 5 | Payments Integration | `app/(portal)/payments/*` | done |
| 6 | Materials + Admin + Calendar | `app/(portal)/materials`, `app/(portal)/admin/*`, `app/api/calendar/*` | done |
| 7 | QA / Regression Guardian | `docs/teacher-portal-regression-checklist.md`, `docs/teacher-portal-final-qa-report.md` | done |

## Hard rules (enforced at integration)

- Existing payment request flow (`app/page.tsx`, `app/submit/*`, `app/api/monday/*`, `lib/payment/*`, `lib/monday/{client,constants,queries,types,mock}.ts`) is preserved. Only additive changes allowed.
- No Supabase / Prisma / database of any kind.
- Monday GraphQL only from server code (`lib/monday/*`, route handlers, server actions).
- Authorization is enforced server-side; client-side filtering is not sufficient.
- Missing Monday board/column IDs become typed `null` placeholders with TODOs, runtime configuration errors in real mode, and admin diagnostics. Never guessed.
- Preview/mock mode (no `MONDAY_API_TOKEN`) must keep every portal screen usable.
- Hebrew RTL everywhere.

## Integration order

1. Phase 0 — foundation contracts (`lib/auth/*`, `lib/monday/portal-mappings.ts`, `lib/monday/portal-types.ts`) + docs.
2. Phase 1 — Monday portal services + portal mock data.
3. Phase 2 — portal shell, dashboard, courses, meetings, attendance, private notebook, payments integration, materials, admin, calendar export (parallel, disjoint file ownership).
4. Phase 3 — QA (lint, build, test:meetings, security greps), fixes, final docs, push.

## Open Monday mapping questions (production blockers, app degrades safely without them)

- Meetings board ID + columns (course relation, teacher relation, date, duration, status, location, zoom, students, attendance).
- Teachers board: app access status column, app role column, mentor relation column.
- Materials/links board ID + columns (optional — local typed fallback exists).
- Private notebook fields on courses/private-lessons and meetings (goals, background, summaries).
- Attendance storage model decision (columns on meeting item vs. subitems vs. connected board).

## Assumptions log

- Cloudflare Access provides `Cf-Access-Authenticated-User-Email` header in production (`AUTH_MODE=cloudflare`). JWT signature validation against `CLOUDFLARE_ACCESS_AUD` is documented as a production hardening step.
- Until a Monday "app role" column is mapped, roles come from `PORTAL_ADMIN_EMAILS` / `PORTAL_TRAINING_MANAGER_EMAILS` env allowlists, defaulting to `teacher` for any matched active teacher. Documented in mappings doc.
- Until a Monday "app access" column is mapped, any active teacher found by email is treated as approved (status `unknown` surfaces in diagnostics).
