# Build from the repo root: docker build -f apps/api/Dockerfile .
# One image, two deployment units: compose runs it as `api` (dist/main.js)
# and as `worker` (dist/worker.main.js).
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
# --ignore-scripts: prisma's postinstall needs the schema, copied below
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @delivery-hub/api exec prisma generate \
  && pnpm --filter @delivery-hub/shared build \
  && pnpm --filter @delivery-hub/api build

FROM node:22-slim
RUN corepack enable
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo ./
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
