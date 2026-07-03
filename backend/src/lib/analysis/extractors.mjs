const PHONE_PATTERN = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-.\s]?\d{4}/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Heuristica simples para indicio de pagina de contato (nao segue o link, so
// verifica se existe algum href apontando para uma pagina de contato comum).
const CONTACT_PAGE_PATTERN = /href=["'][^"']*(?:\/contato|\/contact|fale-conosco|atendimento)[^"']*["']/i;

// Heuristica simples para CTA visivel: botoes/links com texto comum de
// chamada para acao. Nao garante que o CTA seja visualmente destacado.
const CTA_PATTERN = /(fale\s+conosco|solicite\s+(um\s+)?or[cç]amento|pe[cç]a\s+(um\s+)?or[cç]amento|agende\s+(uma\s+)?(consulta|visita|hor[aá]rio)|compre\s+agora|fale\s+com\s+(um\s+)?(consultor|especialista)|entre\s+em\s+contato|saiba\s+mais|solicitar\s+or[cç]amento)/i;

// Indicio basico de links quebrados: href vazio, "#" ou javascript:void(0)
// usados como placeholder em menus/botoes que nao foram finalizados.
const BROKEN_LINK_PATTERN = /href=["'](#|javascript:void\(0\)?|)["']/gi;

export function extractSignals(html, finalUrl = "") {
  const lower = html.toLowerCase();
  const text = stripTags(html);

  return {
    finalUrl,
    title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i),
    phones: unique(text.match(PHONE_PATTERN) ?? []).slice(0, 5),
    emails: unique(text.match(EMAIL_PATTERN) ?? []).slice(0, 5),
    whatsappLinks: unique(matchAll(html, /href=["']([^"']*(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)[^"']*)["']/gi)).slice(0, 5),
    instagramLinks: unique(matchAll(html, /href=["']([^"']*instagram\.com[^"']*)["']/gi)).slice(0, 5),
    facebookLinks: unique(matchAll(html, /href=["']([^"']*facebook\.com[^"']*)["']/gi)).slice(0, 5),
    linkedinLinks: unique(matchAll(html, /href=["']([^"']*linkedin\.com[^"']*)["']/gi)).slice(0, 5),
    hasForms: /<form[\s>]/i.test(html),
    hasHttps: finalUrl.startsWith("https://"),
    hasMetaPixel: /connect\.facebook\.net|fbq\(|facebook\.com\/tr/i.test(html),
    hasGtm: /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i.test(html),
    hasGa4: /G-[A-Z0-9]{6,}|gtag\(["']config["']\s*,\s*["']G-/i.test(html),
    hasGoogleAdsTag: /AW-\d{6,}|gtag\(["']config["']\s*,\s*["']AW-/i.test(html),
    hasClarity: /clarity\.ms\/tag|clarity\(/i.test(html),
    hasHotjar: /static\.hotjar\.com|hj\(/i.test(html),
    isWordPress: /wp-content|wp-includes|wordpress/i.test(lower),
    usesElementor: /elementor/i.test(lower),
    usesShopify: /cdn\.shopify\.com|shopify/i.test(lower),
    hasContactPage: CONTACT_PAGE_PATTERN.test(html),
    hasCta: CTA_PATTERN.test(text),
    brokenLinksCount: (html.match(BROKEN_LINK_PATTERN) ?? []).length,
  };
}

export function normalizeLead(raw) {
  // Aceita tanto o formato bruto vindo de CSV/API (nome_empresa, site) quanto
  // o formato ja normalizado (companyName, url), para permitir chamar esta
  // funcao de forma idempotente sobre um lead ja processado.
  const url = raw.site || raw.url || raw.website || "";

  const rating = parseNumber(raw.rating);
  const reviewCount = parseNumber(raw.total_avaliacoes ?? raw.review_count ?? raw.reviews ?? raw.reviewCount);

  return {
    companyName: raw.nome_empresa || raw.empresa || raw.nome || raw.name || raw.companyName || "",
    category: raw.categoria || raw.category || "",
    city: raw.cidade || raw.city || "",
    niche: raw.nicho || raw.niche || "",
    phone: raw.telefone || raw.whatsapp || raw.phone || "",
    source: raw.fonte || raw.source || "manual",
    url: normalizeUrl(url),
    notes: raw.observacoes || raw.notes || "",
    rating,
    reviewCount,
  };
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(value, regex) {
  const match = value.match(regex);
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function matchAll(value, regex) {
  return Array.from(value.matchAll(regex), (match) => match[1]);
}

function unique(values) {
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
}
