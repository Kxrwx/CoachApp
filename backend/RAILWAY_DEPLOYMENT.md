# Railway Deployment Guide

## 📋 Prerequisites

1. Railway account (https://railway.app)
2. Project created in Railway dashboard
3. GitHub repository connected to Railway

## 🚀 Deployment Steps

### Step 1: Connect GitHub Repository
1. Go to Railway dashboard
2. Click "New Project" → "Deploy from GitHub"
3. Select your CoachApp repository
4. Railway auto-detects the Dockerfile

### Step 2: Create PostgreSQL Service
1. In Railway project, click "Add"
2. Select "PostgreSQL"
3. A database will be created automatically
4. Railway injects `DATABASE_URL` env var

### Step 3: Configure Environment Variables

Go to "Variables" tab and add:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=<your_32_char_secret>
STRAVA_CLIENT_ID=<your_strava_id>
STRAVA_CLIENT_SECRET=<your_strava_secret>
STRAVA_REDIRECT_URI=https://<railway_domain>/auth/strava/callback
R2_ENDPOINT=<your_r2_endpoint>
R2_ACCESS_KEY_ID=<your_r2_key>
R2_SECRET_ACCESS_KEY=<your_r2_secret>
R2_BUCKET_NAME=<your_bucket>
SENTRY_DSN=<your_sentry_dsn>
SENTRY_ENVIRONMENT=production
POSTHOG_API_KEY=<your_posthog_key>
FRONTEND_URL=https://<your_frontend_domain>
```

**Note**: `DATABASE_URL` is auto-injected by Railway PostgreSQL service.

### Step 4: Deploy

```bash
# Just push to GitHub
git push origin main

# Railway automatically:
# 1. Detects changes
# 2. Builds Docker image
# 3. Runs migrations
# 4. Deploys to production
```

## 🔍 Monitoring

### Health Check
```bash
curl https://<your-app>.railway.app/health
```

### Logs
View logs in Railway dashboard:
- All HTTP requests logged with Pino
- Errors tracked by Sentry
- Events tracked by PostHog

### Metrics
- **Sentry**: Error tracking, performance profiling
- **PostHog**: User analytics, feature usage
- **Railway**: CPU, memory, disk usage

## ⚠️ Common Issues

### Database Connection Error
```
Error: connect ECONNREFUSED
```
**Solution**: Ensure `DATABASE_URL` is set in Railway variables

### Strava Callback Fails
```
Error: redirect_uri_mismatch
```
**Solution**: Update Strava OAuth app with correct `STRAVA_REDIRECT_URI`

### Rate Limiting Issues
```
429 Too Many Requests
```
**Expected behavior** - Rate limiting is working. Each IP gets 100 req/minute.

## 📊 First Production Checklist

- [ ] Database migrations ran (check Railway logs)
- [ ] Health endpoint responds 200
- [ ] Frontend can connect (CORS whitelist working)
- [ ] Strava linking works
- [ ] File uploads work
- [ ] Sentry receiving errors
- [ ] PostHog tracking events
- [ ] Logs visible in Pino format

## 🔄 Zero-Downtime Deployments

Railway supports zero-downtime deployments:
1. New container starts
2. Health check passes
3. Old container receives SIGTERM
4. In-flight requests complete (30s timeout)
5. Old container exits

This is automatic - no configuration needed!

## 💾 Database Backups

Railway PostgreSQL includes:
- Automatic daily backups (7-day retention)
- Manual backup option in dashboard
- Point-in-time recovery available

## 🎯 Next Steps

1. **Monitor production** for first 24 hours
2. **Track user behavior** via PostHog
3. **Fix errors** reported in Sentry
4. **Scale** if needed (Railway supports horizontal scaling)

---

**Deployed!** 🎉

Your CoachApp backend is now running on Railway with:
- Auto-scaling
- Zero-downtime deployments
- Error tracking
- Analytics
- Structured logging
- Health monitoring
