# AGENTS.md — דוח1 (Doch-1) Daily Attendance & Guard Assignment System

Read this first. It summarizes the architecture, data flow, and core logic so you do NOT need to re-explore the whole codebase. For details, see `docs/` (especially `docs/ARCHITECTURE.md`).

## What this project is

A Hebrew (RTL), mobile-first PWA for an IDF reserve unit ("דוח 1", repo "3-979"):
- **Soldier portal** (`/guards`): read-only view of the daily guard/security assignment (שיבוץ שמירות), phonebook, vacation planner.
- **Commander portal** (`/main`): attendance dashboard (דוח נוכחות), 4-day work plan, **auto-generated guard assignment** with constraint logic, status updates, bus/hapak assignment.
- Backend = **self-hosted n8n** (`https://151.145.89.228.sslip.io`) + **Google Sheets** (single doc `1CG8OQGdvOZdji15yY3ZV2QL6NhcLlxZ5fBBothfLSx8`). The React app has no real backend — everything is webhooks + localStorage.

## Quick commands

```sh
npm run dev          # vite dev server
npm run build        # production build
npm run lint         # eslint
npm run test         # vitest
npm run deploy:gh    # gh-pages deploy (after build)
npm run deploy:worker # Cloudflare Worker proxy deploy
```

## Tech stack

React 18 + TypeScript (strict) + Vite 6, React Router **HashRouter** (GH Pages compat), React Query v5 (`retry:1`, `staleTime:60s` global), Tailwind 3 + shadcn/Radix `src/components/ui/`, framer-motion, html2canvas (PNG export), `vite-plugin-pwa` (autoUpdate). Version is managed via `package.json` (semver bumps in git history, e.g. `3.14.6`).

## Routing & auth (src/App.tsx)

| Route | Page | Guard |
|---|---|---|
| `/` | → redirect `/guards` | public |
| `/guards` | GuardAssignmentPage (soldier, read-only) | public |
| `/guards/contact` | ContactPage (phonebook) | public |
| `/guards/vacation` | VacationPage (iframe) | public, **nav-hidden** |
| `/main` | MainPage (attendance dashboard) | public (domain-gated, see below) |
| `/main/workplan` | WorkPlanPage (4-day matrix) | public |
| `/main/contact` | ContactPage | public |
| `/main/update` | DataUpdatePage (status editor) | `CommanderGuard requiredRoll="update"` |
| `/main/guards/manage` | GuardAssignmentPage (commander mode) | `CommanderGuard requiredRoll="guard"` |
| `/main/bus` | BusAssignmentPage (bus/hapak) | **no guard** — UI-level auth only |

- **Auth**: Google Identity Services sign-in → POST `/webhook/validate` → server returns `roll` → stored in `localStorage` (`is_commander`, `user_info.authorizedRolls`). Client-side only (forgeable); localhost/private-IP hosts get a mock commander with full access (`AuthContext.tsx:18-29`).
- **Deployment gating**: `src/lib/deployment.ts` — commander portal redirects to `/guards` on the Cloudflare `workers.dev` domain (`isCommanderDashboardAllowed()`). GH Pages = `https://avrahamlip.github.io/3-979/`.
- `checkPermission()` is wired in AuthContext but **never called** — don't rely on it.

## Webhook inventory (n8n base: `https://151.145.89.228.sslip.io`)

Dates sent as `D/M/YY` via `formatDateForApi()`.

| Endpoint | Method | Purpose | Used by |
|---|---|---|---|
| `/webhook/validate` | POST `{email, roll, credential}` | auth whitelist check | useRoleAuth.ts |
| `/webhook/Doch-1?date=` | GET | attendance rows → `{data:[{name,personalNumber,department,role,todayValue,dateUsed}]}` | useAttendanceData, WorkPlanPage |
| `/webhook/Zama/Doch-1?id=&date=` | GET | per-dept attendance (dead — Zama removed) | useZamaAttendance (unused) |
| `/webhook/update-status` | POST `{name,status,date,email}` | write status to sheet (hardcoded whitelist: `lip.avi@gmail.com` only) | DataUpdatePage |
| `/webhook/load-guards?date=` | GET | load saved assignment | GuardAssignmentPage |
| `/webhook/save-guards` | POST `{date, assignment}` | save assignment | GuardAssignmentPage |
| `/webhook/confirm-guards` | POST `{updates:[{date,name,role,type,hours,points}]}` | confirm + write points ledger (יומן פעילות) | GuardAssignmentPage |
| `/webhook/hapak-eligible` | GET | hapak personnel registry | BusAssignmentPage |
| `/webhook/load-bus?date=` / `/webhook/save-bus` | GET/POST | bus assignment save/load | BusAssignmentPage |
| `/webhook/979/vacation?id=` | GET | vacation data | defined in n8n, **unused by app** |

⚠️ **Known mismatch**: the live n8n `Doch-1` mapper returns only `{name, personalNumber, department, role, todayValue, dateUsed}` — `gender` and `burdenPoints` (needed by the assignment algorithm) are **not mapped**; `processRecords` defaults them to `undefined`/`0`.

## Core logic — Guard Assignment (`src/pages/GuardAssignmentPage.tsx`, 1900+ lines)

`generateAssignment()` (exported, line ~122) — called from `handleGenerate` and on page load; unit-tested in `src/test/assignmentLogic.test.ts`.

Fixed slots:
- **חפ"ק מ"פ (hapak)**: 4 slots, commander hardcoded to "רז חיון"; team derived from role/department containing חפק/חפ"ק. `hapakRows` param unused. (No 1ג-3ג — `HAPAK_RULES.md` describes a broader hapak structure than implemented; BusAssignmentPage does implement 4 hapak teams.)
- **חמל (chamal)**: 3 shifts × 1 person, role must contain "חמל": 22:00–06:00 (3pts), 06:00–14:00 (2pts), 14:00–22:00 (2pts).
- **יזומה**: 4 slots (מפקד, נהג, רחפן, חייל) + optional second team "יזומה ב".
- **פילבוקס (pilbox)**: 8 slots × 3pts (סמל pre-assigned first, מפקד, נהג, חייל 1-5) + up to 1 extra soldier.

Selection (`getBestCandidate`, line ~232):
1. Keep yesterday's occupant if still available (`preferName` continuity).
2. Candidate must be: present or returning (`presence !== "none"/"leaving"` — see `getComputedPresence` in `src/lib/attendanceUtils.ts:208`), unassigned/unblocked, not מ"פ/מפ, gender-compatible.
3. Sort: exact role match → ascending `burdenPoints + sessionHistory`; yesterday's pilbox team gets −2 bonus.
4. Pilbox: ≥3 females if any female used (else all-male fallback); tomorrow-leavers excluded unless slot would be empty (`allowLeavingTomorrow`).

Extras: קצין תורן (roles containing קצין/מ"מ), תורן רס"פ (1pt, excludes מפקד/סמ/קצין/מנהלה/מ"פ).

**Points** (`POINTS` const, line ~101): חפ"ק 3, חמל לילה 3, חמל יום 2, פילבוקס 3, יזומה 2, רס"פ 1, קצין תורן 2.

**Persistence**: `localStorage` — `guard_burden_points` `{date:{name:points}}`, `guard_blocked_names`. Save flow: save-guards (raw assignment) → confirm-guards (points ledger, removals logged as "הוסר").

⚠️ **Caveats / doc vs code drift**:
- The 12-hour gap rule (old doc) is **NOT implemented**; schedule actually starts 14:00 ("החל מ-14:00"), not 12:00 as HAPAK_RULES.md says.
- `tomorrowRecords` is never passed in production → `isLeavingTomorrow` always `false` (tomorrow-leaver logic only exercised by tests).
- `findBest` (line ~178) is dead code (superseded by `getBestCandidate`).
- `src/types/guard.ts` referenced by 2 test files **does not exist** → those tests fail on import (`pilboxConsecutive.test.ts`, `monthlyEdgeCases.test.ts`).
- `src/test/attendanceUtils.test.ts` is stale (expects legacy labels/date format).

## Statuses (src/lib/attendanceUtils.ts `normalizeStatus`)

`נ/V/1`→נוכח · `יא`→יצא לאפטר · `א/0/""`→אפטר · `ג/2/גימלים`→מחלה/גימלים · `מק`→מנותק קשר · `ק`→קורס · `מ`→משתחרר · `ש`→שוחרר · `פנ`→פוטנציאל נפקדות · `פ`→פיצול · `יפ`→יציאה לפיצול · `4`→נוכח(בדרך חזרה) · else אחר.

`getComputedPresence` also cross-checks yesterday's record (yesterday-away + today-present → "returning"; yesterday-present + today-home → "leaving"). Eligible for assignment: present + returning.

## Conventions (from .cursorrules — must follow)

1. **Docs sync**: every change to `src/pages/` requires updating its file in `docs/pages/`; verify documented behavior isn't broken.
2. **HAPAK rules**: business-logic changes must respect `HAPAK_RULES.md` (note: some rules there are aspirational/out of sync with code — see drift list above).
3. **RTL-first**: all UI in Hebrew, Right-to-Left.
4. **Premium aesthetics**: glassmorphism (`bg-white/10`, `backdrop-blur-md`), dark navy/electric-blue palette, micro-animations, skeleton loaders.
5. **Security/routing**: keep soldier (`/guards`) vs commander (`/main`) separation; use `CommanderGuard` for restricted tools.

## Dead / disabled code (don't resurrect without checking git history)

ZamaPage (removed `f91413d`), NotFound/Index pages (not routed), `src/types/guard.ts` (missing), legacy vanilla pages (`main.html`, `zama.html`, `contact.html`, `update.html` in repo root — still in vite multi-entry build), `vercel.json` `/api-webhook` proxy (unused), Telegram AI bot in `n8n/Update Status API.json` (backend-only).
