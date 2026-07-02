export function scoreLead(lead, audit) {
  const signals = audit.signals;
  const opportunities = [];
  const strengths = [];
  let score = 0;

  if (!lead.url) add(opportunities, "Nao possui site informado", 25);
  if (lead.url && !audit.ok) add(opportunities, "Site nao carregou corretamente", 20);
  if (audit.ok && !signals.hasMetaPixel) add(opportunities, "Nao encontrei Pixel da Meta", 20);
  if (audit.ok && !signals.hasGtm) add(opportunities, "Nao encontrei Google Tag Manager", 15);
  if (audit.ok && !signals.hasGa4) add(opportunities, "Nao encontrei GA4", 15);
  if (audit.ok && !signals.whatsappLinks.length) add(opportunities, "WhatsApp nao esta evidente no site", 15);
  if (audit.ok && !signals.hasForms) add(opportunities, "Nao encontrei formulario de contato", 8);
  if (audit.ok && !signals.hasHttps) add(opportunities, "Site sem HTTPS no endereco final", 12);
  if (audit.ok && audit.loadMs > 5000) add(opportunities, "Site com carregamento lento", 10);
  if (audit.ok && audit.sizeKb > 2500) add(opportunities, "Pagina inicial muito pesada", 6);
  if (audit.ok && !signals.instagramLinks.length && !signals.facebookLinks.length) add(opportunities, "Redes sociais pouco visiveis no site", 6);

  if (signals.hasMetaPixel) strengths.push("Possui Pixel da Meta");
  if (signals.hasGtm) strengths.push("Possui GTM");
  if (signals.hasGa4) strengths.push("Possui GA4");
  if (signals.whatsappLinks.length) strengths.push("WhatsApp aparece no site");
  if (signals.hasForms) strengths.push("Possui formulario");
  if (signals.instagramLinks.length) strengths.push("Instagram linkado");
  if (signals.facebookLinks.length) strengths.push("Facebook linkado");

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

function priority(score) {
  if (score >= 80) return "Prioridade maxima";
  if (score >= 60) return "Alta";
  if (score >= 35) return "Media";
  return "Baixa";
}
