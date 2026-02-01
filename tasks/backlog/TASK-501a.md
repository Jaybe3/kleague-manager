# TASK-501a: Draft Board Horizontal Scroll UX

**Status:** BACKLOG
**Created:** January 2026
**Priority:** Low
**Depends On:** TASK-501h
**Phase:** Phase 5 - UI/UX Polish

---

## Objective

Improve the horizontal scrolling experience on the Draft Board page, especially on smaller screens.

---

## Background

The Draft Board displays a 10-column grid (one column per team) with rows for each draft round. On smaller screens, this requires horizontal scrolling which can be disorienting. Users may lose track of which round they're looking at when scrolling horizontally.

---

## Specification

### Current Behavior
- Draft board renders as HTML table
- 10 team columns + 1 round number column
- Horizontal scroll enabled via `overflow-x-auto`
- All columns scroll together, including round numbers

### Issues
- Round numbers scroll off-screen when scrolling horizontally
- No visual indicator showing more content to scroll
- Can be disorienting on mobile

### Proposed Improvements

1. **Sticky First Column**
   - Round numbers column stays fixed while team columns scroll
   - CSS `position: sticky; left: 0;` on first column

2. **Better Scroll Indicators**
   - Visual fade/shadow on edges when more content exists
   - Optional: scroll buttons for accessibility

3. **Mobile-Optimized View**
   - Consider alternative layout for very small screens
   - Possibly card-based view instead of table
   - Or rotated table (rounds as columns, teams as rows)

---

## Technical Approach

### Option A: Sticky Column (Recommended)
```css
.draft-board th:first-child,
.draft-board td:first-child {
  position: sticky;
  left: 0;
  z-index: 10;
  background: var(--background);
}
```

### Option B: Scroll Shadows
```css
.scroll-container {
  background:
    linear-gradient(to right, var(--background) 30%, transparent),
    linear-gradient(to left, var(--background) 30%, transparent);
  background-position: left, right;
  background-repeat: no-repeat;
  background-size: 40px 100%;
}
```

---

## Files Created

TBD

---

## Files Modified

TBD - likely:
- `components/draft-board/draft-board-grid.tsx`
- `app/globals.css` or component-specific styles

---

## Acceptance Criteria

- [ ] Round numbers visible at all horizontal scroll positions
- [ ] Scroll indicator shows when more content exists
- [ ] Readable on mobile devices (320px width)
- [ ] No horizontal layout shift during scroll
- [ ] Maintains Forest theme styling
- [ ] Touch-friendly scrolling on mobile

---

## Verification

TBD - will include:
1. Test on desktop at various widths
2. Test on mobile devices (iOS Safari, Android Chrome)
3. Test with keyboard navigation
4. Test with screen reader

---

## Completion Notes

N/A - Not yet started

---

## Related

- [TASK-501h](../completed/phase-5-ui/TASK-501h.md) - Restyle Draft Board Page (prerequisite)
- [TASK-300](../completed/phase-3-draft-board/TASK-300.md) - Draft Board Grid Display (original implementation)
