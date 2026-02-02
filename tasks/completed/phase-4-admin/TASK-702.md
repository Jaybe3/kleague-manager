# TASK-702: Commissioner View Other Teams

**Status:** COMPLETED
**Created:** February 2026
**Started:** February 2, 2026
**Completed:** February 2, 2026
**Priority:** Medium
**Depends On:** None
**Phase:** Phase 7 - Commissioner Tools

---

## Objective

Allow the commissioner to view any team's roster and keeper options without logging in as that manager.

---

## Background

Currently, when the commissioner needs to help a manager with their keeper selections or troubleshoot an issue, they must:
1. Log out of their account
2. Log in as the specific manager (requires knowing/resetting their password)
3. View the team's roster and keeper options
4. Log back out
5. Log back in as commissioner

This is cumbersome and creates security concerns around password sharing/resetting. The commissioner should be able to view (but not modify) any team's data from their own account.

---

## Specification

### User Story

As the commissioner, I want to view any team's roster and keeper cost information so that I can help managers make decisions and troubleshoot issues without logging in as them.

### Requirements

1. **Team Selector** (Commissioner Only)
   - Dropdown or selector on My Team page
   - Shows all 10 teams
   - Default: Commissioner's own team
   - Only visible to users with `isCommissioner: true`

2. **View Mode**
   - When viewing another team, page shows that team's roster
   - Clear visual indicator showing "Viewing as: [Team Name]"
   - All data is READ-ONLY
   - Cannot make keeper selections for other teams
   - Cannot finalize for other teams

3. **Data Displayed**
   - Full roster with positions
   - Keeper cost for each player
   - Years owned
   - Eligibility status
   - Current keeper selections (if any)

4. **Restrictions**
   - View only - no modifications allowed
   - Must be commissioner to see team selector
   - Audit log entry when commissioner views another team (optional)

---

## Technical Approach

### Option A: Query Parameter (Recommended)

Add `?slotId=N` query parameter to My Team page:

```typescript
// app/(dashboard)/my-team/page.tsx
export default async function MyTeamPage({ searchParams }) {
  const session = await auth();
  const user = session?.user;

  // Default to user's own slot
  let viewingSlot = user?.slotId;

  // Commissioner can override
  if (user?.isCommissioner && searchParams.slotId) {
    viewingSlot = parseInt(searchParams.slotId);
  }

  // Fetch data for viewingSlot instead of user's slot
  const roster = await getRosterForSlot(viewingSlot, seasonYear);

  // Pass isViewingOther flag to component
  const isViewingOther = viewingSlot !== user?.slotId;

  return <MyTeamContent
    roster={roster}
    isViewingOther={isViewingOther}
    viewingSlot={viewingSlot}
  />;
}
```

### Recommendation

Option A (query parameter) is simpler and keeps UI consistent. The commissioner sees the exact same view the manager sees.

---

## Files Created

| File | Purpose |
|------|---------|
| `components/my-team/team-selector.tsx` | Dropdown to select team (commissioner only) |
| `app/api/slots/route.ts` | API endpoint to list all teams for selector |

---

## Files Modified

| File | Change |
|------|--------|
| `app/(dashboard)/my-team/page.tsx` | Add slotId query param handling, integrate TeamSelector |
| `app/(dashboard)/my-team/keepers/page.tsx` | Add slotId query param, disable actions when viewing other, Suspense boundary |
| `app/api/my-team/route.ts` | Add slotId query param support with commissioner check |
| `app/api/my-team/keepers/route.ts` | Add slotId query param support with commissioner check |
| `lib/keeper/selection-service.ts` | Add slotId to team return object |
| `lib/keeper/selection-types.ts` | Add slotId, isViewingOther, isCommissioner to response type |

---

## Acceptance Criteria

- [x] Commissioner sees team selector dropdown on My Team page
- [x] Selecting a team shows that team's roster
- [x] Clear visual indicator shows when viewing another team
- [x] Cannot modify keeper selections when viewing another team
- [x] Regular managers do not see team selector
- [x] Commissioner can switch back to their own team
- [x] Works on keepers sub-page as well
- [x] URL is shareable (query param based)

---

## Verification

1. Log in as commissioner
2. Navigate to My Team page
3. Verify team selector dropdown is visible
4. Select a different team
5. Verify URL updates to `?slotId=N`
6. Verify roster shows selected team's players
7. Verify "Viewing" badge indicator
8. Navigate to keepers page
9. Verify keeper data shows for selected team
10. Verify action buttons are hidden when viewing other team
11. Log in as regular manager
12. Verify team selector is NOT visible

---

## Completion Notes

### Implementation Summary

Built commissioner "view other teams" feature using query parameter approach (`?slotId=N`):

- **TeamSelector component**: Radix UI Select dropdown showing all 10 teams, with "(You)" indicator for own team
- **API layer**: Both `/api/my-team` and `/api/my-team/keepers` updated to accept `slotId` param with commissioner-only access
- **UI indicators**: Amber "Viewing" badge and read-only banner when viewing another team
- **Read-only mode**: All action buttons (Select, Remove, Bump, Finalize) hidden when viewing another team

### Issues Fixed

1. **Hydration issue**: TeamSelector had unused `useSearchParams` import causing hydration errors - removed
2. **Suspense boundary**: Keepers page needed Suspense wrapper for `useSearchParams` hook
3. **Type error**: Removed unused `isReadOnly` prop from RosterTable

### Performance Note

Keepers page makes extra API call to fetch user's own slot when viewing another team (needed for "(You)" indicator in dropdown). Could be optimized by caching user's slot in session or passing from parent.

---

## Related

- [TASK-102](../completed/phase-1-import/TASK-102.md) - My Team Page (original implementation)
- [TASK-501e](../completed/phase-5-ui/TASK-501e.md) - Restyle My Team Page
- [TASK-104](../completed/phase-1-import/TASK-104.md) - Team Identity System (Slots)
