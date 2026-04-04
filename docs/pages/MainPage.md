# Page Title: Main Page (Commander Dashboard)
**Route:** `/main`

## Purpose & Description
The `MainPage` serves as the central hub and dashboard for commanders. It displays the Daily Attendance Report (דוח נוכחות יומי), aggregating presence and status statistics across the entire unit. It provides a high-level overview of personnel availability and includes quick navigation links to other management tools (like Guard Assignment).

## Authentication & Access Level
- **Access Level:** Public by default (View-only).
- **Security Logic:** The page itself does not enforce a strict login wall (`<CommanderGuard>` is absent). However, actionable elements (like the link to "ניהול שיבוץ שמירות") route the user to protected pages that do require authentication.

## Key Components
- `DatePickerBar`: Controls the date selected for the attendance report.
- `SummaryCards`: Displays top-level numerical aggregations (`totalCounts`, `roles`).
- `LegendCard`: Provides a color/icon legend defining what different status markers mean.
- `DepartmentAccordion`: Breaks down attendance numbers by specific departments.
- `AttendanceTable`: Provides an itemized list of all fetched personnel records.
- `StatusMessages` (`LoadingOverlay`, `ErrorMessage`, `EmptyState`): Handles the visual states of data fetching.

## State Management & Data Fetching
- **Local State:** `useState(getTodayIso())` manages the currently selected `date`.
- **Server Data:** `useMainAttendance(date)` hook executes the remote fetch of attendance records based on the selected date.
- **Derived State:** Built-in `useMemo` hooks use utility functions (`buildStatusCounts`, `buildRoleStats`, `buildDepartmentStats` from `lib/attendanceUtils.ts`) to compute statistics whenever `records` update.

## Core Logic & Behaviors to Maintain
- **Date Synchronization:** The data and computed statistics must perfectly sync with the `date` state. Changing the date through `DatePickerBar` should auto-trigger a data re-fetch.
- **Manual Repolling:** A dedicated refresh button calls `refetch()` to update data without reloading the whole application.
- **Navigation Continuity:** The button linking to `/guards/manage` acts as the primary bridge from the public commander reporting view into the protected commander administrative view.
