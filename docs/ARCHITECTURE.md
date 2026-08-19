# Project Architecture & Design System — דוח1 (Doch-1)

Hebrew RTL PWA for an IDF reserve unit: attendance reporting (דוח נוכחות), 4-day work plan, guard/hapak assignment (שיבוץ שמירות), phonebook, and bus assignment. No real backend — everything is n8n webhooks + Google Sheets + localStorage.

## 1. Technology Stack

- **Frontend**: React 18 + TypeScript (strict) + Vite 6 (`vite.config.ts`).
- **Routing**: `HashRouter` (React Router v6) — GH Pages compatible (`src/App.tsx:35`).
- **State/Data**: React Query v5 (`@tanstack/react-query`) — global defaults `retry: 1`, `staleTime: 60s` (`src/App.tsx:20-27`); per-hook `staleTime: 5min`.
- **Styling**: Tailwind 3 + shadcn/Radix (`src/components/ui/`), tailwind-merge `cn()` (`src/lib/utils.ts`).
- **Animations**: framer-motion. **Export**: html2canvas (PNG of guard/bus tables).
- **PWA**: `vite-plugin-pwa`, `registerType: "autoUpdate"`, manifest "דוח-1", `PWAInstallButton` component.
- **Backend**: self-hosted n8n at `https://151.145.89.228.sslip.io` + single Google Sheet doc `1CG8OQGdvOZdji15yY3ZV2QL6NhcLlxZ5fBBothfLSx8`.
- **Testing**: vitest + testing-library (`src/test/`). Versioning: `package.json` semver.

## 2. Directory Structure

- `src/pages/` — views (each documented in `docs/pages/<Name>.md`).
- `src/components/` — shared components; `/ui` = atomic shadcn; `/layouts` = `SoldierLayout`, `CommanderLayout`.
- `src/hooks/` — `useAttendanceData`, `useRoleAuth`, `use-mobile`.
- `src/lib/` — `attendanceUtils.ts` (statuses/presence), `deployment.ts` (domain gating), `utils.ts` (cn).
- `src/contexts/AuthContext.tsx` — auth state provider.
- `src/types/attendance.ts` — `RawRecord`, `AttendanceRecord`, `StatusType`, stats types.
- `n8n/` — local copies of the 3 n8n workflows (Auth, Guard Assignment, Update Status).
- `docs/` — architecture + per-page docs.
- Repo root: legacy vanilla pages (`main.html`, `zama.html`, `contact.html`, `update.html`) + `api.js`/`main.js`, still in the vite multi-entry build.

## 3. Routing & Access Model

| Route | Page | Access |
|---|---|---|
| `/guards` (+ `contact`, `vacation`) | Soldier portal (read-only) | public |
| `/main` | MainPage (attendance dashboard) | public, but `CommanderLayout` redirects to `/guards` on the Cloudflare `workers.dev` domain (`src/lib/deployment.ts`) |
| `/main/workplan`, `/main/contact` | work plan, phonebook | public |
| `/main/update` | DataUpdatePage | `CommanderGuard requiredRoll="update"` |
| `/main/guards/manage` | GuardAssignmentPage (commander mode) | `CommanderGuard requiredRoll="guard"` |
| `/main/bus` | BusAssignmentPage | **no router guard** — UI-level `isAuthenticated` only |

**Auth** (see `docs/AUTH_SYSTEM_DOCUMENTATION.md`): Google Identity Services sign-in → POST `/webhook/validate` → server returns `roll` → persisted in `localStorage` (`is_commander`, `user_info.authorizedRolls`). Client-side only; localhost/`192.168.*`/`10.*`/`172.*` hosts get a mock commander with full access (`AuthContext.tsx:18-29`). Roles: `update`, `guard` (legacy `phone` no longer used).

## 4. Data Flow & Webhook Inventory

All requests go to `https://151.145.89.228.sslip.io/webhook/...`. Dates serialized as `D/M/YY` via `formatDateForApi()` (`src/lib/attendanceUtils.ts:27`). Attendance rows normalized by `processRecords()` (`attendanceUtils.ts:81`) and `normalizeStatus()` (`attendanceUtils.ts:10`).

| Endpoint | Method | Purpose | Used by |
|---|---|---|---|
| `/validate` | POST `{email, roll, credential}` | auth whitelist (n8n Data Table `emails`) | `useRoleAuth.ts` |
| `/Doch-1?date=` | GET | attendance → `{data:[...]}` | `useAttendanceData`, WorkPlanPage |
| `/Zama/Doch-1?id=&date=` | GET | per-dept attendance | dead (Zama removed) |
| `/update-status` | POST `{name,status,date,email}` | write status; hardcoded email whitelist `lip.avi@gmail.com` | DataUpdatePage |
| `/load-guards?date=` / `/save-guards` | GET/POST | assignment save/load (sheet "שיבוץ שמירות") | GuardAssignmentPage |
| `/confirm-guards` | POST `{updates:[...]}` | confirm + append points ledger (sheet "יומן פעילות") | GuardAssignmentPage |
| `/hapak-eligible` | GET | hapak registry (sheet "חפקים") | BusAssignmentPage |
| `/load-bus?date=` / `/save-bus` | GET/POST | bus assignment (sheet "שיבוץ אוטובוסים") | BusAssignmentPage |
| `/979/vacation?id=` | GET | vacation data | defined in n8n, unused by app |

⚠️ **Known gap**: live `/Doch-1` mapper returns only `{name, personalNumber, department, role, todayValue, dateUsed}` — **no `gender`/`burdenPoints`** → gender-balance and burden-sorting logic degrades in production.

### Deployment
- **GH Pages**: `https://avrahamlip.github.io/3-979/` — `npm run deploy:gh` (vite `base: "/3-979/"`).
- **Cloudflare Worker**: `mountain-axes` (wrangler.toml) — `index.js` reverse-proxies the GH Pages site; commander dashboard is **hidden on this domain** (`isCommanderDashboardAllowed()`).
- **Vercel**: `vercel.json` `/api-webhook` proxy — unused by current code.

## 5. Core Business Logic

### Guard assignment (`src/pages/GuardAssignmentPage.tsx`, ~1900 lines)
See `AGENTS.md` "Core logic — Guard Assignment" and `docs/pages/GuardAssignmentPage.md` for the full algorithm (slots, `getBestCandidate`, points, pilbox gender/continuity rules). Key entry point: exported `generateAssignment()` (~line 122).

### Statuses & presence (`src/lib/attendanceUtils.ts`)
`normalizeStatus()` maps raw sheet values (`נ/V/1`, `יא`, `א/0`, `ג/2`, `מק`, `ק`, `מ`, `ש`, `פנ`, `פ`, `יפ`, `4`, else) to 12 Hebrew `StatusType`s. `getComputedPresence()` (line 208) → `"full" | "leaving" | "returning" | "none"` with yesterday cross-check; eligible for assignment = `full`/`returning`.

### HAPAK rules (`HAPAK_RULES.md`)
Business rules reference doc. ⚠️ **Drift**: describes 1ג-3ג hapaks, 12:00 schedule start, engineer/medic exclusivity, sergeant hour-roster exemption — most are **not implemented** (only חפ"ק מ"פ in GuardAssignmentPage; BusAssignmentPage implements all 4 hapak teams). Verify before relying on it.

## 6. Design Principles

- **Premium aesthetics**: glassmorphism (`bg-white/10`, `backdrop-blur-md`), deep navy / electric blue / slate, micro-animations (framer-motion), skeleton loaders.
- **RTL-first**: all UI Hebrew, right-to-left.
- **Mobile-first**: drawer/popover responsive patterns, sticky headers.

## 7. Documentation Constraint

Every change to `src/pages/` must update its file in `docs/pages/`; business logic must respect `HAPAK_RULES.md`; keep soldier/commander route separation. Known stale docs: `docs/pages/GuardAssignmentPage.md` (see drift notes in AGENTS.md), `docs/AUTH_SYSTEM_DOCUMENTATION.md` (mentions `AuthGuard.tsx`/`phone` role — legacy).
