# TASK-203: Deadline Enforcement

**Status:** COMPLETED
**Created:** January 2026
**Completed:** 2026-01-16
**Priority:** High
**Depends On:** TASK-201
**Phase:** Phase 2 - Keepers

---

## Objective

Lock keeper selections after commissioner-set deadline, show warnings as deadline approaches, and allow commissioner to extend deadline.

---

## Background

Keeper selections must be submitted by a deadline set by the commissioner. The system needs to:
- Calculate deadline state based on time remaining
- Show appropriate warnings as deadline approaches
- Block all mutation operations after deadline passes
- Allow commissioner to extend deadline if needed

---

## Specification

### Deadline States

| State | Condition | UI Indicator |
|-------|-----------|--------------|
| `open` | > 7 days until deadline | Blue "Deadline: {date}" |
| `approaching` | ≤ 7 days until deadline | Yellow warning banner |
| `urgent` | ≤ 24 hours until deadline | Red urgent banner (pulsing) |
| `passed` | Past deadline | Red "Deadline passed" - actions blocked |

### Commissioner Features
- View all seasons with deadlines
- Update `keeperDeadline` for any season
- Extending deadline unblocks mutations immediately

### Blocked Operations After Deadline
- Adding keeper selections
- Removing keeper selections
- Bumping keeper rounds
- Finalizing selections

---

## Technical Approach

1. Create deadline state calculation functions
2. Add deadline info to keepers API response
3. Block mutation endpoints when deadline passed
4. Create admin seasons management page
5. Build deadline banner component with state-based styling

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/keeper/selection-types.ts` | Added `DeadlineState`, `DeadlineInfo` types |
| `app/api/admin/seasons/route.ts` | GET/PATCH endpoints for commissioner |
| `app/(dashboard)/admin/seasons/page.tsx` | Season deadline management UI |

---

## Files Modified

| File | Change |
|------|--------|
| `lib/keeper/selection-service.ts` | Added `getDeadlineState()`, `getDeadlineInfo()`, `canModifySelections()` helpers |
| `app/api/my-team/keepers/route.ts` | Deadline check on POST, deadlineInfo in GET response |
| `app/api/my-team/keepers/[playerId]/route.ts` | Deadline check on DELETE |
| `app/api/my-team/keepers/bump/route.ts` | Deadline check on POST |
| `app/api/my-team/keepers/finalize/route.ts` | Deadline check on POST |
| `app/(dashboard)/my-team/keepers/page.tsx` | DeadlineBanner component, UI respects canModify |

---

## Acceptance Criteria

- [x] Deadline state calculated correctly based on current time
- [x] Appropriate warning banner shown for each state
- [x] All mutation endpoints blocked after deadline passes
- [x] Clear error message when action blocked due to deadline
- [x] Commissioner can view all seasons
- [x] Commissioner can update `keeperDeadline` for any season
- [x] Non-commissioners cannot access admin endpoints (403)
- [x] Extending deadline unblocks mutations immediately

---

## Verification

### Manual Testing
1. Set deadline to > 7 days away → Blue banner
2. Set deadline to 3 days away → Yellow warning banner
3. Set deadline to 12 hours away → Red pulsing banner
4. Set deadline to past date → Red "Deadline passed" + actions blocked
5. Try to select/remove/bump/finalize after deadline → Error shown
6. Extend deadline → Actions unblocked

### Admin Testing
1. Log in as commissioner
2. Navigate to `/admin/seasons`
3. View all seasons with current deadlines
4. Update a deadline
5. Verify change persists

### API Testing
```bash
# Get seasons (commissioner only)
curl http://localhost:3000/api/admin/seasons

# Update deadline (commissioner only)
curl -X PATCH http://localhost:3000/api/admin/seasons -d '{
  "year": 2026,
  "keeperDeadline": "2026-03-01T00:00:00Z"
}'
```

---

## Completion Notes

Deadline enforcement fully implemented with:
- Four deadline states with distinct UI indicators
- Blocking of all mutation operations after deadline
- Commissioner admin page for managing deadlines
- Immediate unblocking when deadline extended

The deadline banner component uses color coding and animation (pulsing for urgent) to clearly communicate deadline status to users.

---

## Related

- [TASK-201](./TASK-201.md) - Keeper Selection Interface (prerequisite)
- [TASK-300](../phase-3-draft-board/TASK-300.md) - Draft Board Grid Display (shows finalized selections)
- [docs/API.md](../../../docs/API.md) - API documentation for admin endpoints
