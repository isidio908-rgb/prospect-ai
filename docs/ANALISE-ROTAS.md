# 🛣️ ANÁLISE COMPLETA DE ROTAS - Prospect AI API

**Data:** 02 de Julho de 2026  
**Objetivo:** Documentar e testar todas as rotas para evitar conflitos

---

## ⚠️ REGRAS DE ORDEM DE ROTAS NO EXPRESS

### Prioridade de Matching
O Express avalia rotas **na ordem em que são definidas**. A primeira rota que fizer match será executada.

### Conflitos Comuns
```javascript
// ❌ ERRADO - /:id captura tudo, incluindo "export"
router.get('/:id', ...)      // Match: /123, /export, /duplicates
router.get('/export', ...)   // Nunca será alcançada!

// ✅ CORRETO - Rotas específicas ANTES das genéricas
router.get('/export', ...)    // Match exato: /export
router.get('/duplicates', ...) // Match exato: /duplicates
router.get('/:id', ...)       // Match: /123, /456, etc
```

---

## 📋 ROTAS DE LEADS (/api/leads)

### Ordem Atual (✅ CORRETA)

| # | Método | Rota | Descrição | Conflito? |
|---|--------|------|-----------|-----------|
| 1 | GET | `/` | Listar todos os leads | ✅ OK |
| 2 | GET | `/export` | Exportar CSV | ✅ OK (antes de /:id) |
| 3 | GET | `/duplicates` | Encontrar duplicatas | ✅ OK (antes de /:id) |
| 4 | GET | `/:id` | Detalhes de um lead | ✅ OK (depois das específicas) |
| 5 | PATCH | `/:id` | Atualizar lead | ✅ OK |
| 6 | DELETE | `/:id` | Deletar lead | ✅ OK |
| 7 | POST | `/import` | Importar lead manual | ✅ OK |
| 8 | POST | `/import-csv` | Importar CSV em lote | ✅ OK |
| 9 | POST | `/collect` | Coletar via API | ✅ OK |
| 10 | POST | `/analyze` | Analisar leads | ✅ OK |
| 11 | POST | `/:id/merge/:duplicateId` | Mesclar dois leads | ✅ OK |
| 12 | POST | `/normalize` | Normalizar todos | ✅ OK |

### ✅ Análise: SEM CONFLITOS

**Rotas específicas que devem vir ANTES de `/:id`:**
- ✅ `/export` - CORRETO
- ✅ `/duplicates` - CORRETO

**Todas as outras rotas específicas:**
- ✅ `/import` - POST, não conflita
- ✅ `/import-csv` - POST, não conflita
- ✅ `/collect` - POST, não conflita
- ✅ `/analyze` - POST, não conflita
- ✅ `/normalize` - POST, não conflita
- ✅ `/:id/merge/:duplicateId` - Mais específico que `/:id`

---

## 🔑 ROTAS DE CREDENTIALS (/api/credentials)

### Ordem Atual (⚠️ ATENÇÃO)

| # | Método | Rota | Descrição | Conflito? |
|---|--------|------|-----------|-----------|
| 1 | GET | `/` | Listar todas | ✅ OK |
| 2 | GET | `/:id` | Detalhes de uma | ⚠️ POTENCIAL |
| 3 | POST | `/` | Criar nova | ✅ OK |
| 4 | PUT | `/:id` | Atualizar | ✅ OK |
| 5 | PATCH | `/:id/status` | Alterar status | ✅ OK (mais específica) |
| 6 | DELETE | `/:id` | Deletar | ✅ OK |
| 7 | GET | `/:id/usage` | Ver uso | ✅ OK (mais específica) |
| 8 | POST | `/:id/test` | Testar | ✅ OK (mais específica) |

### ✅ Análise: SEM CONFLITOS

**Por quê não há conflitos?**
- `/:id/usage` é mais específico que `/:id` (2 segmentos vs 1)
- `/:id/test` é mais específico que `/:id` (2 segmentos vs 1)
- `/:id/status` é mais específico que `/:id` (2 segmentos vs 1)
- Express faz match do mais específico primeiro quando tem mesmo número de segmentos base

**NOTA:** Se houvesse rotas como `/usage` ou `/test` sem ID, elas deveriam vir ANTES de `/:id`.

---

## 🧪 PLANO DE TESTES

### Leads - GET Rotas

```bash
# 1. Listar todos
GET /api/leads
Expect: 200, array de leads

# 2. Exportar CSV
GET /api/leads/export
Expect: 200, Content-Type: text/csv

# 3. Buscar duplicatas
GET /api/leads/duplicates
Expect: 200, { total, groups }

# 4. Detalhes de lead específico
GET /api/leads/5
Expect: 200, { lead: {...} }

# 5. Detalhes com ID não numérico (não deve capturar)
GET /api/leads/export  # Deve ir para rota /export
GET /api/leads/duplicates  # Deve ir para rota /duplicates
```

### Leads - POST Rotas

```bash
# 6. Importar manual
POST /api/leads/import
Body: { nome_empresa, site, ... }
Expect: 201

# 7. Importar CSV
POST /api/leads/import-csv
Body: { csvContent }
Expect: 200

# 8. Coletar da API
POST /api/leads/collect
Body: { credentialId, query, ... }
Expect: 200

# 9. Analisar leads
POST /api/leads/analyze
Body: { leadIds: [1,2,3] }
Expect: 200

# 10. Normalizar campos
POST /api/leads/normalize
Expect: 200

# 11. Mesclar leads
POST /api/leads/5/merge/6
Expect: 200
```

### Credentials - Rotas

```bash
# 12. Listar todas
GET /api/credentials
Expect: 200, { credentials: [...] }

# 13. Detalhes
GET /api/credentials/2
Expect: 200, { credential: {...} }

# 14. Uso
GET /api/credentials/2/usage
Expect: 200, { daily, monthly, history }

# 15. Criar
POST /api/credentials
Body: { name, api_key, ... }
Expect: 201

# 16. Testar
POST /api/credentials/2/test
Expect: 200, { success: true/false }

# 17. Atualizar
PUT /api/credentials/2
Body: { name, daily_limit, ... }
Expect: 200

# 18. Alterar status
PATCH /api/credentials/2/status
Body: { status: "paused" }
Expect: 200

# 19. Deletar
DELETE /api/credentials/2
Expect: 200
```

---

## 🧪 EXECUTANDO TESTES

Vou testar cada rota na ordem:
