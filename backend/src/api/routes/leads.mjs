import express from 'express';
import { query } from '../../database/init.mjs';
import { authenticate } from '../middleware/auth.mjs';
import { importLeadsFromCSV, exportLeadsToCSV, exportLeadsToJSON } from '../../services/csvImporter.mjs';
import {
  findAllDuplicates,
  mergeLeads,
  normalizeAllLeads,
  updateNormalizedFields
} from '../../services/deduplicator.mjs';
import {
  addCollectionRunLog,
  buildCollectionCacheKey,
  createCollectionRun,
  finishCollectionRun,
  getCollectionCache,
  saveCollectionCache
} from '../../services/collectionRunService.mjs';
import { updateLeadSchema } from '../validators/leads.mjs';
import { recordAuditEvent } from '../../services/tenancy.mjs';
import { assertBillingLimit } from '../../services/billing.mjs';

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticate);

// GET /api/leads - Listar todos os leads (com filtros e paginação)
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      prioridade,
      cidade,
      nicho,
      search,
      sortBy = 'score',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    let whereConditions = ['user_id = $1'];
    let params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      whereConditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (prioridade) {
      whereConditions.push(`prioridade = $${paramIndex++}`);
      params.push(prioridade);
    }

    if (cidade) {
      whereConditions.push(`LOWER(cidade) = LOWER($${paramIndex++})`);
      params.push(cidade);
    }

    if (nicho) {
      whereConditions.push(`LOWER(nicho) = LOWER($${paramIndex++})`);
      params.push(nicho);
    }

    if (search) {
      whereConditions.push(`(
        LOWER(nome_empresa) LIKE LOWER($${paramIndex}) OR
        LOWER(site) LIKE LOWER($${paramIndex}) OR
        LOWER(telefone) LIKE LOWER($${paramIndex})
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');
    const allowedSortColumns = ['score', 'created_at', 'nome_empresa', 'prioridade'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'score';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM leads WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    params.push(limit, offset);
    const result = await query(
      `SELECT
        id, nome_empresa, site, telefone, whatsapp, email,
        cidade, bairro, nicho, categoria, fonte,
        score, prioridade, status,
        tem_pixel_meta, tem_gtm, tem_ga4, tem_whatsapp_site,
        proxima_acao, responsavel, valor_potencial,
        whatsapp_instance_id,
        data_coleta, data_analise, observacoes
       FROM leads
       WHERE ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    res.json({
      leads: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/export - Exportar leads para CSV (DEVE VIR ANTES DE /:id)
router.get('/export', async (req, res, next) => {
  try {
    const { status, prioridade, cidade, nicho, minScore } = req.query;

    const csv = await exportLeadsToCSV(req.user.id, {
      status,
      prioridade,
      cidade,
      nicho,
      minScore: minScore ? parseInt(minScore) : undefined
    });

    if (!csv) {
      return res.status(404).json({
        error: 'Nenhum lead encontrado com os filtros especificados'
      });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `leads-export-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/export-json - Exportar leads para JSON (DEVE VIR ANTES DE /:id)
router.get('/export-json', async (req, res, next) => {
  try {
    const { status, prioridade, cidade, nicho, minScore } = req.query;

    const exportedLeads = await exportLeadsToJSON(req.user.id, {
      status,
      prioridade,
      cidade,
      nicho,
      minScore: minScore ? parseInt(minScore) : undefined
    });

    if (exportedLeads.length === 0) {
      return res.status(404).json({
        error: 'Nenhum lead encontrado com os filtros especificados'
      });
    }

    const exportedAt = new Date().toISOString();
    const timestamp = exportedAt.replace(/[:.]/g, '-');
    const filename = `leads-export-${timestamp}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify({
      exportedAt,
      total: exportedLeads.length,
      leads: exportedLeads
    }, null, 2));
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/duplicates - Encontrar leads duplicados (DEVE VIR ANTES DE /:id)
router.get('/duplicates', async (req, res, next) => {
  try {
    const { threshold = 0.85, limit = 100 } = req.query;

    const duplicateGroups = await findAllDuplicates(req.user.id, {
      threshold: parseFloat(threshold),
      limit: parseInt(limit)
    });

    res.json({
      total: duplicateGroups.length,
      groups: duplicateGroups.map(group => ({
        count: group.length,
        leads: group.map(l => ({
          id: l.id,
          nome_empresa: l.nome_empresa,
          site: l.site,
          telefone: l.telefone,
          cidade: l.cidade
        }))
      }))
    });
  } catch (error) {
    next(error);
  }
});

const KANBAN_STAGES = [
  { id: 'novo', title: 'Novo' },
  { id: 'coletado', title: 'Coletado' },
  { id: 'qualificado', title: 'Qualificado' },
  { id: 'primeira_mensagem', title: 'Primeira mensagem' },
  { id: 'respondeu', title: 'Respondeu' },
  { id: 'followup', title: 'Follow-up' },
  { id: 'reuniao', title: 'Reuniao' },
  { id: 'ganho', title: 'Ganho' },
  { id: 'perdido', title: 'Perdido' },
];

function mapLeadToKanbanStage(lead) {
  if (lead.status === 'cliente_fechado') return 'ganho';
  if (['sem_interesse', 'nao_respondeu'].includes(lead.status)) return 'perdido';
  if (lead.status === 'reuniao_marcada') return 'reuniao';
  if (lead.status === 'respondeu') return 'respondeu';
  if (
    lead.status === 'contato_enviado'
    && ['followup_1', 'followup_2'].includes(lead.latest_message_type)
  ) {
    return 'followup';
  }
  if (['mensagem_pronta', 'contato_enviado'].includes(lead.status)) return 'primeira_mensagem';
  if (lead.status === 'analisado') return 'qualificado';
  if (lead.fonte || lead.data_coleta) return 'coletado';
  return 'novo';
}

function isLeadOverdue(lead) {
  if (lead.data_proxima_acao && new Date(lead.data_proxima_acao) < new Date()) return true;
  if (!lead.last_sent_at || ['cliente_fechado', 'sem_interesse', 'reuniao_marcada'].includes(lead.status)) return false;
  const sentAt = new Date(lead.last_sent_at).getTime();
  return Number.isFinite(sentAt) && Date.now() - sentAt > 48 * 60 * 60 * 1000 && !lead.last_received_at;
}

// GET /api/leads/kanban - Visão Kanban 2.0 para operação BDR/SDR
router.get('/kanban', async (req, res, next) => {
  try {
    const {
      cidade,
      nicho,
      responsavel,
      status,
      search,
      whatsapp_instance_id: whatsappInstanceId,
      reply_status: replyStatus,
      limit = 300,
    } = req.query;

    const where = ['l.user_id = $1'];
    const params = [req.user.id];
    let paramIndex = 2;

    if (cidade) {
      where.push(`LOWER(l.cidade) = LOWER($${paramIndex++})`);
      params.push(cidade);
    }

    if (nicho) {
      where.push(`LOWER(l.nicho) = LOWER($${paramIndex++})`);
      params.push(nicho);
    }

    if (responsavel) {
      where.push(`LOWER(COALESCE(l.responsavel, '')) = LOWER($${paramIndex++})`);
      params.push(responsavel);
    }

    if (status) {
      where.push(`l.status = $${paramIndex++}`);
      params.push(status);
    }

    if (whatsappInstanceId) {
      where.push(`l.whatsapp_instance_id = $${paramIndex++}`);
      params.push(Number(whatsappInstanceId));
    }

    if (search) {
      where.push(`(
        LOWER(l.nome_empresa) LIKE LOWER($${paramIndex})
        OR LOWER(COALESCE(l.telefone, '')) LIKE LOWER($${paramIndex})
        OR LOWER(COALESCE(l.site, '')) LIKE LOWER($${paramIndex})
      )`);
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    if (replyStatus === 'has_reply') {
      where.push('reply_meta.last_received_at IS NOT NULL');
    } else if (replyStatus === 'needs_human') {
      where.push('COALESCE(sdr_meta.escalation_required, FALSE) = TRUE');
    } else if (replyStatus === 'no_reply') {
      where.push('reply_meta.last_received_at IS NULL');
    }

    const safeLimit = Math.min(Math.max(Number(limit || 300), 1), 500);
    params.push(safeLimit);

    const result = await query(
      `SELECT
        l.id, l.nome_empresa, l.site, l.telefone, l.whatsapp, l.email,
        l.cidade, l.nicho, l.categoria, l.fonte, l.score, l.prioridade, l.status,
        l.proxima_acao, l.responsavel, l.valor_potencial, l.data_proxima_acao,
        l.whatsapp_instance_id, l.data_coleta, l.created_at, l.updated_at,
        wi.label as whatsapp_instance_label,
        wi.phone_number as whatsapp_instance_phone,
        wi.status as whatsapp_instance_status,
        reply_meta.last_received_at,
        reply_meta.reply_count,
        sent_meta.last_sent_at,
        queue_meta.latest_message_type,
        sdr_meta.escalation_required as sdr_escalation_required,
        sdr_meta.decision as sdr_decision,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(l.data_coleta, l.created_at))) / 86400)::int as age_days
       FROM leads l
       LEFT JOIN whatsapp_instances wi ON wi.id = l.whatsapp_instance_id AND wi.user_id = l.user_id
       LEFT JOIN LATERAL (
         SELECT MAX(created_at) as last_received_at, COUNT(*)::int as reply_count
         FROM whatsapp_messages wm
         WHERE wm.user_id = l.user_id AND wm.lead_id = l.id AND wm.direction = 'received'
       ) reply_meta ON TRUE
       LEFT JOIN LATERAL (
         SELECT MAX(created_at) as last_sent_at
         FROM whatsapp_messages wm
         WHERE wm.user_id = l.user_id AND wm.lead_id = l.id AND wm.direction = 'sent'
       ) sent_meta ON TRUE
       LEFT JOIN LATERAL (
         SELECT message_type as latest_message_type
         FROM message_queue mq
         WHERE mq.user_id = l.user_id AND mq.lead_id = l.id
         ORDER BY mq.created_at DESC
         LIMIT 1
       ) queue_meta ON TRUE
       LEFT JOIN LATERAL (
         SELECT escalation_required, decision
         FROM sdr_events se
         WHERE se.user_id = l.user_id AND se.lead_id = l.id
         ORDER BY se.created_at DESC
         LIMIT 1
       ) sdr_meta ON TRUE
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(l.data_proxima_acao, l.updated_at, l.created_at) DESC
       LIMIT $${paramIndex}`,
      params
    );

    const columns = KANBAN_STAGES.map((stage) => ({
      ...stage,
      leads: [],
      count: 0,
      overdue: 0,
      needs_human: 0,
      total_value: 0,
    }));
    const byStage = new Map(columns.map((column) => [column.id, column]));

    for (const lead of result.rows) {
      const stage = mapLeadToKanbanStage(lead);
      const overdue = isLeadOverdue(lead);
      const needsHuman = Boolean(lead.sdr_escalation_required);
      const card = {
        ...lead,
        kanban_stage: stage,
        overdue,
        needs_human: needsHuman,
      };
      const column = byStage.get(stage) || byStage.get('novo');
      column.leads.push(card);
      column.count += 1;
      column.overdue += overdue ? 1 : 0;
      column.needs_human += needsHuman ? 1 : 0;
      column.total_value += Number(lead.valor_potencial || 0);
    }

    res.json({
      columns,
      summary: {
        total: result.rows.length,
        overdue: columns.reduce((sum, column) => sum + column.overdue, 0),
        needs_human: columns.reduce((sum, column) => sum + column.needs_human, 0),
        total_value: columns.reduce((sum, column) => sum + column.total_value, 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/:id - Detalhes de um lead
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM leads WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json({ lead: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/leads/:id - Atualizar lead (status, CRM: responsável, próxima ação, valor potencial, motivo de perda)
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateLeadSchema.parse(req.body);

    const existing = await query(
      'SELECT id, status FROM leads WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const statusAnterior = existing.rows[0].status;

    if (data.whatsapp_instance_id !== undefined && data.whatsapp_instance_id !== null) {
      const instance = await query(
        'SELECT id FROM whatsapp_instances WHERE id = $1 AND user_id = $2',
        [data.whatsapp_instance_id, req.user.id]
      );
      if (instance.rows.length === 0) {
        return res.status(400).json({ error: 'Instância WhatsApp não encontrada para este usuário' });
      }
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (data.observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex++}`);
      values.push(data.observacoes);
    }

    if (data.data_contato !== undefined) {
      updates.push(`data_contato = $${paramIndex++}`);
      values.push(data.data_contato);
    }

    if (data.responsavel !== undefined) {
      updates.push(`responsavel = $${paramIndex++}`);
      values.push(data.responsavel);
    }

    if (data.proxima_acao !== undefined) {
      updates.push(`proxima_acao = $${paramIndex++}`);
      values.push(data.proxima_acao);
    }

    if (data.data_proxima_acao !== undefined) {
      updates.push(`data_proxima_acao = $${paramIndex++}`);
      values.push(data.data_proxima_acao);
    }

    if (data.valor_potencial !== undefined) {
      updates.push(`valor_potencial = $${paramIndex++}`);
      values.push(data.valor_potencial);
    }

    if (data.motivo_perda !== undefined) {
      updates.push(`motivo_perda = $${paramIndex++}`);
      values.push(data.motivo_perda);
    }

    if (data.whatsapp_instance_id !== undefined) {
      updates.push(`whatsapp_instance_id = $${paramIndex++}`);
      values.push(data.whatsapp_instance_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, req.user.id);

    await query(
      `UPDATE leads
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
      values
    );

    if (data.status !== undefined && data.status !== statusAnterior) {
      await query(
        `INSERT INTO lead_followups (lead_id, user_id, tipo, status_anterior, status_novo, mensagem)
         VALUES ($1, $2, 'status_change', $3, $4, $5)`,
        [id, req.user.id, statusAnterior, data.status, data.observacoes || null]
      );
    }

    await recordAuditEvent({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      entityType: 'lead',
      entityId: id,
      action: 'lead_updated',
      metadata: { fields: Object.keys(data) }
    });

    res.json({ message: 'Lead atualizado com sucesso' });
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/:id/followups - Histórico de follow-up/mudanças de status do lead
router.get('/:id/followups', async (req, res, next) => {
  try {
    const { id } = req.params;

    const leadExists = await query(
      'SELECT id FROM leads WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (leadExists.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const result = await query(
      `SELECT id, tipo, status_anterior, status_novo, mensagem, created_at
       FROM lead_followups
       WHERE lead_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [id, req.user.id]
    );

    res.json({ followups: result.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/:id/followups - Adicionar nota manual de follow-up
router.post('/:id/followups', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({ error: 'Informe a mensagem do follow-up' });
    }

    const leadExists = await query(
      'SELECT id, status FROM leads WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (leadExists.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const result = await query(
      `INSERT INTO lead_followups (lead_id, user_id, tipo, status_anterior, status_novo, mensagem)
       VALUES ($1, $2, 'nota', $3, $3, $4)
       RETURNING id, tipo, status_anterior, status_novo, mensagem, created_at`,
      [id, req.user.id, leadExists.rows[0].status, mensagem.trim()]
    );

    res.status(201).json({ message: 'Follow-up registrado', followup: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/leads/:id - Deletar lead
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM leads WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    await recordAuditEvent({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      entityType: 'lead',
      entityId: id,
      action: 'lead_deleted'
    });

    res.json({ message: 'Lead deletado com sucesso' });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/import - Importar lead manualmente
router.post('/import', async (req, res, next) => {
  try {
    const { nome_empresa, site, telefone, cidade, nicho, categoria, fonte, observacoes } = req.body;

    if (!nome_empresa) {
      return res.status(400).json({ error: 'nome_empresa é obrigatório' });
    }

    await assertBillingLimit(req.user.organization_id, 'leads', 1);

    const result = await query(
      `INSERT INTO leads (
        user_id, organization_id, nome_empresa, site, telefone, cidade, nicho, categoria, fonte, observacoes, data_coleta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING id, nome_empresa, site, telefone, cidade, nicho, categoria`,
      [
        req.user.id,
        req.user.organization_id,
        nome_empresa,
        site || '',
        telefone || '',
        cidade || '',
        nicho || '',
        categoria || '',
        fonte || 'manual',
        observacoes || ''
      ]
    );

    await updateNormalizedFields(result.rows[0].id, { site, telefone, nome_empresa });

    res.status(201).json({
      message: 'Lead importado com sucesso',
      lead: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/import-csv - Upload CSV em lote
router.post('/import-csv', async (req, res, next) => {
  try {
    const { csvContent } = req.body;

    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({
        error: 'Envie o conteúdo CSV no campo "csvContent"'
      });
    }

    const expectedRows = Math.max(String(csvContent).trim().split(/\r?\n/).length - 1, 1);
    await assertBillingLimit(req.user.organization_id, 'leads', expectedRows);
    const results = await importLeadsFromCSV(req.user.id, csvContent);

    res.json({
      message: 'Importação concluída',
      summary: {
        total: results.imported.length + results.errors.length + results.duplicates.length,
        imported: results.imported.length,
        duplicates: results.duplicates.length,
        errors: results.errors.length
      },
      imported: results.imported,
      duplicates: results.duplicates,
      errors: results.errors
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/collect - Coletar leads via provider configurado
router.post('/collect', async (req, res, next) => {
  let run = null;

  try {
    const {
      credentialId,
      query: searchQuery,
      city,
      niche,
      limit,
      lat,
      lng,
      zoom,
      language,
      region,
      extractEmailsAndContacts,
      verifyWhatsAppExists,
      forceRefresh
    } = req.body;

    if (!credentialId) {
      return res.status(400).json({ error: 'credentialId é obrigatório' });
    }

    const credentialCheck = await query(
      `SELECT id, type
       FROM credentials
       WHERE id = $1 AND user_id = $2 AND category = 'scraper'`,
      [credentialId, req.user.id]
    );

    if (credentialCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Credencial de coleta não encontrada' });
    }

    const normalizedLimit = limit || 20;
    await assertBillingLimit(req.user.organization_id, 'leads', normalizedLimit);
    const cacheInput = {
      credentialId,
      query: searchQuery,
      city,
      niche,
      limit: normalizedLimit,
      lat,
      lng,
      zoom,
      language,
      region,
      extractEmailsAndContacts,
      verifyWhatsAppExists,
      sourceType: credentialCheck.rows[0].type,
      params: { lat, lng, zoom, language, region, extractEmailsAndContacts, verifyWhatsAppExists }
    };
    const cacheKey = buildCollectionCacheKey(cacheInput);

    run = await createCollectionRun(req.user.id, {
      ...cacheInput,
      cacheKey
    });

    await addCollectionRunLog(run.id, req.user.id, 'info', 'collection_started', 'Coleta iniciada', {
      query: searchQuery,
      city,
      niche,
      limit: normalizedLimit,
      forceRefresh: Boolean(forceRefresh)
    });

    const { collectLeads } = await import('../../services/scraperCollector.mjs');
    const { saveLeadsWithDeduplication } = await import('../../services/localBusinessDataCollector.mjs');
    let verifyLeadPhonesOnWhatsApp = null;
    let collection = null;
    let cacheHit = false;

    if (!forceRefresh) {
      const cached = await getCollectionCache(req.user.id, cacheKey);
      if (cached?.response_json) {
        collection = cached.response_json;
        cacheHit = true;
        await addCollectionRunLog(run.id, req.user.id, 'info', 'cache_hit', 'Resultado reaproveitado do cache de coleta', {
          cacheId: cached.id,
          expiresAt: cached.expires_at
        });
      }
    }

    if (!collection) {
      await addCollectionRunLog(run.id, req.user.id, 'info', 'cache_miss', 'Nenhum cache válido encontrado; chamando provider', {
        forceRefresh: Boolean(forceRefresh)
      });

      if (verifyWhatsAppExists) {
        ({ verifyLeadPhonesOnWhatsApp } = await import('../../services/whatsapp/whatsappService.mjs'));
        await verifyLeadPhonesOnWhatsApp(req.user.id, []);
        await addCollectionRunLog(run.id, req.user.id, 'info', 'whatsapp_connection_ok', 'Instância WhatsApp validada antes da coleta');
      }

      collection = await collectLeads(req.user.id, {
        credentialId,
        query: searchQuery,
        city,
        niche,
        limit: normalizedLimit,
        lat,
        lng,
        zoom,
        language,
        region,
        extractEmailsAndContacts,
        verifyWhatsAppExists
      });

      await saveCollectionCache(req.user.id, {
        ...cacheInput,
        cacheKey,
        sourceType: collection.sourceType
      }, collection);

      await addCollectionRunLog(run.id, req.user.id, 'info', 'provider_collected', 'Provider retornou leads para normalização', {
        total: collection.total,
        sourceType: collection.sourceType,
        credentialId: collection.credentialUsed
      });
    }

    let leadsToSave = collection.leads || [];
    let whatsappVerification = { enabled: false };

    if (verifyWhatsAppExists) {
      if (!verifyLeadPhonesOnWhatsApp) {
        ({ verifyLeadPhonesOnWhatsApp } = await import('../../services/whatsapp/whatsappService.mjs'));
      }

      const verification = await verifyLeadPhonesOnWhatsApp(
        req.user.id,
        leadsToSave.map((lead) => lead.telefone).filter(Boolean)
      );

      let rejected = 0;
      let withoutPhone = 0;
      leadsToSave = leadsToSave.reduce((acc, lead) => {
        if (!lead.telefone) {
          withoutPhone += 1;
          return acc;
        }
        if (verification.get(lead.telefone)) {
          acc.push({ ...lead, whatsapp: lead.telefone });
        } else {
          rejected += 1;
        }
        return acc;
      }, []);

      whatsappVerification = {
        enabled: true,
        verified: leadsToSave.length,
        rejected,
        withoutPhone,
      };

      await addCollectionRunLog(run.id, req.user.id, 'info', 'whatsapp_verified', 'Verificação WhatsApp concluída', whatsappVerification);
    }

    const { saved, duplicates, errors } = await saveLeadsWithDeduplication(req.user.id, leadsToSave);

    for (const error of errors) {
      await addCollectionRunLog(run.id, req.user.id, 'error', 'lead_save_failed', 'Falha ao salvar lead coletado', error);
    }

    await addCollectionRunLog(run.id, req.user.id, 'info', 'database_saved', 'Coleta persistida no banco com deduplicação', {
      saved: saved.length,
      duplicates: duplicates.length,
      errors: errors.length
    });

    const finishedRun = await finishCollectionRun(run.id, req.user.id, {
      sourceType: collection.sourceType,
      totalFound: collection.total || leadsToSave.length,
      savedCount: saved.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      whatsappVerifiedCount: whatsappVerification.enabled ? whatsappVerification.verified : 0,
      whatsappRejectedCount: whatsappVerification.enabled ? whatsappVerification.rejected : 0,
      withoutPhoneCount: whatsappVerification.enabled ? whatsappVerification.withoutPhone : 0,
      cacheHit,
      status: errors.length > 0 ? 'completed_with_errors' : 'completed'
    });

    const credentialPayload = collection.credentialUsed ? {
      id: collection.credentialUsed,
      used: collection.usedToday,
      limit: collection.dailyLimit,
      remaining: collection.dailyLimit - collection.usedToday
    } : null;

    res.json({
      message: cacheHit ? 'Coleta concluída usando cache' : 'Coleta concluída',
      total: collection.total,
      saved: saved.length,
      duplicates: duplicates.length,
      errors: errors.length,
      cache: { hit: cacheHit, key: cacheKey },
      collectionRun: finishedRun ? { id: finishedRun.id, status: finishedRun.status, cacheHit: finishedRun.cache_hit } : null,
      whatsappVerification,
      credential: credentialPayload,
      leads: saved,
      duplicateDetails: duplicates,
      errorDetails: errors
    });
  } catch (error) {
    if (run?.id) {
      await addCollectionRunLog(run.id, req.user.id, 'error', 'collection_failed', error.message, {
        name: error.name
      });
      await finishCollectionRun(run.id, req.user.id, {
        status: 'failed',
        errorMessage: error.message
      });
    }
    next(error);
  }
});

// POST /api/leads/analyze - Analisar leads pendentes
router.post('/analyze', async (req, res, next) => {
  try {
    const { leadIds } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        error: 'Informe um array de IDs de leads para analisar'
      });
    }

    const { analyzeLead } = await import('../../services/analyzer.mjs');

    const placeholders = leadIds.map((_, i) => `$${i + 2}`).join(',');
    const leadsResult = await query(
      `SELECT id, nome_empresa, site, telefone, cidade, nicho, categoria, fonte, observacoes,
              rating, total_avaliacoes
       FROM leads
       WHERE id IN (${placeholders}) AND user_id = $1`,
      [req.user.id, ...leadIds]
    );

    if (leadsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum lead encontrado' });
    }

    const results = [];
    for (const lead of leadsResult.rows) {
      try {
        const analyzed = await analyzeLead({
          companyName: lead.nome_empresa,
          site: lead.site,
          url: lead.site,
          telefone: lead.telefone,
          cidade: lead.cidade,
          nicho: lead.nicho,
          categoria: lead.categoria,
          fonte: lead.fonte,
          observacoes: lead.observacoes,
          rating: lead.rating,
          total_avaliacoes: lead.total_avaliacoes
        });

        await query(
          `UPDATE leads SET
            tem_site = $1,
            site_final = $2,
            site_online = $3,
            status_site = $4,
            erro_site = $5,
            tempo_carregamento_ms = $6,
            tamanho_kb = $7,
            tem_pixel_meta = $8,
            tem_gtm = $9,
            tem_ga4 = $10,
            tem_google_ads_tag = $11,
            tem_whatsapp_site = $12,
            tem_formulario = $13,
            tem_https = $14,
            tem_pagina_contato = $15,
            tem_cta_visivel = $16,
            instagram = $17,
            facebook = $18,
            linkedin = $19,
            emails_encontrados = $20,
            telefones_encontrados = $21,
            score = $22,
            prioridade = $23,
            oportunidades = $24,
            pontos_positivos = $25,
            diagnostico = $26,
            mensagem_whatsapp = $27,
            mensagem_whatsapp_followup = $28,
            data_analise = $29,
            updated_at = NOW()
          WHERE id = $30`,
          [
            analyzed.tem_site,
            analyzed.site_final,
            analyzed.site_online,
            analyzed.status_site,
            analyzed.erro_site,
            analyzed.tempo_carregamento_ms,
            analyzed.tamanho_kb,
            analyzed.tem_pixel_meta,
            analyzed.tem_gtm,
            analyzed.tem_ga4,
            analyzed.tem_google_ads_tag,
            analyzed.tem_whatsapp_site,
            analyzed.tem_formulario,
            analyzed.tem_https,
            analyzed.tem_pagina_contato,
            analyzed.tem_cta_visivel,
            analyzed.instagram,
            analyzed.facebook,
            analyzed.linkedin,
            analyzed.emails_encontrados,
            analyzed.telefones_encontrados,
            analyzed.score,
            analyzed.prioridade,
            analyzed.oportunidades,
            analyzed.pontos_positivos,
            analyzed.diagnostico,
            analyzed.mensagem_whatsapp,
            analyzed.mensagem_whatsapp_followup,
            analyzed.data_analise,
            lead.id
          ]
        );

        results.push({
          id: lead.id,
          nome_empresa: lead.nome_empresa,
          score: analyzed.score,
          prioridade: analyzed.prioridade,
          success: true
        });
      } catch (error) {
        results.push({
          id: lead.id,
          nome_empresa: lead.nome_empresa,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      message: 'Análise concluída',
      total: results.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/:id/merge/:duplicateId - Mesclar dois leads
router.post('/:id/merge/:duplicateId', async (req, res, next) => {
  try {
    const { id, duplicateId } = req.params;

    const result = await mergeLeads(
      req.user.id,
      parseInt(id),
      parseInt(duplicateId)
    );

    res.json({
      message: 'Leads mesclados com sucesso',
      ...result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/normalize - Normalizar todos os leads
router.post('/normalize', async (req, res, next) => {
  try {
    const result = await normalizeAllLeads(req.user.id);

    res.json({
      message: 'Normalização concluída',
      ...result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
