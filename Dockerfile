# syntax=docker/dockerfile:1.7
# Многоступенчатая сборка: зависимости → сборка → маленький образ без dev-зависимостей.

FROM node:22.13-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Одноразовый контейнер: миграции и (по флагу) сид
FROM deps AS migrator
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY seed ./seed
COPY src/server/db ./src/server/db
COPY src/server/auth/password-params.ts ./src/server/auth/password-params.ts
COPY src/lib ./src/lib
COPY drizzle.config.ts tsconfig.json ./
CMD ["sh", "-c", "npm run db:migrate && if [ \"$RUN_SEED\" = \"1\" ]; then npm run db:seed; fi"]

FROM node:22.13-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/storage && chown app:app /app/storage
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
