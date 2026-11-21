# Образ приложения __APP__. Собирается из корня монорепо:
#   docker build -f apps/__APP__/Dockerfile --build-arg APP_RELEASE=$(git rev-parse HEAD) .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm fetch --frozen-lockfile
COPY . .
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile --filter "__APP__..."
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter __APP__ build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# uid 1001 — владелец env-файла на сервере (роль app_env)
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app
COPY --from=build --chown=app:app /repo/apps/__APP__/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/__APP__/.next/static ./apps/__APP__/.next/static
COPY --from=build --chown=app:app /repo/apps/__APP__/public ./apps/__APP__/public
COPY --from=build --chown=app:app /repo/apps/__APP__/migrations ./apps/__APP__/migrations
COPY --chown=app:app apps/__APP__/docker-entrypoint.sh /usr/local/bin/entrypoint
USER app
ARG APP_RELEASE=dev
ENV APP_NAME=__APP__ APP_RELEASE=${APP_RELEASE}
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint"]
CMD ["node", "apps/__APP__/server.js"]
