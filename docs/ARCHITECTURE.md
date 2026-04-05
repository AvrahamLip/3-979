# Project Architecture & Design System

This document outlines the architectural patterns and design principles governing the Project.

## 1. Technology Stack

- **Frontend**: React (v18+) with Vite as the build tool.
- **Language**: TypeScript (strict mode).
- **Styling**: Tailwind CSS for utility-first styling.
- **Routing**: `HashRouter` (React Router v6) to ensure compatibility with GitHub Pages.
- **State Management**: React Query (`@tanstack/react-query`) for data fetching and caching.
- **UI Components**: Radix UI primitives with custom Shadcn-like styling for refined interactions.
- **Backend/API**: n8n Webhooks for automation and Google Sheets for data storage.

## 2. Directory Structure

- `src/components`: Reusable UI components.
  - `/ui`: Atomic Shadcn components.
  - `/layouts`: Global layouts (Soldier vs. Commander).
- `src/pages`: Main application views.
- `src/contexts`: React Contexts (Auth, Theme, etc.).
- `docs/pages`: Markdown documentation corresponding to each file in `src/pages/`.
- `n8n/`: (Optional) Local copies of n8n workflow JSONs.

## 3. Design Principles (Rich Aesthetics)

The application must feel "Premium" and "Advanced."

### Visual Language
- **Glassmorphism**: Use `bg-white/10` and `backdrop-blur-md` for backgrounds.
- **Depth**: Use subtle shadows and layering to create a sense of hierarchy.
- **Colors**: Deep Navy, Electric Blue, and Slate Gray. High-contrast indicators for status.
- **RTL Support**: All layouts must be Right-to-Left (Hebrew) first.

### Interactions
- **Micro-animations**: Use `framer-motion` (if installed) or Tailwind transitions for hover and state changes.
- **Smooth Loading**: Always provide skeleton screens or premium loaders for data-heavy views.

## 4. Key Patterns

### Separation of Views
- **Soldier Portal**: Public-facing, simple, fast, and mobile-optimized. Located at `/guards`.
- **Commander Portal**: Authenticated, data-rich, and administrative. Located at `/main`.

### Data Flow
- All data fetching from Google Sheets must go through n8n webhooks.
- Cache data locally using React Query to minimize load times and API hits.

### Documentation Constraint
- Every new feature or page must be documented in `docs/` BEFORE it is considered "Complete."
