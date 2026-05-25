# CoachApp Backend - Production Architecture

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│                    http://localhost:3001                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ CORS Whitelisted
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Railway / Docker                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          NestJS Backend API (Node.js)                │   │
│  │              Port: 3000 (0.0.0.0)                    │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  Health Check: GET /health                           │   │
│  │  Auth: POST /auth/*, GET /auth/callback             │   │
│  │  Activities: GET|POST|DELETE /activities/*          │   │
│  │  Stats: GET /stats/* (NEW sync logic)               │   │
│  │  Strava: POST /strava/link|unlink                   │   │
│  │  Upload: POST /upload, DELETE /upload/:id           │   │
│  │  Goals: GET|POST /goals/*                           │   │
│  │  Planning: GET|POST /planning/*                     │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Observability Stack                                 │   │
│  │  • Pino Logger (JSON/Pretty)                         │   │
│  │  • Sentry Error Tracking + APM                       │   │
│  │  • PostHog Analytics                                 │   │
│  │  • Request Rate Limiting (100 req/min per IP)        │   │
│  │  • CORS Whitelist (prod/dev dynamic)                 │   │
│  │  • Graceful Shutdown (dumb-init)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────┬──────────────────────────────┘
                              │
                   ┌──────────┼──────────┐
                   ↓          ↓          ↓
            ┌────────────┐ ┌────────┐ ┌──────────┐
            │ PostgreSQL │ │Strava  │ │Cloudflare│
            │ (Database) │ │(OAuth) │ │R2 (S3)   │
            └────────────┘ └────────┘ └──────────┘
```

## 🔧 Technology Stack

### Backend Framework
- **NestJS 10+** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Express.js** - HTTP adapter

### Database
- **PostgreSQL 16** - Relational database
- **Prisma ORM** - Database access layer
- **Migrations** - Schema versioning

### Authentication & Authorization
- **JWT** - Token-based auth
- **OAuth2** - Strava integration
- **Cookies** - Session persistence

### Observability
- **Pino** - Structured JSON logging
- **Sentry** - Error tracking + APM
- **PostHog** - Product analytics
- **Railway Health Checks** - Infrastructure monitoring

### Security & Performance
- **Zod** - Environment & input validation
- **@nestjs/throttler** - Rate limiting (100 req/min)
- **CORS** - Cross-origin protection
- **Helmet** - HTTP security headers (via NestJS)

### Infrastructure
- **Docker** - Containerization (Alpine Linux)
- **Railway** - Deployment platform
- **dumb-init** - Process signal handling

## 📦 File Structure

```
backend/
├── src/
│   ├── main.ts                    # Application bootstrap
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # Root routes
│   ├── app.service.ts             # Root service
│   │
│   ├── config/                    # Configuration
│   │   ├── config.service.ts      # Typed config getter
│   │   ├── config.module.ts       # Config provider
│   │   ├── env.config.ts          # Zod validation schema
│   │   ├── sentry.config.ts       # Error tracking init
│   │   └── posthog.config.ts      # Analytics init
│   │
│   ├── common/
│   │   └── guards/
│   │       └── throttler.guard.ts # Rate limiting by IP
│   │
│   ├── health/                    # Health check
│   │   ├── health.controller.ts   # GET /health
│   │   └── health.module.ts       # Module export
│   │
│   ├── auth/                      # Authentication
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts
│   │   └── auth.module.ts
│   │
│   ├── activities/                # Activity management
│   │   ├── activities.controller.ts
│   │   ├── activities.service.ts
│   │   └── activities.module.ts
│   │
│   ├── stats/                     # Statistics (NEW)
│   │   ├── stats.controller.ts
│   │   ├── stats.service.ts       # REFACTORED sync logic
│   │   └── stats.module.ts
│   │
│   ├── strava/                    # Strava integration
│   │   ├── strava.controller.ts
│   │   ├── strava.service.ts      # MODIFIED link/unlink
│   │   └── strava.module.ts
│   │
│   ├── upload/                    # File uploads (NEW)
│   │   ├── upload.controller.ts
│   │   ├── upload.service.ts      # MODIFIED stats protection
│   │   └── upload.module.ts
│   │
│   ├── r2/                        # Cloudflare R2 storage
│   │   ├── r2.controller.ts
│   │   ├── r2.service.ts
│   │   └── r2.module.ts
│   │
│   ├── goals/                     # Goal planning
│   │   ├── goals.controller.ts
│   │   ├── goals.service.ts
│   │   └── goals.module.ts
│   │
│   ├── planning/                  # Workout planning
│   │   ├── planning.controller.ts
│   │   ├── planning.service.ts
│   │   └── planning.module.ts
│   │
│   └── prisma/                    # Database service
│       ├── prisma.service.ts
│       └── prisma.module.ts
│
├── prisma/
│   └── schema.prisma              # Database schema
│
├── dist/                          # Compiled output
│
├── Dockerfile                     # Production container
├── docker-compose.yml             # Local dev orchestration
├── .dockerignore                  # Build optimization
│
├── .env.example                   # Variable template
├── .env.local                     # Local development
│
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── eslint.config.mjs              # Code linting
│
├── railway.json                   # Railway deployment config
│
├── PRODUCTION.md                  # Production overview
├── PRODUCTION_CHECKLIST.md        # V0 readiness checklist
├── RAILWAY_DEPLOYMENT.md          # Railway guide
│
└── README.md                      # Getting started
```

## 🔄 Key Workflows

### Strava Link Flow
```
1. User clicks "Link Strava"
2. Browser redirects to Strava OAuth
3. Strava redirects back with code
4. Backend: POST /auth/strava/callback { code }
5. Exchange code for access token
6. Sync user's Strava activities
7. NEW: Call stats.service.recomputeGlobalStats(userId)
   - Merges Strava activities with uploaded activities
   - Ensures no double-counting
8. Store access token in database
9. Response: { user, token }
```

### Activity Upload Flow
```
1. User uploads GPX/FIT file
2. Backend: POST /upload { file }
3. Parse distance, elevation, date from file
4. Save to R2 storage
5. Create Activity record with idStrava=null
6. NEW: Check !finalActivity?.idStrava before adding stats
   - If has idStrava: log and skip (Strava already counted)
   - If no idStrava: call stats.service.addUploadStats()
7. Response: { activity, stats }
```

### Strava Unlink Flow
```
1. User clicks "Unlink Strava"
2. Backend: POST /auth/strava/unlink
3. NEW: Call stats.service.recomputeStatsFromUploadsOnly(userId)
   - DELETE all Stats records
   - Rebuild from UploadActivity records only
4. Remove Strava access token
5. Delete StravaActivity records
6. Response: { success: true }
```

### Old Activity Deletion (>30 days)
```
1. User deletes upload >30 days old
2. Check if has idStrava (Strava link)
3. NEW: Call strava.service.doesStravaActivityExist()
   - Query Strava API within ±1h window
   - Verify activity still exists or was deleted
4. If no idStrava or not on Strava: removeUploadStats()
5. Delete Activity record
```

## 📊 Stats Table Architecture

### Before Refactor (Buggy)
```
Stats:
- ride_all: Strava only
- year_2024: Strava only
- month_2024_12: Strava only

Upload activities: Not in stats
→ Bug: Missing uploaded activities in stats
```

### After Refactor (Fixed)
```
Stats (Master table):
- ride_all: Strava + Upload
- year_2024: Strava + Upload
- month_2024_12: Strava + Upload

StravaStats (Strava-only cache):
- ride_all: Strava only
- year_2024: Strava only
- month_2024_12: Strava only

UploadActivity (Upload metadata):
- distance: Stored (NEW)
- elevation: Stored (NEW)
- date: Used for stats bucketing

On Link Strava:
  Stats = StravaStats + UploadActivity

On Unlink Strava:
  Stats = UploadActivity only

On Upload:
  Check if !idStrava → Add to Stats (avoid double-count)
```

## 🚀 Deployment Flow

### Local Development
```bash
docker-compose up
# Builds Docker image
# Starts backend + postgres
# Runs migrations
# Listens on http://localhost:3000
```

### Production on Railway
```bash
git push origin main
# Railway webhook triggered
# Detects Dockerfile
# Builds Docker image
# Deploys to production
# Runs migrations
# Health checks pass
# Traffic routed to new container
# Old container gracefully shuts down
```

## 🔒 Security Layers

1. **Input Validation** (Zod)
   - Environment variables validated at boot
   - Request payloads validated by ValidationPipe
   - Type mismatch caught early

2. **Authentication** (JWT)
   - Token issued on login
   - AuthGuard verifies signature
   - Expired tokens rejected

3. **Authorization** (Decorators)
   - @UseGuards(AuthGuard) on protected routes
   - userId extracted from token
   - Resource ownership verified

4. **Rate Limiting** (Throttler)
   - 100 requests/minute per IP
   - Returns 429 on limit exceeded
   - Prevents brute force attacks

5. **CORS** (Whitelist)
   - Production: Only whitelisted origins
   - Development: Localhost variants
   - Credentials: true (for cookies)

6. **Database** (Prisma)
   - Parameterized queries (SQL injection proof)
   - ORM handles escaping
   - Type-safe queries

## 📈 Scalability

### Horizontal Scaling
- Stateless: No server-side sessions
- JWT: Can scale to multiple instances
- Database: PostgreSQL handles connections
- Load Balancer: Railway/Vercel handles routing

### Caching (Future)
- Redis for session cache
- Prisma with caching layer
- CDN for static files

### Database Optimization (Future)
- Indexes on frequently queried fields
- Query optimization via Prisma explain()
- Connection pooling (PgBouncer)

## 🎯 Production Readiness

✅ **PRODUCTION READY FOR V0**

All components implemented:
- Stats synchronization
- Docker containerization
- Environment validation
- Structured logging
- Error tracking
- Analytics
- Health checks
- Rate limiting
- CORS protection
- Graceful shutdown
- Zero-downtime deployments
