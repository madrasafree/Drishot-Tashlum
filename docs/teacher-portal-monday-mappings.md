# Teacher Portal — Monday Board & Column Mappings

**Single source of truth** for every Monday board/column the portal reads or writes.
Code locations: known IDs live in `lib/monday/constants.ts` (existing payment flow) and
`lib/monday/portal-mappings.ts` (portal additions). Anything marked
**TODO — required for production** raises a Hebrew configuration error in real mode and falls back
to mock data in preview. Status of all mappings is visible at `/admin/diagnostics`.

Legend: column IDs are Monday's internal ids (e.g. `color_mkq1g95v`), not display names.

---

## 1. Teachers — מורים לקורסים — board `1179972988`

Constant: `BOARD_IDS.TEACHERS`, columns: `TEACHER_COLUMNS` (`lib/monday/constants.ts`).

| Purpose | Column ID | Type | Consumed by |
|---|---|---|---|
| Teacher name | `name` (item name) | item name | everything |
| Email (login identity) | `email` | email | **auth** (`lib/auth/current-user.ts` email lookup), payment flow |
| Phone | `_____3` | phone | admin users view |
| ID number | `text2` | text | payment flow |
| Active status | `color_mkq1g95v` | status | auth (`isActive`), `getActiveTeachers` filter (`compare_value: [1]`) |
| Supplier relation | `board_relation_mkqrgntw` | board relation → Suppliers | supplier check, payments |
| Supplier file status | `color_mm0w6kxf` | status | supplier blocking, `CurrentUser.supplierFileStatus` |
| Courses relation | `connect_boards9` | board relation → Courses | course lists |
| Private lessons relation | `board_relation_mm0wnmwq` | board relation → Private Lessons | private flows |
| Pedagogical guide | `status_1__1` | status | (existing constant, not yet used by portal) |
| **App access status** (approved/pending/blocked) | **TODO — required for production** (typed `null` in `portal-mappings.ts`) | status | auth gating (`/pending`, `/blocked`); until mapped: active teachers treated as approved, status `unknown` |
| **App role** (teacher/mentor/training_manager/admin) | **TODO — required for production** | status | role resolution; interim source: `PORTAL_ADMIN_EMAILS` / `PORTAL_TRAINING_MANAGER_EMAILS` envs |
| **Mentor relation** (mentor → assigned teachers) | **TODO — required for production** (for mentor role) | board relation (self) | mentor visibility scope (`mentorTeacherIds`) |

## 2. Suppliers — ספקים מדרסה — board `9101632052`

Constant: `BOARD_IDS.SUPPLIERS`, columns: `SUPPLIER_COLUMNS`. Fully mapped; the portal only reads
via the existing supplier check.

| Purpose | Column ID | Type | Consumed by |
|---|---|---|---|
| Supplier name | `text_mkqrfpzx` | text | supplier check |
| Beneficiary name | `text_mkrcb7gn` | text | office use |
| Category | `status` | status | office use |
| Supplier file status | `color_mkqr7v8z` | status | blocking logic (`app/api/monday/supplier-check`) |
| Tax validity date | `date_mkqrepm1` | date | blocking logic (expired ⇒ blocked) |
| Email | `email_mkqrwpj6` | email | office use |
| ID number | `text_mkqrjyty` | text | office use |
| Employment status | `color_mkqrr42c` | status | office use |
| Tax deduction | `color_mkqrkb91` | status | office use |
| Documents files | `file_mkqrvzyf` | file | office use |

## 3. Courses — קורסים משולבים — board `914870132`

Constant: `BOARD_IDS.COURSES`, columns: `COURSE_COLUMNS`.

| Purpose | Column ID | Type | Consumed by |
|---|---|---|---|
| Course name | `name` | item name | all course views |
| Teacher relation | `link_to______________________` | board relation → Teachers | course scoping per teacher |
| Start date | `date` | date | course lists, dashboard |
| End date | `date2` | date | course lists |
| Teaching rate | `numeric` | number | **server-side amount calc only — never shown to teachers** |
| Travel rate | `numeric1` | number | server-side amount calc only |
| Course state | `status_mkkzjxkt` | status | visibility/eligibility filters |
| Teacher status | `status05` | status | finished-course detection |
| Payment status | `color` | status | duplicate/blocking detection |
| Lessons count | `numbers9` | number | meetings validation |
| Level | `numbers4` | number | display |
| **Location** | **TODO — optional for portal display** | text/location | course detail page |
| **Zoom link** | **TODO — optional for portal display** | link | course detail, calendar export |
| **Notebook: learning goals** | **TODO — required for production notebook** | long_text | private student notebook (course-level) |
| **Notebook: language background** | **TODO — required for production notebook** | long_text | private student notebook |
| **Notebook: general notes** | **TODO — required for production notebook** | long_text | private student notebook |

(Notebook fields may live on the Private Lessons board instead — decide during mapping and record
the final location here and in `portal-mappings.ts`.)

## 4. Private Lessons — הרשמות לשיעורים פרטיים — board `18082848395`

Constant: `BOARD_IDS.PRIVATE_LESSONS`, columns: `PRIVATE_LESSON_COLUMNS`.

| Purpose | Column ID | Type | Consumed by |
|---|---|---|---|
| Item name | `name` | item name | display |
| Teacher relation | `board_relation_mkwa4jw7` | board relation → Teachers | scoping |
| Student name | `text_mkwawacp` | text | notebook header, payments |
| Status | `status` | status | eligibility filter |
| Lessons purchased | `numeric_mm0p7wx7` | number | payments |
| Lessons held | `formula_mm0yvry6` | formula | payments |
| Lessons remaining | `formula_mm0y2gqp` | formula | payments |
| **Notebook fields** (goals/background/notes if stored here) | **TODO — required for production notebook** | long_text | private student notebook |

## 5. Payment Requests — דרישות תשלום — board `8396771037`

Constant: `BOARD_IDS.PAYMENT_REQUESTS`, columns: `PAYMENT_REQUEST_COLUMNS`,
`PAYMENT_REQUEST_COLUMNS_V2`, `PAYMENT_REQUEST_MEETINGS_COLUMNS`. Owned by the existing payment
flow; the portal reads it for `/payments` and writes only through the existing submit path.

| Purpose | Column ID | Type | Consumed by |
|---|---|---|---|
| Submitter (teacher) | `connect_boards_mkmtjb7v` | board relation → Teachers | submit, **/payments scoping, submit guard** |
| Supplier | `board_relation_mkqw15s9` | board relation → Suppliers | submit |
| Supplier approval | `lookup_mkr3nbkn` | mirror | office |
| Item name | `text_mkrbkwdh` | text | submit |
| Details | `text_mkpvbcde` | text | submit |
| Submit date | `date_mkn83j86` | date | submit, /payments list |
| Teaching amount | `numbers_mkmv6m0m` | number | **server-side only — never shown to teachers** |
| Travel amount | `numeric_mknf5vt3` | number | server-side only |
| Status | `color_mkptpky8` | status | duplicate detection, /payments list |
| Course | `connect_boards_mkmta87` | board relation → Courses | submit, duplicate detection |
| Payment type | `status_mkmvbxtq` | status | submit, filtering |
| Replaced teacher | `board_relation_mknfrcyc` | board relation → Teachers | replacement flow |
| Replacement date | `text_mkp6ta1q` | text | replacement flow |
| Private lessons | `board_relation_mm0x9vwe` | board relation → Private Lessons | private flow |
| Lessons count | `numeric_mm0xxmbn` | number | private flow |
| Total transfer | `numeric_mkptwqxq` | number | server-side only |
| System notes | `long_text_mm39e63q` | long_text | submit fallback notes |
| Requested meetings | **TODO** (`PAYMENT_REQUEST_MEETINGS_COLUMNS.REQUESTED_MEETINGS = null`) | number | meetings tracking (falls back to system notes) |
| Course total meetings snapshot | **TODO** (`null`) | number | meetings tracking |
| Course claim type | **TODO** (`null`) | status | meetings tracking |
| Manual review | **TODO** (`null`) | status | office triage |
| Review reason | **TODO** (`null`) | text | office triage |
| Expected amount / amount match / total submitted / rate mirrors | `formula_mkpvpapy`, `formula_mkpvqn17`, `formula_mkpv2f0n`, `lookup_mkpv381y`, `lookup_mkpvay16` | formula/mirror | office (V2) |

## 6. Meetings — מפגשים — board **[MISSING — production blocker]**

No board ID is known. Every portal meeting must be a **real Monday item**; no virtual meeting
generation. Until mapped: real mode raises `PortalConfigurationError`; preview uses
`portal-mock.ts`. Temporary unblock: set env `PORTAL_MEETINGS_BOARD_ID`.

| Purpose | Column ID | Type | Consumed by |
|---|---|---|---|
| **Board ID** | **TODO — required for production** (env override `PORTAL_MEETINGS_BOARD_ID`) | — | all meeting features |
| Course relation | **TODO — required for production** | board relation → Courses | course detail, calendar |
| Teacher relation | **TODO — required for production** | board relation → Teachers | authorization (meeting ownership) |
| Date (+ time) | **TODO — required for production** | date | dashboard, calendar export |
| Duration | **TODO — recommended** | number | calendar export (default duration otherwise) |
| Status | **TODO — required for production** | status | meeting lists (`scheduled/completed/cancelled`) |
| Location | **TODO — optional** | text/location | meeting detail, .ics LOCATION |
| Zoom link | **TODO — optional** | link | meeting detail, .ics |
| Students | **TODO — required for attendance** | relation/subitems/text | attendance checklist roster |
| Attendance storage | **TODO — required for attendance writes** (model undecided: columns on item / subitems / connected board / long_text JSON) | — | `lib/monday/attendance.ts` |
| Meeting summary fields (topics, new words, homework, teacher notes) | **TODO — required for production notebook** | long_text | private student notebook per-meeting summaries |

## 7. Materials / Links — board **[MISSING — optional]**

Optional. When unmapped, `/materials` serves a typed local config fallback defined in
`lib/monday/materials.ts` (no DB). `/admin/materials` shows "not configured".

| Purpose | Column ID | Type | Consumed by |
|---|---|---|---|
| Board ID | **TODO — optional** | — | /materials, /admin/materials |
| Title | `name` (expected) | item name | /materials |
| URL (Drive/external) | **TODO — optional** | link | /materials |
| Description | **TODO — optional** | text | /materials |
| Category | **TODO — optional** | status | /materials grouping |
| Audience (role/course scoping) | **TODO — optional** | status/relation | /materials filtering |

---

## How to find a column ID in Monday (admin instructions)

1. Open the board in Monday (e.g. `https://madrasa.monday.com/boards/1179972988`).
2. Easiest: board menu (⋯) → **Developers** → "Column IDs" / API playground; or click a column
   header → ⚙ → the column id appears in the column settings URL/details.
3. Alternatively run this in Monday's API playground (https://monday.com/developers/v2/try-it-yourself):

   ```graphql
   query { boards(ids: [BOARD_ID]) { columns { id title type } } }
   ```

   Copy the `id` value (e.g. `color_mkq1g95v`), **not** the Hebrew title.
4. Board IDs are the number in the board URL: `https://....monday.com/boards/<BOARD_ID>`.

## Where to fill the IDs in

1. **`lib/monday/portal-mappings.ts`** — replace the typed `null` placeholder for the matching key
   and delete its TODO comment. This is the canonical place for all portal mappings.
2. **Env overrides** — `PORTAL_MEETINGS_BOARD_ID` can be set in `.env.local` / Cloudflare project
   env to unblock the Meetings board without a code change. Code value (when added to
   `portal-mappings.ts`) wins consistency checks; diagnostics flags a mismatch.
3. Existing payment-flow columns stay in **`lib/monday/constants.ts`**
   (`PAYMENT_REQUEST_MEETINGS_COLUMNS` nulls are filled there, not in portal-mappings).
4. After filling, verify in **`/admin/diagnostics`**: every row must show configured; run the
   relevant regression checklist section.
5. Update **this document** — it must always match `portal-mappings.ts`.
