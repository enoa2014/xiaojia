# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WeChat Mini Program called "小家服务管理小程序" (Xiaojia Service Management Mini Program) - a care service management system for managing patients, tenancies, services, activities, and statistics. The system uses WeChat Mini Program frontend with Tencent Cloud Backend (CloudBase).

### Architecture

- **Frontend**: Native WeChat Mini Program (JavaScript + WXML/WXSS)
- **Backend**: TypeScript Cloud Functions on Tencent CloudBase
- **Database**: Tencent Cloud NoSQL Database
- **Storage**: Tencent Cloud Object Storage (COS)
- **Environment**: Single production environment `cloud1-3grb87gwaba26b64`

## Common Development Commands

### Build and Development

```bash
# Install dependencies for all cloud functions
pnpm i
pnpm -r --filter ./functions/* i

# Build all cloud functions
pnpm run build:functions

# Initialize database (first time only)
pnpm run init:db

# Deploy specific cloud functions
pnpm run deploy:patients
pnpm run deploy:services
pnpm run deploy:activities
pnpm run deploy:registrations
pnpm run deploy:stats
pnpm run deploy:permissions
pnpm run deploy:users
pnpm run deploy:exports
pnpm run deploy:tenancies

# Deploy all functions at once
pnpm run deploy:all

# Generate source tree documentation
pnpm run docs:source-tree
```

### Data Import

Two methods for importing data from Excel files:

**Method A: Local Scripts**
```bash
# Place b.xlsx in scripts/data/b.xlsx
python scripts/convert_b_xlsx.py --in scripts/data/b.xlsx --out scripts/out
tcb database import --env cloud1-3grb87gwaba26b64 --collection Patients --file scripts/out/patients.jsonl
tcb database import --env cloud1-3grb87gwaba26b64 --collection Tenancies --file scripts/out/tenancies.jsonl
```

**Method B: Cloud Function**
```bash
pnpm run deploy:importxlsx
wx cloud callFunction --name import-xlsx --data '{"action":"fromCos","payload":{"fileID":"<fileID>"}}'
```

### Prerequisites

- Node.js LTS + pnpm
- WeChat Developer Tools
- Tencent CloudBase CLI: `npm i -g @cloudbase/cli`
- Login to CloudBase: `tcb login`

## Code Architecture

### Frontend Structure (/miniprogram)

```
miniprogram/
├── app.js                 # App initialization, cloud environment setup
├── app.json               # App configuration, pages registration
├── app.wxss               # Global styles
├── pages/                 # Page components
│   ├── index/             # Homepage/dashboard
│   ├── patients/          # Patient management (list, detail, form, search)
│   ├── services/          # Service records (list, form)
│   ├── activities/        # Activities management
│   ├── stats/             # Statistics and reports
│   └── tenancies/         # Tenancy management (form)
└── services/
    ├── api.js             # Unified API calling interface
    └── upload.js          # File upload utilities
```

### Backend Structure (/functions)

Each cloud function follows the same pattern:
- `index.ts` - Main entry point with action-based routing
- `schema.ts` - Zod validation schemas
- `package.json` - Dependencies and build scripts
- `tsup.config.ts` - TypeScript build configuration

**Cloud Functions:**
- `patients` - Patient records management
- `tenancies` - Housing/tenancy management  
- `services` - Service records
- `activities` - Activities and event management
- `registrations` - Activity registrations
- `stats` - Statistics and reporting
- `permissions` - Permission requests and approvals
- `users` - User management and RBAC
- `exports` - Data export functionality
- `import-xlsx` - Excel data import
- `init-db` - Database initialization

### Database Collections

- **Patients** - Patient/family records with unique ID validation
- **Tenancies** - Check-in/check-out records
- **Services** - Service provision records
- **Activities** - Events and activities
- **Registrations** - Activity sign-ups
- **Users** - User accounts and roles
- **PermissionRequests** - Field-level permission requests
- **Stats** - Aggregated statistics
- **ExportTasks** - Async export job queue
- **AuditLogs** - Operation audit trail

### API Pattern

All cloud functions follow a unified pattern:

```typescript
export const main = async (event: any): Promise<Resp<any>> => {
  const { action, payload } = event || {}
  switch (action) {
    case 'list': return listItems(event)
    case 'get': return getItem(event)
    case 'create': return createItem(event)
    // ... other actions
  }
}

type Resp<T> = { ok: true; data: T } | { ok: false; error: { code: string; msg: string; details?: any } }
```

Frontend calls functions via:
```javascript
const result = await wx.cloud.callFunction({
  name: 'patients',
  data: { action: 'list', payload: { page: 1 } }
})
```

## Key Development Guidelines

### Cloud Function Development

1. Each function uses TypeScript with `tsup` for building
2. All input validation uses Zod schemas
3. Unified error handling with standard error codes (E_AUTH, E_PERM, E_VALIDATE, etc.)
4. All functions return standardized response format `{ ok: boolean, data?, error? }`
5. Build output goes to `dist/` directory for deployment

### Frontend Development

1. Native WeChat Mini Program APIs only (no external frameworks)
2. Cloud environment hardcoded to `cloud1-3grb87gwaba26b64`
3. Unified API calling through `/services/api.js`
4. Error handling maps backend error codes to user-friendly messages

### Deployment

- Single environment deployment (no dev/staging separation)
- All functions deploy to the same CloudBase environment
- Use TCB CLI for deployment with environment ID `cloud1-3grb87gwaba26b64`

### Documentation

- Comprehensive architecture documentation in `/docs/architecture/`
- API documentation in `/docs/api/`
- Product requirements in `/docs/prd/`
- User stories and backlogs in `/docs/backlog/`

## Testing

The system includes test cases in `/docs/testing/cases/` and quality assurance gates in `/docs/qa/gates/`. No automated testing framework is currently configured.