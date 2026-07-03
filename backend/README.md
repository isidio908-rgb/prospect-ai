# Prospect AI - Backend API

API REST para o sistema de prospecção Prospect AI.

## 🚀 Tecnologias

- Node.js 20+
- Express.js
- PostgreSQL
- JWT para autenticação
- Bcrypt para hash de senhas
- Zod para validação
- node-cron para reset automático de cotas
- AES-256-GCM para criptografia de API Keys

## 📦 Instalação

```bash
npm install
```

## ⚙️ Configuração

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Configure as variáveis de ambiente no arquivo `.env`:
```env
DATABASE_URL=postgresql://prospect_user:prospect_pass@localhost:5432/prospect_ai
JWT_SECRET=seu-segredo-jwt-aqui
ENCRYPTION_KEY=64-caracteres-hex-para-criptografar-api-keys
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Gerar uma `ENCRYPTION_KEY` segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🗄️ Banco de Dados

O banco é inicializado automaticamente na primeira execução, criando todas as tabelas necessárias.

### Tabelas criadas:
- `users` - Usuários do sistema
- `credentials` - Credenciais de API por usuário (chave criptografada, limites, uso)
- `credential_usage` - Histórico diário de uso por credencial
- `leads` - Leads coletados e analisados

## 🏃 Executar

### Desenvolvimento (com hot reload):
```bash
npm run dev
```

### Produção:
```bash
npm start
```

A API estará disponível em `http://localhost:3001`

## 📡 Endpoints

### Autenticação
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Dados do usuário logado (requer autenticação)

### Credenciais (requer autenticação)
- `GET /api/credentials` - Listar credenciais (API key sempre mascarada)
- `GET /api/credentials/:id` - Detalhes de uma credencial
- `POST /api/credentials` - Criar credencial (chave é criptografada antes de salvar)
- `PUT /api/credentials/:id` - Atualizar credencial
- `PATCH /api/credentials/:id/status` - Ativar/pausar/desativar
- `DELETE /api/credentials/:id` - Remover credencial
- `GET /api/credentials/:id/usage` - Uso diário/mensal e histórico
- `POST /api/credentials/:id/test` - Testar credencial contra a API real

### Leads (requer autenticação)
- `GET /api/leads` - Listar leads (com filtros e paginação)
- `GET /api/leads/export` - Exportar leads em CSV
- `GET /api/leads/duplicates` - Encontrar grupos de leads duplicados
- `GET /api/leads/:id` - Detalhes de um lead
- `PATCH /api/leads/:id` - Atualizar lead (status, observações, data de contato)
- `DELETE /api/leads/:id` - Deletar lead
- `POST /api/leads/import` - Importar um lead manualmente
- `POST /api/leads/import-csv` - Importar leads em lote via CSV
- `POST /api/leads/collect` - Coletar leads via Local Business Data (RapidAPI), usando uma credencial cadastrada
- `POST /api/leads/analyze` - Auditar site, calcular score e gerar diagnóstico/mensagem de WhatsApp
- `POST /api/leads/:id/merge/:duplicateId` - Mesclar dois leads duplicados
- `POST /api/leads/normalize` - Recalcular campos normalizados (domínio/telefone/nome) para deduplicação

### Estatísticas (requer autenticação)
- `GET /api/stats` - Estatísticas gerais (total, por prioridade, por status, top cidades/nichos, score médio)

### Health Check
- `GET /health` - Verificar status da API

## 🔒 Autenticação

A API usa JWT (JSON Web Tokens) para autenticação.

Após fazer login, inclua o token no header das requisições:
```
Authorization: Bearer seu-token-aqui
```

## 🔑 Credenciais de API (RapidAPI / Local Business Data)

As credenciais NÃO ficam em variáveis de ambiente do backend. Cada usuário
cadastra suas próprias chaves via `/api/credentials` (ou pela tela
"Credenciais" no frontend), e elas são:

- Criptografadas com AES-256-GCM antes de ir para o banco (`api_key_encrypted`).
- Nunca retornadas em texto puro pela API — apenas mascaradas (`abcd...7890`).
- Controladas por limite diário/mensal, com reset automático (scheduler
  `node-cron`: diário à meia-noite, mensal no dia 1º).
- Escolhidas automaticamente por rotação: ao coletar, o sistema usa a
  credencial ativa com menor uso no dia.

Campos principais de uma credencial: `name`, `type`, `provider`, `api_host`,
`base_url`, `search_endpoint`, `daily_limit`, `monthly_limit`, `status`, `notes`.

## 📊 Exemplo de Uso

### 1. Criar conta
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"senha123","name":"Seu Nome"}'
```

### 2. Fazer login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"senha123"}'
```

### 3. Cadastrar credencial da Local Business Data
```bash
curl -X POST http://localhost:3001/api/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -d '{
    "name": "RapidAPI - Local Business Data",
    "type": "rapidapi",
    "provider": "letscrape_local_business_data",
    "api_host": "local-business-data.p.rapidapi.com",
    "api_key": "sua-chave-real",
    "base_url": "https://local-business-data.p.rapidapi.com",
    "search_endpoint": "/search",
    "daily_limit": 100,
    "monthly_limit": 3000
  }'
```

### 4. Coletar leads
```bash
curl -X POST http://localhost:3001/api/leads/collect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-token" \
  -d '{
    "credentialId": 1,
    "query": "imobiliarias em Cuiaba, MT",
    "city": "Cuiaba",
    "niche": "imobiliarias",
    "lat": -15.6014,
    "lng": -56.0979,
    "zoom": 13,
    "region": "br",
    "language": "pt",
    "limit": 20
  }'
```

### 5. Ver estatísticas
```bash
curl -X GET http://localhost:3001/api/stats \
  -H "Authorization: Bearer seu-token"
```

## 🐛 Debug

Para ver logs detalhados das queries SQL, defina `NODE_ENV=development` no `.env`.
Os logs de query nunca incluem os parâmetros (evita logar API keys ou senhas).

## 🧪 Testes

```bash
npm test
```

## 📝 TODO

- [ ] Segundo estágio da mensagem de WhatsApp (pós-resposta positiva)
- [ ] Diagnóstico com tom mais comercial (menos técnico)
- [ ] Score considerando rating/review_count e categoria de alto ticket
- [ ] Status de CRM completo (pipeline comercial, seção 11 da spec)
- [ ] Dashboard avançado (taxa de resposta, reuniões, propostas)
- [ ] Documentação Swagger/OpenAPI
