# Use Node.js LTS (Alpine para imagem menor)
FROM node:20-alpine

# Instalar dependências do sistema necessárias
RUN apk add --no-cache wget

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3001

# Variáveis de ambiente padrão (podem ser sobrescritas)
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Comando para iniciar
CMD ["node", "src/server.mjs"]
