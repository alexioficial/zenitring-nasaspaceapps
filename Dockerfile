FROM oven/bun:1.3.14 AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["bun", "run", "dev"]

FROM dependencies AS build
COPY . .
RUN bun run check && bun run build

FROM base AS production-dependencies
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile --ignore-scripts

FROM base AS production
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=production-dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/build ./build
COPY --chown=bun:bun package.json ./
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]
