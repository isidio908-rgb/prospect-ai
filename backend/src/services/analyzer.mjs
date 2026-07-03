import { auditWebsite } from '../lib/analysis/auditor.mjs';
import { scoreLead } from '../lib/analysis/scoring.mjs';
import { buildDiagnosis, buildFollowUpMessage, buildOutreachMessage } from '../lib/analysis/messages.mjs';
import { extractSignals, normalizeLead } from '../lib/analysis/extractors.mjs';

/**
 * Analisa um lead completo: audita site, calcula score, gera mensagens
 */
export async function analyzeLead(leadData) {
  const lead = normalizeLead(leadData);
  
  // Auditar site
  const audit = await auditWebsite(lead.url);
  
  // Calcular score
  const scoring = scoreLead(lead, audit);
  
  // Gerar diagnóstico e mensagens (1º e 2º estágio)
  const diagnosis = buildDiagnosis(lead, audit, scoring);
  const whatsappMessage = buildOutreachMessage(lead, scoring);
  const whatsappFollowUpMessage = buildFollowUpMessage(lead, scoring);
  
  // Preparar resultado formatado para o banco
  return {
    // Dados básicos
    nome_empresa: lead.companyName,
    site: lead.url,
    telefone: lead.phone,
    cidade: lead.city,
    nicho: lead.niche,
    categoria: lead.category,
    fonte: lead.source,
    observacoes: lead.notes,
    
    // Resultado da auditoria
    tem_site: Boolean(lead.url),
    site_final: audit.finalUrl,
    site_online: audit.ok,
    status_site: audit.ok ? 'online' : 'erro',
    erro_site: audit.error,
    tempo_carregamento_ms: audit.loadMs,
    tamanho_kb: audit.sizeKb,
    
    // Sinais técnicos
    tem_pixel_meta: audit.signals.hasMetaPixel,
    tem_gtm: audit.signals.hasGtm,
    tem_ga4: audit.signals.hasGa4,
    tem_google_ads_tag: audit.signals.hasGoogleAdsTag,
    tem_whatsapp_site: audit.signals.whatsappLinks.length > 0,
    tem_formulario: audit.signals.hasForms,
    tem_https: audit.signals.hasHttps,
    tem_pagina_contato: audit.signals.hasContactPage,
    tem_cta_visivel: audit.signals.hasCta,
    
    // Redes sociais
    instagram: audit.signals.instagramLinks[0] || '',
    facebook: audit.signals.facebookLinks[0] || '',
    linkedin: audit.signals.linkedinLinks?.[0] || '',
    
    // Contatos encontrados
    emails_encontrados: audit.signals.emails.join(', '),
    telefones_encontrados: audit.signals.phones.join(', '),
    
    // Score e priorização
    score: scoring.score,
    prioridade: scoring.priority,
    oportunidades: scoring.opportunities.join(' | '),
    pontos_positivos: scoring.strengths.join(' | '),
    diagnostico: diagnosis,
    mensagem_whatsapp: whatsappMessage,
    mensagem_whatsapp_followup: whatsappFollowUpMessage,
    
    // Timestamp
    data_analise: new Date()
  };
}

/**
 * Analisa múltiplos leads em lote
 */
export async function analyzeLeads(leadsData, onProgress) {
  const results = [];
  
  for (let i = 0; i < leadsData.length; i++) {
    const lead = leadsData[i];
    
    try {
      const analyzed = await analyzeLead(lead);
      results.push({ success: true, data: analyzed, original: lead });
      
      if (onProgress) {
        onProgress(i + 1, leadsData.length, analyzed);
      }
    } catch (error) {
      results.push({ 
        success: false, 
        error: error.message, 
        original: lead 
      });
      
      if (onProgress) {
        onProgress(i + 1, leadsData.length, null, error);
      }
    }
  }
  
  return results;
}
