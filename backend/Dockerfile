# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps

# Instalar dependências do sistema necessárias
RUN apk add --no-cache wget

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar somente dependências de produção de forma reprodutível
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime

RUN apk add --no-cache wget

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --chown=node:node . .

RUN mkdir -p /app/data && chown -R node:node /app

USER node

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3001/health || exit 1

# Comando para iniciar
CMD ["node", "src/server.mjs"]
