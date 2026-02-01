# TASK-501d: UI Foundation - Design System & Layout Shell

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** High
**Depends On:** TASK-400
**Phase:** Phase 5 - UI/UX Polish

---

## Objective

Install shadcn/ui component library, apply Forest dark theme, and create responsive layout shell with sidebar and bottom navigation.

---

## Background

The application needed a consistent design system and modern UI components. The choice was made to use:
- **shadcn/ui:** Accessible, customizable component library built on Radix UI
- **Forest Dark Theme:** Dark theme with emerald (#10b981) as the primary accent color
- **Responsive Layout:** Desktop sidebar + mobile bottom navigation pattern

---

## Specification

### Forest Theme Colors

| Token | Value | Tailwind |
|-------|-------|----------|
| Background | #111827 | gray-900 |
| Surface | #1f2937 | gray-800 |
| Border | #374151 | gray-700 |
| Text | #f9fafb | gray-50 |
| Text Muted | #9ca3af | gray-400 |
| Accent | #10b981 | emerald-500 |
| Success | #22c55e | green-500 |
| Warning | #f59e0b | amber-500 |
| Error | #ef4444 | red-500 |

### Navigation Structure

| Label | Path | Access |
|-------|------|--------|
| My Team | /my-team | All users |
| Keepers | /my-team/keepers | All users |
| Draft Board | /draft-board | All users |
| Rules | /rules | All users |
| Admin | /admin/import | Commissioner only |

### Responsive Behavior
- < 768px: Bottom nav visible, sidebar hidden
- ≥ 768px: Sidebar visible, bottom nav hidden

---

## Technical Approach

1. Install shadcn/ui CLI and dependencies
2. Configure components.json for project
3. Generate initial component set (button, card, table, select, input, badge, dropdown-menu)
4. Create cn() utility for className merging
5. Apply Forest theme CSS variables to globals.css
6. Build AppShell wrapper component
7. Build Sidebar component (desktop)
8. Build BottomNav component (mobile)
9. Build PageHeader reusable component
10. Create dashboard layout wrapper

---

## Files Created

| File | Purpose |
|------|---------|
| `components.json` | shadcn/ui configuration |
| `lib/utils.ts` | cn() utility for className merging |
| `components/ui/button.tsx` | shadcn/ui Button component |
| `components/ui/card.tsx` | shadcn/ui Card component |
| `components/ui/table.tsx` | shadcn/ui Table component |
| `components/ui/select.tsx` | shadcn/ui Select component |
| `components/ui/input.tsx` | shadcn/ui Input component |
| `components/ui/badge.tsx` | shadcn/ui Badge component |
| `components/ui/dropdown-menu.tsx` | shadcn/ui DropdownMenu component |
| `components/layout/app-shell.tsx` | Main wrapper with sidebar + bottom nav |
| `components/layout/sidebar.tsx` | Desktop nav (w-64, fixed left) |
| `components/layout/bottom-nav.tsx` | Mobile nav (fixed bottom) |
| `components/layout/page-header.tsx` | Reusable page header |
| `components/layout/index.ts` | Barrel exports |
| `app/(dashboard)/layout.tsx` | Wrap dashboard pages in AppShell |

---

## Files Modified

| File | Change |
|------|--------|
| `app/globals.css` | Forest dark theme CSS variables |
| `app/layout.tsx` | Title: "KLeague Manager" |
| `package.json` | shadcn dependencies added |

---

## Acceptance Criteria

- [x] shadcn/ui installed and configured
- [x] Forest dark theme applied globally
- [x] Sidebar visible on desktop (≥768px)
- [x] Bottom nav visible on mobile (<768px)
- [x] Active nav highlighted with emerald accent
- [x] Admin link only visible for commissioners
- [x] All existing pages still functional
- [x] No TypeScript or console errors

---

## Verification

### Visual Testing
1. Open app at various viewport sizes
2. Verify sidebar appears at ≥768px
3. Verify bottom nav appears at <768px
4. Check all navigation links work
5. Verify admin link only visible when logged in as commissioner
6. Confirm Forest theme colors applied consistently

### Component Testing
```bash
# Start dev server
npm run dev

# Navigate to:
# - /my-team
# - /my-team/keepers
# - /draft-board
# - /rules
# - /admin/import (as commissioner)
```

---

## Completion Notes

Forest theme applied successfully. Responsive layout shell working as designed.

**Noted Issue:** Pre-existing slow load on Keepers/My Team pages noted for future optimization (database query issue, not UI-related). Logged as TASK-501b for future work.

**Components Installed:**
- button, card, table, select, input, badge, dropdown-menu (7 total)

---

## Related

- [TASK-400](../phase-4-admin/TASK-400.md) - Manual Trade Entry (prerequisite)
- [TASK-501e](./TASK-501e.md) - Restyle My Team Page (next)
- [TASK-501b](./TASK-501b.md) - Keepers Page Performance (follow-up)
