# Code Flow Analysis - Authentication System

## Current State (Clerk-based)

### Frontend (Client)

1. **main.tsx** - Entry point
   - Wraps app with `ClerkProvider`
   - Creates TRPC client with credentials
   - Redirects to login on unauthorized errors

2. **App.tsx** - Routing
   - Public routes: `/`, `/signup`, `/admin-setup`
   - Protected routes wrapped with `<ProtectedRoute>`
   - All dashboard routes require authentication

3. **ProtectedRoute.tsx** - Auth guard
   - Uses Clerk hooks: `useAuth`, `useUser`, `useClerk`
   - Checks if user email exists in database via `trpc.auth.checkUserByEmail`
   - Blocks unauthorized users and redirects to landing page

4. **DashboardLayout.tsx** - Dashboard wrapper
   - Uses Clerk hooks for user info
   - Gets role from Clerk metadata (defaults to admin)
   - Shows different menu items based on role
   - Logout via Clerk's `signOut`

5. **LandingPage.tsx** - Public page
   - Has Clerk `<SignIn>` component in a dialog
   - Customer signup form (public)

6. **useAuth.ts** - Custom hook
   - Uses `trpc.auth.me` to get user from backend
   - Provides logout functionality

### Backend (Server)

1. **sdk.ts** - Authentication SDK
   - Uses JWT session cookies (COOKIE_NAME = "app_session_id")
   - `authenticateRequest()` - verifies session cookie and gets user from DB
   - `createSessionToken()` - creates JWT for session
   - `verifySession()` - verifies JWT token

2. **context.ts** - TRPC context
   - Calls `sdk.authenticateRequest()` to get user
   - Passes user to all TRPC procedures

3. **routers.ts** - API routes
   - `auth.me` - returns current user from context
   - `auth.logout` - clears session cookie
   - `auth.checkUserByEmail` - checks if email exists in DB
   - `auth.seedAdmin` - creates admin user

4. **trpc.ts** - Procedures
   - `publicProcedure` - no auth required
   - `protectedProcedure` - requires user
   - `adminProcedure` - requires admin role

### Database Schema (users table)

```
- id: serial
- openId: varchar(64) - unique identifier
- name: text
- email: varchar(320)
- password: varchar(255) - for email/password auth
- loginMethod: varchar(64)
- role: enum (admin, employee, customer, supplier, courier)
- status: enum (pending_approval, active, rejected, deactivated)
- phone, companyName, address
- permissions: jsonb
- timestamps
```

## Changes Needed for Email/Password Auth

### Remove Clerk

1. **main.tsx** - Remove ClerkProvider
2. **ProtectedRoute.tsx** - Replace Clerk hooks with custom auth
3. **DashboardLayout.tsx** - Replace Clerk hooks with custom auth
4. **LandingPage.tsx** - Replace Clerk SignIn with custom login form
5. **package.json** - Remove @clerk/clerk-react, @clerk/backend

### Add Email/Password Auth

1. **Backend**
   - Add bcrypt for password hashing
   - Add login endpoint: `auth.login(email, password)`
   - Update `createSessionToken` to work with email/password
   - Keep existing JWT session mechanism

2. **Frontend**
   - Create AuthContext for global auth state
   - Create LoginPage with email/password form
   - Update ProtectedRoute to use AuthContext
   - Update DashboardLayout to use AuthContext

3. **User Management**
   - Settings page already has staff management
   - Add password field when creating users
   - Admin can set initial password for users
