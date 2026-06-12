# Teacher Portal — Manual Regression Checklist

Run before every merge to `main` and before deploy. Sections A–B protect the existing payment app
(highest priority); C–H cover the new portal. Preview mode = no `MONDAY_API_TOKEN` set, or
`?preview=1` appended on `/`.

Conventions: mock teacher 101 = יעל כהן (healthy), 102 = אמיר לוי, 103 = דנה חסומה (blocked
supplier). Mock course IDs 7001–7006 belong to teacher 101 (`lib/monday/mock.ts`).

## A. Existing payment request flow (preview, `/?preview=1`)

### A1. Teacher selection + supplier check
- [ ] `/` loads RTL, teacher list loads (3 mock teachers).
- [ ] Select teacher 101 (יעל כהן) → supplier check passes ("תיק הספק תקין"), payment-type radios appear.
- [ ] Select teacher **103 (דנה חסומה)** → `SupplierBlockedAlert` shown, continue button disabled,
      payment-type selection not available.
- [ ] Continue with 101 stores session (`sessionStorage`) and navigates to the chosen submit route.

### A2. Course flow (`/submit/course`)
- [ ] Course list for teacher 101 shows eligible finished courses; running course 7004 is **not**
      offered for a course claim.
- [ ] **Course 7001** (no claims): meetings state shows 0 submitted / 12 remaining; submit 12 →
      success, no manual review.
- [ ] **Course 7002 (duplicate/partial detection)**: meetings state shows existing claim by יעל כהן,
      6 submitted / 6 remaining. Submitting 3 more → valid. Submitting 7 → flagged
      "דורש בדיקה ידנית" with reason `סה"כ מפגשים לאחר ההגשה: 13 מתוך 12`.
      API check: `GET /api/monday/check-duplicate?teacherId=101&courseId=7002&preview=1` returns
      `isDuplicate: true` with existing item 555001. *(Note: this endpoint is currently server-only;
      the UI surfaces duplicates via the course-meetings state.)*
- [ ] **Course 7003** (fully submitted 12/12): remaining 0; over-submission triggers manual review.
- [ ] **Course 7005** (missing lessons count): warning "חסר מספר מפגשים בקורס", submission goes to
      manual review, no amount guessed.
- [ ] **Course 7006** (legacy claim without meetings): warning shown; submission flagged for review.
- [ ] At no point are amounts, rates, or balances visible to the teacher.

### A3. Replacement flow (`/submit/replacement`) + deduction data (course 7004)
- [ ] Teacher 101 → replacement route: must pick replaced teacher; replaced teacher's courses load
      (running + finished only); replacement date + meetings required; submit succeeds.
- [ ] Deduction lookup API: `GET /api/monday/replacements?teacherId=101&courseId=7004&preview=1`
      returns one replacement (אמיר לוי, 12/05/2026) with `totalSuggestedDeduction: 550`.
- [ ] When a submission payload includes `deductionSummary`, the created item's system notes include
      the "קיזוז החלפות" lines (verify via submit response in preview / system notes column in real mode).
      *(Note: as of this writing no client component calls `/api/monday/replacements`; verify the
      endpoint contract and system-notes path until the UI wiring lands.)*

### A4. Private lessons flow (`/submit/private`)
- [ ] Teacher 101 sees students נועם ישראלי and רוני עזרא with purchased/held/remaining counts.
- [ ] Lessons count required and must be > 0; submit succeeds and is routed to manual review
      (private lessons always `needs_review`).

### A5. Other flow (`/submit/other`)
- [ ] Details field required; submit succeeds; flagged for manual review.

### A6. Success page (`/success`)
- [ ] Shows submission summary (type, subject, units when relevant, manual-review notice when set);
      session cleared; "new request" path returns to `/`.

### A7. Real mode (token present) sanity
- [ ] `/` without `?preview=1` hits real Monday (`/api/monday/teachers` returns live data).
- [ ] `npm run test:meetings` green; `npm run lint` and `npm run build` pass.

## B. Preview smoke (`?preview=1`)
- [ ] Entire A1–A6 path completes with **no** `MONDAY_API_TOKEN` set.
- [ ] With a token set, `?preview=1` still forces mocks; without the flag, real data is used.
- [ ] Mock submit returns an itemId (990xxx) and never writes to Monday.

## C. Portal access states
- [ ] Unauthenticated (cloudflare mode, no Access header) → `/unauthorized`.
- [ ] Email not on Teachers board → `/unauthorized` (not_found message, office contact hint).
- [ ] **Duplicate email** (two teacher items share the email) → blocked safely at `/unauthorized`;
      duplicate listed in `/admin/diagnostics`.
- [ ] App access pending → `/pending`; blocked → `/blocked`; inactive teacher → `/blocked`.
- [ ] Preview role-switcher (preview mode only): switching role changes nav and scope immediately;
      switcher absent/inert in cloudflare mode with a real token.

## D. Portal flows per role (preview)
- [ ] **teacher**: dashboard/courses/meetings show **only own** items; direct URL to another
      teacher's course/meeting → 404/forbidden (server-side, not just hidden in UI).
- [ ] **mentor**: sees own data + assigned teachers' (`mentorTeacherIds`) only; others blocked.
      (Until the mentor relation column is mapped: mentor scope comes from mock data in preview and
      diagnostics shows the missing mapping.)
- [ ] **training_manager**: sees all teachers' courses/meetings; admin area limited to
      diagnostics/users read.
- [ ] **admin**: sees all + full `/admin/*`.

## E. Attendance
- [ ] `/attendance/[meetingId]` for an owned meeting: roster renders; statuses
      present/absent/late/excused/cancelled + per-student note + general note.
- [ ] Preview submit succeeds with `storedInMonday: false` and a clear notice.
- [ ] Real mode with unmapped attendance columns → clear Hebrew configuration error (no silent drop).
- [ ] Submitting for a meeting owned by another teacher → rejected server-side (403), including via
      crafted request with forged `submittedByTeacherItemId`.

## F. Payments wrapper, calendar, materials, notebook
- [ ] `/payments` lists only the current user's requests; **no amounts/rates shown**.
- [ ] `/payments/new` skips teacher selection and uses `currentUser.teacherItemId`; the flow then
      matches section A behavior.
- [ ] **Teacher spoofing on submit**: in authenticated mode, POST to the submit path with
      `submitterId` of a different teacher → 403; legitimate submit (own id) succeeds.
- [ ] Open flow (`/` + `/submit/*`) still works exactly as before the portal (section A unchanged).
- [ ] Calendar: `GET /api/calendar/course/[courseId]` and `/api/calendar/my-upcoming` download valid
      `.ics` built from real meeting items (mock meetings in preview); unauthorized course → 403;
      events import into a calendar client with correct date/title.
- [ ] `/materials` renders links (Monday board when configured, typed local fallback otherwise);
      external links open in new tab.
- [ ] `/private-students/[courseId]` (private-lesson product): course fields + per-meeting summaries
      editable in preview; real mode with unmapped fields → config error on save, read view degrades
      gracefully.

## G. Admin
- [ ] `/admin/diagnostics`: shows `AUTH_MODE`, identity source (cloudflare/preview), every mapping
      from `getPortalMappingDiagnostics()` with required/configured flags — including Meetings board
      (or `PORTAL_MEETINGS_BOARD_ID` override), teacher role/access/mentor columns, notebook fields,
      materials board — and duplicate-email check results.
- [ ] `/admin/users`: teacher list with active + access status; pending-approvals UI only appears
      when the access-status mapping exists, otherwise "not configured".
- [ ] `/admin/mappings`: required vs configured board/column IDs match
      `docs/teacher-portal-monday-mappings.md`.
- [ ] `/admin/materials`: manage links when board configured; "not configured" otherwise.
- [ ] Non-admin roles get no `/admin` nav and direct URLs are rejected server-side.

## H. Security checks
- [ ] `grep -rn "MONDAY_API_TOKEN" app components` → no hits in client components; token used only
      in `lib/monday/client.ts` / `lib/runtime-env.ts` server paths.
- [ ] `grep -rn "NEXT_PUBLIC" app lib components .env.example` → no secrets (ideally no hits).
- [ ] No Monday GraphQL from client components:
      `grep -rln "\"use client\"" app components | xargs grep -ln "fetchQuery\|fetchMutation\|api.monday.com"` → empty.
- [ ] No DB deps: `grep -in "supabase\|prisma\|drizzle\|postgres\|sqlite" package.json` → empty.
- [ ] Response bodies for teacher-facing endpoints contain no teaching/travel rates or amounts.
- [ ] In cloudflare mode, requests with a forged `Cf-Access-Authenticated-User-Email` header but no
      Access enforcement are treated per deployment policy (Access must front the Worker;
      `CLOUDFLARE_ACCESS_AUD` validation when enabled rejects them).
- [ ] Preview identity (`PORTAL_PREVIEW_EMAIL`/cookie) is ignored when `AUTH_MODE=cloudflare` and a
      real token is present.

## Sign-off
- [ ] `npm run lint` / `npm run build` / `npm run test:meetings` all pass.
- [ ] Sections A+B fully green (blocking). C–H green or failures triaged with issues filed.
- Tester: ______  Date: ______  Commit: ______
