import express from 'express';
import { query } from '../../database/init.mjs';
import { authenticate } from '../middleware/auth.mjs';
import { decrypt } from '../../services/encryption.mjs';
import { listLlmProviders, isLlmType } from '../../services/llm/providers.mjs';
import { chatComplete } from '../../services/llm/client.mjs';
import { listTasks, getTask } from '../../services/llm/tasks.mjs';

const router = express.Router();
router.use(authenticate);

// Campos do lead que uma tarefa pode gravar (whitelist de segurança)
const SAVEABLE_FIELDS = new Set(['diagnostico', 'mensagem_whatsapp', 'mensagem_whatsapp_followup']);

// GET /api/ai/providers - Catálogo de provedores de LLM
router.get('/providers', (req, res) => {
  res.json({ providers: listLlmProviders() });
});

// GET /api/ai/tasks - Catálogo de tarefas que a IA pode executar
router.get('/tasks', (req, res) => {
  res.json({ tasks: listTasks() });
});

// GET /api/ai/status - Há credencial de IA ativa? Quais?
router.get('/status', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, type, model, status, used_today, daily_limit
       FROM credentials
       WHERE user_id = $1 AND category = 'llm'
       ORDER BY status = 'active' DESC, used_today ASC`,
      [req.user.id]
    );

    const credentials = result.rows;
    const enabled = credentials.some((c) => c.status === 'active');

    res.json({ enabled, credentials });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/run - Executa uma tarefa de IA para um lead
router.post('/run', async (req, res, next) => {
  try {
    const { leadId, taskId, credentialId, apply = false } = req.body;

    if (!leadId || !taskId) {
      return res.status(400).json({ error: 'leadId e taskId são obrigatórios' });
    }

    const task = getTask(taskId);
    if (!task) {
      return res.status(400).json({ error: 'Tarefa de IA desconhecida' });
    }

    // Seleciona a credencial de IA (a informada, ou a primeira ativa com menor uso)
    let credQuery;
    let credParams;
    if (credentialId) {
      credQuery = `SELECT * FROM credentials WHERE id = $1 AND user_id = $2 AND category = 'llm'`;
      credParams = [credentialId, req.user.id];
    } else {
      credQuery = `SELECT * FROM credentials
                   WHERE user_id = $1 AND category = 'llm' AND status = 'active'
                   ORDER BY used_today ASC, last_used_at ASC NULLS FIRST
                   LIMIT 1`;
      credParams = [req.user.id];
    }

    const credResult = await query(credQuery, credParams);
    if (credResult.rows.length === 0) {
      return res.status(400).json({
        error: 'no_llm_credential',
        message:
          'Nenhuma credencial de IA ativa. Cadastre uma em Credenciais (aba Inteligência Artificial) para usar o assistente. Sem IA, o sistema continua usando a geração automática por regras.',
      });
    }

    const credential = credResult.rows[0];

    if (!isLlmType(credential.type)) {
      return res.status(400).json({ error: 'Credencial informada não é de IA' });
    }
    if (credential.status !== 'active') {
      return res.status(400).json({ error: `Credencial de IA está ${credential.status}` });
    }
    if (credential.used_today >= credential.daily_limit) {
      await query('UPDATE credentials SET status = $1 WHERE id = $2', ['limit_reached', credential.id]);
      return res.status(429).json({ error: `Limite diário da credencial de IA atingido (${credential.used_today}/${credential.daily_limit})` });
    }

    // Carrega o lead
    const leadResult = await query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', [leadId, req.user.id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }
    const lead = leadResult.rows[0];

    const apiKey = decrypt(credential.api_key_encrypted);
    if (!apiKey) {
      return res.status(500).json({ error: 'Erro ao descriptografar a chave de IA' });
    }

    // Executa a chamada ao LLM
    const text = await chatComplete(credential, apiKey, {
      system: task.system,
      user: task.buildUser(lead),
    });

    if (!text) {
      return res.status(502).json({ error: 'A IA não retornou conteúdo. Tente novamente.' });
    }

    // Contabiliza 1 requisição na credencial
    await query(
      `UPDATE credentials
       SET used_today = used_today + 1, used_month = used_month + 1,
           last_used_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [credential.id]
    );
    await query(
      `INSERT INTO credential_usage (credential_id, date, requests_count)
       VALUES ($1, CURRENT_DATE, 1)
       ON CONFLICT (credential_id, date)
       DO UPDATE SET requests_count = credential_usage.requests_count + 1`,
      [credential.id]
    );

    // Aplica ao lead, se solicitado e a tarefa tiver campo de destino
    let applied = false;
    if (apply && task.savesTo && SAVEABLE_FIELDS.has(task.savesTo)) {
      await query(`UPDATE leads SET ${task.savesTo} = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`, [
        text,
        leadId,
        req.user.id,
      ]);
      await query(
        `INSERT INTO lead_followups (lead_id, user_id, tipo, mensagem)
         VALUES ($1, $2, 'nota', $3)`,
        [leadId, req.user.id, `[IA/${credential.type}] Campo "${task.savesTo}" atualizado pela tarefa "${task.label}".`]
      );
      applied = true;
    }

    res.json({
      text,
      task: task.id,
      savesTo: task.savesTo,
      applied,
      provider: credential.type,
      model: credential.model,
      credentialId: credential.id,
    });
  } catch (error) {
    // Erros do provedor de IA voltam como 502 com a mensagem original
    if (/retornou \d{3}/.test(error.message)) {
      return res.status(502).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
