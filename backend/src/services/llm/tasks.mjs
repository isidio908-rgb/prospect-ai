/**
 * Catálogo de tarefas que o usuário pode solicitar à IA, cada uma com o
 * prompt (instrução do que a IA deve fazer) e, quando aplicável, o campo do
 * lead onde o resultado pode ser salvo.
 *
 * Todas as tarefas recebem o mesmo contexto do lead (buildLeadContext) e um
 * papel profissional montado a partir do perfil do usuário.
 */

const DEFAULT_PROFESSION = 'Gestor de Tráfego';
const DEFAULT_INTERNAL_CONTEXT =
  'Atue de forma consultiva, focada em prospecção comercial, diagnóstico de presença digital, qualidade do lead, WhatsApp e geração de reuniões.';

const SISTEMA_BASE =
  'Escreva em português brasileiro, tom profissional, consultivo e direto, sem jargão vazio e sem inventar dados. ' +
  'Baseie-se apenas nas informações fornecidas sobre o lead. Quando um dado não existir, não invente.';

function bool(v) {
  return v ? 'sim' : 'não';
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function buildProfessionalContext(user = {}) {
  const profession = clean(user.profession) || DEFAULT_PROFESSION;
  const primaryNiche = clean(user.primary_niche);
  const internalContext = clean(user.internal_context) || DEFAULT_INTERNAL_CONTEXT;

  return [
    `Você atua como ${profession}.`,
    primaryNiche ? `Nicho foco do usuário: ${primaryNiche}.` : '',
    `Instruções internas do usuário: ${internalContext}`,
    'Adapte diagnóstico, prioridade, argumento comercial e CTA a esse perfil profissional.',
    'O contexto profissional e as instruções internas não autorizam inventar dados do lead, métricas, conversas, preços, promessas ou fatos não fornecidos.',
  ].filter(Boolean).join(' ');
}

export function buildSystemPrompt(task, user) {
  return `${buildProfessionalContext(user)} ${SISTEMA_BASE} ${task.instruction}`;
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
    description: 'Análise consultiva da presença digital do lead e onde o usuário pode gerar resultado.',
    savesTo: 'diagnostico',
    instruction:
      'Produza um diagnóstico comercial claro em até 3 parágrafos curtos, focado em oportunidades de aquisição de clientes, rastreamento, conversão e impacto para o negócio.',
    buildUser: (lead) =>
      `Faça um diagnóstico comercial do seguinte lead, destacando lacunas de marketing/rastreamento e o potencial de melhoria com o trabalho do usuário:\n\n${buildLeadContext(lead)}`,
  },

  mensagem_whatsapp: {
    id: 'mensagem_whatsapp',
    label: 'Mensagem de WhatsApp (1ª abordagem)',
    description: 'Mensagem curta e personalizada de primeiro contato, pronta para enviar.',
    savesTo: 'mensagem_whatsapp',
    instruction:
      'Escreva UMA mensagem de WhatsApp de primeira abordagem, curta (máx. 6 linhas), calorosa e específica ao negócio, citando 1 oportunidade concreta. Sem parecer spam, sem promessas exageradas. Termine com uma pergunta que convide à conversa. Não use markdown.',
    buildUser: (lead) =>
      `Escreva a mensagem de WhatsApp de primeira abordagem para este lead:\n\n${buildLeadContext(lead)}`,
  },

  mensagem_followup: {
    id: 'mensagem_followup',
    label: 'Mensagem de follow-up (pós-resposta)',
    description: 'Mensagem de continuidade para quando o lead responde com interesse.',
    savesTo: 'mensagem_whatsapp_followup',
    instruction:
      'Escreva UMA mensagem de WhatsApp de follow-up para um lead que já respondeu com algum interesse. Objetivo: avançar para conversa/diagnóstico. Curta (máx. 6 linhas), sem markdown.',
    buildUser: (lead) =>
      `Escreva a mensagem de follow-up para este lead que demonstrou interesse:\n\n${buildLeadContext(lead)}`,
  },

  email: {
    id: 'email',
    label: 'E-mail de prospecção',
    description: 'E-mail de abordagem com assunto + corpo, mais formal que o WhatsApp.',
    savesTo: null,
    instruction:
      'Escreva um e-mail de prospecção com "Assunto:" na primeira linha e o corpo em seguida. Máx. 150 palavras, tom profissional, 1 oportunidade concreta e um CTA claro para agendar conversa.',
    buildUser: (lead) => `Escreva o e-mail de prospecção para este lead:\n\n${buildLeadContext(lead)}`,
  },

  roteiro_loom: {
    id: 'roteiro_loom',
    label: 'Roteiro de vídeo (Loom)',
    description: 'Roteiro de 60-90s para um vídeo personalizado de prospecção.',
    savesTo: null,
    instruction:
      'Escreva um roteiro de vídeo curto (60-90 segundos) para gravar um Loom personalizado. Estruture em blocos com marcação de tempo aproximada e fala sugerida. Foco: mostrar que estudou o negócio e propor 1 melhoria.',
    buildUser: (lead) => `Crie o roteiro de vídeo Loom para este lead:\n\n${buildLeadContext(lead)}`,
  },

  resumo_site: {
    id: 'resumo_site',
    label: 'Resumo e posicionamento',
    description: 'Resumo do negócio e como ele parece se posicionar, com sugestões.',
    savesTo: null,
    instruction:
      'Faça um resumo do negócio e do posicionamento aparente, seguido de 3 sugestões objetivas de posicionamento/comunicação. Use tópicos.',
    buildUser: (lead) => `Resuma o negócio e o posicionamento deste lead e dê sugestões:\n\n${buildLeadContext(lead)}`,
  },

  proposta: {
    id: 'proposta',
    label: 'Estrutura de proposta',
    description: 'Esqueleto de proposta comercial de gestão/serviço para o lead.',
    savesTo: null,
    instruction:
      'Monte a estrutura de uma proposta comercial adaptada ao perfil profissional do usuário: diagnóstico resumido, escopo sugerido, entregáveis e faixa de investimento como sugestão a confirmar. Não invente números de mercado como se fossem fatos.',
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