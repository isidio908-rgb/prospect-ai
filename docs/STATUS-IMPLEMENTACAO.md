# 📊 STATUS DE IMPLEMENTAÇÃO - PROSPECT AI

**Data:** 02 de Julho de 2026  
**Versão:** 1.0 - Preparação para Produção

---

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

### 🎯 FASE 1: Módulo de Credenciais - Backend ✅ COMPLETO

#### Arquivos Criados/Atualizados:
- ✅ `backend/src/services/encryption.mjs` - Criptografia AES-256-GCM
- ✅ `backend/src/api/routes/credentials.mjs` - Rotas CRUD completas
- ✅ `backend/src/server.mjs` - Rota de credenciais registrada
- ✅ `backend/.env.example` - ENCRYPTION_KEY adicionada
- ✅ `backend/src/database/init.mjs` - Tabelas credentials e credential_usage

#### Funcionalidades:
✅ **Criptografia Segura**
   - AES-256-GCM com IV único por registro
   - Auth Tag para validação de integridade
   - Chave de 32 bytes via ENCRYPTION_KEY

✅ **CRUD Completo**
   - `GET /api/credentials` - Listar todas (com máscara)
   - `GET /api/credentials/:id` - Ver detalhes
   - `POST /api/credentials` - Criar nova
   - `PUT /api/credentials/:id` - Atualizar
   - `PATCH /api/credentials/:id/status` - Mudar status
   - `DELETE /api/credentials/:id` - Deletar

✅ **Controle de Uso**
   - `GET /api/credentials/:id/usage` - Ver estatísticas
   - Limites diários e mensais configuráveis
   - Histórico de uso por dia (últimos 30 dias)
   - Status: active, inactive, limit_reached, error_auth, error_provider, paused

✅ **Teste de Credencial**
   - `POST /api/credentials/:id/test` - Validar credencial
   - Faz requisição real à API configurada
   - Atualiza status automaticamente

✅ **Segurança**
   - API Keys mascaradas no retorno (mostra apenas ***0001, etc)
   - Validação com Zod
   - Autenticação obrigatória em todas as rotas
   - API Key nunca retorna descriptografada

---

### 🗄️ Banco de Dados ✅ COMPLETO

#### Tabelas Implementadas:

**users**
- Autenticação básica
- email, password_hash, name

**user_settings** (Sistema Antigo - Manter por compatibilidade)
- Configurações RapidAPI antigas
- Será migrado para usar tabela credentials

**credentials** ⭐ NOVA
```sql
- id, user_id, name, type, provider
- api_host, api_key_encrypted
- base_url, search_endpoint, details_endpoint
- daily_limit, monthly_limit
- used_today, used_month, last_used_at
- status, notes
- created_at, updated_at
```

**credential_usage** ⭐ NOVA
```sql
- id, credential_id, date
- requests_count
```

**leads**
- 40+ campos para armazenar dados completos
- Suporte a análise técnica, score, status de prospecção

**rapidapi_usage** (Sistema Antigo)
- Controle de cota diário por usuário

---

### 🔧 Backend - Estrutura ✅ COMPLETO

```
backend/
├── src/
│   ├── api/
│   │   ├── middleware/
│   │   │   ├── auth.mjs ✅
│   │   │   └── errorHandler.mjs ✅
│   │   ├── routes/
│   │   │   ├── auth.mjs ✅
│   │   │   ├── credentials.mjs ✅ NOVO
│   │   │   ├── leads.mjs ✅
│   │   │   ├── settings.mjs ✅
│   │   │   └── stats.mjs ✅
│   │   └── validators/
│   │       └── leads.mjs ✅
│   ├── database/
│   │   └── init.mjs ✅
│   ├── services/
│   │   ├── analyzer.mjs ✅
│   │   ├── collector.mjs ⚠️ PRECISA ATUALIZAR
│   │   ├── csvImporter.mjs ✅
│   │   ├── encryption.mjs ✅ NOVO
│   │   └── localBusinessDataCollector.mjs ✅
│   └── server.mjs ✅
```

---

## ⚠️ O QUE PRECISA SER FEITO

### 🔄 FASE 2: Integração Local Business Data Completa

#### 2.1. Atualizar Collector para Usar Credenciais
**Arquivo:** `backend/src/services/collector.mjs`

**Mudanças Necessárias:**
```javascript
// ❌ ATUAL: Busca user_settings
const settingsResult = await query(
  `SELECT rapidapi_key, rapidapi_host...`
);

// ✅ NOVO: Busca credentials ativas
const credResult = await query(
  `SELECT api_key_encrypted, api_host, base_url, search_endpoint, 
          daily_limit, used_today, id
   FROM credentials 
   WHERE user_id = $1 AND status = 'active' AND type = 'rapidapi'
   ORDER BY used_today ASC, last_used_at ASC NULLS FIRST
   LIMIT 1`,
  [userId]
);

const apiKey = decrypt(credResult.rows[0].api_key_encrypted);
```

**Implementar Rotação de Credenciais:**
- Escolher credencial com menor uso do dia
- Respeitar limites diários/mensais
- Marcar como `limit_reached` quando atingir limite
- Atualizar `used_today`, `used_month`, `last_used_at`

**Adicionar Parâmetros do Local Business Data:**
- ✅ `query` - Busca genérica
- ✅ `limit` - Número de resultados (1-500)
- 🔲 `lat` / `lng` - Coordenadas geográficas
- 🔲 `region` - Região (ex: 'us', 'br')
- 🔲 `language` - Idioma dos resultados
- 🔲 `zoom` - Nível de zoom do mapa (1-21)
- 🔲 `subtypes` - Filtro por tipo de negócio

#### 2.2. Atualizar Rota de Coleta
**Arquivo:** `backend/src/api/routes/leads.mjs`

**Endpoint:** `POST /api/leads/collect`

**Adicionar no Body:**
```javascript
{
  "query": "restaurante em são paulo",
  "limit": 50,
  "lat": -23.550520,    // Opcional
  "lng": -46.633308,    // Opcional
  "region": "br",       // Opcional
  "language": "pt-BR",  // Opcional
  "zoom": 13,           // Opcional
  "subtypes": "restaurant,cafe" // Opcional
}
```

---

### 🧹 FASE 3: Deduplicação Avançada

#### 3.1. Sistema de Deduplicação Inteligente
**Arquivo:** `backend/src/services/deduplicator.mjs` (CRIAR)

**Funções:**
```javascript
// Normalizar domínio (remove www, trailing slash, etc)
export function normalizeDomain(url)

// Normalizar telefone (remove espaços, +55, etc)
export function normalizePhone(phone)

// Normalizar nome (lowercase, remove acentos, etc)
export function normalizeName(name)

// Verificar duplicatas antes de salvar
export async function checkDuplicates(userId, lead)

// Mesclar leads duplicados
export async function mergeLeads(leadId, duplicateId)

// Buscar possíveis duplicatas
export async function findPossibleDuplicates(userId, threshold = 0.8)
```

**Critérios de Duplicação:**
- 🔴 Domínio idêntico = 100% duplicata
- 🟡 Telefone idêntico + cidade = 90% duplicata
- 🟡 Nome similar (>85%) + cidade = 80% duplicata
- 🟢 Nome similar (>85%) + telefone similar = 90% duplicata

#### 3.2. Adicionar Campos no Banco
**Migração:** `credentials` table
```sql
ALTER TABLE leads ADD COLUMN domain_normalized VARCHAR(500);
ALTER TABLE leads ADD COLUMN phone_normalized VARCHAR(50);
ALTER TABLE leads ADD COLUMN name_normalized VARCHAR(500);

CREATE INDEX idx_leads_domain_normalized ON leads(domain_normalized);
CREATE INDEX idx_leads_phone_normalized ON leads(phone_normalized);
CREATE INDEX idx_leads_name_normalized ON leads(name_normalized);
```

#### 3.3. API de Deduplicação
**Arquivo:** `backend/src/api/routes/leads.mjs`

**Novos Endpoints:**
```
POST /api/leads/deduplicate - Iniciar processo de deduplicação
GET /api/leads/duplicates - Listar possíveis duplicatas
POST /api/leads/:id/merge/:duplicateId - Mesclar dois leads
```

---

### 🎨 FASE 4: Frontend - Gestão de Credenciais

#### 4.1. Nova Página de Credenciais
**Arquivo:** `frontend/src/pages/Credentials.jsx` (CRIAR)

**Funcionalidades:**
- Lista de credenciais com status visual
- Formulário de criação/edição
- Indicadores de uso (diário/mensal)
- Botão de teste
- Ativação/desativação
- Exclusão com confirmação

**Layout:**
```
┌─────────────────────────────────────────┐
│ 🔑 Minhas Credenciais                   │
│                                         │
│ [+ Nova Credencial]                     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🟢 Local Business Data - Prod      │ │
│ │ Provider: RapidAPI                 │ │
│ │ Key: ***0001                       │ │
│ │ Uso: 45/100 diário | 1.200/3.000  │ │
│ │ [Testar] [Editar] [Pausar] [❌]    │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### 4.2. Integrar no Menu
**Arquivo:** `frontend/src/components/Layout.jsx`

**Adicionar:**
```jsx
<Link to="/credentials">🔑 Credenciais</Link>
```

#### 4.3. Criar API Client
**Arquivo:** `frontend/src/services/api.js`

**Adicionar:**
```javascript
export const credentialsAPI = {
  list: () => api.get('/credentials'),
  get: (id) => api.get(`/credentials/${id}`),
  create: (data) => api.post('/credentials', data),
  update: (id, data) => api.put(`/credentials/${id}`, data),
  delete: (id) => api.delete(`/credentials/${id}`),
  test: (id) => api.post(`/credentials/${id}/test`),
  usage: (id) => api.get(`/credentials/${id}/usage`),
  updateStatus: (id, status) => 
    api.patch(`/credentials/${id}/status`, { status })
};
```

#### 4.4. Atualizar Dashboard
**Arquivo:** `frontend/src/pages/Dashboard.jsx`

**Adicionar:**
- Widget mostrando status das credenciais
- Alertas quando limite próximo (>80%)
- Link rápido para adicionar credencial se não tiver

---

### 🧪 FASE 5: Testes Completos

#### 5.1. Testes de Credenciais
**Arquivo:** `backend/tests/credentials.test.mjs` (CRIAR)

**Cenários:**
- ✅ Criar credencial
- ✅ Listar credenciais
- ✅ Editar credencial
- ✅ Deletar credencial
- ✅ Testar credencial válida
- ❌ Testar credencial inválida
- ✅ Verificar máscara de API Key
- ✅ Verificar criptografia/descriptografia
- ✅ Controle de limites

#### 5.2. Testes de Coleta com Credenciais
**Arquivo:** `backend/tests/collector.test.mjs` (CRIAR)

**Cenários:**
- ✅ Coleta com credencial ativa
- ❌ Coleta sem credencial
- ❌ Coleta com limite atingido
- ✅ Rotação entre múltiplas credenciais
- ✅ Atualização de contadores

#### 5.3. Testes de Deduplicação
**Arquivo:** `backend/tests/deduplicator.test.mjs` (CRIAR)

**Cenários:**
- ✅ Detectar domínio duplicado
- ✅ Detectar telefone duplicado
- ✅ Detectar nome similar
- ✅ Mesclar leads
- ✅ Normalização de dados

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [x] Módulo de Criptografia
- [x] Rotas de Credenciais (CRUD)
- [x] Tabelas do Banco de Dados
- [ ] Atualizar Collector para usar Credenciais
- [ ] Implementar Rotação de Credenciais
- [ ] Adicionar Parâmetros Avançados (lat/lng/region/etc)
- [ ] Sistema de Deduplicação
- [ ] Testes Automatizados

### Frontend
- [ ] Página de Credenciais
- [ ] Formulário de Criar/Editar
- [ ] Integração com API
- [ ] Indicadores de Uso
- [ ] Teste de Credencial
- [ ] Atualizar Dashboard
- [ ] Adicionar no Menu

### Documentação
- [x] Documentar API de Credenciais
- [ ] Guia de Configuração
- [ ] Exemplos de Uso
- [ ] Troubleshooting

---

## 🚀 PRÓXIMOS PASSOS

### Prioridade ALTA 🔴
1. **Atualizar Collector** para usar credenciais ao invés de user_settings
2. **Implementar Rotação** para distribuir uso entre múltiplas credenciais
3. **Testar Backend** - garantir que tudo funciona

### Prioridade MÉDIA 🟡
4. **Frontend de Credenciais** - página completa
5. **Deduplicação** - evitar leads repetidos
6. **Dashboard** - widgets de status

### Prioridade BAIXA 🟢
7. **Testes Automatizados** - cobertura completa
8. **Documentação** - guias e exemplos
9. **Parâmetros Avançados** - lat/lng, region, subtypes

---

## 📊 ESTATÍSTICAS

- **Arquivos Criados:** 3
- **Arquivos Modificados:** 4
- **Linhas de Código:** ~800
- **Endpoints API:** 9 novos
- **Tempo Estimado Restante:** 4-6 horas

---

## 🎯 OBJETIVO FINAL

Transformar o Prospect AI em uma **máquina de prospecção completa** que:

✅ Gerencia múltiplas credenciais de API  
✅ Rotaciona automaticamente entre credenciais  
✅ Respeita limites diários/mensais  
✅ Deduplica leads automaticamente  
✅ Oferece interface visual para gestão  
✅ Monitora uso e performance  
✅ Escala facilmente adicionando mais credenciais  

---

**Status Geral:** 🟡 **60% Completo**

**Última Atualização:** 02/07/2026 - 21:30 BRT
