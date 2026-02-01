# Deployment

This document describes the deployment process, environments, and configuration for KLeague Manager.

**Audience:** Developers, DevOps, Commissioner (for production management)

---

## Table of Contents

1. [Overview](#overview)
2. [Environments](#environments)
3. [Environment Variables](#environment-variables)
4. [Deployment Process](#deployment-process)
5. [Database Management](#database-management)
6. [Domain & DNS](#domain--dns)
7. [Monitoring](#monitoring)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)

---

## Overview

| Aspect | Details |
|--------|---------|
| Hosting Platform | Vercel |
| Database | Vercel Postgres (PostgreSQL) |
| Repository | GitHub |
| Deployment Trigger | Push to `master` branch |
| Build Command | `prisma generate && next build` |
| Production URL | https://kleague-manager.vercel.app |

### Architecture
```
GitHub Repository
       │
       │ push to master
       ▼
┌─────────────────┐
│     Vercel      │
│  ┌───────────┐  │
│  │  Build    │  │  ← prisma generate && next build
│  └───────────┘  │
│       │         │
│       ▼         │
│  ┌───────────┐  │
│  │  Deploy   │  │  ← Serverless functions + static assets
│  └───────────┘  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vercel Postgres │
│   (PostgreSQL)  │
└─────────────────┘
```

---

## Environments

### Production

| Setting | Value |
|---------|-------|
| URL | https://kleague-manager.vercel.app |
| Branch | `master` |
| Auto-deploy | Yes (on push) |
| Database | Vercel Postgres (production) |

### Preview

| Setting | Value |
|---------|-------|
| URL | https://kleague-manager-{hash}.vercel.app |
| Branch | Pull requests, non-master branches |
| Auto-deploy | Yes |
| Database | Same as production (caution!) |

### Local Development

| Setting | Value |
|---------|-------|
| URL | http://localhost:3000 |
| Database | SQLite (local) or PostgreSQL (if configured) |
| Config | `.env.local` file |

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `AUTH_SECRET` | NextAuth.js secret (32+ chars) | `your-random-secret-key-here` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` on Vercel |
| `NEXTAUTH_URL` | Auth callback URL | Auto-detected on Vercel |

### Setting Variables in Vercel

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable
3. Select environments (Production, Preview, Development)
4. Redeploy for changes to take effect

### Local Development Setup

Create `.env.local` in project root:
```bash
# Database (SQLite for local dev)
DATABASE_URL="file:./dev.db"

# Or PostgreSQL (copy from Vercel for prod data access)
# DATABASE_URL="postgresql://..."

# Auth secret (generate with: openssl rand -base64 32)
AUTH_SECRET="your-local-dev-secret"
```

**Important:** Never commit `.env.local` to git.

---

## Deployment Process

### Automatic Deployment (Recommended)

1. **Make changes** locally
2. **Commit** to git
```bash
   git add .
   git commit -m "Description of changes"
```
3. **Push** to master
```bash
   git push origin master
```
4. **Vercel automatically:**
   - Detects push
   - Runs build (`prisma generate && next build`)
   - Deploys if successful
   - Updates production URL

5. **Verify** at https://kleague-manager.vercel.app

### Manual Deployment (If Needed)

Via Vercel CLI:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (follows prompts)
vercel

# Deploy to production
vercel --prod
```

### Build Process
```bash
# What Vercel runs:
prisma generate    # Generate Prisma client
next build         # Build Next.js application
```

Build output:
- `.next/` directory (not committed)
- Serverless functions for API routes
- Static assets for pages

---

## Database Management

### Vercel Postgres

Managed PostgreSQL provided by Vercel. Accessed via Vercel Dashboard → Storage.

### Schema Changes

1. **Update** `prisma/schema.prisma`
2. **Generate** migration locally:
```bash
   npx prisma migrate dev --name description
```
3. **Commit** migration files
4. **Push** to master
5. Vercel runs `prisma generate` (client only, not migrations)

**Note:** Production migrations must be run manually or via a deploy hook.

### Running Migrations on Production
```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate deploy
```

Or via Vercel CLI:
```bash
vercel env pull .env.production.local
npx prisma migrate deploy
```

### Database Backup

Vercel Postgres includes automatic backups. For manual backup:
```bash
# Export data
pg_dump $DATABASE_URL > backup.sql

# Or use Prisma
npx prisma db pull  # Schema only
```

### Accessing Production Data Locally
```bash
# Pull production env vars
vercel env pull .env.production.local

# Use Prisma Studio
npx prisma studio
```

**Caution:** This connects to production data. Be careful with writes.

---

## Domain & DNS

### Current Setup

Using default Vercel domain: `kleague-manager.vercel.app`

### Custom Domain (Future)

To add a custom domain:

1. Vercel Dashboard → Project → Settings → Domains
2. Add domain (e.g., `kleague.example.com`)
3. Configure DNS:
   - CNAME: `kleague` → `cname.vercel-dns.com`
   - Or A record: `@` → Vercel IP
4. Wait for SSL certificate (automatic)

---

## Monitoring

### Current Capabilities

| Feature | Status |
|---------|--------|
| Deployment logs | ✓ Vercel Dashboard |
| Runtime logs | ✓ Vercel Dashboard → Logs |
| Error tracking | ✗ Not configured |
| Performance monitoring | ✗ Not configured |
| Uptime monitoring | ✗ Not configured |

### Viewing Logs

1. Vercel Dashboard → Project → Logs
2. Filter by:
   - Function (API routes)
   - Level (Error, Warning, Info)
   - Time range

### Recommended Additions

| Tool | Purpose | Priority |
|------|---------|----------|
| Sentry | Error tracking | Medium |
| Vercel Analytics | Performance | Low |
| Better Uptime | Uptime monitoring | Low |

---

## Rollback Procedures

### Rollback Deployment

1. **Vercel Dashboard** → Project → Deployments
2. Find previous working deployment
3. Click "..." menu → "Promote to Production"

### Rollback via Git
```bash
# Revert last commit
git revert HEAD
git push origin master

# Or reset to specific commit
git reset --hard <commit-hash>
git push origin master --force  # Caution: destructive
```

### Database Rollback

If schema change caused issues:
```bash
# Revert migration (if possible)
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
psql $DATABASE_URL < backup.sql
```

**Prevention:** Always test migrations locally with production data copy first.

---

## Troubleshooting

### Build Failures

**Symptom:** Deployment fails during build

**Check:**
1. Vercel Dashboard → Deployments → Click failed deployment → Build Logs
2. Common issues:
   - TypeScript errors
   - Missing dependencies
   - Prisma schema issues

**Fix:**
```bash
# Test build locally
npm run build
```

### Database Connection Issues

**Symptom:** "Can't reach database server"

**Check:**
1. `DATABASE_URL` environment variable set correctly
2. Database is running (Vercel Dashboard → Storage)
3. SSL mode included in connection string (`?sslmode=require`)

### Authentication Issues

**Symptom:** Login fails, session not persisted

**Check:**
1. `AUTH_SECRET` environment variable set
2. Same secret across all environments
3. Cookies not blocked by browser

### API Route Errors

**Symptom:** 500 errors on API calls

**Check:**
1. Vercel Dashboard → Logs → Filter by function
2. Look for stack traces
3. Check database queries (Prisma errors)

### Slow Performance

**Symptom:** Pages load slowly

**Check:**
1. Vercel Dashboard → Analytics (if enabled)
2. Database query performance
3. Cold start times (serverless functions)

**Mitigations:**
- Optimize database queries
- Add indexes
- Consider edge functions for latency-sensitive routes

---

## Deployment Checklist

### Before Deploying

- [ ] Changes tested locally
- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors
- [ ] Database migrations tested (if any)
- [ ] Environment variables updated (if needed)

### After Deploying

- [ ] Production site loads
- [ ] Login works
- [ ] Key functionality verified
- [ ] No errors in Vercel logs
- [ ] Database state correct (if migrations ran)

---

## Related Documents

- [Development Guide](./DEVELOPMENT.md) - Local setup
- [Architecture](./ARCHITECTURE.md) - System design
- [Database](./DATABASE.md) - Schema reference

---

**Last Updated:** February 1, 2026
