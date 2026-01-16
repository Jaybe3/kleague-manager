# DEVELOPMENT.md
## Fantasy Football Keeper League Management System
## Technical Specification & Architecture

**Project:** KLeague Manager  
**Version:** 1.0

---

## Technology Stack

### Frontend
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Components: shadcn/ui
- Forms: React Hook Form + Zod validation

### Backend
- Runtime: Node.js 18+
- Framework: Next.js API Routes
- ORM: Prisma
- Database: PostgreSQL (Vercel Postgres or Supabase)
- Auth: NextAuth.js v5

### Hosting
- Platform: Vercel (free tier)
- Database: Vercel Postgres or Supabase (free tier)

---

## Project Structure
```
kleague-manager/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, register)
│   ├── (dashboard)/       # Protected routes
│   │   ├── my-team/
│   │   ├── draft-board/
│   │   └── admin/
│   └── api/               # API routes
├── components/            # Reusable components
├── lib/                   # Utilities & business logic
│   ├── keeper/           # Keeper calculation logic
│   └── importers/        # Excel parsing
├── prisma/
│   └── schema.prisma     # Database schema
├── package.json
└── tsconfig.json
```

---

## Database Schema (Prisma)

### Core Tables
- **User**: Authentication and user management
- **Team**: Team identity (permanent_id 1-10)
- **Player**: Master player list
- **Season**: Yearly configuration (deadline, draft date)
- **PlayerAcquisition**: Draft picks, FAs, trades
- **KeeperSelection**: Yearly keeper decisions
- **AuditLog**: Change tracking

### Key Relationships
- User → Team (manager)
- Team → PlayerAcquisition → KeeperSelection
- Player → PlayerAcquisition

### PlayerAcquisition Model
```prisma
model PlayerAcquisition {
  id               String    @id
  playerId         String
  teamId           String
  seasonYear       Int       // Year acquired
  acquisitionType  String    // "DRAFT", "FA", "TRADE"
  draftRound       Int?      // Round if drafted
  draftPick        Int?      // Pick number if drafted
  acquisitionDate  DateTime
  tradedFromTeamId String?   // If traded, original team
  droppedDate      DateTime? // If dropped, when (null = still on roster)
  // ...timestamps
}
```

**droppedDate field (added 2026-01-16):**
- `null` = player is still on team roster
- Set to date = player was dropped on that date
- Used to filter roster display (only show active players)

**TODO:** Reset scenario detection
- If player dropped and NOT picked up rest of season → re-enters draft pool
- Original draft would no longer apply
- Requires tracking season coverage, not just seasonYear field

---

## Keeper Calculation Algorithm

### Rules (CORRECTED 2026-01-16)
| Year | Drafted Player (Round X) | Free Agent |
|------|--------------------------|------------|
| Y2 (1st keeper) | Round X | Round 15 |
| Y3 (2nd keeper) | Round X - 4 | Round 11 |
| Y4 (3rd keeper) | Round X - 8 | Round 7 |
| Y5+ | Continue -4/year | Continue -4/year |

**Ineligibility:** When calculated cost < Round 1

### Original Draft Rule
- Search ALL teams/seasons for player's original DRAFT acquisition
- If DRAFT found anywhere → use that for cost calculation
- If NO DRAFT found → player is true undrafted FA, use Round 15 rules

### Key Files
- `lib/keeper/calculator.ts` - Pure calculation logic
- `lib/keeper/service.ts` - Database integration, finds original draft
- `lib/keeper/types.ts` - Constants: `YEARS_AT_BASE_COST = 1`, `FA_BASE_ROUND = 15`
- `lib/keeper/selection-service.ts` - Keeper selection business logic
- `lib/keeper/selection-types.ts` - Types for selections, deadlines

```typescript
// Example calculation
const result = calculateKeeperCost({
  acquisitionType: "DRAFT",
  originalDraftRound: 10,
  acquisitionYear: 2024,
  targetYear: 2026,  // Y3
});
// Result: keeperRound = 6 (10 - 4)
```

---

## Deadline Enforcement (added 2026-01-16)

### Deadline States
| State | Condition | Mutations Allowed |
|-------|-----------|-------------------|
| `open` | > 7 days until deadline | Yes |
| `approaching` | ≤ 7 days until deadline | Yes |
| `urgent` | ≤ 24 hours until deadline | Yes |
| `passed` | Past deadline | No |

### Helper Functions
```typescript
// lib/keeper/selection-service.ts
getDeadlineState(deadline: Date): DeadlineState
getDeadlineInfo(deadline: Date, isFinalized: boolean): DeadlineInfo
canModifySelections(deadline: Date, isFinalized: boolean): boolean
```

### Blocking Behavior
When `canModifySelections()` returns `false`:
- POST /api/my-team/keepers → 403 "Cannot modify"
- DELETE /api/my-team/keepers/[playerId] → 403 "Cannot modify"
- POST /api/my-team/keepers/bump → 403 "Cannot modify"
- POST /api/my-team/keepers/finalize → 403 "Cannot finalize"

---

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/signin
- POST /api/auth/signout

### My Team & Keepers
- GET /api/my-team - Get current user's team
- GET /api/my-team/keepers - Get keeper selections + eligible players
- POST /api/my-team/keepers - Add player to keeper selections
- DELETE /api/my-team/keepers/[playerId] - Remove player from selections
- POST /api/my-team/keepers/bump - Bump player to earlier round
- GET /api/my-team/keepers/bump?playerId=X - Get bump options
- POST /api/my-team/keepers/finalize - Lock selections

### Teams
- GET /api/teams/[teamId]/roster - Get team roster with keeper costs

### Draft Board
- GET /api/draft-board?year=YYYY - Get draft board with finalized keepers (defaults to active year + 1)

### Admin (Commissioner Only)
- POST /api/admin/import - Import draft/FA data from Excel
- POST /api/admin/trade - Enter manual trade
- GET /api/admin/seasons - List all seasons with deadline states
- PATCH /api/admin/seasons - Update season deadline

---

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Use ESLint + Prettier for formatting
- Follow Next.js conventions

### Git Workflow
- Feature branches: `feature/TASK-XXX-description`
- Commit format: `TASK-XXX: Description`
- Never commit to main directly

### Testing
- Unit tests for business logic (calculator, validators)
- Integration tests for API endpoints
- Test coverage goal: 80%+ for business logic

---

## Deployment

### Environment Variables
```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://kleague-manager.vercel.app"
NEXTAUTH_SECRET="..." # Generate with: openssl rand -base64 32
```

### Vercel Deployment
```bash
vercel deploy --prod
```

---

**Document Status:** APPROVED  
**Next Steps:** Begin TASK-000
