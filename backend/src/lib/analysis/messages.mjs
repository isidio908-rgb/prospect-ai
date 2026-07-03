/**
 * Primeiro estagio: mensagem inicial de abordagem (spec secao 10).
 * Objetivo e curioso, sem citar os problemas encontrados ainda.
 */
export function buildOutreachMessage(lead, score) {
  const company = lead.companyName || "sua empresa";
  const city = lead.city ? ` em ${lead.city}` : "";

  if (!score.opportunities.length) {
    return `Ola, tudo bem? Estava analisando algumas empresas${city} e vi a ${company}. A presenca digital de voces ja tem alguns pontos bons, mas acredito que ainda da para melhorar a geracao de oportunidades no Google, site e WhatsApp. Posso te enviar um diagnostico rapido, sem compromisso, mostrando o que encontrei?`;
  }

  return `Ola, tudo bem? Estava analisando algumas empresas${city} e vi a ${company}. Encontrei alguns pontos simples que podem estar fazendo vocês perderem oportunidades no digital, principalmente em Google, site e WhatsApp. Posso te enviar um diagnostico rapido, sem compromisso, mostrando o que encontrei?`;
}

/**
 * Segundo estagio: mensagem apos resposta positiva do lead (spec secao 10).
 * Lista os problemas encontrados de forma numerada e convida para uma call.
 */
export function buildFollowUpMessage(lead, score) {
  const topProblems = score.opportunities.slice(0, 3);

  if (!topProblems.length) {
    return `Perfeito. Fiz uma analise rapida e nao encontrei falhas criticas, mas ainda existe espaco para evoluir a estrutura de conversao de voces. Se fizer sentido, posso te mostrar em uma chamada rapida de 15 minutos como aproveitar melhor isso.`;
  }

  const list = topProblems.map((problem, index) => `${index + 1}. ${problem}`).join("\n");

  return `Perfeito.\nFiz uma analise rapida e encontrei estes pontos:\n${list}\n\nIsso normalmente impacta diretamente a quantidade de pessoas que chamam no WhatsApp ou solicitam orcamento.\n\nSe fizer sentido, posso te mostrar em uma chamada rapida de 15 minutos como corrigir isso.`;
}

/**
 * Diagnostico comercial (spec secao 9): tom de negocio, focado em impacto,
 * evitando jargao tecnico. Usa no maximo os 3 problemas mais relevantes.
 */
export function buildDiagnosis(lead, audit, score) {
  const company = lead.companyName || "A empresa";

  if (!lead.url) {
    return `${company} nao possui site cadastrado. Isso limita a capacidade de captar clientes pelo Google e dificulta usar anuncios pagos com eficiencia, pois nao ha um destino claro para levar quem clica.`;
  }

  if (!audit.ok) {
    return `${company} possui site, mas ele nao carregou corretamente durante a analise. Isso pode estar afastando clientes e reduzindo a confianca de quem chega pelo Google ou redes sociais.`;
  }

  const topProblems = score.opportunities.slice(0, 3);

  if (!topProblems.length) {
    return `${company} possui uma boa base digital, com estrutura de mensuracao e canais de contato presentes. Ainda vale revisar oportunidades de otimizacao para melhorar a captacao de clientes pelo digital.`;
  }

  const problemsText = describeProblemsInPlainLanguage(topProblems);

  return `${company} possui boa presenca local, mas o site ${problemsText}. Isso pode estar reduzindo a quantidade de pessoas que entram em contato pelo WhatsApp ou solicitam orcamento pelo site.`;
}

/**
 * Traduz os labels tecnicos de oportunidades para uma frase comercial unica,
 * evitando termos como "Pixel", "GTM" ou "GA4" isolados sem contexto.
 */
function describeProblemsInPlainLanguage(problems) {
  const mapped = problems.map((problem) => COMMERCIAL_PHRASES[problem] ?? problem.toLowerCase());
  return `${joinNaturally(mapped)}`;
}

function joinNaturally(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

const COMMERCIAL_PHRASES = {
  "Nao possui site informado": "nao tem site",
  "Site nao carregou corretamente": "esta com problemas de acesso",
  "Nao encontrei Pixel da Meta": "nao tem como medir quem vem do Facebook e Instagram",
  "Nao encontrei Google Tag Manager": "nao tem uma estrutura de mensuracao organizada",
  "Nao encontrei GA4": "nao tem como acompanhar visitantes e conversoes",
  "Nao encontrei Google Ads Tag": "nao tem como medir o retorno de anuncios no Google",
  "WhatsApp nao esta evidente no site": "nao deixa o WhatsApp visivel para contato rapido",
  "Nao encontrei formulario de contato": "nao tem um formulario simples de contato",
  "Site sem HTTPS no endereco final": "nao tem certificado de seguranca (HTTPS)",
  "Site com carregamento lento": "demora para carregar",
  "Pagina inicial muito pesada": "tem uma pagina inicial pesada, o que atrasa o carregamento",
  "Redes sociais pouco visiveis no site": "nao deixa as redes sociais visiveis",
  "Poucas avaliacoes no perfil do negocio": "tem poucas avaliacoes no perfil online",
  "Muitas avaliacoes mas sem estrutura de tracking": "tem boa reputacao mas nao mede os resultados dos anuncios",
  "Categoria de alto ticket com espaco para estrutura digital": "esta em um segmento que costuma se beneficiar de mais estrutura digital",
  "Site existe mas sem estrutura clara de conversao": "nao apresenta um caminho claro para o cliente entrar em contato",
};
