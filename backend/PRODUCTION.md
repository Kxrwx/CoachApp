# CoachApp Backend - Production Setup

## 📋 Checklist Production V0

### Infrastructure (✅ Done)
- [x] Dockerised avec multi-stage build (image légère)
- [x] docker-compose pour déploiement local
- [x] railway.json pour Railway
- [x] Health check endpoint `/health`
- [x] Graceful shutdown configuré

### Configuration (✅ Done)
- [x] Validation env stricte avec Zod
- [x] ConfigService pour accès centralisé
- [x] .env.example pour documentation
- [x] Variables obligatoires validées au boot

### Observabilité (✅ Done)
- [x] Logging structuré avec Pino
- [x] Sentry pour error tracking
- [x] PostHog pour analytics produit
- [x] Request tracing intégré

### Sécurité (✅ Done)
- [x] CORS whitelist propre (prod & dev)
- [x] Rate limiting avec throttler
- [x] Validation des payloads
- [x] User non-root dans Docker
- [x] Trust proxy configuré

---

## 🚀 Déploiement

### Local avec Docker Compose
```bash
cp .env.example .env
# Remplir les variables manquantes
docker-compose up
```

### Production sur Railway
```bash
# 1. Push le code
git push origin main

# 2. Railway détecte automatiquement le Dockerfile
# 3. Configurer les variables d'env via Railway dashboard
# 4. Deploy!
```

### Environnement PostgreSQL
Railway créera automatiquement la DB si tu link le service PostgreSQL.

---

## 🔧 Variables d'environnement

### Obligatoires
- `NODE_ENV` - development|production|test
- `DATABASE_URL` - PostgreSQL URL
- `JWT_SECRET` - Min 32 caractères

### Strava (pour lier les comptes)
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI`

### Cloudflare R2 (pour stocker les fichiers GPX/FIT)
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### Monitoring
- `SENTRY_DSN` - https://sentry.io
- `POSTHOG_API_KEY` - https://posthog.com

### Frontend
- `FRONTEND_URL` - Pour CORS

---

## 🎯 Endpoints Importants

```bash
# Health check (utilisé par Railway pour les deployments)
GET /health
→ { "status": "ok", "timestamp": "...", "environment": "..." }

# Auth endpoints (rate-limited)
POST /auth/signup
POST /auth/signin
```

---

## 📊 Monitoring en Production

### Sentry
- Tous les erreurs 500+ sont envoyées automatiquement
- Profiling activé (10% en prod)
- Tracing des requêtes HTTP

### PostHog
Track automatiquement :
- Signups
- Logins
- Conversions
- Feature usage
- Churn

### Pino Logs
- Format JSON structuré
- Intégration facile avec Loki, Datadog, ELK

---

## 🛡️ Security Checklist

- [x] CORS whitelist (pas de `*`)
- [x] Rate limiting (100 req/min par défaut)
- [x] Validation stricte des payloads
- [x] JWT signé
- [x] Pas de secrets en logs
- [x] User non-root dans Docker
- [x] Trust proxy configuré pour Railway

---

## 📈 Scaling

### Horizontal
- Docker image prête pour Kubernetes
- Health check pour load balancers
- Graceful shutdown pour zéro-downtime deploys

### Observabilité
- Pino logs structurés → Loki/Datadog
- Sentry pour erreurs
- PostHog pour business metrics

---

## ⚠️ Premiers pas

1. **Créer les comptes**:
   - PostgreSQL (RDS/Railway)
   - Sentry (erreurs)
   - PostHog (analytics)
   - Cloudflare R2 (fichiers)

2. **Configurer les variables** dans `railway.json`

3. **Deploy**: `git push` → Railway détecte & déploie

4. **Vérifier**: `GET https://your-app.railway.app/health`

---

## 🐛 Troubleshooting

```bash
# Logs en local
docker-compose logs -f backend

# Vérifier la build Docker
docker build -t coachapp-backend ./backend

# Tester la health check
curl http://localhost:3000/health
```

---

**Ready for V0 production!** 🎉
