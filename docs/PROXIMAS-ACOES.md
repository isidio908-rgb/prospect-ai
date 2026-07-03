# 🎯 PRÓXIMAS AÇÕES - PROSPECT AI

## ⚡ AÇÃO IMEDIATA #1: Atualizar Collector

### Objetivo
Fazer o `collector.mjs` usar credenciais da tabela `credentials` ao invés de `user_settings`

### Arquivo
`backend/src/services/collector.mjs`

### Mudanças Principais

#### 1. Buscar Credencial Ativa (ao invés de settings)
```javascript
// ❌ REMOVER
const settingsResult = await query(
  `SELECT rapidapi_key, rapidapi_host...`
);

// ✅ ADICIONAR
const credResult = await query(
  `SELECT 
    id, api_key_encrypted, api_host, base_url, 
    search_endpoint, daily_limit, used_today, used_month, monthly_limit
   FROM credentials 
   WHERE user_id = $1 
     AND status = 'active' 
     AND type = 'rapidapi'
     AND used_today < daily_limit 
     AND used_month < monthly_limit
   ORDER BY used_today ASC, last_used_at ASC NULLS FIRST
   LIMIT 1`,
  [userId]
);

if (credResult.rows.length === 0) {
  throw new Error('Nenhuma credencial disponível. Adicione uma credencial em Configurações > Credenciais');
}

const credential = credResult.rows[0];
const apiKey = decrypt(credential.api_key_encrypted);
```

#### 2. Construir URL Corretamente
```javascript
// Usar dados da credencial
const url = `${credential.base_url}${credential.search_endpoint}`;
const params = new URLSearchParams({
  query: searchQuery,
  limit: requestLimit,
  ...(options.lat && { lat: options.lat }),
  ...(options.lng && { lng: options.lng }),
  ...(options.region && { region: options.region }),
  ...(options.language && { language: options.language }),
  ...(options.zoom && { zoom: options.zoom }),
  ...(options.subtypes && { subtypes: options.subtypes })
});

const fullUrl = `${url}?${params.toString()}`;
```

#### 3. Atualizar Contadores da Credencial
```javascript
// Após requisição bem-sucedida
await query(
  `UPDATE credentials 
   SET used_today = used_today + 1,
       used_month = used_month + 1,
       last_used_at = NOW(),
       updated_at = NOW()
   WHERE id = $1`,
  [credential.id]
);

// Registrar no histórico
await query(
  `INSERT INTO credential_usage (credential_id, date, requests_count)
   VALUES ($1, CURRENT_DATE, 1)
   ON CONFLICT (credential_id, date) 
   DO UPDATE SET requests_count = credential_usage.requests_count + 1`,
  [credential.id]
);
```

#### 4. Tratar Limites
```javascript
// Verificar se atingiu limite após usar
const newUsedToday = credential.used_today + 1;
const newUsedMonth = credential.used_month + 1;

if (newUsedToday >= credential.daily_limit || newUsedMonth >= credential.monthly_limit) {
  await query(
    `UPDATE credentials 
     SET status = 'limit_reached', updated_at = NOW()
     WHERE id = $1`,
    [credential.id]
  );
}
```

#### 5. Importar decrypt
```javascript
import { decrypt } from './encryption.mjs';
```

---

## ⚡ AÇÃO IMEDIATA #2: Atualizar Rota de Coleta

### Arquivo
`backend/src/api/routes/leads.mjs`

### Endpoint
`POST /api/leads/collect`

### Body Schema
```javascript
const collectSchema = z.object({
  query: z.string().min(3).optional(),
  city: z.string().optional(),
  niche: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(20),
  
  // Parâmetros avançados Local Business Data
  lat: z.number().optional(),
  lng: z.number().optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  zoom: z.number().int().min(1).max(21).optional(),
  subtypes: z.string().optional()
});
```

### Passar Parâmetros para Collector
```javascript
const result = await collectLeadsFromRapidAPI(req.user.id, {
  query: data.query,
  city: data.city,
  niche: data.niche,
  limit: data.limit,
  lat: data.lat,
  lng: data.lng,
  region: data.region,
  language: data.language,
  zoom: data.zoom,
  subtypes: data.subtypes
});
```

---

## ⚡ AÇÃO IMEDIATA #3: Criar Job de Reset Diário

### Objetivo
Resetar `used_today` todo dia à meia-noite

### Arquivo
`backend/src/services/credentialScheduler.mjs` (CRIAR)

### Implementação
```javascript
import cron from 'node-cron';
import { query } from '../database/init.mjs';

export function startCredentialScheduler() {
  // Todo dia à meia-noite (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Resetando contadores diários de credenciais...');
    
    try {
      const result = await query(
        `UPDATE credentials 
         SET used_today = 0,
             status = CASE 
               WHEN status = 'limit_reached' AND used_month < monthly_limit THEN 'active'
               ELSE status
             END,
             updated_at = NOW()
         WHERE used_today > 0`
      );
      
      console.log(`✅ ${result.rowCount} credenciais resetadas`);
    } catch (error) {
      console.error('❌ Erro ao resetar credenciais:', error);
    }
  });

  // Todo dia 1º do mês à meia-noite (00:05)
  cron.schedule('5 0 1 * *', async () => {
    console.log('🔄 Resetando contadores mensais de credenciais...');
    
    try {
      const result = await query(
        `UPDATE credentials 
         SET used_month = 0,
             status = CASE 
               WHEN status = 'limit_reached' THEN 'active'
               ELSE status
             END,
             updated_at = NOW()
         WHERE used_month > 0`
      );
      
      console.log(`✅ ${result.rowCount} credenciais resetadas (mensal)`);
    } catch (error) {
      console.error('❌ Erro ao resetar credenciais (mensal):', error);
    }
  });

  console.log('⏰ Scheduler de credenciais iniciado');
}
```

### Instalar Dependência
```bash
npm install node-cron
```

### Iniciar no Server
```javascript
// backend/src/server.mjs
import { startCredentialScheduler } from './services/credentialScheduler.mjs';

async function start() {
  // ... código existente
  
  // Iniciar scheduler
  startCredentialScheduler();
  
  app.listen(PORT, () => {
    // ...
  });
}
```

---

## ⚡ AÇÃO IMEDIATA #4: Testar Tudo

### 1. Criar Credencial via API
```bash
POST http://localhost:3001/api/credentials
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Local Business Data - Prod",
  "type": "rapidapi",
  "provider": "Local Business Data",
  "api_host": "local-business-data.p.rapidapi.com",
  "api_key": "SUA_API_KEY_AQUI",
  "base_url": "https://local-business-data.p.rapidapi.com",
  "search_endpoint": "/search",
  "daily_limit": 100,
  "monthly_limit": 3000,
  "notes": "Credencial principal de produção"
}
```

### 2. Testar Credencial
```bash
POST http://localhost:3001/api/credentials/{id}/test
Authorization: Bearer {token}
```

### 3. Coletar Leads
```bash
POST http://localhost:3001/api/leads/collect
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "restaurante em são paulo",
  "limit": 10,
  "region": "br",
  "language": "pt-BR"
}
```

### 4. Verificar Uso
```bash
GET http://localhost:3001/api/credentials/{id}/usage
Authorization: Bearer {token}
```

---

## 📋 ORDEM DE EXECUÇÃO

1. ✅ **Documento criado** - STATUS-IMPLEMENTACAO.md
2. ⏭️ **Atualizar collector.mjs** (15 min)
3. ⏭️ **Atualizar rota leads.mjs** (10 min)
4. ⏭️ **Criar scheduler** (10 min)
5. ⏭️ **Instalar node-cron** (1 min)
6. ⏭️ **Testar tudo** (15 min)

**Tempo Total Estimado:** ~51 minutos

---

## 🎯 RESULTADO ESPERADO

Após essas ações:

✅ Sistema usa credenciais da tabela `credentials`  
✅ Múltiplas credenciais funcionam (rotação automática)  
✅ Limites diários/mensais são respeitados  
✅ Contadores resetam automaticamente  
✅ Parâmetros avançados disponíveis (lat/lng/etc)  
✅ Coleta de leads 100% funcional  

---

## 🚨 IMPORTANTE

⚠️ **Não esquecer de:**
- Adicionar `ENCRYPTION_KEY` no arquivo `.env`
- Instalar `node-cron`: `npm install node-cron`
- Testar com credencial real do Local Business Data
- Verificar se `decrypt()` está funcionando corretamente

---

## 💡 DICA

Para gerar uma ENCRYPTION_KEY segura:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Adicione no `.env`:
```
ENCRYPTION_KEY=a1b2c3d4e5f6...  # (64 caracteres hex)
```

---

**Criado em:** 02/07/2026  
**Status:** 📝 Pronto para Execução
