# TASK-702: Commissioner View Other Teams

**Status:** BACKLOG
**Created:** February 2026
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

Add `?teamSlot=N` query parameter to My Team page:

```typescript
// app/(dashboard)/my-team/page.tsx
export default async function MyTeamPage({ searchParams }) {
  const session = await auth();
  const user = session?.user;

  // Default to user's own slot
  let viewingSlot = user?.slotId;

  // Commissioner can override
  if (user?.isCommissioner && searchParams.teamSlot) {
    viewingSlot = parseInt(searchParams.teamSlot);
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

### Option B: Separate Admin Page

Create `/admin/view-team/[slot]` route:
- Pros: Clear separation of concerns
- Cons: Duplicates My Team UI, harder to maintain

### Recommendation

Option A is simpler and keeps UI consistent. The commissioner sees the exact same view the manager sees.

---

## Files Created

| File | Purpose |
|------|---------|
| `components/my-team/team-selector.tsx` | Dropdown to select team (commissioner only) |

---

## Files Modified

| File | Change |
|------|--------|
| `app/(dashboard)/my-team/page.tsx` | Add teamSlot query param handling |
| `app/(dashboard)/my-team/keepers/page.tsx` | Add teamSlot query param, disable actions when viewing other |
| `lib/keeper/service.ts` | Ensure slot-based queries work for any slot |

---

## Acceptance Criteria

- [ ] Commissioner sees team selector dropdown on My Team page
- [ ] Selecting a team shows that team's roster
- [ ] Clear visual indicator shows when viewing another team
- [ ] Cannot modify keeper selections when viewing another team
- [ ] Regular managers do not see team selector
- [ ] Commissioner can switch back to their own team
- [ ] Works on keepers sub-page as well
- [ ] URL is shareable (query param based)

---

## Verification

1. Log in as commissioner
2. Navigate to My Team page
3. Verify team selector dropdown is visible
4. Select a different team
5. Verify URL updates to `?teamSlot=N`
6. Verify roster shows selected team's players
7. Verify "Viewing as: [Team Name]" indicator
8. Navigate to keepers page
9. Verify keeper data shows for selected team
10. Verify no action buttons (select/deselect) are available
11. Log in as regular manager
12. Verify team selector is NOT visible

---

## Completion Notes

N/A - Not yet started

---

## Related

- [TASK-102](../completed/phase-1-import/TASK-102.md) - My Team Page (original implementation)
- [TASK-501e](../completed/phase-5-ui/TASK-501e.md) - Restyle My Team Page
- [TASK-104](../completed/phase-1-import/TASK-104.md) - Team Identity System (Slots)
