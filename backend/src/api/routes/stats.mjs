import express from 'express';
import { query } from '../../database/init.mjs';
import { authenticate } from '../middleware/auth.mjs';

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticate);

// GET /api/stats - Estatísticas gerais
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Total de leads
    const totalResult = await query(
      'SELECT COUNT(*) as total FROM leads WHERE user_id = $1',
      [userId]
    );
    
    // Leads por prioridade
    const prioridadeResult = await query(
      `SELECT prioridade, COUNT(*) as count 
       FROM leads 
       WHERE user_id = $1 
       GROUP BY prioridade`,
      [userId]
    );
    
    // Leads por status
    const statusResult = await query(
      `SELECT status, COUNT(*) as count 
       FROM leads 
       WHERE user_id = $1 
       GROUP BY status`,
      [userId]
    );
    
    // Leads por cidade (top 10)
    const cidadeResult = await query(
      `SELECT cidade, COUNT(*) as count 
       FROM leads 
       WHERE user_id = $1 AND cidade IS NOT NULL
       GROUP BY cidade 
       ORDER BY count DESC 
       LIMIT 10`,
      [userId]
    );
    
    // Leads por nicho (top 10)
    const nichoResult = await query(
      `SELECT nicho, COUNT(*) as count 
       FROM leads 
       WHERE user_id = $1 AND nicho IS NOT NULL
       GROUP BY nicho 
       ORDER BY count DESC 
       LIMIT 10`,
      [userId]
    );
    
    // Score médio
    const scoreResult = await query(
      `SELECT 
        AVG(score) as avg_score,
        MIN(score) as min_score,
        MAX(score) as max_score
       FROM leads 
       WHERE user_id = $1 AND score IS NOT NULL`,
      [userId]
    );
    
    // Leads analisados vs não analisados
    const analisadosResult = await query(
      `SELECT 
        COUNT(CASE WHEN data_analise IS NOT NULL THEN 1 END) as analisados,
        COUNT(CASE WHEN data_analise IS NULL THEN 1 END) as nao_analisados
       FROM leads 
       WHERE user_id = $1`,
      [userId]
    );
    
    // Leads com oportunidades (score > 60)
    const oportunidadesResult = await query(
      `SELECT COUNT(*) as count 
       FROM leads 
       WHERE user_id = $1 AND score >= 60`,
      [userId]
    );

    // Presença de recursos técnicos (spec seção 13: leads sem site/pixel/GTM/GA4, com telefone/site)
    const presencaResult = await query(
      `SELECT
        COUNT(CASE WHEN tem_site = FALSE OR site IS NULL OR site = '' THEN 1 END) as sem_site,
        COUNT(CASE WHEN site IS NOT NULL AND site != '' THEN 1 END) as com_site,
        COUNT(CASE WHEN telefone IS NOT NULL AND telefone != '' THEN 1 END) as com_telefone,
        COUNT(CASE WHEN whatsapp IS NOT NULL AND whatsapp != '' THEN 1 END) as com_whatsapp_confirmado,
        COUNT(CASE WHEN data_analise IS NOT NULL AND tem_pixel_meta = FALSE THEN 1 END) as sem_pixel,
        COUNT(CASE WHEN data_analise IS NOT NULL AND tem_gtm = FALSE THEN 1 END) as sem_gtm,
        COUNT(CASE WHEN data_analise IS NOT NULL AND tem_ga4 = FALSE THEN 1 END) as sem_ga4,
        COUNT(CASE WHEN data_analise IS NOT NULL AND tem_whatsapp_site = FALSE THEN 1 END) as sem_whatsapp_site
       FROM leads
       WHERE user_id = $1`,
      [userId]
    );

    // Funil comercial (spec seção 13: reuniões marcadas, propostas enviadas, clientes fechados, taxa de resposta)
    const funilResult = await query(
      `SELECT
        COUNT(CASE WHEN status = 'contato_enviado' THEN 1 END) as contato_enviado,
        COUNT(CASE WHEN status = 'respondeu' THEN 1 END) as respondeu,
        COUNT(CASE WHEN status = 'reuniao_marcada' THEN 1 END) as reuniao_marcada,
        COUNT(CASE WHEN status = 'proposta_enviada' THEN 1 END) as proposta_enviada,
        COUNT(CASE WHEN status = 'cliente_fechado' THEN 1 END) as cliente_fechado,
        COUNT(CASE WHEN status = 'sem_interesse' THEN 1 END) as sem_interesse,
        COUNT(CASE WHEN status = 'nao_respondeu' THEN 1 END) as nao_respondeu,
        COUNT(CASE WHEN status IN (
          'contato_enviado', 'respondeu', 'reuniao_marcada',
          'proposta_enviada', 'cliente_fechado', 'sem_interesse', 'nao_respondeu'
        ) THEN 1 END) as total_contatados,
        COUNT(CASE WHEN status IN (
          'respondeu', 'reuniao_marcada', 'proposta_enviada', 'cliente_fechado'
        ) THEN 1 END) as total_respondeu_ou_avancou,
        SUM(CASE WHEN status = 'cliente_fechado' THEN valor_potencial ELSE 0 END) as valor_fechado
       FROM leads
       WHERE user_id = $1`,
      [userId]
    );

    const fonteResult = await query(
      `SELECT COALESCE(fonte, 'indefinida') as fonte, COUNT(*) as total,
        COUNT(CASE WHEN score >= 60 THEN 1 END) as oportunidades,
        COUNT(CASE WHEN status = 'cliente_fechado' THEN 1 END) as clientes
       FROM leads
       WHERE user_id = $1
       GROUP BY COALESCE(fonte, 'indefinida')
       ORDER BY total DESC
       LIMIT 10`,
      [userId]
    );

    const conversaoNichoResult = await query(
      `SELECT COALESCE(nicho, 'indefinido') as nicho,
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('respondeu', 'reuniao_marcada', 'proposta_enviada', 'cliente_fechado') THEN 1 END) as avancados,
        COUNT(CASE WHEN status = 'cliente_fechado' THEN 1 END) as clientes
       FROM leads
       WHERE user_id = $1
       GROUP BY COALESCE(nicho, 'indefinido')
       HAVING COUNT(*) > 0
       ORDER BY avancados DESC, total DESC
       LIMIT 8`,
      [userId]
    );

    const conversaoCidadeResult = await query(
      `SELECT COALESCE(cidade, 'indefinida') as cidade,
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('respondeu', 'reuniao_marcada', 'proposta_enviada', 'cliente_fechado') THEN 1 END) as avancados,
        COUNT(CASE WHEN status = 'cliente_fechado' THEN 1 END) as clientes
       FROM leads
       WHERE user_id = $1
       GROUP BY COALESCE(cidade, 'indefinida')
       HAVING COUNT(*) > 0
       ORDER BY avancados DESC, total DESC
       LIMIT 8`,
      [userId]
    );

    const funil = funilResult.rows[0];
    const totalContatados = parseInt(funil.total_contatados);
    const totalRespondeuOuAvancou = parseInt(funil.total_respondeu_ou_avancou);
    const taxaResposta = totalContatados > 0
      ? parseFloat(((totalRespondeuOuAvancou / totalContatados) * 100).toFixed(1))
      : 0;

    const withRate = (row, key) => {
      const total = parseInt(row.total || 0);
      const value = parseInt(row[key] || 0);
      return total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0;
    };
    
    res.json({
      total: parseInt(totalResult.rows[0].total),
      porPrioridade: prioridadeResult.rows.reduce((acc, row) => {
        acc[row.prioridade || 'indefinida'] = parseInt(row.count);
        return acc;
      }, {}),
      porStatus: statusResult.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      topCidades: cidadeResult.rows.map(row => ({
        cidade: row.cidade,
        count: parseInt(row.count)
      })),
      topNichos: nichoResult.rows.map(row => ({
        nicho: row.nicho,
        count: parseInt(row.count)
      })),
      score: {
        medio: scoreResult.rows[0].avg_score ? parseFloat(scoreResult.rows[0].avg_score).toFixed(1) : 0,
        minimo: scoreResult.rows[0].min_score || 0,
        maximo: scoreResult.rows[0].max_score || 0
      },
      analisados: parseInt(analisadosResult.rows[0].analisados),
      naoAnalisados: parseInt(analisadosResult.rows[0].nao_analisados),
      comOportunidades: parseInt(oportunidadesResult.rows[0].count),
      presenca: {
        semSite: parseInt(presencaResult.rows[0].sem_site),
        comSite: parseInt(presencaResult.rows[0].com_site),
        comTelefone: parseInt(presencaResult.rows[0].com_telefone),
        comWhatsappConfirmado: parseInt(presencaResult.rows[0].com_whatsapp_confirmado),
        semPixel: parseInt(presencaResult.rows[0].sem_pixel),
        semGtm: parseInt(presencaResult.rows[0].sem_gtm),
        semGa4: parseInt(presencaResult.rows[0].sem_ga4),
        semWhatsappSite: parseInt(presencaResult.rows[0].sem_whatsapp_site)
      },
      funil: {
        contatoEnviado: parseInt(funil.contato_enviado),
        respondeu: parseInt(funil.respondeu),
        reuniaoMarcada: parseInt(funil.reuniao_marcada),
        propostaEnviada: parseInt(funil.proposta_enviada),
        clienteFechado: parseInt(funil.cliente_fechado),
        semInteresse: parseInt(funil.sem_interesse),
        naoRespondeu: parseInt(funil.nao_respondeu),
        taxaResposta,
        valorFechado: parseFloat(funil.valor_fechado || 0)
      },
      porFonte: fonteResult.rows.map((row) => ({
        fonte: row.fonte,
        total: parseInt(row.total),
        oportunidades: parseInt(row.oportunidades),
        clientes: parseInt(row.clientes),
        taxaOportunidade: withRate(row, 'oportunidades')
      })),
      conversaoPorNicho: conversaoNichoResult.rows.map((row) => ({
        nicho: row.nicho,
        total: parseInt(row.total),
        avancados: parseInt(row.avancados),
        clientes: parseInt(row.clientes),
        taxaAvanco: withRate(row, 'avancados')
      })),
      conversaoPorCidade: conversaoCidadeResult.rows.map((row) => ({
        cidade: row.cidade,
        total: parseInt(row.total),
        avancados: parseInt(row.avancados),
        clientes: parseInt(row.clientes),
        taxaAvanco: withRate(row, 'avancados')
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;