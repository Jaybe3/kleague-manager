# TASK-501f: Restyle Rules Page

**Status:** COMPLETED
**Created:** January 2026
**Completed:** January 2026
**Priority:** Medium
**Depends On:** TASK-501e
**Phase:** Phase 5 - UI/UX Polish

---

## Objective

Apply Forest theme and shadcn/ui components to Rules page.

---

## Background

The Rules page displays all league rules grouped by their effective season. With the design system established, this page needed to be updated to use shadcn/ui components and consistent Forest theme styling.

---

## Specification

### Requirements
- Use PageHeader component from layout
- Use shadcn/ui Card for rule groupings (by effective season)
- Remove any old inline navigation (handled by AppShell)
- Apply Forest theme colors consistently
- Clean typography hierarchy for rule names and descriptions
- Maintain grouping by effective season (2023 founding rules, 2025 new rules)

### Rule Display
- Rule name: Bold, larger text
- Rule description: Muted color, normal weight
- Grouped into Cards by effective season year
- Season year as Card header

---

## Technical Approach

1. Add PageHeader component for page title
2. Replace rule containers with shadcn/ui Card components
3. Group rules by effectiveSeason
4. Apply clean typography hierarchy
5. Remove code labels (internal identifiers)
6. Remove redundant navigation elements

---

## Files Created

None

---

## Files Modified

| File | Change |
|------|--------|
| `app/(dashboard)/rules/page.tsx` | Restyled with shadcn/ui Card, Badge; uses PageHeader; removed old nav and code labels |

---

## Acceptance Criteria

- [x] Page uses PageHeader component
- [x] Rules grouped by season using shadcn Card components
- [x] Old inline navigation removed
- [x] Clean typography (rule name bold, description muted)
- [x] Responsive on mobile
- [x] No TypeScript errors
- [x] Visual consistency with Forest theme

---

## Verification

### Manual Testing
1. Log in as any user
2. Navigate to `/rules`
3. Verify PageHeader displays "League Rules"
4. Verify rules grouped into Cards by effective season
5. Verify 2023 founding rules Card contains 5 rules
6. Verify 2025 new rules Card contains 2 rules
7. Check typography hierarchy (name bold, description muted)
8. Test on mobile viewport

---

## Completion Notes

Rules page restyled with shadcn/ui Card and Badge. Code labels removed for cleaner presentation. Typography hierarchy improved with clear distinction between rule names and descriptions.

The page now groups rules into visually distinct Cards:
- "Effective 2023 (Founding Rules)" - 5 rules
- "Effective 2025" - 2 rules

---

## Related

- [TASK-501e](./TASK-501e.md) - Restyle My Team Page (prerequisite)
- [TASK-501g](./TASK-501g.md) - Restyle Keepers Page (next)
- [TASK-303](../phase-3-draft-board/TASK-303.md) - League Rules Registry (original implementation)
