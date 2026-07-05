import { query } from '../../database/init.mjs';

function clean(value) {
  return String(value || '').trim();
}

function boolLabel(value) {
  return value ? 'sim' : 'nao';
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalize(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const OFFER_LABELS = {
  tracking: 'Tracking e mensuracao',
  traffic: 'Trafego pago local',
  website: 'Site ou landing page de conversao',
  conversion: 'Conversao via WhatsApp/formulario',
  creative: 'Criativos e prova social',
  crm: 'CRM e follow-up comercial',
  consulting: 'Consultoria comercial digital',
};

const NICHE_CONTEXTS = [
  {
    key: 'imobiliarias',
    label: 'Imobiliarias',
    match: ['imobiliaria', 'imobiliarias', 'imoveis', 'imovel', 'corretor'],
    buyerAction: 'pedidos de informacao, simulacoes e visitas',
  },
  {
    key: 'clinicas',
    label: 'Clinicas',
    match: ['clinica', 'clinicas', 'medico', 'cardiologista', 'ortopedista', 'veterinaria', 'veterinario', 'quiropraxia'],
    buyerAction: 'agendamentos, avaliacoes e novos pacientes',
  },
  {
    key: 'odontologia',
    label: 'Odontologia',
    match: ['odontologia', 'odontologica', 'dentista', 'ortodontia'],
    buyerAction: 'avaliacoes, orcamentos e consultas',
  },
  {
    key: 'estetica',
    label: 'Estetica',
    match: ['estetica', 'harmonizacao', 'beleza', 'spa', 'depilacao'],
    buyerAction: 'avaliacoes, pacotes e agendamentos recorrentes',
  },
  {
    key: 'advocacia',
    label: 'Advocacia',
    match: ['advogado', 'advocacia', 'juridico', 'juridica'],
    buyerAction: 'atendimentos qualificados e consultas iniciais',
  },
  {
    key: 'default',
    label: 'Negocio local',
    match: [],
    buyerAction: 'contatos e oportunidades comerciais pelo digital',
  },
];

function detectNiche(lead) {
  const source = normalize(`${lead.nicho || ''} ${lead.categoria || ''} ${lead.nome_empresa || ''}`);
  return NICHE_CONTEXTS.find((item) => item.key !== 'default' && item.match.some((term) => source.includes(normalize(term))))
    || NICHE_CONTEXTS.find((item) => item.key === 'default');
}

function buildFacts(lead) {
  const facts = [
    { key: 'company', label: `Empresa: ${lead.nome_empresa || '-'}` },
    { key: 'city', label: `Cidade: ${lead.cidade || '-'}` },
    { key: 'niche', label: `Nicho/categoria: ${lead.nicho || lead.categoria || '-'}` },
    { key: 'score', label: `Score: ${lead.score ?? '-'}${lead.prioridade ? ` (${lead.prioridade})` : ''}` },
    { key: 'site', label: `Site: ${lead.site ? 'identificado' : 'nao identificado'}` },
  ];

  if (lead.site) {
    facts.push(
      { key: 'https', label: `HTTPS: ${boolLabel(lead.tem_https)}` },
      { key: 'pixel', label: `Pixel Meta: ${boolLabel(lead.tem_pixel_meta)}` },
      { key: 'gtm', label: `Google Tag Manager: ${boolLabel(lead.tem_gtm)}` },
      { key: 'ga4', label: `GA4: ${boolLabel(lead.tem_ga4)}` },
      { key: 'google_ads_tag', label: `Google Ads Tag: ${boolLabel(lead.tem_google_ads_tag)}` },
      { key: 'whatsapp_site', label: `WhatsApp no site: ${boolLabel(lead.tem_whatsapp_site)}` },
      { key: 'form', label: `Formulario: ${boolLabel(lead.tem_formulario)}` }
    );
  }

  if (lead.tempo_carregamento_ms) {
    facts.push({ key: 'speed', label: `Tempo de carregamento: ${lead.tempo_carregamento_ms}ms` });
  }

  if (lead.rating || lead.total_avaliacoes) {
    facts.push({ key: 'reviews', label: `Google: nota ${lead.rating || '-'} com ${lead.total_avaliacoes || 0} avaliacoes` });
  }

  return facts;
}

function buildGaps(lead) {
  const gaps = [];

  if (!lead.site) {
    gaps.push({ key: 'sem_site', label: 'Nao foi identificado site', impact: 'reduz controle sobre conversao, prova de autoridade e paginas especificas de campanha', offer: 'website' });
  }

  if (lead.site && !lead.tem_pixel_meta) {
    gaps.push({ key: 'sem_pixel', label: 'Pixel Meta nao identificado', impact: 'limita remarketing, publicos personalizados e otimizacao de campanhas Meta', offer: 'tracking' });
  }

  if (lead.site && !lead.tem_gtm) {
    gaps.push({ key: 'sem_gtm', label: 'Google Tag Manager nao identificado', impact: 'dificulta organizacao e manutencao das tags de marketing', offer: 'tracking' });
  }

  if (lead.site && !lead.tem_ga4) {
    gaps.push({ key: 'sem_ga4', label: 'GA4 nao identificado', impact: 'limita leitura de origem, engajamento e conversoes no site', offer: 'tracking' });
  }

  if (lead.site && !lead.tem_google_ads_tag) {
    gaps.push({ key: 'sem_google_ads_tag', label: 'Google Ads Tag nao identificada', impact: 'pode dificultar mensuracao e otimizacao de campanhas Google Ads', offer: 'traffic' });
  }

  if (lead.site && !lead.tem_whatsapp_site) {
    gaps.push({ key: 'sem_whatsapp_site', label: 'WhatsApp nao parece estar visivel no site', impact: 'pode reduzir contatos diretos de visitantes prontos para conversar', offer: 'conversion' });
  }

  if (lead.site && !lead.tem_formulario) {
    gaps.push({ key: 'sem_formulario', label: 'Formulario de contato nao identificado', impact: 'cria dependencia de um unico canal de conversao', offer: 'conversion' });
  }

  if (asNumber(lead.tempo_carregamento_ms) > 3000) {
    gaps.push({ key: 'site_lento', label: 'Site com carregamento acima do ideal', impact: 'pode aumentar abandono antes do contato', offer: 'website' });
  }

  if (asNumber(lead.total_avaliacoes) > 100 && lead.site && (!lead.tem_pixel_meta || !lead.tem_ga4)) {
    gaps.push({ key: 'prova_social_sem_tracking', label: 'Boa prova social com mensuracao incompleta', impact: 'ha sinais de demanda/reputacao, mas pouca leitura do que vira oportunidade comercial', offer: 'tracking' });
  }

  return gaps;
}

function countOffers(gaps) {
  const counts = new Map();
  for (const gap of gaps) counts.set(gap.offer, (counts.get(gap.offer) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function buildOffer(lead, gaps) {
  const ranked = countOffers(gaps);
  const primaryKey = ranked[0]?.[0] || (lead.site ? 'consulting' : 'website');
  const secondary = ranked.slice(1, 4).map(([key]) => OFFER_LABELS[key]).filter(Boolean);

  return {
    primary_key: primaryKey,
    primary: OFFER_LABELS[primaryKey] || OFFER_LABELS.consulting,
    secondary,
    rationale: gaps.length
      ? `Oferta baseada nos pontos observados: ${gaps.slice(0, 3).map((gap) => gap.label).join('; ')}.`
      : 'Oferta consultiva baseada em revisao de presenca digital, mensuracao e conversao.',
  };
}

function buildInferences(lead, niche, gaps) {
  const inferences = [];
  if (gaps.some((gap) => ['sem_pixel', 'sem_gtm', 'sem_ga4'].includes(gap.key))) {
    inferences.push(`Inferencia: a empresa pode ter dificuldade para medir quais canais geram ${niche.buyerAction}.`);
  }
  if (gaps.some((gap) => ['sem_whatsapp_site', 'sem_formulario'].includes(gap.key))) {
    inferences.push('Inferencia: visitantes do site podem encontrar atrito para iniciar contato rapidamente.');
  }
  if (asNumber(lead.total_avaliacoes) > 100) {
    inferences.push('Inferencia: a quantidade de avaliacoes sugere presenca local relevante, mas isso nao indica faturamento ou investimento em midia.');
  }
  if (!inferences.length) {
    inferences.push('Inferencia: existe espaco para uma conversa consultiva, mas a proposta deve ser validada em diagnostico manual.');
  }
  return inferences;
}

function buildWhatsappSummary(lead, gaps, offer, niche) {
  const company = lead.nome_empresa || 'sua empresa';
  const mainGaps = gaps.slice(0, 3).map((gap) => gap.label.toLowerCase());
  const problemText = mainGaps.length
    ? mainGaps.join(', ')
    : 'alguns pontos de conversao e mensuracao que valem revisao';

  return [
    `Analisei rapidamente a presenca digital da ${company} e separei alguns pontos objetivos: ${problemText}.`,
    `Isso pode impactar ${niche.buyerAction}, principalmente quando a empresa quer transformar visitas em contatos medidos.`,
    `Minha sugestao inicial seria olhar para ${offer.primary.toLowerCase()}. Posso te mostrar esse diagnostico em uma chamada rapida de 15 minutos?`,
  ].join('\n\n');
}

function buildLoomScript(lead, gaps, offer) {
  const company = lead.nome_empresa || 'sua empresa';
  const firstGap = gaps[0]?.label || 'pontos de conversao e mensuracao';
  const secondGap = gaps[1]?.label || 'clareza do caminho ate o contato';

  return [
    `1. Abrir dizendo: "Gravei esse video rapido porque analisei a ${company} e encontrei alguns pontos que podem estar limitando oportunidades no digital."`,
    `2. Mostrar o site/perfil e apontar o primeiro fato observado: ${firstGap}.`,
    `3. Mostrar o segundo ponto observado: ${secondGap}.`,
    `4. Explicar sem prometer resultado: "Isso nao significa que voces estejam perdendo X em vendas, mas dificulta medir e melhorar o caminho ate o contato."`,
    `5. Fechar com oferta: "O caminho que eu recomendaria avaliar primeiro e ${offer.primary.toLowerCase()}. Se fizer sentido, marcamos 15 minutos e eu te mostro um plano simples."`,
  ].join('\n');
}

function buildMeetingScript(lead, gaps, offer, niche) {
  const company = lead.nome_empresa || 'a empresa';
  return [
    `Abertura: "Quero entender como hoje a ${company} gera ${niche.buyerAction} e onde o digital entra nesse processo."`,
    'Pergunta 1: "Hoje voces sabem de onde vem cada contato: Google, Instagram, indicacao ou site?"',
    'Pergunta 2: "Existe alguem responsavel por responder e acompanhar os contatos que chegam pelo WhatsApp?"',
    'Pergunta 3: "Qual seria um bom resultado para os proximos 30 a 60 dias: mais contatos, melhor qualidade ou organizacao do funil?"',
    `Diagnostico: "Pelos dados observados, os principais pontos sao ${gaps.length ? gaps.slice(0, 3).map((gap) => gap.label.toLowerCase()).join(', ') : 'mensuracao, conversao e clareza comercial'}."`,
    `Proxima etapa: "Eu montaria primeiro um plano de ${offer.primary.toLowerCase()}, com revisao depois dos primeiros dados."`,
  ].join('\n');
}

function buildMarkdown({ lead, facts, gaps, inferences, offer, whatsappSummary, loomScript, meetingScript }) {
  return [
    `# Diagnostico Comercial - ${lead.nome_empresa}`,
    '',
    '## Resumo Para WhatsApp',
    whatsappSummary,
    '',
    '## Fatos Observados',
    ...facts.map((fact) => `- ${fact.label}`),
    '',
    '## Pontos De Atencao',
    ...(gaps.length ? gaps.map((gap) => `- **${gap.label}:** ${gap.impact}.`) : ['- Nenhum ponto critico foi identificado pelos dados atuais.']),
    '',
    '## Inferencias Comerciais',
    ...inferences.map((item) => `- ${item}`),
    '',
    '## Oferta Recomendada',
    `Oferta principal: **${offer.primary}**.`,
    offer.secondary.length ? `Ofertas secundarias: ${offer.secondary.join(', ')}.` : 'Ofertas secundarias: avaliar apos conversa inicial.',
    offer.rationale,
    '',
    '## Roteiro Loom/Audio',
    loomScript,
    '',
    '## Roteiro De Reuniao De 15 Minutos',
    meetingScript,
    '',
    '## Regra De Seguranca Comercial',
    'Nao prometer faturamento, volume de leads, ROI ou investimento sem dados confirmados pelo cliente. Separar fatos observados de inferencias.',
  ].join('\n');
}

function buildLlmContext(user, lead, facts, gaps, offer) {
  return [
    `Profissao do usuario: ${clean(user.profession) || 'Gestor de Trafego'}.`,
    `Nicho foco do usuario: ${clean(user.primary_niche) || 'prospeccao comercial local'}.`,
    `Instrucoes internas do usuario: ${clean(user.internal_context) || 'abordar com diagnostico consultivo e sem prometer resultados'}.`,
    `Lead: ${lead.nome_empresa}.`,
    `Fatos observados: ${facts.map((fact) => fact.label).join(' | ')}.`,
    `Pontos de atencao: ${gaps.map((gap) => gap.label).join(' | ') || 'nenhum ponto critico confirmado'}.`,
    `Oferta recomendada: ${offer.primary}.`,
    'Regra: nao inventar dados, campanha ativa, faturamento, investimento, ROI ou problema nao observado.',
  ].join('\n');
}

async function getLeadForUser(userId, leadId) {
  const result = await query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
  const lead = result.rows[0];
  if (!lead) {
    const error = new Error('Lead nao encontrado');
    error.status = 404;
    throw error;
  }
  return lead;
}

async function getUserContext(userId, fallbackUser = {}) {
  const result = await query(
    'SELECT id, profession, primary_niche, internal_context FROM users WHERE id = $1',
    [userId]
  );
  return { ...(result.rows[0] || {}), ...fallbackUser };
}

export async function buildAdvancedCommercialDiagnostic(userId, userContext, leadId) {
  const id = Number(leadId);
  if (!id) {
    const error = new Error('lead_id e obrigatorio');
    error.status = 400;
    throw error;
  }

  const lead = await getLeadForUser(userId, id);
  const user = await getUserContext(userId, userContext);
  const niche = detectNiche(lead);
  const facts = buildFacts(lead);
  const gaps = buildGaps(lead);
  const offer = buildOffer(lead, gaps);
  const inferences = buildInferences(lead, niche, gaps);
  const whatsappSummary = buildWhatsappSummary(lead, gaps, offer, niche);
  const loomScript = buildLoomScript(lead, gaps, offer);
  const meetingScript = buildMeetingScript(lead, gaps, offer, niche);
  const markdown = buildMarkdown({ lead, facts, gaps, inferences, offer, whatsappSummary, loomScript, meetingScript });
  const llmContext = buildLlmContext(user, lead, facts, gaps, offer);

  return {
    lead_id: lead.id,
    nome_empresa: lead.nome_empresa,
    niche,
    facts,
    gaps,
    inferences,
    offer,
    whatsapp_summary: whatsappSummary,
    loom_script: loomScript,
    meeting_script: meetingScript,
    markdown,
    llm_context: llmContext,
    safety_notes: [
      'Separar fatos observados de inferencias.',
      'Nao prometer resultado financeiro sem dados confirmados.',
      'Nao enviar automaticamente por WhatsApp a partir desta tela.',
    ],
  };
}

export async function applyAdvancedCommercialDiagnostic(userId, userContext, leadId) {
  const diagnostic = await buildAdvancedCommercialDiagnostic(userId, userContext, leadId);

  const updated = await query(
    `UPDATE leads SET
       diagnostico = $1,
       proxima_acao = $2,
       updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING id, nome_empresa, diagnostico, proxima_acao`,
    [
      diagnostic.markdown,
      `Diagnostico comercial avancado gerado. Revisar resumo, Loom e roteiro de reuniao antes de abordar.`,
      diagnostic.lead_id,
      userId,
    ]
  );

  await query(
    `INSERT INTO lead_followups (lead_id, user_id, tipo, mensagem)
     VALUES ($1, $2, 'nota', $3)`,
    [
      diagnostic.lead_id,
      userId,
      '[Diagnostico avancado] Diagnostico comercial gerado e salvo no lead. Nenhuma mensagem foi enviada automaticamente.',
    ]
  );

  return { diagnostic, lead: updated.rows[0] };
}
