# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Copier les manifests
COPY package*.json ./

# Installer toutes les dépendances (y compris dev)
RUN npm ci

# Copier le code source ET le dossier prisma
COPY . .

# ⚠️ CRUCIAL : Générer le client Prisma avant de compiler
RUN npx prisma generate

# Compiler TypeScript (crée le dossier /dist)
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Installer dumb-init
RUN apk add --no-cache dumb-init

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copier les manifests
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --omit=dev && npm cache clean --force

# ⚠️ CRUCIAL : Copier le schéma Prisma et regénérer le client pour la prod
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

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