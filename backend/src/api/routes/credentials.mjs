import express from 'express';
import { z } from 'zod';
import { query } from '../../database/init.mjs';
import { authenticate } from '../middleware/auth.mjs';
import { encrypt, decrypt, maskApiKey } from '../../services/encryption.mjs';
import { listProviders, getProvider } from '../../services/scrapers/providers.mjs';
import { testCredentialByType } from '../../services/scraperCollector.mjs';

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticate);

// Schema de validação. `type` deve ser um provedor de scraper suportado.
const credentialSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  type: z.enum(['rapidapi', 'apify', 'serper']),
  provider: z.string().optional(),
  api_host: z.string().optional(),
  api_key: z.string().min(10, 'API Key inválida'),
  base_url: z.string().url('URL base inválida').optional(),
  search_endpoint: z.string().optional(),
  details_endpoint: z.string().optional(),
  daily_limit: z.number().int().positive().default(100),
  monthly_limit: z.number().int().positive().default(3000),
  notes: z.string().optional()
});

// GET /api/credentials/providers - Catálogo de provedores de scraper suportados
// (DEVE VIR ANTES DE /:id para não ser capturado pela rota de detalhes)
router.get('/providers', (req, res) => {
  res.json({ providers: listProviders() });
});

// GET /api/credentials - Listar todas as credenciais do usuário
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT 
        id, name, type, provider, api_host, base_url, 
        search_endpoint, details_endpoint, daily_limit, monthly_limit,
        used_today, used_month, last_used_at, status, notes, created_at,
        api_key_encrypted
       FROM credentials 
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Adicionar máscara real da API key (baseada na chave verdadeira, nunca no ID)
    const credentials = result.rows.map(({ api_key_encrypted, ...cred }) => ({
      ...cred,
      api_key_masked: maskApiKey(decrypt(api_key_encrypted)),
      api_key_exists: true
    }));

    res.json({ credentials });
  } catch (error) {
    next(error);
  }
});

// GET /api/credentials/:id - Detalhes de uma credencial
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT 
        id, name, type, provider, api_host, base_url,
        search_endpoint, details_endpoint, daily_limit, monthly_limit,
        used_today, used_month, last_used_at, status, notes, created_at,
        api_key_encrypted
       FROM credentials 
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }

    const { api_key_encrypted, ...credential } = result.rows[0];
    credential.api_key_masked = maskApiKey(decrypt(api_key_encrypted));
    credential.api_key_exists = true;

    res.json({ credential });
  } catch (error) {
    next(error);
  }
});

// POST /api/credentials - Criar nova credencial
router.post('/', async (req, res, next) => {
  try {
    const data = credentialSchema.parse(req.body);
    
    // Criptografar API Key
    const encryptedKey = encrypt(data.api_key);
    
    const result = await query(
      `INSERT INTO credentials (
        user_id, name, type, provider, api_host, api_key_encrypted,
        base_url, search_endpoint, details_endpoint, daily_limit, monthly_limit, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, name, type, provider, status, created_at`,
      [
        req.user.id,
        data.name,
        data.type,
        data.provider || null,
        data.api_host || null,
        encryptedKey,
        data.base_url || null,
        data.search_endpoint || '/search',
        data.details_endpoint || null,
        data.daily_limit,
        data.monthly_limit,
        data.notes || null
      ]
    );

    res.status(201).json({
      message: 'Credencial criada com sucesso',
      credential: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/credentials/:id - Atualizar credencial
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    // Verificar se existe
    const existing = await query(
      'SELECT id FROM credentials WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.api_key) {
      updates.push(`api_key_encrypted = $${paramIndex++}`);
      values.push(encrypt(data.api_key));
    }

    if (data.provider !== undefined) {
      updates.push(`provider = $${paramIndex++}`);
      values.push(data.provider);
    }

    if (data.api_host !== undefined) {
      updates.push(`api_host = $${paramIndex++}`);
      values.push(data.api_host);
    }

    if (data.base_url !== undefined) {
      updates.push(`base_url = $${paramIndex++}`);
      values.push(data.base_url);
    }

    if (data.search_endpoint !== undefined) {
      updates.push(`search_endpoint = $${paramIndex++}`);
      values.push(data.search_endpoint);
    }

    if (data.daily_limit !== undefined) {
      updates.push(`daily_limit = $${paramIndex++}`);
      values.push(data.daily_limit);
    }

    if (data.monthly_limit !== undefined) {
      updates.push(`monthly_limit = $${paramIndex++}`);
      values.push(data.monthly_limit);
    }

    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(id, req.user.id);

      await query(
        `UPDATE credentials SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
        values
      );
    }

    res.json({ message: 'Credencial atualizada com sucesso' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/credentials/:id/status - Alterar status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'inactive', 'limit_reached', 'error_auth', 'error_provider', 'paused'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const result = await query(
      `UPDATE credentials 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id`,
      [status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/credentials/:id - Deletar credencial
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM credentials WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }

    res.json({ message: 'Credencial deletada com sucesso' });
  } catch (error) {
    next(error);
  }
});

// GET /api/credentials/:id/usage - Ver uso da credencial
router.get('/:id/usage', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscar credencial
    const credResult = await query(
      `SELECT daily_limit, monthly_limit, used_today, used_month, last_used_at
       FROM credentials 
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (credResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }

    const cred = credResult.rows[0];

    // Buscar histórico dos últimos 30 dias
    const historyResult = await query(
      `SELECT date, requests_count
       FROM credential_usage
       WHERE credential_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY date DESC`,
      [id]
    );

    res.json({
      daily: {
        limit: cred.daily_limit,
        used: cred.used_today,
        remaining: cred.daily_limit - cred.used_today,
        percent: Math.round((cred.used_today / cred.daily_limit) * 100)
      },
      monthly: {
        limit: cred.monthly_limit,
        used: cred.used_month,
        remaining: cred.monthly_limit - cred.used_month,
        percent: Math.round((cred.used_month / cred.monthly_limit) * 100)
      },
      lastUsed: cred.last_used_at,
      history: historyResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/credentials/:id/test - Testar credencial
router.post('/:id/test', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Buscar credencial
    const result = await query(
      `SELECT type, api_key_encrypted, api_host, base_url, search_endpoint
       FROM credentials
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credencial não encontrada' });
    }

    const cred = result.rows[0];
    const apiKey = decrypt(cred.api_key_encrypted);

    if (!apiKey) {
      return res.status(500).json({ error: 'Erro ao descriptografar API Key' });
    }

    // Teste específico por provedor (RapidAPI, Apify, Serper)
    const { success, statusCode } = await testCredentialByType(cred.type, apiKey, cred);

    // Atualizar status da credencial
    const newStatus = success ? 'active' : 'error_auth';

    await query(
      'UPDATE credentials SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, id]
    );

    res.json({
      success,
      statusCode,
      message: success ? 'Credencial válida!' : 'Falha na autenticação',
      status: newStatus
    });
  } catch (error) {
    await query(
      'UPDATE credentials SET status = $1, updated_at = NOW() WHERE id = $2',
      ['error_provider', req.params.id]
    );
    
    res.status(500).json({
      success: false,
      message: 'Erro ao testar credencial',
      error: error.message
    });
  }
});

export default router;
