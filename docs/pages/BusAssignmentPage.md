# Page Title: Bus & Hapak Assignment (שיבוץ מפקדים וניוד)
**Route:** `/main/bus`

## Purpose & Description
The `BusAssignmentPage` handles the daily bus/transport and hapak (חפ"ק) personnel assignment (valid from 18:00). It auto-generates a suggested assignment, allows manual swap via personnel pickers, exports the result as a PNG image, and saves it to the "שיבוץ אוטובוסים" sheet.

## Authentication & Access Level
- **No router guard** — `/main/bus` is NOT wrapped in `<CommanderGuard>` (`src/App.tsx:68`).
- Protection is **UI-level only**: the save button renders only when `isAuthenticated` (`BusAssignmentPage.tsx:597-608`), and all personnel swaps are `readonly` when not authenticated or when exporting.

## Key Components
- `generateBusAssignment()` (`:76-213`): auto-generation — 4 hapak missions (מ"פ, 1ג, 2ג, 3ג; `:65-70`), commander fallback to "מפקד2", specialist limits (3 for מ"פ, 2 for others, `:115`), platoons 1 and 3 only (`:72`), dynamic team counts, medic logic (`:179-195`), random shuffle (`:160-161`).
- `PersonnelSwap`: Popover (desktop) / Drawer + Command (mobile) personnel picker with presence color dots (`:217-373`).
- PNG export via `html2canvas` with a hidden export header (`:476-514`).
- "נספחים" section listing unassigned available soldiers (`:754-775`).

## State Management & Data Fetching
- **Server Data (3 webhooks)**:
  - `GET /webhook/hapak-eligible` — hapak personnel registry (sheet "חפקים") (`:409`)
  - `GET /webhook/load-bus?date=D/M/YY` — load saved assignment (`:419`)
  - `POST /webhook/save-bus` `{date, assignment}` — save assignment (`:455-461`)
  - Plus `useMainAttendance(date)` for presence data (`:381`).

## Core Logic & Behaviors to Maintain
- This page implements the **full 4-hapak structure** (מ"פ + 1ג/2ג/3ג) described in `HAPAK_RULES.md`, unlike `GuardAssignmentPage` which implements only חפ"ק מ"פ.
- **Note**: `HAPAK_RULES.md` also describes engineer/medic exclusivity and other rules — only a subset is implemented here (commander-first, specialist limits, medic logic).
