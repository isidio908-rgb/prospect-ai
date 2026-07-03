# 📡 Prospect AI - Documentação Completa da API

**Versão:** 1.0.0  
**Base URL:** `http://localhost:3001`  
**Autenticação:** JWT Bearer Token

---

## 📋 Índice

1. [Autenticação](#autenticação)
2. [Credenciais](#credenciais)
3. [Leads](#leads)
4. [CRM (status, follow-up)](#crm)
5. [Estatísticas](#estatísticas)
6. [Códigos de Status](#códigos-de-status)
7. [Exemplos de Uso](#exemplos-de-uso)

---

## 🔐 Autenticação

Todas as rotas, exceto `/health`, `/api/auth/register` e `/api/auth/login`, requerem autenticação via JWT.

Inclua o token no header:
```
Authorization: Bearer seu-token-aqui
```

### POST `/api/auth/register`
Criar nova conta.

**Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

**Response 201:**
```json
{
  "message": "Conta criada com sucesso",
  "user": {
    "id": 1,
    "email": "usuario@email.com",
    "name": "Nome do Usuário"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### POST `/api/auth/login`
Fazer login.

**Body:**
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Response 200:**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "email": "usuario@email.com",
    "name": "Nome do Usuário"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### GET `/api/auth/me`
Dados do usuário logado.

**Headers:**
```
Authorization: Bearer token
```

**Response 200:**
```json
{
  "user": {
    "id": 1,
    "email": "usuario@email.com",
    "name": "Nome do Usuário"
  }
}
```

---

## 🔑 Credenciais

### GET `/api/credentials`
Listar credenciais do usuário. A API key nunca é retornada em texto puro,
apenas mascarada (4 primeiros + 4 últimos caracteres da chave real).

**Headers:**
```
Authorization: Bearer token
```

**Response 200:**
```json
{
  "credentials": [
    {
      "id": 1,
      "name": "RapidAPI - Local Business Data",
      "type": "rapidapi",
      "provider": "letscrape_local_business_data",
      "api_host": "local-business-data.p.rapidapi.com",
      "base_url": "https://local-business-data.p.rapidapi.com",
      "search_endpoint": "/search",
      "daily_limit": 100,
      "monthly_limit": 3000,
      "used_today": 5,
      "used_month": 120,
      "last_used_at": "2026-07-02T20:15:00.000Z",
      "status": "active",
      "api_key_masked": "abcd...7890",
      "api_key_exists": true
    }
  ]
}
```

---

### POST `/api/credentials`
Criar credencial. A chave é criptografada (AES-256-GCM) antes de ser salva.

**Headers:**
```
Authorization: Bearer token
```

**Body:**
```json
{
  "name": "RapidAPI - Local Business Data",
  "type": "rapidapi",
  "provider": "letscrape_local_business_data",
  "api_host": "local-business-data.p.rapidapi.com",
  "api_key": "sua-chave-real",
  "base_url": "https://local-business-data.p.rapidapi.com",
  "search_endpoint": "/search",
  "daily_limit": 100,
  "monthly_limit": 3000
}
```

**Response 201:**
```json
{
  "message": "Credencial criada com sucesso",
  "credential": { "id": 1, "name": "...", "status": "active" }
}
```

---

### GET `/api/credentials/:id/usage`
Ver uso diário/mensal e histórico dos últimos 30 dias.

**Response 200:**
```json
{
  "daily": { "limit": 100, "used": 5, "remaining": 95, "percent": 5 },
  "monthly": { "limit": 3000, "used": 120, "remaining": 2880, "percent": 4 },
  "lastUsed": "2026-07-02T20:15:00.000Z",
  "history": [{ "date": "2026-07-02", "requests_count": 5 }]
}
```

---

### POST `/api/credentials/:id/test`
Testa a credencial com uma requisição real (limit=1) e atualiza o status
(`active` ou `error_auth`) de acordo com o resultado.

---

## 📊 Leads

### GET `/api/leads`
Listar todos os leads com filtros e paginação.

**Headers:**
```
Authorization: Bearer token
```

**Query Params:**
- `page` (number, default: 1) - Página atual
- `limit` (number, default: 20, max: 100) - Itens por página
- `status` (string) - Filtrar por status
- `prioridade` (string) - Filtrar por prioridade
- `cidade` (string) - Filtrar por cidade
- `nicho` (string) - Filtrar por nicho
- `search` (string) - Busca em nome, site, telefone
- `sortBy` (string: score|created_at|nome_empresa|prioridade) - Ordenar por
- `sortOrder` (string: ASC|DESC) - Ordem

**Exemplo:**
```
GET /api/leads?page=1&limit=20&prioridade=Alta&sortBy=score&sortOrder=DESC
```

**Response 200:**
```json
{
  "leads": [
    {
      "id": 1,
      "nome_empresa": "Empresa ABC",
      "site": "https://empresa.com",
      "telefone": "65999999999",
      "cidade": "Cuiaba",
      "nicho": "imobiliarias",
      "score": 85,
      "prioridade": "Alta",
      "status": "novo",
      "tem_pixel_meta": false,
      "tem_gtm": false,
      "data_coleta": "2026-07-02T21:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### GET `/api/leads/:id`
Buscar detalhes completos de um lead.

**Headers:**
```
Authorization: Bearer token
```

**Response 200:**
```json
{
  "lead": {
    "id": 1,
    "nome_empresa": "Empresa ABC",
    "site": "https://empresa.com",
    "site_final": "https://empresa.com/",
    "status_site": "online",
    "tempo_carregamento_ms": 150,
    "tamanho_kb": "2.5",
    "score": 85,
    "prioridade": "Alta",
    "oportunidades": "Nao encontrei Pixel da Meta | Nao encontrei GTM",
    "pontos_positivos": "Possui formulario | WhatsApp aparece no site",
    "diagnostico": "Empresa ABC recebeu score 85/100...",
    "mensagem_whatsapp": "Ola, tudo bem? Estava analisando empresas...",
    "tem_pixel_meta": false,
    "tem_gtm": false,
    "tem_ga4": true,
    "tem_whatsapp_site": true,
    "instagram": "https://instagram.com/empresa",
    "facebook": "",
    "data_coleta": "2026-07-02T21:00:00.000Z",
    "data_analise": "2026-07-02T21:05:00.000Z"
  }
}
```

---

### POST `/api/leads/import`
Importar um lead manualmente.

**Headers:**
```
Authorization: Bearer token
```

**Body:**
```json
{
  "nome_empresa": "Empresa Nova",
  "site": "https://empresanova.com",
  "telefone": "65999999999",
  "cidade": "Cuiaba",
  "nicho": "imobiliarias",
  "categoria": "Imobiliaria",
  "fonte": "manual",
  "observacoes": "Lead interessante"
}
```

**Response 201:**
```json
{
  "message": "Lead importado com sucesso",
  "lead": {
    "id": 10,
    "nome_empresa": "Empresa Nova",
    "site": "https://empresanova.com",
    "cidade": "Cuiaba",
    "nicho": "imobiliarias"
  }
}
```

---

### POST `/api/leads/import-csv`
Importar múltiplos leads via CSV.

**Headers:**
```
Authorization: Bearer token
```

**Body:**
```json
{
  "csvContent": "nome_empresa,site,telefone,cidade,nicho\nEmpresa 1,https://site1.com,65911111111,Cuiaba,imobiliarias\nEmpresa 2,https://site2.com,65922222222,Cuiaba,clinicas"
}
```

**Formato CSV aceito:**
```csv
nome_empresa,site,telefone,cidade,nicho,categoria,fonte,observacoes
Empresa ABC,https://site.com,65999999999,Cuiaba,imobiliarias,Imobiliaria,csv,Obs
```

**Variações aceitas nos headers:**
- `nome_empresa`, `empresa`, `nome`, `name`
- `site`, `website`, `url`
- `telefone`, `phone`, `whatsapp`
- `cidade`, `city`
- `nicho`, `niche`
- `categoria`, `category`
- `fonte`, `source`
- `observacoes`, `observações`, `notes`, `obs`

**Response 200:**
```json
{
  "message": "Importação concluída",
  "summary": {
    "total": 10,
    "imported": 8,
    "duplicates": 1,
    "errors": 1
  },
  "imported": [
    {
      "id": 11,
      "nome_empresa": "Empresa 1",
      "site": "https://site1.com",
      "cidade": "Cuiaba"
    }
  ],
  "duplicates": [
    {
      "line": 3,
      "empresa": "Empresa Duplicada",
      "existing_id": 5
    }
  ],
  "errors": [
    {
      "line": 5,
      "error": "Nome da empresa é obrigatório",
      "data": "..."
    }
  ]
}
```

---

### GET `/api/leads/export`
Exportar leads para CSV.

**Headers:**
```
Authorization: Bearer token
```

**Query Params (filtros opcionais):**
- `status` - Filtrar por status
- `prioridade` - Filtrar por prioridade
- `cidade` - Filtrar por cidade
- `nicho` - Filtrar por nicho
- `minScore` - Score mínimo

**Exemplo:**
```
GET /api/leads/export?prioridade=Alta&minScore=60
```

**Response 200:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="leads-export-2026-07-02.csv"

nome_empresa,site,telefone,cidade,score,prioridade,...
Empresa ABC,https://site.com,65999999999,Cuiaba,85,Alta,...
```

---

### POST `/api/leads/collect`
Coletar leads via RapidAPI.

**Headers:**
```
Authorization: Bearer token
```

**Body:**
```json
{
  "query": "imobiliarias Cuiaba",
  "city": "Cuiaba",
  "niche": "imobiliarias",
  "limit": 20
}
```

**Obs:** Requer configurações RapidAPI salvas previamente.

**Response 200:**
```json
{
  "message": "Coleta concluída",
  "total": 20,
  "saved": 18,
  "errors": 2,
  "quota": {
    "used": 6,
    "limit": 100,
    "remaining": 94
  },
  "leads": [
    {
      "id": 20,
      "nome_empresa": "Imobiliaria XYZ",
      "site": "https://xyz.com",
      "cidade": "Cuiaba"
    }
  ]
}
```

---

### POST `/api/leads/analyze`
Analisar leads (auditoria + score + mensagens).

**Headers:**
```
Authorization: Bearer token
```

**Body:**
```json
{
  "leadIds": [1, 2, 3, 4, 5]
}
```

**Response 200:**
```json
{
  "message": "Análise concluída",
  "total": 5,
  "successful": 4,
  "failed": 1,
  "results": [
    {
      "id": 1,
      "nome_empresa": "Empresa ABC",
      "score": 85,
      "prioridade": "Alta",
      "success": true
    },
    {
      "id": 2,
      "nome_empresa": "Empresa XYZ",
      "success": false,
      "error": "Site inacessível"
    }
  ]
}
```

**O que é analisado:**
- ✅ Status do site (online/offline)
- ✅ Tempo de carregamento
- ✅ Tamanho da página
- ✅ Meta Pixel (Facebook)
- ✅ Google Tag Manager
- ✅ Google Analytics 4
- ✅ Google Ads Tag
- ✅ WhatsApp links
- ✅ Formulários de contato
- ✅ HTTPS
- ✅ Instagram e Facebook links
- ✅ Emails e telefones no site
- ✅ Score de oportunidade (0-100)
- ✅ Priorização automática
- ✅ Diagnóstico personalizado
- ✅ Mensagem WhatsApp pronta

---

### PATCH `/api/leads/:id`
Atualizar lead (status e campos de CRM). Quando `status` muda, um registro é
criado automaticamente em `lead_followups` (histórico de mudanças).

**Headers:**
```
Authorization: Bearer token
```

**Body:**
```json
{
  "status": "contato_enviado",
  "observacoes": "Enviado mensagem no WhatsApp",
  "data_contato": "2026-07-02T21:30:00.000Z",
  "responsavel": "Gestor Teste",
  "proxima_acao": "Ligar em 2 dias",
  "data_proxima_acao": "2026-07-05T14:00:00.000Z",
  "valor_potencial": 2500.50,
  "motivo_perda": "Já tem agência"
}
```

Todos os campos são opcionais; envie apenas os que deseja atualizar.

**Status permitidos (CRM interno, seção 11 da spec):**
- `novo`
- `analisado`
- `mensagem_pronta`
- `contato_enviado`
- `respondeu`
- `reuniao_marcada`
- `proposta_enviada`
- `cliente_fechado`
- `sem_interesse`
- `nao_respondeu`

**Response 200:**
```json
{
  "message": "Lead atualizado com sucesso"
}
```

---

### DELETE `/api/leads/:id`
Deletar um lead.

**Headers:**
```
Authorization: Bearer token
```

**Response 200:**
```json
{
  "message": "Lead deletado com sucesso"
}
```

---

## 🗂️ CRM

### GET `/api/leads/:id/followups`
Histórico de follow-up do lead: toda mudança de status é registrada
automaticamente (`tipo: "status_change"`), além de notas manuais
(`tipo: "nota"`).

**Response 200:**
```json
{
  "followups": [
    {
      "id": 5,
      "tipo": "nota",
      "status_anterior": "cliente_fechado",
      "status_novo": "cliente_fechado",
      "mensagem": "Cliente pediu retorno na sexta",
      "created_at": "2026-07-03T05:29:10.000Z"
    },
    {
      "id": 4,
      "tipo": "status_change",
      "status_anterior": "reuniao_marcada",
      "status_novo": "cliente_fechado",
      "mensagem": null,
      "created_at": "2026-07-03T05:28:50.000Z"
    }
  ]
}
```

---

### POST `/api/leads/:id/followups`
Adiciona uma nota manual de follow-up (não altera o status do lead).

**Body:**
```json
{ "mensagem": "Cliente pediu retorno na sexta" }
```

**Response 201:**
```json
{
  "message": "Follow-up registrado",
  "followup": {
    "id": 5,
    "tipo": "nota",
    "status_anterior": "cliente_fechado",
    "status_novo": "cliente_fechado",
    "mensagem": "Cliente pediu retorno na sexta",
    "created_at": "2026-07-03T05:29:10.000Z"
  }
}
```

---

## 📈 Estatísticas

### GET `/api/stats`
Estatísticas gerais do dashboard.

**Headers:**
```
Authorization: Bearer token
```

**Response 200:**
```json
{
  "total": 150,
  "porPrioridade": {
    "Alta": 45,
    "Media": 60,
    "Baixa": 30,
    "Prioridade maxima": 15
  },
  "porStatus": {
    "novo": 80,
    "analisado": 40,
    "contato_enviado": 20,
    "cliente_fechado": 10
  },
  "topCidades": [
    { "cidade": "Cuiaba", "count": 50 },
    { "cidade": "Goiania", "count": 30 }
  ],
  "topNichos": [
    { "nicho": "imobiliarias", "count": 40 },
    { "nicho": "clinicas", "count": 25 }
  ],
  "score": {
    "medio": "72.5",
    "minimo": 30,
    "maximo": 95
  },
  "analisados": 100,
  "naoAnalisados": 50,
  "comOportunidades": 90,
  "presenca": {
    "semSite": 55,
    "comSite": 95,
    "comTelefone": 120,
    "semPixel": 70,
    "semGtm": 65,
    "semGa4": 68,
    "semWhatsappSite": 40
  },
  "funil": {
    "contatoEnviado": 20,
    "respondeu": 12,
    "reuniaoMarcada": 6,
    "propostaEnviada": 4,
    "clienteFechado": 10,
    "semInteresse": 8,
    "naoRespondeu": 15,
    "taxaResposta": 61.9,
    "valorFechado": 32000
  }
}
```

---

## 🚦 Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Requisição bem sucedida |
| 201 | Created - Recurso criado com sucesso |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token ausente ou inválido |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Conflito (ex: email já existe) |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro no servidor |

---

## 💡 Exemplos de Uso

### Fluxo Completo: Prospecção End-to-End

#### 1. Criar conta e fazer login
```bash
# Registrar
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@trafego.com","password":"senha123","name":"Gestor"}'

# Login
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@trafego.com","password":"senha123"}' | jq -r '.token')
```

#### 2. Cadastrar credencial da Local Business Data
```bash
curl -X POST http://localhost:3001/api/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name":"RapidAPI - Local Business Data",
    "type":"rapidapi",
    "provider":"letscrape_local_business_data",
    "api_host":"local-business-data.p.rapidapi.com",
    "api_key":"sua-chave",
    "base_url":"https://local-business-data.p.rapidapi.com",
    "search_endpoint":"/search",
    "daily_limit":100,
    "monthly_limit":3000
  }'
```

#### 3. Coletar leads
```bash
curl -X POST http://localhost:3001/api/leads/collect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "credentialId":1,
    "query":"imobiliarias em Cuiaba, MT",
    "city":"Cuiaba",
    "niche":"imobiliarias",
    "lat":-15.6014,
    "lng":-56.0979,
    "zoom":13,
    "region":"br",
    "language":"pt",
    "limit":20
  }'
```

#### 4. Analisar leads
```bash
curl -X POST http://localhost:3001/api/leads/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"leadIds":[1,2,3,4,5]}'
```

#### 5. Ver leads com alta prioridade
```bash
curl "http://localhost:3001/api/leads?prioridade=Alta&sortBy=score&sortOrder=DESC" \
  -H "Authorization: Bearer $TOKEN"
```

#### 6. Exportar para CSV
```bash
curl "http://localhost:3001/api/leads/export?prioridade=Alta&minScore=70" \
  -H "Authorization: Bearer $TOKEN" \
  -o leads-alta-prioridade.csv
```

#### 7. Atualizar status após contato
```bash
curl -X PATCH http://localhost:3001/api/leads/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"contatado","observacoes":"Enviado no WhatsApp"}'
```

---

## 🔒 Segurança

- **Rate Limiting:** 100 requisições por IP a cada 15 minutos
- **JWT Expiração:** Tokens expiram em 7 dias
- **Senhas:** Hash com Bcrypt (10 rounds)
- **Chaves API:** Mascaradas no retorno (apenas últimos 4 chars)
- **CORS:** Configurável por ambiente
- **Helmet:** Headers de segurança ativos

---

## 🐛 Tratamento de Erros

Todos os erros retornam JSON:

```json
{
  "error": "Mensagem de erro",
  "details": "Detalhes adicionais (opcional)"
}
```

Exemplos:

```json
// 401 - Token inválido
{
  "error": "Token inválido"
}

// 400 - Validação falhou
{
  "error": "Dados inválidos",
  "details": [
    {
      "path": ["email"],
      "message": "Email inválido"
    }
  ]
}

// 404 - Not found
{
  "error": "Lead não encontrado"
}
```

---

## 📞 Suporte

- Email: suporte@prospect.ai
- Docs: `/docs`
- Health: `/health`

---

**Última atualização:** 02/07/2026  
**Versão da API:** 1.0.0
