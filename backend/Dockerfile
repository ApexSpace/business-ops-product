### Build stage
FROM node:22.12-bookworm-slim AS build

WORKDIR /app

# Needed for native deps (e.g. bcrypt) and Prisma engines
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Use pnpm via Corepack (matches package.json "packageManager")
RUN corepack enable

# Install deps first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# Generate Prisma client (also done via postinstall locally, but explicit here)
RUN pnpm run db:generate

# Remove devDependencies to keep runtime lean (keeps generated Prisma client)
RUN pnpm prune --prod

### Runtime stage
FROM node:22.12-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
