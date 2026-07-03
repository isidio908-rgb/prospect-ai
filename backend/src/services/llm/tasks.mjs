/**
 * Catálogo de tarefas que o usuário pode solicitar à IA, cada uma com o
 * prompt (instrução do que a IA deve fazer) e, quando aplicável, o campo do
 * lead onde o resultado pode ser salvo.
 *
 * Todas as tarefas recebem o mesmo contexto do lead (buildLeadContext) e um
 * papel comum de "gestor de tráfego / especialista em marketing local".
 */

const SISTEMA_BASE =
  'Você é um especialista em marketing digital e gestão de tráfego para negócios locais no Brasil. ' +
  'Escreve em português brasileiro, tom profissional, consultivo e direto, sem jargão vazio e sem inventar dados. ' +
  'Baseie-se apenas nas informações fornecidas sobre o lead. Quando um dado não existir, não invente.';

function bool(v) {
  return v ? 'sim' : 'não';
}

/**
 * Monta um resumo textual do lead para alimentar o prompt.
 */
export function buildLeadContext(lead) {
  const linhas = [
    `Empresa: ${lead.nome_empresa || 'N/D'}`,
    `Cidade: ${lead.cidade || 'N/D'}`,
    `Nicho/Categoria: ${lead.nicho || ''} ${lead.categoria ? '(' + lead.categoria + ')' : ''}`.trim(),
    `Site: ${lead.site || 'sem site'}`,
    `Telefone: ${lead.telefone || 'N/D'}`,
    lead.rating != null ? `Avaliação Google: ${lead.rating} (${lead.total_avaliacoes || 0} avaliações)` : '',
    lead.score != null ? `Score interno de oportunidade: ${lead.score} (prioridade: ${lead.prioridade || 'N/D'})` : '',
    '--- Presença técnica detectada no site ---',
    `HTTPS: ${bool(lead.tem_https)} | Meta Pixel: ${bool(lead.tem_pixel_meta)} | Google Tag Manager: ${bool(lead.tem_gtm)} | GA4: ${bool(lead.tem_ga4)} | Google Ads Tag: ${bool(lead.tem_google_ads_tag)}`,
    `WhatsApp no site: ${bool(lead.tem_whatsapp_site)} | Formulário: ${bool(lead.tem_formulario)} | Página de contato: ${bool(lead.tem_pagina_contato)} | CTA visível: ${bool(lead.tem_cta_visivel)}`,
    `Instagram: ${lead.instagram || 'N/D'} | Facebook: ${lead.facebook || 'N/D'}`,
    lead.oportunidades ? `Oportunidades já mapeadas: ${lead.oportunidades}` : '',
    lead.pontos_positivos ? `Pontos positivos: ${lead.pontos_positivos}` : '',
    lead.diagnostico ? `Diagnóstico atual (regras): ${lead.diagnostico}` : '',
  ].filter(Boolean);

  return linhas.join('\n');
}

export const AI_TASKS = {
  diagnostico: {
    id: 'diagnostico',
    label: 'Diagnóstico comercial aprofundado',
    description: 'Análise consultiva da presença digital do lead e onde um gestor de tráfego pode gerar resultado.',
    savesTo: 'diagnostico',
    system:
      SISTEMA_BASE +
      ' Produza um diagnóstico comercial claro em até 3 parágrafos curtos, focado em oportunidades de aquisição de clientes (tráfego pago, rastreamento, conversão) e no impacto para o negócio.',
    buildUser: (lead) =>
      `Faça um diagnóstico comercial do seguinte lead, destacando lacunas de marketing/rastreamento e o potencial de melhoria com gestão de tráfego:\n\n${buildLeadContext(lead)}`,
  },

  mensagem_whatsapp: {
    id: 'mensagem_whatsapp',
    label: 'Mensagem de WhatsApp (1ª abordagem)',
    description: 'Mensagem curta e personalizada de primeiro contato, pronta para enviar.',
    savesTo: 'mensagem_whatsapp',
    system:
      SISTEMA_BASE +
      ' Escreva UMA mensagem de WhatsApp de primeira abordagem, curta (máx. 6 linhas), calorosa e específica ao negócio, citando 1 oportunidade concreta. Sem parecer spam, sem promessas exageradas. Termine com uma pergunta que convide à conversa. Não use markdown.',
    buildUser: (lead) =>
      `Escreva a mensagem de WhatsApp de primeira abordagem para este lead:\n\n${buildLeadContext(lead)}`,
  },

  mensagem_followup: {
    id: 'mensagem_followup',
    label: 'Mensagem de follow-up (pós-resposta)',
    description: 'Mensagem de continuidade para quando o lead responde com interesse.',
    savesTo: 'mensagem_whatsapp_followup',
    system:
      SISTEMA_BASE +
      ' Escreva UMA mensagem de WhatsApp de follow-up, para um lead que já respondeu com algum interesse. Objetivo: avançar para uma conversa/diagnóstico. Curta (máx. 6 linhas), sem markdown.',
    buildUser: (lead) =>
      `Escreva a mensagem de follow-up para este lead que demonstrou interesse:\n\n${buildLeadContext(lead)}`,
  },

  email: {
    id: 'email',
    label: 'E-mail de prospecção',
    description: 'E-mail de abordagem com assunto + corpo, mais formal que o WhatsApp.',
    savesTo: null,
    system:
      SISTEMA_BASE +
      ' Escreva um e-mail de prospecção com "Assunto:" na primeira linha e o corpo em seguida. Máx. 150 palavras, tom profissional, 1 oportunidade concreta e um CTA claro (agendar conversa).',
    buildUser: (lead) => `Escreva o e-mail de prospecção para este lead:\n\n${buildLeadContext(lead)}`,
  },

  roteiro_loom: {
    id: 'roteiro_loom',
    label: 'Roteiro de vídeo (Loom)',
    description: 'Roteiro de 60-90s para um vídeo personalizado de prospecção.',
    savesTo: null,
    system:
      SISTEMA_BASE +
      ' Escreva um roteiro de vídeo curto (60-90 segundos) para gravar um Loom personalizado. Estruture em blocos com marcação de tempo aproximada e fala sugerida. Foco: mostrar que estudou o negócio e propor 1 melhoria.',
    buildUser: (lead) => `Crie o roteiro de vídeo Loom para este lead:\n\n${buildLeadContext(lead)}`,
  },

  resumo_site: {
    id: 'resumo_site',
    label: 'Resumo e posicionamento',
    description: 'Resumo do negócio e como ele parece se posicionar, com sugestões.',
    savesTo: null,
    system:
      SISTEMA_BASE +
      ' Faça um resumo do negócio e do posicionamento aparente, seguido de 3 sugestões objetivas de posicionamento/comunicação. Use tópicos.',
    buildUser: (lead) => `Resuma o negócio e o posicionamento deste lead e dê sugestões:\n\n${buildLeadContext(lead)}`,
  },

  proposta: {
    id: 'proposta',
    label: 'Estrutura de proposta',
    description: 'Esqueleto de proposta comercial de gestão de tráfego para o lead.',
    savesTo: null,
    system:
      SISTEMA_BASE +
      ' Monte a estrutura de uma proposta comercial de gestão de tráfego para este lead: diagnóstico resumido, escopo sugerido, entregáveis, e uma faixa de investimento em formato de tópicos (deixe valores como sugestão a confirmar). Não invente números de mercado como se fossem fatos.',
    buildUser: (lead) => `Monte a estrutura de proposta comercial para este lead:\n\n${buildLeadContext(lead)}`,
  },
};

export function listTasks() {
  return Object.values(AI_TASKS).map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
    savesTo: t.savesTo,
  }));
}

export function getTask(id) {
  return AI_TASKS[id] || null;
}
