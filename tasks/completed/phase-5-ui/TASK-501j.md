# TASK-501j: Restyle Admin Draft Order Page + Fix Admin Navigation

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** Medium
**Depends On:** TASK-501i
**Phase:** Phase 5 - UI/UX Polish

---

## Objective

Fix admin navigation in sidebar to show all admin pages, and apply Forest theme to Admin Draft Order page.

---

## Background

The sidebar only showed a single "Admin" link pointing to /admin/import. All other admin pages (Draft Order, Keeper Overrides, Rules Management, Seasons) were not accessible from the navigation. This task addresses both the navigation gap and restyling the Draft Order page.

---

## Specification

### Part A: Fix Admin Navigation

**Requirements:**
- Update components/layout/sidebar.tsx
- Under COMMISSIONER section, add links to ALL admin pages:
  - Data Import → /admin/import
  - Draft Order → /admin/draft-order
  - Keeper Overrides → /admin/keeper-overrides
  - Rules Management → /admin/rules
  - Seasons → /admin/seasons
- Keep links always visible (not collapsed)
- Active page highlights with emerald accent like other nav items
- Commissioner-only visibility preserved

**Icons Used:**
- Data Import: Database
- Draft Order: ListOrdered
- Keeper Overrides: Shield
- Rules Management: Scale
- Seasons: Calendar

### Part B: Restyle Draft Order Page

**Requirements:**
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Select for season dropdown
- Use shadcn/ui Button for actions (save, reset, move up/down)
- Remove old inline navigation (handled by AppShell)
- Maintain all existing functionality
- Apply Forest theme colors consistently
- Success/error messages use Forest semantic colors

---

## Technical Approach

1. Update sidebar with 5 admin navigation links
2. Add appropriate icons from lucide-react
3. Maintain commissioner-only visibility check
4. Add PageHeader to Draft Order page
5. Wrap content in shadcn/ui Card
6. Replace season dropdown with shadcn/ui Select
7. Replace buttons with shadcn/ui Button
8. Apply Forest semantic colors to messages

---

## Files Created

None

---

## Files Modified

| File | Change |
|------|--------|
| `components/layout/sidebar.tsx` | Added 5 admin page links with icons (Database, ListOrdered, Shield, Scale, Calendar) |
| `app/(dashboard)/admin/draft-order/page.tsx` | Restyled with shadcn/ui Card, Select, Button; Forest semantic colors |

---

## Acceptance Criteria

- [x] Sidebar shows all 5 admin links under Commissioner section
- [x] Admin links only visible to commissioners
- [x] Active admin page highlights correctly
- [x] Page uses PageHeader component
- [x] Season selector uses shadcn/ui Select
- [x] Buttons use shadcn/ui Button
- [x] Setting draft order still works
- [x] Success/error states use Forest semantic colors
- [x] Responsive on mobile
- [x] No TypeScript errors

---

## Verification

### Navigation Testing
1. Log in as commissioner
2. Check sidebar shows all 5 admin links
3. Click each link and verify navigation
4. Verify active page highlighting
5. Log in as non-commissioner
6. Verify admin links are NOT visible

### Draft Order Testing
1. Navigate to `/admin/draft-order`
2. Select a season
3. Verify teams display with current positions
4. Test move up/down buttons
5. Test save functionality
6. Verify success/error message styling

---

## Completion Notes

Admin navigation expanded to 5 links with appropriate icons. Draft Order page restyled with shadcn/ui components.

**Bug Discovered:** During testing, discovered BUG-002: cannot set draft order for 2026 because teams don't exist until draft data imported. This is a data initialization issue, not a UI issue. Logged for investigation.

Admin navigation now includes:
1. Data Import (Database icon)
2. Draft Order (ListOrdered icon)
3. Keeper Overrides (Shield icon)
4. Rules Management (Scale icon)
5. Seasons (Calendar icon)

---

## Related

- [TASK-501i](./TASK-501i.md) - Restyle Admin Import Page (prerequisite)
- [TASK-501k](./TASK-501k.md) - Restyle Admin Keeper Overrides Page (next)
- [TASK-301](../phase-3-draft-board/TASK-301.md) - Draft Order Management (original implementation)
- [BUG-002](../../bugs/BUG-002.md) - Cannot Set Draft Order for Future Season
