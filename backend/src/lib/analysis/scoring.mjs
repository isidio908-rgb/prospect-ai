// Categorias com ticket medio mais alto, onde a falta de estrutura digital
// custa mais caro em oportunidades perdidas (spec secao 8).
const HIGH_TICKET_CATEGORIES = [
  "imobiliaria", "imobiliarias", "real estate",
  "advocacia", "advogado", "advogados", "escritorio de advocacia",
  "clinica", "clinicas", "odontologia", "dentista", "dermatologista",
  "clinica de estetica", "estetica", "cirurgia plastica",
  "arquitetura", "arquiteto", "engenharia", "construtora", "incorporadora",
  "hotel", "hoteis", "pousada",
  "consultoria", "contabilidade", "contador",
  "joalheria", "joias", "moveis planejados", "moveis sob medida",
];

export function scoreLead(lead, audit) {
  const signals = audit.signals;
  const opportunities = [];
  const strengths = [];
  let score = 0;

  const hasSite = Boolean(lead.url);
  const rating = toNumber(lead.rating);
  const reviewCount = toNumber(lead.reviewCount);
  const isHighTicket = isHighTicketCategory(lead.category, lead.niche);

  if (!hasSite) add(opportunities, "Nao possui site informado", 25);
  if (hasSite && !audit.ok) add(opportunities, "Site nao carregou corretamente", 20);
  if (audit.ok && !signals.hasMetaPixel) add(opportunities, "Nao encontrei Pixel da Meta", 20);
  if (audit.ok && !signals.hasGtm) add(opportunities, "Nao encontrei Google Tag Manager", 15);
  if (audit.ok && !signals.hasGa4) add(opportunities, "Nao encontrei GA4", 15);
  if (audit.ok && !signals.hasGoogleAdsTag) add(opportunities, "Nao encontrei Google Ads Tag", 10);
  if (audit.ok && !signals.whatsappLinks.length) add(opportunities, "WhatsApp nao esta evidente no site", 15);
  if (audit.ok && !signals.hasForms) add(opportunities, "Nao encontrei formulario de contato", 8);
  if (audit.ok && !signals.hasHttps) add(opportunities, "Site sem HTTPS no endereco final", 8);
  if (audit.ok && audit.loadMs > 5000) add(opportunities, "Site com carregamento lento", 10);
  if (audit.ok && audit.sizeKb > 2500) add(opportunities, "Pagina inicial muito pesada", 6);
  if (audit.ok && !signals.instagramLinks.length && !signals.facebookLinks.length) add(opportunities, "Redes sociais pouco visiveis no site", 6);

  // Regras adicionais da especificacao (secao 8): reputacao local e tipo de negocio.
  if (reviewCount !== null && reviewCount > 0 && reviewCount < 10) {
    add(opportunities, "Poucas avaliacoes no perfil do negocio", 10);
  }
  if (reviewCount !== null && reviewCount >= 50 && audit.ok && !hasAnyTracking(signals)) {
    add(opportunities, "Muitas avaliacoes mas sem estrutura de tracking", 15);
  }
  if (isHighTicket) {
    add(opportunities, "Categoria de alto ticket com espaco para estrutura digital", 20);
  }
  if (hasSite && audit.ok && !hasAnyTracking(signals) && !signals.whatsappLinks.length && !signals.hasForms) {
    add(opportunities, "Site existe mas sem estrutura clara de conversao", 15);
  }

  if (signals.hasMetaPixel) strengths.push("Possui Pixel da Meta");
  if (signals.hasGtm) strengths.push("Possui GTM");
  if (signals.hasGa4) strengths.push("Possui GA4");
  if (signals.hasGoogleAdsTag) strengths.push("Possui Google Ads Tag");
  if (signals.whatsappLinks.length) strengths.push("WhatsApp aparece no site");
  if (signals.hasForms) strengths.push("Possui formulario");
  if (signals.instagramLinks.length) strengths.push("Instagram linkado");
  if (signals.facebookLinks.length) strengths.push("Facebook linkado");
  if (signals.linkedinLinks?.length) strengths.push("LinkedIn linkado");
  if (rating !== null && rating >= 4.5) strengths.push("Boa reputacao local (rating alto)");

  return {
    score: Math.min(score, 100),
    priority: priority(score),
    opportunities,
    strengths,
  };

  function add(list, label, points) {
    score += points;
    list.push(label);
  }
}

function hasAnyTracking(signals) {
  return Boolean(signals.hasMetaPixel || signals.hasGtm || signals.hasGa4 || signals.hasGoogleAdsTag);
}

function isHighTicketCategory(category, niche) {
  const value = `${category ?? ""} ${niche ?? ""}`.toLowerCase();
  if (!value.trim()) return false;
  return HIGH_TICKET_CATEGORIES.some((keyword) => value.includes(keyword));
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function priority(score) {
  if (score >= 80) return "Prioridade maxima";
  if (score >= 60) return "Alta";
  if (score >= 35) return "Media";
  return "Baixa";
}
