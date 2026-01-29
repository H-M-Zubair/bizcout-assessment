# CI/CD Pipeline Documentation

## Overview

This document describes the CI/CD pipeline for the HTTPBin Monitor application. The pipeline ensures code quality, test coverage, and build verification before code is merged or deployed.

**Workflow File:** `.github/workflows/ci.yml`  
**Triggers:** Push to `main` branch, Pull requests to `main`  
**Environment:** Node.js 18.x on Ubuntu Latest

---

## Pipeline Structure

The pipeline consists of **3 jobs**:

1. **Test Backend** - Validates backend code quality and functionality
2. **Test Frontend** - Validates frontend code quality and functionality  
3. **Build Applications** - Builds both applications (runs after tests pass)

---

## Job 1: Test Backend

### Steps

1. **Checkout Code** - Retrieves repository code
2. **Setup Node.js** - Configures Node.js 18.x with npm cache
3. **Install Dependencies** - `cd backend && npm ci`
4. **Run Linting** - `npm run lint` (ESLint)
   - **Configuration:** `backend/.eslintrc.js`
   - **Checks:**
     - TypeScript syntax validation
     - Unused variables/imports (error)
     - Missing return types (warning)
     - Use of `any` type (warning)
5. **Run Tests** - `npm test` (Jest)
   - **Environment:** `NODE_ENV=test`, `DB_PATH=:memory:`
   - **Test Files:**
     - `database.test.ts` - Database service unit tests
     - `ping.test.ts` - Ping service unit tests
     - `api.test.ts` - API integration tests

---

## Job 2: Test Frontend

### Steps

1. **Checkout Code** - Retrieves repository code
2. **Setup Node.js** - Configures Node.js 18.x with npm cache
3. **Install Dependencies** - `cd frontend && npm ci`
4. **Run Linting** - `npm run lint` (Next.js ESLint)
   - Checks React/Next.js best practices, TypeScript, code style
5. **Run Tests** - `npm test` (Jest)
   - **Test Files:**
     - `StatsCards.test.tsx` - Component unit tests
6. **Build Frontend** - `npm run build` (Next.js)
   - Validates TypeScript compilation, production build

---

## Job 3: Build Applications

**Dependencies:** Waits for `test-backend` and `test-frontend` to pass

### Steps

1. **Checkout Code** - Retrieves repository code
2. **Setup Node.js** - Configures Node.js 18.x with npm cache
3. **Install Dependencies** - Installs root, backend, and frontend dependencies
4. **Build Applications** - `npm run build`
   - **Backend:** `tsc` (TypeScript compilation)
   - **Frontend:** `next build` (Next.js production build)

---

## Code Quality Checks

### Backend
- **Linting:** ESLint with TypeScript rules
- **Type Checking:** TypeScript compiler
- **Unit Tests:** Database and Ping service tests
- **Integration Tests:** API endpoint tests
- **Build:** TypeScript to JavaScript compilation

### Frontend
- **Linting:** Next.js ESLint
- **Type Checking:** TypeScript compiler
- **Component Tests:** React component rendering tests
- **Build:** Next.js production build and optimization

---

## Test Coverage

### Backend Tests
- ✅ Database operations (insert, retrieve, filter, pagination, stats)
- ✅ Ping service (payload generation, success/error handling)
- ✅ API endpoints (GET/POST routes, validation, error handling)

### Frontend Tests
- ✅ Component rendering and data display
- ✅ Edge cases and error states

---

## Failure Conditions

Pipeline fails if:
- ❌ ESLint finds errors (unused vars, syntax errors, type violations)
- ❌ Any test assertion fails
- ❌ TypeScript compilation errors
- ❌ Next.js build fails
- ❌ Dependency installation fails

---

## Success Criteria

Pipeline succeeds when:
- ✅ All linting checks pass
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ Backend TypeScript compilation succeeds
- ✅ Frontend Next.js build succeeds

---

## Local Testing

### Backend
```bash
cd backend
npm ci && npm run lint && npm test && npm run build
```

### Frontend
```bash
cd frontend
npm ci && npm run lint && npm test && npm run build
```

### Both
```bash
npm ci && npm test && npm run build
```

---

## Related Files

- **Workflow:** `.github/workflows/ci.yml`
- **Backend ESLint:** `backend/.eslintrc.js`
- **Backend Jest:** `backend/jest.config.js`
- **Frontend Jest:** `frontend/jest.config.js`

---

**Last Updated:** 2026-01-29  
**Node.js Version:** 18.x
