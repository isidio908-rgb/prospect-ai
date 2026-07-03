import express from 'express';
import { query } from '../../database/init.mjs';
import { authenticate } from '../middleware/auth.mjs';
import { importLeadsFromCSV, exportLeadsToCSV } from '../../services/csvImporter.mjs';
import { 
  findAllDuplicates, 
  mergeLeads, 
  normalizeAllLeads,
  updateNormalizedFields
} from '../../services/deduplicator.mjs';
import { updateLeadSchema } from '../validators/leads.mjs';

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
    
    // Construir query dinâmica
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
    
    // Validar sortBy
    const allowedSortColumns = ['score', 'created_at', 'nome_empresa', 'prioridade'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'score';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Contar total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM leads WHERE ${whereClause}`,
      params
    );
    
    const total = parseInt(countResult.rows[0].total);
    
    // Buscar leads
    params.push(limit, offset);
    const result = await query(
      `SELECT 
        id, nome_empresa, site, telefone, whatsapp, email,
        cidade, bairro, nicho, categoria, fonte,
        score, prioridade, status, 
        tem_pixel_meta, tem_gtm, tem_ga4, tem_whatsapp_site,
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
    
    // Verificar se o lead existe e pertence ao usuário
    const existing = await query(
      'SELECT id, status FROM leads WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    const statusAnterior = existing.rows[0].status;
    
    // Construir update dinâmico
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

    // Registrar histórico quando o status muda (spec seção 11: histórico de mensagens/follow-up)
    if (data.status !== undefined && data.status !== statusAnterior) {
      await query(
        `INSERT INTO lead_followups (lead_id, user_id, tipo, status_anterior, status_novo, mensagem)
         VALUES ($1, $2, 'status_change', $3, $4, $5)`,
        [id, req.user.id, statusAnterior, data.status, data.observacoes || null]
      );
    }
    
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
    
    const result = await query(
      `INSERT INTO leads (
        user_id, nome_empresa, site, telefone, cidade, nicho, categoria, fonte, observacoes, data_coleta
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id, nome_empresa, site, telefone, cidade, nicho, categoria`,
      [
        req.user.id,
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

    // Normaliza domínio/telefone/nome — essencial para deduplicação e para
    // casar mensagens recebidas do WhatsApp com este lead (via phone_normalized).
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

// POST /api/leads/collect - Coletar leads via Local Business Data
router.post('/collect', async (req, res, next) => {
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
      extractEmailsAndContacts
    } = req.body;
    
    if (!credentialId) {
      return res.status(400).json({ error: 'credentialId é obrigatório' });
    }

    const { collectLeads } = await import('../../services/scraperCollector.mjs');
    const { saveLeadsWithDeduplication } = await import('../../services/localBusinessDataCollector.mjs');

    // Coletar da API (o provedor é determinado pelo tipo da credencial)
    const collection = await collectLeads(req.user.id, {
      credentialId,
      query: searchQuery,
      city,
      niche,
      limit: limit || 20,
      lat,
      lng,
      zoom,
      language,
      region,
      extractEmailsAndContacts
    });
    
    // Salvar no banco com deduplicação
    const { saved, duplicates, errors } = await saveLeadsWithDeduplication(req.user.id, collection.leads);
    
    res.json({
      message: 'Coleta concluída',
      total: collection.total,
      saved: saved.length,
      duplicates: duplicates.length,
      errors: errors.length,
      credential: {
        id: collection.credentialUsed,
        used: collection.usedToday,
        limit: collection.dailyLimit,
        remaining: collection.dailyLimit - collection.usedToday
      },
      leads: saved,
      duplicateDetails: duplicates,
      errorDetails: errors
    });
  } catch (error) {
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
    
    // Buscar leads do banco
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
    
    // Analisar cada lead
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
        
        // Atualizar no banco
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
