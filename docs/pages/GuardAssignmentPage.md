# Page Title: Guard Assignment & Management (שיבוץ שמירות / ניהול שמירות)
**Route:** `/guards` (Soldier Mode, public) and `/main/guards/manage` (Commander Mode, `<CommanderGuard requiredRoll="guard">`)

## Purpose & Description
The `GuardAssignmentPage` is the most complex page in the system. It handles the automated generation, manual adjustment, visual rendering, and image exportation of the daily Guard and Hapak schedules. It operates in two entirely different modes:
1. **Soldier Mode:** A clean, read-only display of the final, loaded assignment.
2. **Commander Mode:** An interactive, protected dashboard that allows for generating assignments based on complex constraint logic, tweaking specific roles via searchable dropdowns, and exporting final schedules as images.

## Authentication & Access Level
- **Soldier View (`/guards`):** Publicly accessible. No login required.
- **Commander View (`/main/guards/manage`):** Intended to be strictly walled off. It checks `isAuthorized` via the `useAuth()` hook (`mode === "commander" || authorizedRolls.includes("guard")`, ~line 839). The router implements a `<CommanderGuard requiredRoll="guard">` validation checkpoint to prevent unauthorized generation or tampering with the assignment data.

## Key Components
- `PersonnelSwap`: A heavy interactive sub-component consisting of a `Popover` (desktop) and `Drawer` (mobile) containing a `Command` search list. It allows commanders to manually override a slot by viewing all eligible available personnel, along with their point scores and validation warnings (e.g., gap conflict).
- `html2canvas`: While not a UI component, this heavy utility is heavily integrated into the JSX refs (`guardTableRef`, `hapakGridRef`) to capture specific HTML sub-trees, forcefully override their CSS dynamically (e.g. `whitespace-nowrap`), and trigger a PNG download.
- `DatePickerBar`: Selects the relevant assignment date.

## State Management & Data Fetching
- **Local State (`useState`):**
  - `assignments`: The actively edited, volatile state of current guards & hapak.
  - `loadedAssignments`: The saved assignment explicitly pulled from the 'backend' / localStorage.
  - `history`: Cumulative point tracking for personnel.
  - `blockedNames`: A `Set` of people intentionally excluded from the generation logic by the commander.
- **Server Data:** Pulls raw availability from `useMainAttendance(date)`.
- **Persistence Layer:** Assignments and point ledgers are stringified and stored. Historically, this leverages browser `localStorage` (`STORAGE_KEY = "guard_burden_points"`, `BLOCKED_STORAGE_KEY`).

## Core Logic & Behaviors to Maintain
- **Automated Generation Rules (`generateAssignment`):**
  - **Points System** (`POINTS` const, ~line 101): Heavily relies on tracking `burdenPoints` (from main API) combined with local `history`. חפ"ק = 3, חמל לילה = 3, חמל יום = 2, פילבוקס = 3, יזומה = 2, רס"פ = 1, קצין תורן = 2.
  - **Slots:** חפ"ק מ"פ (4, commander hardcoded "רז חיון"), חמל ×3 shifts (22:00–06:00/06:00–14:00/14:00–22:00), יזומה ×4 (+ optional יזומה ב), פילבוקס ×8 (סמל pre-assigned first) + up to 1 extra soldier, plus קצין תורן / תורן רס"פ.
  - **Selection (`getBestCandidate`, ~line 232):** yesterday's occupant kept if available → candidate must be present/returning, unassigned, not מ"פ/מפ → sort by exact role match then ascending `burdenPoints + history` (yesterday's pilbox team gets −2).
  - **Pilbox:** ≥3 females if any female used; tomorrow-leavers excluded unless slot empty.
  - **Eligibility:** `getComputedPresence()` (`src/lib/attendanceUtils.ts:208`); excluded roles: מ"פ/מפ, מנהלה (for חייל slots), סמ/קצין (for רס"פ).
  - ⚠️ **No 12-hour gap rule is implemented** (mentioned in older docs; superseded by continuity preference). Schedule starts 14:00 ("החל מ-14:00"). `tomorrowRecords` is never passed in production → tomorrow-leaver logic is test-only.
- **Exporting Architecture:** Do **not** remove inline class names like `no-export` or nested visual references, as the complex `html2canvas` logic is extremely brittle and relies on injecting specific overrides (`windowWidth: 1000`) into a cloned DOM before capturing an image.
- **Role Awareness:** UI elements like the "Save", "Generate", "Clear" buttons, and the interactive swappers (`PersonnelSwap`) are conditionally rendered or disabled based heavily on `mode === "commander"` and `isAuthorized`. Breaking this will expose administrative controls to public soldiers.
