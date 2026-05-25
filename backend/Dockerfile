# Multi-stage build pour NestJS
# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Copier les manifests
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Compiler TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Installer dumb-init pour gérer les signaux proprement
RUN apk add --no-cache dumb-init

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copier les manifests
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev && npm cache clean --force

# Copier le code compilé depuis le builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Passer à l'utilisateur non-root
USER nestjs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

# Utiliser dumb-init pour propager les signaux
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main"]
