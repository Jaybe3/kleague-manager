# TASK-501i: Restyle Admin Import Page

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** Medium
**Depends On:** TASK-501h
**Phase:** Phase 5 - UI/UX Polish

---

## Objective

Apply Forest theme and shadcn/ui components to Admin Import page.

---

## Background

The Admin Import page is used by the commissioner to import draft and FA transaction data from CBS, and to manually enter trades. It features a tabbed interface for switching between Import and Trade entry modes.

---

## Specification

### Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Tabs for Import/Trade toggle (instead of custom tabs)
- Use shadcn/ui Select for dropdowns (import type, season, teams)
- Use shadcn/ui Input for text inputs
- Use shadcn/ui Button for actions
- Use shadcn/ui Textarea for paste area
- Remove old inline navigation (handled by AppShell)
- Maintain all existing functionality (import draft/FA, enter trade)
- Apply Forest theme colors consistently
- Success/error messages use Forest semantic colors

### Tab Structure
- Tab 1: "Import Data" - Draft and FA transaction import
- Tab 2: "Enter Trade" - Manual trade entry form

### Message Colors
- Success: bg-success/10, text-success
- Error: bg-error/10, text-error
- Warning: bg-warning/10, text-warning

---

## Technical Approach

1. Add PageHeader component for page title
2. Install shadcn/ui Tabs component
3. Install shadcn/ui Textarea component
4. Replace custom tabs with shadcn/ui Tabs
5. Wrap content in shadcn/ui Card
6. Replace dropdowns with shadcn/ui Select
7. Replace inputs with shadcn/ui Input
8. Replace textarea with shadcn/ui Textarea
9. Replace buttons with shadcn/ui Button
10. Apply Forest semantic colors to messages

---

## Files Created

| File | Purpose |
|------|---------|
| `components/ui/tabs.tsx` | Installed shadcn/ui Tabs component |
| `components/ui/textarea.tsx` | Installed shadcn/ui Textarea component |

---

## Files Modified

| File | Change |
|------|--------|
| `app/(dashboard)/admin/import/page.tsx` | Restyled with shadcn/ui Tabs, Card, Select, Input, Button, Textarea |

---

## Acceptance Criteria

- [x] Page uses PageHeader component
- [x] Tabs use shadcn/ui Tabs component
- [x] All dropdowns use shadcn/ui Select
- [x] All inputs use shadcn/ui Input
- [x] Buttons use shadcn/ui Button
- [x] Import functionality still works
- [x] Trade entry functionality still works
- [x] Success/error states use Forest semantic colors
- [x] Responsive on mobile
- [x] No TypeScript errors

---

## Verification

### Import Testing
1. Log in as commissioner
2. Navigate to `/admin/import`
3. Verify PageHeader displays
4. Verify Tabs component works (click Import Data, Enter Trade)
5. Select import type (Draft Results or FA Transactions)
6. Select season
7. Paste test data and submit
8. Verify success/error message styling

### Trade Testing
1. Click "Enter Trade" tab
2. Fill in trade form
3. Submit and verify functionality
4. Check success/error message styling

---

## Completion Notes

Admin Import page restyled with shadcn/ui Tabs, Select, Input, Textarea, Button. Forest semantic colors applied for success/warning/error states.

New components installed:
- Tabs (for Import/Trade toggle)
- Textarea (for data paste area)

The tabbed interface provides cleaner separation between import and trade entry functions.

---

## Related

- [TASK-501h](./TASK-501h.md) - Restyle Draft Board Page (prerequisite)
- [TASK-501j](./TASK-501j.md) - Restyle Admin Draft Order Page (next)
- [TASK-105](../phase-1-import/TASK-105.md) - Flexible Data Import Parser
- [TASK-400](../phase-4-admin/TASK-400.md) - Manual Trade Entry
