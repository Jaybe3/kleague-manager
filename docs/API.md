# API Reference

Complete reference for all KLeague Manager API endpoints.

**Audience:** Developers, integrators

**Base URL:** `https://kleague-manager.vercel.app/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
   - [Auth](#auth)
   - [My Team](#my-team)
   - [Keepers](#keepers)
   - [Draft Board](#draft-board)
   - [Rules](#rules)
   - [Admin - Draft Order](#admin---draft-order)
   - [Admin - Import](#admin---import)
   - [Admin - Keeper Overrides](#admin---keeper-overrides)
   - [Admin - Rules](#admin---rules)
   - [Admin - Seasons](#admin---seasons)
   - [Admin - Trade](#admin---trade)

---

## Overview

| Aspect | Details |
|--------|---------|
| Protocol | HTTPS |
| Format | JSON |
| Authentication | Session-based (NextAuth.js JWT) |
| Authorization | Role-based (Manager, Commissioner) |

### HTTP Methods Used

| Method | Purpose |
|--------|---------|
| `GET` | Retrieve data |
| `POST` | Create new records |
| `PATCH` | Update existing records |
| `DELETE` | Remove records |

---

## Authentication

All endpoints except `/api/auth/*` require authentication.

### Session Cookie

Authentication is handled via NextAuth.js session cookies. The session is established after successful login and includes:
```typescript
{
  user: {
    id: string,
    email: string,
    name: string,
    isCommissioner: boolean
  }
}
```

### Authorization Levels

| Level | Access |
|-------|--------|
| **Public** | `/api/auth/*` only |
| **Authenticated** | All `/api/*` except admin |
| **Commissioner** | `/api/admin/*` endpoints |

### Unauthorized Response
```json
{
  "error": "Unauthorized"
}
```
**Status:** `401`

### Forbidden Response (Not Commissioner)
```json
{
  "error": "Forbidden - Commissioner access required"
}
```
**Status:** `403`

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

Or direct data for GET requests:
```json
{
  "roster": [...],
  "activeSeasonYear": 2026,
  "rosterSeasonYear": 2025
}
```

### Error Response
```json
{
  "error": "Human-readable error message"
}
```

Or with details:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": { ... }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| `200` | OK | Successful GET, PATCH, DELETE |
| `201` | Created | Successful POST |
| `400` | Bad Request | Validation error, business rule violation |
| `401` | Unauthorized | Not authenticated |
| `403` | Forbidden | Not authorized (e.g., not commissioner) |
| `404` | Not Found | Resource doesn't exist |
| `500` | Server Error | Unexpected error |

### Common Error Messages

| Message | Cause |
|---------|-------|
| `"Unauthorized"` | No valid session |
| `"Forbidden - Commissioner access required"` | Admin endpoint, user not commissioner |
| `"No slot assigned to this user"` | User not linked to a team slot |
| `"Deadline has passed"` | Keeper modification after deadline |
| `"Player not found on roster"` | Trying to select non-rostered player |
| `"Maximum keepers reached"` | Already at 5 keepers |
| `"Unresolved conflicts"` | Trying to finalize with round conflicts |

---

## Endpoints

---

### Auth

#### POST /api/auth/register

Create a new user account.

**Authentication:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "displayName": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "clx123...",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

**Errors:**
- `400` - Email already exists
- `400` - Invalid email format
- `400` - Password too short

---

#### NextAuth Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/callback/credentials` | Login with email/password |
| `GET /api/auth/session` | Get current session |
| `POST /api/auth/signout` | End session |

These are handled by NextAuth.js. See [NextAuth.js documentation](https://next-auth.js.org/) for details.

---

### My Team

#### GET /api/my-team

Get the authenticated user's team roster with keeper costs.

**Authentication:** Required

**Response (200):**
```json
{
  "team": {
    "id": "clx123...",
    "teamName": "Nabers Think I'm Selling Dope",
    "slotId": 10,
    "seasonYear": 2025
  },
  "players": [
    {
      "id": "clxABC...",
      "firstName": "Patrick",
      "lastName": "Mahomes",
      "position": "QB",
      "acquisition": {
        "type": "DRAFT",
        "round": 1,
        "date": "2023-09-01"
      },
      "keeperCost": {
        "round": null,
        "isEligible": false,
        "reason": "Cost below Round 1"
      }
    },
    {
      "id": "clxDEF...",
      "firstName": "Kenneth",
      "lastName": "Walker III",
      "position": "RB",
      "acquisition": {
        "type": "DRAFT",
        "round": 5,
        "date": "2025-09-01"
      },
      "keeperCost": {
        "round": 5,
        "isEligible": true,
        "yearsKept": 2
      }
    }
  ],
  "activeSeasonYear": 2026,
  "rosterSeasonYear": 2025
}
```

**Errors:**
- `401` - Unauthorized
- `404` - No slot assigned to user

---

### Keepers

#### GET /api/my-team/keepers

Get keeper-eligible players and current selections.

**Authentication:** Required

**Response (200):**
```json
{
  "eligiblePlayers": [
    {
      "playerId": "clxDEF...",
      "firstName": "Kenneth",
      "lastName": "Walker III",
      "position": "RB",
      "keeperRound": 5,
      "yearsKept": 2,
      "isEligible": true
    }
  ],
  "selectedKeepers": [
    {
      "id": "clxSEL...",
      "playerId": "clxGHI...",
      "firstName": "Rome",
      "lastName": "Odunze",
      "position": "WR",
      "keeperRound": 6,
      "yearsKept": 3,
      "isFinalized": false
    }
  ],
  "maxKeepers": 5,
  "conflicts": [],
  "deadlineInfo": {
    "state": "open",
    "deadline": "2026-08-15T00:00:00Z",
    "canModify": true,
    "message": "Keeper deadline: August 15, 2026"
  },
  "targetSeasonYear": 2026
}
```

**Conflicts Format:**
```json
{
  "conflicts": [
    {
      "round": 15,
      "players": [
        { "playerId": "clx1...", "name": "Player A" },
        { "playerId": "clx2...", "name": "Player B" }
      ]
    }
  ]
}
```

---

#### POST /api/my-team/keepers

Add a player to keeper selections.

**Authentication:** Required

**Request Body:**
```json
{
  "playerId": "clxDEF..."
}
```

**Response (201):**
```json
{
  "success": true,
  "selection": {
    "id": "clxSEL...",
    "playerId": "clxDEF...",
    "keeperRound": 5,
    "yearsKept": 2
  }
}
```

**Errors:**
- `400` - Player not found on roster
- `400` - Player not eligible
- `400` - Maximum keepers reached (5)
- `400` - Deadline has passed
- `400` - Player already selected

---

#### DELETE /api/my-team/keepers/[playerId]

Remove a player from keeper selections.

**Authentication:** Required

**URL Parameters:**
- `playerId` - Player ID to remove

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `400` - Player not in selections
- `400` - Deadline has passed
- `400` - Selections already finalized

---

#### POST /api/my-team/keepers/bump

Bump a keeper to an earlier round (to resolve conflicts).

**Authentication:** Required

**Request Body:**
```json
{
  "playerId": "clxDEF...",
  "newRound": 14
}
```

**Response (200):**
```json
{
  "success": true,
  "selection": {
    "id": "clxSEL...",
    "playerId": "clxDEF...",
    "keeperRound": 14,
    "originalRound": 15
  }
}
```

**Errors:**
- `400` - New round must be earlier than current
- `400` - Round already taken by another keeper
- `400` - Deadline has passed

---

#### GET /api/my-team/keepers/bump

Get available bump options for a player.

**Authentication:** Required

**Query Parameters:**
- `playerId` - Player ID to get options for

**Response (200):**
```json
{
  "playerId": "clxDEF...",
  "currentRound": 15,
  "availableRounds": [1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14]
}
```

---

#### POST /api/my-team/keepers/finalize

Finalize keeper selections (locks them for the draft).

**Authentication:** Required

**Request Body:**
```json
{}
```

**Response (200):**
```json
{
  "success": true,
  "finalizedAt": "2026-08-10T15:30:00Z",
  "keepers": [
    { "playerId": "clx1...", "round": 5 },
    { "playerId": "clx2...", "round": 6 },
    { "playerId": "clx3...", "round": 14 }
  ]
}
```

**Errors:**
- `400` - Unresolved conflicts exist
- `400` - Deadline has passed
- `400` - Already finalized

---

### Draft Board

#### GET /api/draft-board

Get the draft board for a season.

**Authentication:** Required

**Query Parameters:**
- `season` (optional) - Year (defaults to active season)

**Response (200):**
```json
{
  "season": 2026,
  "totalRounds": 28,
  "teams": [
    {
      "slotId": 1,
      "teamName": "Go Go Garrett",
      "draftPosition": 1
    },
    {
      "slotId": 5,
      "teamName": "Seal Team Nix",
      "draftPosition": 2
    }
  ],
  "board": [
    {
      "round": 1,
      "picks": [
        { "position": 1, "slotId": 1, "keeper": null },
        { "position": 2, "slotId": 5, "keeper": null },
        { "position": 3, "slotId": 10, "keeper": { "playerId": "clx...", "name": "Player X", "position": "QB" } }
      ]
    }
  ],
  "stats": {
    "totalKeepers": 35,
    "byTeam": [
      { "slotId": 1, "count": 4 },
      { "slotId": 5, "count": 3 }
    ]
  }
}
```

---

### Rules

#### GET /api/rules

Get league rules.

**Authentication:** Required

**Response (200):**
```json
{
  "rules": [
    {
      "id": "clxR1...",
      "code": "KEEPER_COST_YEAR_2",
      "name": "Year 2 Base Cost",
      "description": "In year 2, keepers cost their original draft round",
      "effectiveSeason": 2023,
      "enabled": true
    }
  ]
}
```

---

### Admin - Draft Order

#### GET /api/admin/draft-order

Get draft order for a season.

**Authentication:** Commissioner

**Query Parameters:**
- `season` - Year (required)

**Response (200):**
```json
{
  "season": 2026,
  "draftOrder": [
    { "position": 1, "slotId": 1, "teamName": "Go Go Garrett" },
    { "position": 2, "slotId": 5, "teamName": "Seal Team Nix" },
    { "position": 3, "slotId": 10, "teamName": "Nabers Think I'm Selling Dope" }
  ]
}
```

---

#### PATCH /api/admin/draft-order

Update draft order for a season.

**Authentication:** Commissioner

**Request Body:**
```json
{
  "season": 2026,
  "order": [
    { "slotId": 1, "position": 1 },
    { "slotId": 5, "position": 2 },
    { "slotId": 10, "position": 3 }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "updated": 10
}
```

**Errors:**
- `400` - Invalid positions (must be 1-10, no duplicates)
- `400` - Missing slots

---

### Admin - Import

#### POST /api/admin/import

Import draft or transaction data from CBS.

**Authentication:** Commissioner

**Request Body:**
```json
{
  "type": "draft",
  "season": 2025,
  "data": "Round 1\n1. Go Go Garrett - Patrick Mahomes, QB\n2. Seal Team Nix - Josh Allen, QB\n..."
}
```

**Types:**
- `draft` - Draft picks
- `fa` - Free agent transactions

**Response (200):**
```json
{
  "success": true,
  "imported": {
    "players": 280,
    "acquisitions": 280,
    "teams": 10
  },
  "warnings": []
}
```

**Errors:**
- `400` - Parse error (invalid format)
- `400` - Unknown team name (no alias match)

---

### Admin - Keeper Overrides

#### GET /api/admin/keeper-overrides

Get all keeper overrides for a season.

**Authentication:** Commissioner

**Query Parameters:**
- `season` - Year (required)

**Response (200):**
```json
{
  "overrides": [
    {
      "id": "clxOV...",
      "playerId": "clxPL...",
      "playerName": "Jayden Daniels",
      "teamId": "clxTM...",
      "teamName": "Nabers Think I'm Selling Dope",
      "seasonYear": 2026,
      "overrideRound": 1
    }
  ]
}
```

---

#### POST /api/admin/keeper-overrides

Create a keeper override.

**Authentication:** Commissioner

**Request Body:**
```json
{
  "playerId": "clxPL...",
  "teamId": "clxTM...",
  "seasonYear": 2026,
  "overrideRound": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "override": {
    "id": "clxOV...",
    "playerId": "clxPL...",
    "overrideRound": 1
  }
}
```

**Errors:**
- `400` - Override already exists for this player/team/season

---

#### DELETE /api/admin/keeper-overrides/[id]

Delete a keeper override.

**Authentication:** Commissioner

**URL Parameters:**
- `id` - Override ID

**Response (200):**
```json
{
  "success": true
}
```

---

### Admin - Rules

#### GET /api/admin/rules

Get all league rules (admin view with full details).

**Authentication:** Commissioner

**Response (200):**
```json
{
  "rules": [
    {
      "id": "clxR1...",
      "code": "KEEPER_COST_YEAR_2",
      "name": "Year 2 Base Cost",
      "description": "In year 2, keepers cost their original draft round",
      "effectiveSeason": 2023,
      "enabled": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### POST /api/admin/rules

Create a new league rule.

**Authentication:** Commissioner

**Request Body:**
```json
{
  "code": "NEW_RULE_CODE",
  "name": "New Rule Name",
  "description": "Full description of the rule",
  "effectiveSeason": 2026,
  "enabled": true
}
```

**Response (201):**
```json
{
  "success": true,
  "rule": { ... }
}
```

---

#### PATCH /api/admin/rules/[id]

Update a league rule.

**Authentication:** Commissioner

**URL Parameters:**
- `id` - Rule ID

**Request Body:**
```json
{
  "enabled": false
}
```

**Response (200):**
```json
{
  "success": true,
  "rule": { ... }
}
```

---

#### DELETE /api/admin/rules/[id]

Delete a league rule.

**Authentication:** Commissioner

**URL Parameters:**
- `id` - Rule ID

**Response (200):**
```json
{
  "success": true
}
```

---

### Admin - Seasons

#### GET /api/admin/seasons

Get all seasons.

**Authentication:** Commissioner

**Response (200):**
```json
{
  "seasons": [
    {
      "id": "clxS1...",
      "year": 2026,
      "draftDate": "2026-09-01T00:00:00Z",
      "keeperDeadline": "2026-08-15T00:00:00Z",
      "totalRounds": 28,
      "isActive": true
    },
    {
      "id": "clxS2...",
      "year": 2025,
      "draftDate": "2025-09-01T00:00:00Z",
      "keeperDeadline": "2025-08-15T00:00:00Z",
      "totalRounds": 28,
      "isActive": false
    }
  ]
}
```

---

#### PATCH /api/admin/seasons

Update a season.

**Authentication:** Commissioner

**Request Body:**
```json
{
  "id": "clxS1...",
  "keeperDeadline": "2026-08-20T00:00:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "season": { ... }
}
```

---

### Admin - Trade

#### POST /api/admin/trade

Record a trade.

**Authentication:** Commissioner

**Request Body:**
```json
{
  "playerId": "clxPL...",
  "fromTeamId": "clxTM1...",
  "toTeamId": "clxTM2...",
  "tradeDate": "2025-10-15"
}
```

**Response (201):**
```json
{
  "success": true,
  "acquisition": {
    "id": "clxAQ...",
    "playerId": "clxPL...",
    "teamId": "clxTM2...",
    "acquisitionType": "TRADE",
    "tradedFromTeamId": "clxTM1..."
  }
}
```

**Notes:**
- Creates a new `TRADE` acquisition on the destination team
- Sets `droppedDate` on the source team's acquisition
- Trade inherits original draft cost for keeper calculations

---

## Rate Limiting

Currently no rate limiting is implemented. The application is designed for low-traffic use (10 users max).

---

## Versioning

No API versioning currently. Breaking changes will be documented in [CHANGELOG.md](./CHANGELOG.md).

---

## Related Documents

- [Architecture](./ARCHITECTURE.md) - System design overview
- [Database](./DATABASE.md) - Schema reference
- [Development Guide](./DEVELOPMENT.md) - Local setup

---

**Last Updated:** February 1, 2026
