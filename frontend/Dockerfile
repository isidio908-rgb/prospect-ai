# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Vite "bakes" VITE_* variables into the JS bundle at build time (not
# runtime), so it must be passed as a build ARG, not a container env var.
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Build app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check (usa 127.0.0.1 em vez de localhost: em alguns ambientes
# "localhost" resolve para ::1 e o wget falha mesmo com o nginx respondendo
# normalmente em IPv4). Timeout/retries generosos porque o wget do BusyBox
# (única versão disponível na imagem nginx:alpine) é sensível a contenção
# momentânea de recursos no host.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=5 \
  CMD wget --quiet --tries=1 --timeout=5 --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
