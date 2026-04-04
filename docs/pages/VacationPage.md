# Page Title: Vacation Plan (תוכנית חופשים)
**Route:** `/vacation`

## Purpose & Description
The `VacationPage` is an embedded integration of a separate external web application (the Vacation Planner). Its sole purpose is to inject that application seamlessly into this primary dashboard so users don't have to navigate to a different URL.

## Authentication & Access Level
- **Access Level:** Public by default within this app shell. (The external application may implement its own internal auth).
- **Security Logic:** No `<CommanderGuard>` wrapper.

## Key Components
- An `<iframe>` element pointing directly to `https://avrahamlip.github.io/vacation-planner/`.
- `LoadingOverlay`: Shows a spinner while the iframe content is actively loading.

## State Management & Data Fetching
- **Local State:** A simple `[loading, setLoading]` toggle initialized to `true`.
- **Data Fetching:** No native API hooks (`useQuery`) are used. All data ingestion, rendering, and management is handled by the remote document.

## Core Logic & Behaviors to Maintain
- **Iframe Height Calculations:** The layout relies on exact viewport math (`h-[calc(100vh-64px-44px)]` on mobile, `h-[calc(100vh-64px-60px)]` on desktop) to ensure the embedded app takes up exactly the rest of the screen without causing a double-scroll-bar effect. Changing the header or navigation bar heights in `Layout.tsx` will require updating the math in this component to prevent overflow bugs.
- **OnLoad Toggle:** The `LoadingOverlay` is dismissed using the native `onLoad` event handler attached to the iframe.
