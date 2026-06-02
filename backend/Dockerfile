### Build stage
FROM node:22.12-bookworm-slim AS build

WORKDIR /app

# Needed for native deps (e.g. bcrypt) and Prisma engines
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm explicitly (avoids Corepack signature/key issues in CI)
RUN npm install -g pnpm@9.15.0

# Install deps first (better layer caching)
COPY package.json pnpm-lock.yaml ./
# Prisma runs during postinstall ("prisma generate"), so schema must exist before pnpm install
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# Generate Prisma client (also done via postinstall locally, but explicit here)
RUN pnpm run db:generate

# Remove devDependencies to keep runtime lean.
# Pruning re-runs lifecycle scripts; skip them because `prisma` is a devDependency.
RUN pnpm prune --prod --ignore-scripts

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

# Some Nest builds output `dist/main.js`, others `dist/src/main.js` depending on config.
CMD ["sh", "-c", "node dist/main.js || node dist/src/main.js"]
