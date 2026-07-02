import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { auditWebsite } from "./auditor.mjs";
import { parseCsv, toCsv } from "./csv.mjs";
import { normalizeLead } from "./extractors.mjs";
import { buildDiagnosis, buildOutreachMessage } from "./messages.mjs";
import { scoreLead } from "./scoring.mjs";

export async function analyzeLeads(options) {
  const inputPath = resolve(options.input);
  const outputDir = resolve(options.outputDir ?? "data/outputs");
  const city = options.city ?? "";
  const niche = options.niche ?? "";
  const limit = Number(options.limit ?? 0);

  const raw = await readFile(inputPath, "utf8");
  const records = parseCsv(raw)
    .map(normalizeLead)
    .map((lead) => ({
      ...lead,
      city: lead.city || city,
      niche: lead.niche || niche,
    }))
    .filter((lead) => lead.companyName || lead.url);

  const selected = limit > 0 ? records.slice(0, limit) : records;
  const results = [];

  for (const [index, lead] of selected.entries()) {
    console.log(`[${index + 1}/${selected.length}] Analisando ${lead.companyName || lead.url}`);
    const audit = await auditWebsite(lead.url);
    const score = scoreLead(lead, audit);

    results.push(flattenResult(lead, audit, score));
  }

  await mkdir(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = `${stamp}-${basename(inputPath).replace(/\.csv$/i, "")}`;
  const csvPath = resolve(outputDir, `${base}-resultado.csv`);
  const jsonPath = resolve(outputDir, `${base}-resultado.json`);

  await writeFile(csvPath, toCsv(results), "utf8");
  await writeFile(jsonPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");

  return {
    total: results.length,
    csvPath,
    jsonPath,
    highPriority: results.filter((item) => ["Alta", "Prioridade maxima"].includes(item.prioridade)).length,
  };
}

function flattenResult(lead, audit, score) {
  const signals = audit.signals;

  return {
    empresa: lead.companyName,
    nicho: lead.niche,
    cidade: lead.city,
    categoria: lead.category,
    telefone_informado: lead.phone,
    site: lead.url,
    site_final: audit.finalUrl,
    status_site: audit.ok ? "online" : "erro",
    erro_site: audit.error,
    tempo_carregamento_ms: audit.loadMs,
    tamanho_kb: audit.sizeKb,
    score: score.score,
    prioridade: score.priority,
    tem_pixel_meta: yesNo(signals.hasMetaPixel),
    tem_gtm: yesNo(signals.hasGtm),
    tem_ga4: yesNo(signals.hasGa4),
    tem_google_ads_tag: yesNo(signals.hasGoogleAdsTag),
    tem_whatsapp_site: yesNo(signals.whatsappLinks.length > 0),
    tem_formulario: yesNo(signals.hasForms),
    tem_https: yesNo(signals.hasHttps),
    instagram: signals.instagramLinks.join(" | "),
    facebook: signals.facebookLinks.join(" | "),
    emails_encontrados: signals.emails.join(" | "),
    telefones_encontrados: signals.phones.join(" | "),
    oportunidades: score.opportunities.join(" | "),
    pontos_positivos: score.strengths.join(" | "),
    diagnostico: buildDiagnosis(lead, audit, score),
    mensagem_whatsapp: buildOutreachMessage(lead, score),
    fonte: lead.source,
    observacoes: lead.notes,
  };
}

function yesNo(value) {
  return value ? "sim" : "nao";
}
