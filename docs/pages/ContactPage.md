# Page Title: Contacts (אנשי קשר)
**Route:** `/guards/contact` (soldier) and `/main/contact` (commander) — same component

## Purpose & Description
The `ContactPage` acts as a public phonebook or directory for all personnel currently registered in the system for the day. It provides a simple, searchable listing of individuals with quick-action buttons to call them or message them via WhatsApp. 

## Authentication & Access Level
- **Access Level:** Public by default (View-only for everyone).
- **Security Logic:** No `<CommanderGuard>` wrapper. It safely exposes names and phone numbers without needing authentication.

## Key Components
- **Search Bar:** A simple text input bound to the local `search` state for filtering the list.
- **Contact Cards:** A dynamically mapped grid displaying `contact.name`, `role`, `department`, and `personalNumber`.
- `PWAInstallButton`: A conditionally rendered button to prompt users to install the application as a PWA on their mobile devices (the "Add to Home Screen" functionality).
- `StatusMessages`: Standard `LoadingOverlay` and `ErrorMessage` for data fetches.

## State Management & Data Fetching
- **Local State:** 
  - `[search, setSearch]` captures the raw string for the filter logic.
- **Server Data:** The page utilizes `useMainAttendance(getTodayIso())` to fetch the roster. It relies solely on today's dataset to retrieve names and numbers.
- **Derived State (`useMemo`):** 
  - The `contacts` variable filters the raw `data` matching the `search` string against name, personal number, role, or department using a simple lowercase inclusion check.

## Core Logic & Behaviors to Maintain
- **Number Normalization:** Phone numbers fetched from the backend are notoriously malformed. The functions `formatPhone` and `getWhatsAppLink` explicitly strip formatting (regex `\D`) and prepend appropriate prefixes (`0` for local calling, `972` for the WhatsApp API `wa.me`).
- **Missing Numbers Graceful Degradation:** If `contact.personalNumber` is falsy (missing), the "Call" and "WhatsApp" anchor tags default to `#`, visual opacity is dropped, and an `e.preventDefault()` blocks the navigation action.
