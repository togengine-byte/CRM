# QuoteFlow Architecture Migration Plan

## Executive Summary

This document outlines the migration plan to restructure QuoteFlow for proper Vercel deployment while maintaining 100% functionality and ensuring future scalability.

---

## 1. Current Architecture Analysis

### 1.1 Project Structure
```
quoteflow/
├── client/           # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/trpc.ts  # tRPC client
│   │   └── main.tsx
│   └── index.html
├── server/           # Express Backend
│   ├── _core/
│   │   ├── index.ts     # Main entry point
│   │   ├── vite.ts      # Vite dev server integration
│   │   ├── oauth.ts     # Authentication
│   │   ├── context.ts   # tRPC context
│   │   └── sdk.ts       # SDK utilities
│   ├── routers.ts       # tRPC routers (969 lines)
│   └── db.ts            # Database operations
├── shared/           # Shared code
│   ├── const.ts
│   └── types.ts
└── drizzle/          # Database schema
    └── schema.ts
```

### 1.2 Technology Stack
- **Frontend**: React 19, Vite 7, TailwindCSS 4, tRPC React Query
- **Backend**: Express.js, tRPC Server, Drizzle ORM
- **Database**: MySQL (via mysql2)
- **Authentication**: Custom OAuth + Session Cookies
- **Build**: Vite (frontend) + esbuild (backend)

### 1.3 Current Build Process
```bash
# Build command in package.json
vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```
- Vite builds frontend to `dist/public/`
- esbuild bundles backend to `dist/index.js`
- Production server serves static files from `dist/public/`

### 1.4 Critical Dependencies
1. **tRPC Type Sharing**: Frontend imports types from `server/routers.ts`
2. **Shared Constants**: Both client and server import from `shared/`
3. **Database Schema**: Types exported from `drizzle/schema.ts`
4. **Vite Config**: Custom plugins for Manus integration

---

## 2. Problem Analysis

### 2.1 Why Current Setup Fails on Vercel

| Issue | Description | Impact |
|-------|-------------|--------|
| **Long-running Server** | Express server expects to run continuously | Vercel Serverless has 10s-60s timeout |
| **Static File Serving** | `serveStatic()` expects filesystem access | Vercel serves static files differently |
| **Build Output** | `dist/index.js` is a Node.js server, not a function | Vercel displays raw code instead of running it |
| **Port Binding** | Server binds to port 3000 | Serverless functions don't bind ports |

### 2.2 Risks Identified

| Risk | Severity | Mitigation |
|------|----------|------------|
| tRPC type imports break | HIGH | Keep relative paths, update tsconfig |
| Database connection issues | HIGH | Use connection pooling, test thoroughly |
| Authentication breaks | MEDIUM | Verify cookie handling in serverless |
| Build process fails | MEDIUM | Test locally before pushing |
| Environment variables missing | LOW | Document all required vars |

---

## 3. Target Architecture

### 3.1 Vercel-Compatible Structure
```
quoteflow/
├── api/                    # Vercel Serverless Functions
│   └── trpc/
│       └── [trpc].ts       # Catch-all tRPC handler
├── client/                 # Frontend (unchanged structure)
│   ├── src/
│   └── index.html
├── server/                 # Backend logic (unchanged)
│   ├── _core/
│   ├── routers.ts
│   └── db.ts
├── shared/                 # Shared code (unchanged)
├── drizzle/                # Database schema (unchanged)
├── vercel.json             # Vercel configuration
└── package.json            # Updated scripts
```

### 3.2 Key Changes

1. **New API Handler**: `/api/trpc/[trpc].ts` - Vercel serverless function
2. **Remove**: `server/_core/index.ts` Express server (keep for local dev)
3. **Update**: `vercel.json` with proper routing
4. **Update**: Build scripts for Vercel

### 3.3 Request Flow

```
[Browser] 
    │
    ├─── /api/trpc/* ──→ [Vercel Serverless Function] ──→ [tRPC Router] ──→ [MySQL]
    │
    └─── /* (static) ──→ [Vercel CDN] ──→ [dist/public/index.html]
```

---

## 4. Implementation Plan

### Phase 1: Create Vercel API Handler
- Create `/api/trpc/[trpc].ts` with proper tRPC adapter
- Handle authentication in serverless context
- Test locally with `vercel dev`

### Phase 2: Update Build Configuration
- Modify `vercel.json` for correct routing
- Update `package.json` scripts
- Ensure frontend builds correctly

### Phase 3: Database Connection
- Implement connection pooling for serverless
- Add connection timeout handling
- Test cold start scenarios

### Phase 4: Authentication
- Verify cookie handling in serverless
- Test session persistence
- Handle CORS if needed

### Phase 5: Testing & Validation
- Test all tRPC endpoints
- Verify frontend-backend communication
- Test authentication flow
- Performance testing

---

## 5. Rollback Plan

### 5.1 Git Strategy
```bash
# Before starting, create backup branch
git checkout -b backup/pre-vercel-migration

# All changes on main branch with atomic commits
git checkout main

# If migration fails, restore from backup
git checkout backup/pre-vercel-migration
git checkout -B main
git push --force origin main
```

### 5.2 Vercel Rollback
- Vercel keeps all deployments
- Can instantly rollback to any previous deployment
- Current working deployment: `AtrJaHoSM`

### 5.3 Recovery Steps
1. In Vercel dashboard, go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Restore code from backup branch

---

## 6. Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MySQL connection string | YES |
| `JWT_SECRET` | Session token secret | YES |
| `VITE_APP_ID` | Application identifier | YES |
| `OAUTH_SERVER_URL` | OAuth server URL | NO (disabled) |
| `OWNER_OPEN_ID` | Owner user ID | NO |
| `BUILT_IN_FORGE_API_URL` | Forge API URL | NO |
| `BUILT_IN_FORGE_API_KEY` | Forge API key | NO |

---

## 7. Success Criteria

- [ ] All tRPC endpoints respond correctly
- [ ] Frontend loads and renders
- [ ] Authentication works (login/logout)
- [ ] Database operations succeed
- [ ] No TypeScript errors in build
- [ ] Cold start < 5 seconds
- [ ] No functionality regression

---

## 8. Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `api/trpc/[trpc].ts` | CREATE | Vercel serverless handler |
| `vercel.json` | UPDATE | Routing configuration |
| `package.json` | UPDATE | Build scripts |
| `server/_core/vite.ts` | UPDATE | Fix TypeScript errors |
| `server/_core/cookies.ts` | UPDATE | Fix TypeScript errors |
| `api/index.ts` | DELETE | Remove old broken handler |

---

## 9. Approval

**Migration approved by**: User
**Date**: 2026-01-22
**Risk Level**: Medium
**Estimated Time**: 30 minutes

---

*Document created by Manus Agent*
*Version: 1.0*
