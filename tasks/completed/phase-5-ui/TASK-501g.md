# TASK-501g: Restyle Keepers Page

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** Medium
**Depends On:** TASK-501f
**Phase:** Phase 5 - UI/UX Polish

---

## Objective

Apply Forest theme and shadcn/ui components to the Keepers selection page and its sub-components.

---

## Background

The Keepers page is the most complex UI in the application, containing:
- Deadline banner with multiple states
- Selected keepers table with bump/remove actions
- Conflict alert for round conflicts
- Eligible players table with filtering and selection
- Finalize button with confirmation

All these components needed to be updated with consistent Forest theme styling and shadcn/ui components.

---

## Specification

### Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for content containers
- Use shadcn/ui Table for both selected keepers and eligible players tables
- Use shadcn/ui Badge for status indicators (Eligible, Bumped, Finalized)
- Use shadcn/ui Button for actions (Select, Remove, Bump, Finalize)
- Use shadcn/ui Select for position filter dropdown
- Restyle DeadlineBanner component with Forest theme colors
- Remove old inline navigation (now handled by AppShell)
- Apply Forest theme colors consistently
- Maintain all existing functionality (select, remove, bump, finalize)

### DeadlineBanner States (Forest Theme)

| State | Background | Border | Text |
|-------|------------|--------|------|
| open | bg-primary/10 | border-primary/20 | text-primary |
| approaching | bg-warning/10 | border-warning/20 | text-warning |
| urgent | bg-error/10 | border-error/20 | text-error |
| passed | bg-error/10 | border-error/20 | text-error |

### Conflict Alert Styling
- Background: bg-error/10
- Border: border-error/20
- Text: text-error

---

## Technical Approach

1. Add PageHeader component for page title
2. Wrap content sections in shadcn/ui Card components
3. Convert selected keepers table to shadcn/ui Table, Badge, Button
4. Convert eligible players table to shadcn/ui Table, Badge, Button, Select
5. Apply Forest theme error colors to ConflictAlert
6. Apply Forest semantic colors to DeadlineBanner based on state
7. Remove redundant navigation elements

---

## Files Created

None

---

## Files Modified

| File | Change |
|------|--------|
| `app/(dashboard)/my-team/keepers/page.tsx` | Restyled with shadcn/ui Card, Button; uses PageHeader; removed old nav; restyled DeadlineBanner |
| `components/keepers/conflict-alert.tsx` | Applied Forest theme error colors (bg-error/10, border-error/20, text-error) |
| `components/keepers/selected-keepers-table.tsx` | Converted to shadcn/ui Table, Badge, Button |
| `components/keepers/eligible-players-table.tsx` | Converted to shadcn/ui Table, Badge, Button, Select |

---

## Acceptance Criteria

- [x] Page uses PageHeader component
- [x] Content wrapped in shadcn/ui Card components
- [x] Selected keepers table uses shadcn/ui Table, Badge, Button
- [x] Eligible players table uses shadcn/ui Table, Badge, Button, Select
- [x] Conflict alert uses Forest theme error colors
- [x] Deadline banner uses Forest theme colors per state
- [x] Old inline navigation removed
- [x] All actions still work (select, remove, bump, finalize)
- [x] Filtering and sorting still work
- [x] Responsive on mobile
- [x] No TypeScript errors
- [x] Visual consistency with My Team page (TASK-501e)

---

## Verification

### Manual Testing
1. Log in as any user with a team
2. Navigate to `/my-team/keepers`
3. Verify PageHeader displays
4. Check DeadlineBanner color matches deadline state
5. Verify selected keepers table styling
6. Verify eligible players table styling
7. Test position filter dropdown
8. Test select/remove player actions
9. Test bump action if conflicts exist
10. Verify finalize button styling
11. Test on mobile viewport

### Conflict Alert Testing
1. Select two keepers at same round
2. Verify conflict alert appears with Forest error colors

---

## Completion Notes

Keepers page restyled with shadcn/ui Card, Table, Badge, Button, Select. Deadline banner uses semantic Forest colors based on state (open=primary, approaching=warning, urgent/passed=error).

Key improvements:
- Consistent Card containers for each section
- Tables with proper header/body separation
- Buttons with appropriate variants (default, outline, destructive)
- Badge variants for status indicators
- Deadline banner colors communicate urgency

---

## Related

- [TASK-501f](./TASK-501f.md) - Restyle Rules Page (prerequisite)
- [TASK-501h](./TASK-501h.md) - Restyle Draft Board Page (next)
- [TASK-201](../phase-2-keepers/TASK-201.md) - Keeper Selection Interface (original implementation)
- [TASK-203](../phase-2-keepers/TASK-203.md) - Deadline Enforcement (deadline banner)
