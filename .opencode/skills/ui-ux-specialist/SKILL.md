---
name: ui-ux-specialist
description: Use when improving UI/UX design, styling, responsive layouts, RTL/Hebrew typography, glassmorphism effects, animations, mobile-first design, accessibility, or any visual/cosmetic work in this React+Tailwind project. Covers Hebrew RTL layout, Tailwind utilities, shadcn/Radix components, framer-motion animations, and responsive breakpoints.
---

# UI/UX Specialist — דוח1

Expert guidance for building premium Hebrew RTL interfaces in this React + Tailwind + shadcn project.

## Project Context

- **Framework**: React 18 + TypeScript + Vite 6
- **Styling**: Tailwind CSS 3 + shadcn/Radix UI primitives (`src/components/ui/`)
- **Animation**: framer-motion
- **Language**: Hebrew (RTL) — all UI text is Hebrew, right-to-left
- **Theme**: Dark navy/electric-blue palette, glassmorphism (`bg-white/10`, `backdrop-blur-md`)
- **Target**: Mobile-first PWA, must work on small phones and tablets

## Core Principles

### RTL-First Layout
- Always use `dir="rtl"` on containers or set `rtl` class on `<html>`
- Use Tailwind logical properties: `ms-*`/`me-*` (not `ml-*`/`mr-*`), `ps-*`/`pe-*` (not `pl-*`/`pr-*`)
- `text-right` for Hebrew text alignment, `text-left` for LTR exceptions
- Flexbox/Grid automatically respects `dir="rtl"` — avoid `flex-row` when you need auto-direction, use `flex-row-reverse` intentionally
- Icons that imply direction (arrows, chevrons) must be flipped for RTL

### Mobile-First Responsive
- Design for 320px minimum, scale up
- Use breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Touch targets minimum 44px × 44px (WCAG)
- `overflow-x-auto` on tables for mobile
- Bottom navigation patterns for mobile, sidebar for desktop
- Use `h-dvh` (dynamic viewport height) for mobile to avoid address bar issues

### Glassmorphism Pattern
```tsx
<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
  {/* content */}
</div>
```

### Color Palette
- Primary dark: `#0a1628` (navy), `#0f172a` (slate-900)
- Accent: `#3b82f6` (blue-500), `#60a5fa` (blue-400)
- Glass: `white/10` to `white/20` with `backdrop-blur-md`
- Status colors: green for present, red for absent, yellow for warning

### Animation Guidelines (framer-motion)
```tsx
import { motion } from "framer-motion";

// Page transitions
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: "easeInOut" }}
>

// List stagger
variants={{
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
}}
```

### Typography (Hebrew)
- Use system fonts: `font-sans` maps to `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Hebrew renders well with these defaults — no custom font needed
- Line height: `leading-relaxed` (1.625) for Hebrew readability
- Font sizes: `text-sm` for data, `text-base` for body, `text-lg`/`text-xl` for headers
- Bold sparingly — Hebrew text is dense; use `font-medium` over `font-bold`

### Component Patterns

**Card (Glass)**
```tsx
<div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg">
  <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
  <p className="text-white/70 text-sm">{description}</p>
</div>
```

**Button**
```tsx
<button className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-6 py-3 
  transition-all duration-200 active:scale-95 font-medium">
  {label}
</button>
```

**Status Badge**
```tsx
<span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
  bg-green-500/20 text-green-300 border border-green-500/30">
  {status}
</span>
```

### Skeleton Loaders
```tsx
<div className="animate-pulse bg-white/10 rounded-xl h-20 w-full" />
```

### Spacing & Layout
- Use `gap-*` in flex/grid instead of margin on children
- Container padding: `p-4` on mobile, `p-6` on desktop
- Section spacing: `space-y-4` or `space-y-6`
- Cards in grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`

## File Locations

- UI primitives: `src/components/ui/` (shadcn/Radix)
- Pages: `src/pages/`
- Tailwind config: `tailwind.config.ts` or `tailwind.config.js`
- Global styles: `src/index.css` or `src/App.css`

## Accessibility

- All interactive elements must have `aria-label` in Hebrew
- Focus states visible: `focus:ring-2 focus:ring-blue-500 focus:outline-none`
- Color contrast: WCAG AA minimum (4.5:1 for text)
- `role` attributes on custom interactive elements
- Screen reader text: `sr-only` class for non-visible labels

## Common Pitfalls

1. **Don't** use `ml-*`/`mr-*` — use `ms-*`/`me-*` for RTL
2. **Don't** hardcode `text-left` — use `text-start` or `text-right` explicitly
3. **Don't** use `px-*` when direction matters — use `ps-*`/`pe-*`
4. **Don't** forget `key` props on mapped elements
5. **Don't** use `overflow-hidden` on mobile containers — it breaks scroll
6. **Do** test at 320px width — ensure nothing breaks
7. **Do** use `min-h-screen` or `min-h-dvh` for page containers
