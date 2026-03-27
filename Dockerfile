# Build all
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY app ./app
RUN bun install --frozen-lockfile && bun run build

# API Runtime
FROM oven/bun:1-alpine as api
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/app/api ./app/api

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --eval "await fetch('http://localhost:3000/')" || exit 1
CMD ["bun", "run", "start:api"]

# Web Runtime (Nginx serves static files from dist/)
FROM nginx:1-alpine as web
COPY --from=builder /app/app/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
