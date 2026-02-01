# Security

This document describes the security model, authentication, authorization, and data protection measures for KLeague Manager.

**Audience:** Developers, security reviewers, administrators

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [Data Protection](#data-protection)
5. [Input Validation](#input-validation)
6. [Session Management](#session-management)
7. [API Security](#api-security)
8. [Database Security](#database-security)
9. [Infrastructure Security](#infrastructure-security)
10. [Known Limitations](#known-limitations)
11. [Security Checklist](#security-checklist)
12. [Incident Response](#incident-response)

---

## Overview

| Aspect | Implementation |
|--------|----------------|
| Authentication | NextAuth.js v5 with credentials provider |
| Password Storage | bcrypt (12 rounds) |
| Session Management | JWT tokens in HTTP-only cookies |
| Authorization | Role-based (Manager, Commissioner) |
| Data Isolation | Query-level filtering by user's slot |
| Transport Security | HTTPS (enforced by Vercel) |
| Database Security | Parameterized queries via Prisma ORM |

### Threat Model

| Threat | Risk Level | Mitigation |
|--------|------------|------------|
| Unauthorized access | Medium | Authentication required for all protected routes |
| Privilege escalation | Low | Role checks in middleware and API routes |
| Data leakage between teams | Medium | All queries filter by user's slotId |
| SQL injection | Low | Prisma ORM parameterizes all queries |
| XSS | Low | React escapes output by default |
| CSRF | Low | NextAuth.js includes CSRF protection |
| Password theft | Medium | bcrypt hashing, no plaintext storage |

---

## Authentication

### Credentials Provider

Users authenticate with email and password via NextAuth.js credentials provider.
```typescript
// lib/auth.ts
Credentials({
  async authorize(credentials) {
    const user = await db.user.findUnique({
      where: { email: credentials.email }
    });

    if (!user) return null;

    const valid = await bcrypt.compare(
      credentials.password,
      user.passwordHash
    );

    return valid ? user : null;
  }
})
```

### Password Requirements

| Requirement | Value |
|-------------|-------|
| Minimum length | 8 characters (enforced at registration) |
| Hashing algorithm | bcrypt |
| Hash rounds | 12 |
| Storage | `passwordHash` column, never plaintext |

### Password Hashing
```typescript
// Registration
const passwordHash = await bcrypt.hash(password, 12);

// Verification
const valid = await bcrypt.compare(password, user.passwordHash);
```

### Authentication Flow
```
1. User submits email + password
2. Server looks up user by email
3. bcrypt.compare() verifies password
4. If valid: JWT token created, stored in cookie
5. If invalid: Return null (login fails)
```

---

## Authorization

### Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| Guest | Not authenticated | Public pages only |
| Manager | Authenticated user | Own team data |
| Commissioner | `isCommissioner = true` | All data + admin functions |

### Role Assignment

- **Manager:** Default for all registered users
- **Commissioner:** Set manually in database (`isCommissioner = true`)

### Middleware Protection
```typescript
// middleware.ts
const protectedRoutes = ['/my-team', '/draft-board', '/rules', '/admin'];
const adminRoutes = ['/admin'];

export function middleware(request: NextRequest) {
  const session = await auth();

  // Check authentication
  if (protectedRoutes.some(r => path.startsWith(r)) && !session) {
    return redirect('/login');
  }

  // Check commissioner role
  if (adminRoutes.some(r => path.startsWith(r)) && !session.user.isCommissioner) {
    return redirect('/');
  }
}
```

### API Route Protection

Every API route verifies authorization:
```typescript
// Example: /api/admin/draft-order
export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.isCommissioner) {
    return NextResponse.json(
      { error: "Forbidden - Commissioner access required" },
      { status: 403 }
    );
  }

  // ... proceed with request
}
```

---

## Data Protection

### Team Data Isolation

Managers can only access their own team's data. All queries filter by the user's assigned slot:
```typescript
// Get user's slot
const slot = await db.teamSlot.findFirst({
  where: { managerId: session.user.id }
});

// Query only their data
const roster = await db.playerAcquisition.findMany({
  where: {
    slotId: slot.id,
    droppedDate: null
  }
});
```

### Commissioner Exception

Commissioners can access all team data for administrative functions. This is intentional and required for:
- Setting draft order for all teams
- Managing keeper overrides
- Importing league-wide data
- Viewing draft board

### Sensitive Data Handling

| Data Type | Handling |
|-----------|----------|
| Passwords | Hashed with bcrypt, never stored plaintext |
| Email addresses | Stored, used for login only |
| Session tokens | JWT in HTTP-only cookies |
| Database credentials | Environment variables, never in code |

---

## Input Validation

### Server-Side Validation

All API routes validate input before processing:
```typescript
// Example: Keeper selection
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate required fields
  if (!body.playerId) {
    return NextResponse.json(
      { error: "Player ID required" },
      { status: 400 }
    );
  }

  // Validate player exists and is on roster
  const player = await db.playerAcquisition.findFirst({
    where: {
      playerId: body.playerId,
      slotId: slot.id,
      droppedDate: null
    }
  });

  if (!player) {
    return NextResponse.json(
      { error: "Player not found on roster" },
      { status: 400 }
    );
  }

  // ... proceed
}
```

### SQL Injection Prevention

Prisma ORM parameterizes all queries automatically:
```typescript
// Safe - parameterized by Prisma
const user = await db.user.findUnique({
  where: { email: userInput }  // userInput is escaped
});

// Never do this (not actually possible with Prisma)
// db.$queryRaw(`SELECT * FROM users WHERE email = '${userInput}'`)
```

### XSS Prevention

React escapes all rendered content by default:
```tsx
// Safe - React escapes this
<div>{userInput}</div>

// Dangerous - avoid unless absolutely necessary
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

No `dangerouslySetInnerHTML` is used in this application.

---

## Session Management

### JWT Configuration
```typescript
// NextAuth.js configuration
{
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60  // 30 days
  },
  jwt: {
    secret: process.env.AUTH_SECRET
  }
}
```

### Cookie Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| httpOnly | true | Prevents JavaScript access |
| secure | true (production) | HTTPS only |
| sameSite | lax | CSRF protection |
| maxAge | 30 days | Session duration |

### Session Contents
```typescript
// What's stored in the JWT
{
  user: {
    id: string,
    email: string,
    name: string,
    isCommissioner: boolean
  },
  expires: string  // ISO date
}
```

### Session Refresh

Sessions are automatically refreshed on each request if within the refresh window.

---

## API Security

### Rate Limiting

**Current state:** No rate limiting implemented.

**Risk assessment:** Low - Application has 10 users maximum, all known league members.

**Future consideration:** Add rate limiting if application scales or abuse detected.

### CORS

Next.js API routes only accept same-origin requests by default. No CORS headers are configured.

### Request Size Limits

Vercel enforces default request size limits:
- Request body: 4.5MB
- Response body: 4.5MB

### Error Handling

Errors do not expose sensitive information:
```typescript
try {
  // ... operation
} catch (error) {
  console.error('Operation failed:', error);  // Log full error server-side

  return NextResponse.json(
    { error: "Operation failed" },  // Generic message to client
    { status: 500 }
  );
}
```

---

## Database Security

### Connection Security

- **SSL/TLS:** Required (`?sslmode=require` in connection string)
- **Credentials:** Stored in environment variables, never in code
- **Network:** Vercel Postgres is network-isolated

### Access Control

| Access Type | Who |
|-------------|-----|
| Production database | Vercel (via connection string) |
| Direct access | Commissioner only (via Prisma Studio) |
| Backups | Automatic by Vercel |

### Query Safety

All queries use Prisma ORM, which:
- Parameterizes all values
- Prevents SQL injection
- Validates types at compile time

---

## Infrastructure Security

### Vercel Platform

| Feature | Status |
|---------|--------|
| HTTPS enforcement | ✓ Automatic |
| DDoS protection | ✓ Included |
| Edge network | ✓ Global CDN |
| Automatic updates | ✓ Managed platform |

### Environment Variables

| Practice | Status |
|----------|--------|
| Secrets in env vars | ✓ |
| No secrets in code | ✓ |
| Different secrets per environment | ✓ |
| Secrets not logged | ✓ |

### Dependencies
```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix
```

**Recommendation:** Run `npm audit` periodically and before deployments.

---

## Known Limitations

| Limitation | Risk | Mitigation |
|------------|------|------------|
| No rate limiting | Low | Small user base, known users |
| No 2FA | Low | Single-tenant, low-value target |
| No account lockout | Low | Small user base |
| No password complexity rules | Low | User education |
| Commissioner has full access | Accepted | Required for administration |
| Preview deployments share prod DB | Medium | Be careful with preview branches |

### Accepted Risks

These are acknowledged and accepted given the application's scope:

1. **Single commissioner has full access** - Required for league administration
2. **No audit trail for data changes** - AuditLog table exists but not fully utilized
3. **Email enumeration possible** - Login error doesn't distinguish user-not-found vs wrong-password

---

## Security Checklist

### Development

- [ ] Never commit secrets to git
- [ ] Use environment variables for all credentials
- [ ] Validate all user input server-side
- [ ] Use parameterized queries (Prisma handles this)
- [ ] Check authorization in every API route

### Deployment

- [ ] AUTH_SECRET is set and unique per environment
- [ ] DATABASE_URL uses SSL (`sslmode=require`)
- [ ] No debug logging in production
- [ ] HTTPS enforced (automatic on Vercel)

### Code Review

- [ ] No hardcoded credentials
- [ ] Authorization checks present
- [ ] Input validation complete
- [ ] Error messages don't leak sensitive info

---

## Incident Response

### If Credentials Leaked

1. **Rotate immediately:**
   - Change `AUTH_SECRET` in Vercel
   - Rotate database password
   - Redeploy application

2. **Assess impact:**
   - Check access logs
   - Review recent changes

3. **Notify:**
   - Inform league members if data accessed

### If Unauthorized Access Detected

1. **Disable access:**
   - Remove user from database if applicable
   - Rotate AUTH_SECRET to invalidate all sessions

2. **Investigate:**
   - Review Vercel logs
   - Check database for unauthorized changes

3. **Remediate:**
   - Fix vulnerability
   - Restore data if needed

### Contact

Security issues should be reported to the commissioner (application owner).

---

## Related Documents

- [Architecture](./ARCHITECTURE.md) - System design
- [API Reference](./API.md) - Endpoint documentation
- [Deployment](./DEPLOYMENT.md) - Environment configuration

---

**Last Updated:** February 1, 2026
