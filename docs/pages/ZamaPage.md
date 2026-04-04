# Page Title: ZAMA Report (דוח צמ"ה)
**Route:** `/zama`

## Purpose & Description
The `ZamaPage` is a specialized daily attendance report specifically meant for the ZAMA (צמ"ה - צמ"ה כבד) departments. It displays grouped personnel attendance, calculating presence percentages (בבסיס / Total) and showing role-based breakdowns for these specific departments in an expandable accordion format.

## Authentication & Access Level
- **Access Level:** Public by default (View-only).
- **Security Logic:** Intended for commanders to view specific subset data, but not protected by any `<CommanderGuard>` wrapper.

## Key Components
- `ZamaDeptSection`: A custom internal component that implements a collapsible accordion using `framer-motion`. It displays the department's summary, progress bar, and a nested table of personnel.
- `DatePickerBar`: Controls the date for the ZAMA report.
- `LegendCard`: Provides a color/icon legend defining what different status markers mean.
- `StatusCountsRow`: Minimal display to show summary stat counts inline.
- `StatusBadge`: Renders individual personnel's status visually.
- `StatusMessages` (`LoadingOverlay`, `ErrorMessage`, `EmptyState`): Handles the visual states of data fetching.

## State Management & Data Fetching
- **Local State:** 
  - `useState(getTodayIso())` in `ZamaPage` controls the selected date.
  - `useState(true)` within each `ZamaDeptSection` controls the open/closed state of the accordion.
- **Server Data:** `useZamaAttendance(date)` hook executes the remote fetch explicitly filtering for the `ZAMA_DEPTS` list.
- **Derived State:** `useMemo` is used to aggregate the `totalRecords` dynamically and extract `buildStatusCounts` and `buildRoleStats` for each specific department block.

## Core Logic & Behaviors to Maintain
- **Calculations & Progress Bar:** The overall attendance percentage uses `counts.total > 0 ? Math.round((counts["בבסיס"] / counts.total) * 100) : 0`. The visual progress bar width maps completely to this percentage.
- **Accordion Animation:** Relying on `framer-motion` (`motion.div` and `AnimatePresence`), the accordion gracefully opens and closes. Preserving the exact structure of `AnimatePresence` + `motion.div` is critical to prevent visual jank.
- **Data Filtering:** The data mapping iterates exactly over the specific `ZAMA_DEPTS` imported from `hooks/useAttendanceData.ts`. It assumes structured dictionary data (`data[dept]`).
