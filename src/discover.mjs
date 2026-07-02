import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { toCsv } from "./csv.mjs";

const SOCIAL_OR_NOISE = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "wa.me",
  "api.whatsapp.com",
  "google.com",
  "gstatic.com",
  "schema.org",
];

export async function discoverLeads(options) {
  if (!options.url && !options.html) {
    throw new Error("Informe --url ou --html");
  }

  const source = options.url || options.html;
  const html = options.url ? await fetchHtml(options.url) : await readFile(resolve(options.html), "utf8");
  const baseUrl = options.url || `file://${resolve(options.html)}`;
  const rows = extractLeadsFromHtml(html, {
    baseUrl,
    city: options.city ?? "",
    niche: options.niche ?? "",
    category: options.category ?? "",
    source,
  });

  const outputDir = resolve(options.outputDir ?? "data/inputs");
  await mkdir(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = resolve(outputDir, `${stamp}-discovered-leads.csv`);
  await writeFile(outputPath, toCsv(rows), "utf8");

  return {
    total: rows.length,
    outputPath,
  };
}

export function extractLeadsFromHtml(html, context) {
  const sourceHost = hostOf(context.baseUrl);
  const links = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => ({
      href: absolutize(match[1], context.baseUrl),
      label: cleanText(match[2]),
    }))
    .filter((link) => isBusinessUrl(link.href, sourceHost));

  const byHost = new Map();
  for (const link of links) {
    const host = hostOf(link.href);
    if (!host || byHost.has(host)) continue;

    byHost.set(host, {
      nome_empresa: link.label || host.replace(/^www\./, ""),
      site: link.href,
      telefone: "",
      cidade: context.city,
      nicho: context.niche,
      categoria: context.category,
      fonte: context.source,
      observacoes: "Extraido de pagina publica/diretorio",
    });
  }

  return Array.from(byHost.values());
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "ProspectAI/0.1 (+public directory discovery)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao buscar ${url}`);
  }

  return response.text();
}

function absolutize(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return "";
  }
}

function isBusinessUrl(value, sourceHost = "") {
  if (!value || !/^https?:\/\//i.test(value)) return false;
  const host = hostOf(value);
  if (!host) return false;
  if (sourceHost && host === sourceHost) return false;
  return !SOCIAL_OR_NOISE.some((blocked) => host.includes(blocked));
}

function hostOf(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function cleanText(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
