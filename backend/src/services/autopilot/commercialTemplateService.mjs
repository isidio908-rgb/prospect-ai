import { query } from '../../database/init.mjs';

const TONES = {
  consultivo: {
    label: 'Consultivo',
    stance: 'tom consultivo, objetivo e sem pressao',
    cta: 'Posso te enviar um diagnostico rapido, sem compromisso?',
  },
  direto: {
    label: 'Direto',
    stance: 'tom direto, curto e orientado a oportunidade',
    cta: 'Faz sentido eu te mostrar rapidamente o que encontrei?',
  },
  diagnostico: {
    label: 'Diagnostico',
    stance: 'tom de auditoria rapida, baseado em fatos observados',
    cta: 'Quer que eu te mande o diagnostico com os pontos principais?',
  },
  oportunidade: {
    label: 'Oportunidade',
    stance: 'tom de oportunidade comercial, conectando perda de demanda e melhoria de conversao',
    cta: 'Posso te mostrar onde pode existir oportunidade de gerar mais contatos?',
  },
};

const NICHES = {
  imobiliarias: {
    label: 'Imobiliarias',
    match: ['imobiliaria', 'imobiliarias', 'imoveis', 'imovel', 'corretor'],
    painContext: 'captacao de interessados, visitas e simulacoes pelo WhatsApp',
    offerFocus: 'campanhas de captacao, remarketing, landing pages e mensuracao de leads',
  },
  clinicas: {
    label: 'Clinicas',
    match: ['clinica', 'clinicas', 'medico', 'cardiologista', 'ortopedista', 'veterinaria', 'veterinario', 'quiropraxia'],
    painContext: 'agendamentos, pedidos de avaliacao e novos pacientes',
    offerFocus: 'campanhas locais, estrutura de conversao no site e rastreamento de agendamentos',
  },
  odontologia: {
    label: 'Odontologia',
    match: ['odontologia', 'odontologica', 'dentista', 'ortodontia'],
    painContext: 'avaliacoes, orcamentos e agendamentos pelo WhatsApp',
    offerFocus: 'campanhas para tratamentos, remarketing e rastreamento de consultas',
  },
  estetica: {
    label: 'Estetica',
    match: ['estetica', 'harmonizacao', 'beleza', 'spa', 'depilacao'],
    painContext: 'avaliacoes, pacotes e agendamentos recorrentes',
    offerFocus: 'campanhas de oferta, prova social, criativos e remarketing',
  },
  advocacia: {
    label: 'Advocacia',
    match: ['advogado', 'advocacia', 'juridico', 'juridica'],
    painContext: 'pedidos de atendimento qualificado e consultas iniciais',
    offerFocus: 'captacao local com compliance, paginas de conversao e mensuracao de formularios',
  },
  escolas: {
    label: 'Escolas',
    match: ['escola', 'colegio', 'curso', 'educacao', 'faculdade'],
    painContext: 'matriculas, visitas e pedidos de informacao',
    offerFocus: 'campanhas de matricula, funil de leads e acompanhamento por WhatsApp',
  },
  energia_solar: {
    label: 'Energia solar',
    match: ['energia solar', 'solar', 'fotovoltaica', 'fotovoltaico'],
    painContext: 'orcamentos de alto ticket e leads com intencao real',
    offerFocus: 'captacao qualificada, paginas de simulacao e rastreamento de propostas',
  },
  moveis_planejados: {
    label: 'Moveis planejados',
    match: ['moveis planejados', 'marcenaria', 'planejados', 'decoracao', 'interiores'],
    painContext: 'orcamentos, projetos e visitas comerciais',
    offerFocus: 'campanhas para projetos, criativos de portfolio e mensuracao de contatos',
  },
  default: {
    label: 'Negocio local',
    match: [],
    painContext: 'geracao de contatos e oportunidades pelo digital',
    offerFocus: 'campanhas locais, tracking e melhorias de conversao',
  },
};

function clean(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function boolLabel(value) {
  return value ? 'sim' : 'nao';
}

export function getCommercialTemplateCatalog() {
  return {
    tones: Object.entries(TONES).map(([key, value]) => ({ key, ...value })),
    niches: Object.entries(NICHES).map(([key, value]) => ({
      key,
      label: value.label,
      painContext: value.painContext,
      offerFocus: value.offerFocus,
    })),
  };
}

function detectNicheKey(lead, requestedKey) {
  if (requestedKey && NICHES[requestedKey]) return requestedKey;

  const source = normalize(`${lead.nicho || ''} ${lead.categoria || ''} ${lead.nome_empresa || ''}`);
  const matched = Object.entries(NICHES).find(([key, niche]) => (
    key !== 'default' && niche.match.some((item) => source.includes(normalize(item)))
  ));

  return matched?.[0] || 'default';
}

function detectPains(lead) {
  const pains = [];

  if (!lead.site) {
    pains.push({ key: 'sem_site', label: 'nao identifiquei site', weight: 25 });
  }

  if (lead.site && !lead.tem_pixel_meta) {
    pains.push({ key: 'sem_pixel', label: 'nao encontrei Pixel Meta', weight: 20 });
  }

  if (lead.site && !lead.tem_gtm) {
    pains.push({ key: 'sem_gtm', label: 'nao encontrei Google Tag Manager', weight: 15 });
  }

  if (lead.site && !lead.tem_ga4) {
    pains.push({ key: 'sem_ga4', label: 'nao encontrei GA4', weight: 15 });
  }

  if (lead.site && !lead.tem_whatsapp_site) {
    pains.push({ key: 'sem_whatsapp_site', label: 'o WhatsApp nao parece estar visivel no site', weight: 15 });
  }

  if (lead.site && !lead.tem_formulario) {
    pains.push({ key: 'sem_formulario', label: 'nao identifiquei formulario de contato', weight: 8 });
  }

  if (Number(lead.tempo_carregamento_ms || 0) > 3000) {
    pains.push({ key: 'site_lento', label: 'o site parece carregar acima do ideal', weight: 10 });
  }

  if (Number(lead.total_avaliacoes || 0) > 100 && lead.site && (!lead.tem_pixel_meta || !lead.tem_ga4)) {
    pains.push({ key: 'prova_social_sem_tracking', label: 'existe prova social, mas a estrutura de mensuracao parece incompleta', weight: 15 });
  }

  return pains.sort((a, b) => b.weight - a.weight).slice(0, 4);
}

function buildObservedFacts(lead, pains) {
  const facts = [
    `Site: ${lead.site ? 'identificado' : 'nao identificado'}`,
    lead.site ? `Pixel Meta: ${boolLabel(lead.tem_pixel_meta)}` : '',
    lead.site ? `GTM: ${boolLabel(lead.tem_gtm)}` : '',
    lead.site ? `GA4: ${boolLabel(lead.tem_ga4)}` : '',
    lead.site ? `WhatsApp no site: ${boolLabel(lead.tem_whatsapp_site)}` : '',
    lead.rating ? `Nota Google: ${lead.rating}` : '',
    lead.total_avaliacoes ? `Avaliacoes: ${lead.total_avaliacoes}` : '',
    pains.length ? `Dores observadas: ${pains.map((pain) => pain.label).join('; ')}` : '',
  ].filter(Boolean);

  return facts;
}

function buildPainSentence(pains) {
  if (pains.length === 0) {
    return 'encontrei alguns pontos que podem ser revisados para melhorar a geracao de oportunidades';
  }

  if (pains.length === 1) {
    return pains[0].label;
  }

  const labels = pains.slice(0, 3).map((pain) => pain.label);
  return `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`;
}

function buildProfessionalContext(user, lead, niche, tone) {
  const profession = clean(user.profession) || 'Gestor de Trafego';
  const primaryNiche = clean(user.primary_niche) || 'prospeccao comercial local';
  const internalContext = clean(user.internal_context) || 'priorizar diagnostico consultivo, qualidade do lead e clareza comercial';

  return [
    `Profissao do usuario: ${profession}.`,
    `Nicho foco do usuario: ${primaryNiche}.`,
    `Instrucoes internas do usuario: ${internalContext}.`,
    `Nicho do lead: ${niche.label}.`,
    `Tom escolhido: ${tone.label} (${tone.stance}).`,
    'Regra obrigatoria: usar apenas dados observados no lead; nao inventar campanha ativa, faturamento, investimento, resultados ou problemas nao detectados.',
    `Empresa analisada: ${lead.nome_empresa}.`,
  ].join('\n');
}

function buildTemplate(user, lead, options = {}) {
  const tone = TONES[options.tone] || TONES.consultivo;
  const nicheKey = detectNicheKey(lead, options.niche_key);
  const niche = NICHES[nicheKey] || NICHES.default;
  const pains = detectPains(lead);
  const painSentence = buildPainSentence(pains);
  const city = clean(lead.cidade) || 'sua regiao';
  const company = clean(lead.nome_empresa) || 'sua empresa';
  const profession = clean(user.profession) || 'Gestor de Trafego';

  const initial = [
    'Ola, tudo bem?',
    '',
    `Estava analisando algumas empresas em ${city} no segmento de ${niche.label.toLowerCase()} e vi a ${company}.`,
    '',
    `Notei que ${painSentence}. Isso pode impactar ${niche.painContext}.`,
    '',
    `Como ${profession}, eu olharia principalmente para ${niche.offerFocus}.`,
    '',
    tone.cta,
  ].join('\n');

  const followup = [
    'Oi, tudo bem? Passando so para retomar minha mensagem anterior.',
    '',
    `Eu tinha separado alguns pontos sobre a presenca digital da ${company}, principalmente ligados a ${niche.painContext}.`,
    '',
    'Se fizer sentido, posso te mandar um resumo bem direto do que encontrei.',
  ].join('\n');

  const diagnostic = [
    `${company} tem potencial para uma abordagem consultiva no segmento de ${niche.label.toLowerCase()}.`,
    pains.length
      ? `Os principais pontos observados foram: ${pains.map((pain) => pain.label).join('; ')}.`
      : 'Os dados atuais sugerem revisar conversao, mensuracao e clareza de contato antes de escalar midia.',
    `Oferta recomendada: ${niche.offerFocus}.`,
  ].join(' ');

  return {
    lead_id: lead.id,
    nome_empresa: company,
    niche_key: nicheKey,
    niche_label: niche.label,
    tone_key: Object.entries(TONES).find(([, value]) => value === tone)?.[0] || 'consultivo',
    tone_label: tone.label,
    pains,
    observed_facts: buildObservedFacts(lead, pains),
    professional_context: buildProfessionalContext(user, lead, niche, tone),
    messages: {
      initial,
      followup,
      diagnostic,
    },
  };
}

async function getLeadForUser(userId, leadId) {
  const result = await query(
    `SELECT * FROM leads WHERE id = $1 AND user_id = $2`,
    [leadId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('Lead nao encontrado');
    error.status = 404;
    throw error;
  }

  return result.rows[0];
}

async function getUserContext(userId, fallbackUser = {}) {
  const result = await query(
    `SELECT id, profession, primary_niche, internal_context FROM users WHERE id = $1`,
    [userId]
  );

  return { ...(result.rows[0] || {}), ...fallbackUser };
}

export async function previewCommercialTemplate(userId, userContext, options = {}) {
  const leadId = Number(options.lead_id);
  if (!leadId) {
    const error = new Error('lead_id e obrigatorio');
    error.status = 400;
    throw error;
  }

  const lead = await getLeadForUser(userId, leadId);
  const user = await getUserContext(userId, userContext);
  return buildTemplate(user, lead, options);
}

export async function applyCommercialTemplate(userId, userContext, options = {}) {
  const preview = await previewCommercialTemplate(userId, userContext, options);

  const update = await query(
    `UPDATE leads SET
      mensagem_whatsapp = $1,
      mensagem_whatsapp_followup = $2,
      diagnostico = CASE WHEN diagnostico IS NULL OR diagnostico = '' THEN $3 ELSE diagnostico END,
      proxima_acao = $4,
      updated_at = NOW()
     WHERE id = $5 AND user_id = $6
     RETURNING id, nome_empresa, mensagem_whatsapp, mensagem_whatsapp_followup, diagnostico, proxima_acao`,
    [
      preview.messages.initial,
      preview.messages.followup,
      preview.messages.diagnostic,
      `Template ${preview.niche_label}/${preview.tone_label} aplicado. Revisar antes de enviar.`,
      preview.lead_id,
      userId,
    ]
  );

  await query(
    `INSERT INTO lead_followups (lead_id, user_id, tipo, mensagem)
     VALUES ($1, $2, 'nota', $3)`,
    [
      preview.lead_id,
      userId,
      `[Templates] Aplicado template ${preview.niche_label}/${preview.tone_label}. Revisar antes de enviar qualquer mensagem.`,
    ]
  );

  return { template: preview, lead: update.rows[0] };
}
