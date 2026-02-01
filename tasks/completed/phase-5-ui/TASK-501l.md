# TASK-501l: Restyle Admin Rules + Seasons Pages

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** Medium
**Depends On:** TASK-501k
**Phase:** Phase 5 - UI/UX Polish

---

## Objective

Apply Forest theme and shadcn/ui components to Admin Rules Management and Admin Seasons pages.

---

## Background

The Admin Rules page allows the commissioner to manage league rules (view, add, edit, delete, toggle). The Admin Seasons page allows managing season deadlines. Both pages needed to be updated with Forest theme styling.

---

## Specification

### Admin Rules Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Input for form fields
- Use shadcn/ui Textarea for description fields
- Use shadcn/ui Button for all actions
- Remove old inline navigation (handled by AppShell)
- Maintain all functionality (view, add, edit, delete, toggle rules)
- Apply Forest theme colors consistently
- Success/error messages use Forest semantic colors

### Admin Seasons Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for content sections
- Use shadcn/ui Input for date/time editing
- Use shadcn/ui Button for all actions
- Remove old inline navigation (handled by AppShell)
- Maintain all functionality (view, edit deadlines)
- Apply Forest theme colors consistently (deadline states)
- Success/error messages use Forest semantic colors

### Deadline State Colors
- Open: text-success (green)
- Approaching: text-warning (amber)
- Passed: text-error (red)

---

## Technical Approach

### Admin Rules Page
1. Add PageHeader component
2. Wrap rule list and form in shadcn/ui Card
3. Replace inputs with shadcn/ui Input
4. Use shadcn/ui Textarea for descriptions
5. Replace buttons with shadcn/ui Button
6. Style toggle switches consistently
7. Apply Forest semantic colors

### Admin Seasons Page
1. Add PageHeader component
2. Wrap season list in shadcn/ui Card
3. Replace date/time inputs with shadcn/ui Input
4. Replace buttons with shadcn/ui Button
5. Apply Forest semantic colors for deadline states

---

## Files Created

None

---

## Files Modified

| File | Change |
|------|--------|
| `app/(dashboard)/admin/rules/page.tsx` | Restyled with shadcn/ui Card, Input, Textarea, Button; Forest semantic colors |
| `app/(dashboard)/admin/seasons/page.tsx` | Restyled with shadcn/ui Card, Input, Button; Forest semantic colors for deadline states |

---

## Acceptance Criteria

- [x] Both pages use PageHeader component
- [x] Inputs use shadcn/ui Input
- [x] Buttons use shadcn/ui Button
- [x] All CRUD operations still work on Rules page
- [x] Deadline editing still works on Seasons page
- [x] Success/error states use Forest semantic colors
- [x] Old inline navigation removed from both pages
- [x] Responsive on mobile
- [x] No TypeScript errors

---

## Verification

### Rules Page Testing
1. Log in as commissioner
2. Navigate to `/admin/rules`
3. Verify all rules display in Cards
4. Test toggle enable/disable
5. Test edit rule description
6. Test add new rule
7. Test delete rule
8. Verify success/error messages

### Seasons Page Testing
1. Navigate to `/admin/seasons`
2. Verify seasons display in Card
3. Edit a deadline
4. Save and verify success message
5. Check deadline status colors match state
6. Test on mobile viewport

---

## Completion Notes

Admin Rules and Seasons pages restyled with shadcn/ui Card, Table, Input, Button, Badge. Forest theme applied throughout.

**Rules Page Features:**
- Rule list with toggle switches
- Edit mode for descriptions
- Add new rule form
- Delete with confirmation
- Grouped by effective season

**Seasons Page Features:**
- Season list with deadline display
- Inline date/time editing
- Status indicator with semantic colors
- Active season highlighting

---

## Related

- [TASK-501k](./TASK-501k.md) - Restyle Admin Keeper Overrides Page (prerequisite)
- [TASK-501m](./TASK-501m.md) - Restyle Auth Pages (next)
- [TASK-303](../phase-3-draft-board/TASK-303.md) - League Rules Registry (rules original)
- [TASK-203](../phase-2-keepers/TASK-203.md) - Deadline Enforcement (seasons original)
