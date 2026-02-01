# KLeague Manager

**Automated keeper league management for fantasy football.**

---

## The Problem

Managing a keeper league in Excel is painful:

- **Hours of manual work** - Commissioner spends 5+ hours each offseason calculating keeper costs, cross-referencing draft history, and building the draft board
- **Error-prone** - One wrong formula or missed trade breaks the entire keeper cost chain
- **No collaboration** - Managers can't see their own keeper options; everything funnels through the commissioner
- **Tribal knowledge** - Complex rules live in the commissioner's head, not in a system

---

## The Solution

KLeague Manager automates the entire keeper workflow:

| Capability | What It Does |
|------------|--------------|
| **Keeper Cost Engine** | Automatically calculates keeper costs based on acquisition history, years kept, trades, and free agent rules |
| **Self-Service Selection** | Managers log in, see their eligible keepers with costs, and make selections directly |
| **Conflict Detection** | System flags round conflicts and guides resolution before deadline |
| **Draft Board** | Auto-generated 28x10 grid showing all keeper placements and open slots |
| **Data Import** | Commissioner imports CBS draft/transaction data via copy-paste |
| **Rule Flexibility** | Rules engine allows toggling league rules by season as they evolve |

---

## How It Works

### For Team Managers

1. Log in to your account
2. View your roster with calculated keeper costs
3. Select up to 5 keepers (system prevents invalid selections)
4. Resolve any round conflicts via "bump" feature
5. Finalize before deadline

### For Commissioner

1. Set draft order for upcoming season
2. Import draft results and transactions from CBS
3. Configure league rules and keeper deadline
4. Override keeper costs for special cases (e.g., traded draft picks)
5. View league-wide draft board with all keeper placements

---

## Traction

| Metric | Value |
|--------|-------|
| Seasons of historical data | 3 (2023, 2024, 2025) |
| Players tracked | 664 |
| Acquisitions recorded | 1,521 |
| Trades processed | 8 |
| Active managers | 4 (of 10 slots) |
| Commissioner time saved | ~5 hours per season |

---

## Technology

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (production) |
| Auth | NextAuth.js v5 (credentials) |
| Hosting | Vercel |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design details.

---

## Roadmap

| Priority | Feature | Status |
|----------|---------|--------|
| Done | Core keeper calculation engine | Complete |
| Done | Manager self-service keeper selection | Complete |
| Done | Commissioner admin tools | Complete |
| Done | Draft board visualization | Complete |
| Planned | Commissioner view any team's roster | Planned |
| Backlog | Historical keeper selection backfill | Backlog |
| Future | Multi-platform support (ESPN, Yahoo, Sleeper) | Future |

See [ROADMAP.md](./ROADMAP.md) for full details.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System design, data flow, technical decisions |
| [Database](./DATABASE.md) | Schema, ERD, relationships |
| [API Reference](./API.md) | Endpoint documentation |
| [Development Guide](./DEVELOPMENT.md) | Local setup, coding standards |
| [Deployment](./DEPLOYMENT.md) | Environment configuration, deploy process |
| [Changelog](./CHANGELOG.md) | Release history |

---

## For Developers

<details>
<summary>Click to expand setup instructions</summary>

### Prerequisites

- Node.js 18+
- PostgreSQL (or use SQLite for local dev)

### Quick Start
```bash
# Clone repository
git clone https://github.com/[your-repo]/kleague-manager.git
cd kleague-manager

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with DATABASE_URL and AUTH_SECRET

# Initialize database
npx prisma db push

# Start development server
npm run dev
```

### Project Structure
```
kleague-manager/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login, register pages
│   ├── (dashboard)/       # Protected pages
│   └── api/               # API routes
├── components/            # React components
├── lib/                   # Business logic
│   ├── keeper/           # Keeper cost calculation
│   ├── importers/        # CBS data parsers
│   ├── slots/            # Team identity
│   └── rules/            # Rules engine
├── prisma/               # Database schema
├── docs/                 # Documentation
└── tasks/                # Task tracking
```

</details>

---

**Last Updated:** February 1, 2026
