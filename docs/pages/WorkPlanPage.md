# Page Title: Work Plan (תוכנית עבודה)
**Route:** `/workplan`

## Purpose & Description
The `WorkPlanPage` presents a 4-day matrix (Yesterday, Today, Tomorrow, Day After Tomorrow) displaying personnel availability. It is designed to help commanders see a broad view of attendance over time to facilitate planning and assignments.

## Authentication & Access Level
- **Access Level:** Public by default (View-only).
- **Security Logic:** Intended for commanders, but does not enforce a strict login wall via `CommanderGuard`.

## Key Components
- `DatePickerBar`: Selects the "Today/Anchor" date.
- **Filters Row:** 
  - Free-text `Search` bar for names.
  - Department dropdown filter.
  - Multi-select `Popover` with `Checkbox`es for role filtering.
  - Status dropdown filter (filters based on the status of the *anchor* day).
- **Matrix Table:** A large data grid table showing the calculated 4 specific days horizontally and personnel names vertically, with sticky column styling for scrolling.
- `StatusBadge`: Maps the text statuses into visual indicators.

## State Management & Data Fetching
- **Local State:** 
  - `[baseDate, setBaseDate]` sets the anchor date.
  - `search`, `deptFilter`, `roleFilter`, and `statusFilter` hold user filter preferences.
- **Server Data:** The page implements 4 concurrent API fetches using the local `useDayData(isoDate)` wrapper around `fetchDayData()`. It explicitly fetches data directly from `https://151.145.89.228.sslip.io/webhook/Doch-1`.
- **Derived State (`useMemo`):**
  - Iterates over the 4 sets of daily data to cross-reference and collect a distinct list of all personnel (`allNames`), caching their roles/departments.
  - `statusMaps`: A mapping from person name to status for each specific day index to facilitate O(1) table cell rendering lookups.
  - `filteredNames`: The final sorted array of names calculated dynamically by running the raw names through all 4 active filters.

## Core Logic & Behaviors to Maintain
- **Multi-Day Architecture:** Changes to `baseDate` instantly shift the 4-day window (`DAY_OFFSETS = [-1, 0, 1, 2]`). This logic must not be broken as the entire table relies on finding the anchor day at index `1`.
- **Filtering Logic Priority:** Status filtering *only* looks at the anchor day status (`statusMaps[1].get(name)`) rather than checking all four days.
- **Direct API Fetching:** Unlike `useMainAttendance` which might use centralized React Query definitions from `lib`, `WorkPlanPage` has its own data fetcher locally defined (`MAIN_API`). Refactoring this path should take care to update exactly where this points if the backend changes.
