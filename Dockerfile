# -------- Base --------
FROM node:22-alpine AS base
RUN npm config set registry https://registry.npmmirror.com && \
    apk add --no-cache libc6-compat
WORKDIR /app

# -------- Deps --------
FROM base AS deps
# 用通配：复制 package.json 以及可能存在的 lock（package-lock.json / npm-shrinkwrap.json）
COPY package*.json ./
# 如果有 lock 用 ci，没 lock 就普通 install
RUN if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then \
    npm ci --ignore-scripts; \
    else \
    npm i --ignore-scripts; \
    fi

# -------- Build --------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && \
    if [ -d "dist" ]; then mv dist out; \
    elif [ -d "build" ]; then mv build out; \
    else echo "Build output not found (dist/ or build/)" && exit 1; fi && \
    rm -rf node_modules

# -------- Runner --------
FROM node:22-alpine AS runner
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com && \
    apk add --no-cache libc6-compat curl && \
    npm i -g serve

COPY --from=builder /app/out ./out

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:3000 >/dev/null || exit 1

CMD ["serve", "-s", "out", "-l", "3000"]
