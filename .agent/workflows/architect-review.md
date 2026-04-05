---
description: Perform a comprehensive architecture and documentation health check.
---

# Architecture & Documentation Review

Follow these steps to ensure the repository remains aligned with the established standards.

## 1. Documentation Alignment Check
- [ ] List all files in `src/pages/`.
- [ ] For each file, verify a corresponding `.md` file exists in `docs/pages/`.
- [ ] Check if the documentation content is up-to-date with the current code (State, Props, Logic).

## 2. Aesthetic Audit
- [ ] Select a sample of UI components in `src/components/ui/`.
- [ ] Verify usage of variables and Tailwind classes defined in `docs/ARCHITECTURE.md`.
- [ ] Ensure "Glassmorphism" and "Micro-animations" are implemented where appropriate.

## 3. Structural Consistency
- [ ] Verify that no commander-specific logic is leaking into soldier routes (`/guards`).
- [ ] Ensure `CommanderGuard` is used in all restricted routes in `src/App.tsx`.
- [ ] Check for file size violations (Target: < 400 lines per component).

## 4. Knowledge Item (KI) Sync
- [ ] Check if any major architectural changes have been made that are NOT yet reflected in KIs.
- [ ] Update or create KIs for significant new patterns.

---

**Running this workflow**:
1. Run `ls src/pages` and `ls docs/pages` to check for missing docs.
2. Review `src/App.tsx` for routing security.
3. Randomly inspect 3 UI components for aesthetics.
4. Report findings and propose fixes in a new task.
