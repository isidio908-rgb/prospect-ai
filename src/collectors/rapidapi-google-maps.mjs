import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { toCsv } from "../csv.mjs";

export async function collectFromRapidApi(options) {
  const config = loadRapidApiConfig(options);
  const query = options.query || `${options.niche ?? ""} ${options.city ?? ""}`.trim();

  if (!query) throw new Error("Informe --query ou --niche com --city");

  const quota = await readQuota(config.quotaPath);
  const usedToday = quota[config.providerKey]?.[today()] ?? 0;
  const limit = Number(options.limit ?? 20);

  if (usedToday >= config.dailyLimit) {
    throw new Error(`Limite diario atingido para ${config.providerKey}: ${usedToday}/${config.dailyLimit}`);
  }

  const requestLimit = Math.min(limit, config.dailyLimit - usedToday);
  const url = buildSearchUrl(config.searchUrl, {
    query,
    city: options.city ?? "",
    niche: options.niche ?? "",
    limit: requestLimit,
  });

  const response = await fetch(url, {
    method: config.method,
    headers: {
      "x-rapidapi-key": config.key,
      "x-rapidapi-host": config.host,
      accept: "application/json",
    },
  });

  const body = await response.text();
  await incrementQuota(config.quotaPath, config.providerKey);

  if (!response.ok) {
    throw new Error(`RapidAPI retornou HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const json = JSON.parse(body);
  const places = findPlacesArray(json);
  const rows = places.slice(0, requestLimit).map((place) => normalizePlace(place, {
    city: options.city ?? "",
    niche: options.niche ?? "",
    source: config.providerKey,
  }));

  const outputDir = resolve(options.outputDir ?? "data/inputs");
  await mkdir(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = resolve(outputDir, `${stamp}-rapidapi-leads.csv`);
  await writeFile(outputPath, toCsv(rows), "utf8");

  return {
    total: rows.length,
    outputPath,
    provider: config.providerKey,
    usedToday: usedToday + 1,
    dailyLimit: config.dailyLimit,
  };
}

export function normalizePlace(place, context = {}) {
  const site = pick(place, ["website", "site", "url", "business_website", "web_url", "links.website"]);
  const phone = pick(place, [
    "phone",
    "telephone",
    "phone_number",
    "international_phone_number",
    "formatted_phone_number",
  ]);
  const rating = pick(place, ["rating", "stars", "review_rating"]);
  const reviews = pick(place, ["reviews", "reviews_count", "user_ratings_total", "review_count"]);
  const mapsUrl = pick(place, ["google_maps_url", "maps_url", "place_link", "url", "link"]);
  const address = pick(place, ["address", "full_address", "formatted_address"]);

  return {
    nome_empresa: pick(place, ["name", "title", "business_name", "place_name"]),
    site,
    telefone: phone,
    cidade: context.city,
    nicho: context.niche,
    categoria: pick(place, ["category", "type", "main_category", "business_type"]),
    fonte: context.source ?? "rapidapi",
    observacoes: [
      rating ? `rating=${rating}` : "",
      reviews ? `reviews=${reviews}` : "",
      mapsUrl ? `maps=${mapsUrl}` : "",
      address,
    ].filter(Boolean).join(" | "),
  };
}

function loadRapidApiConfig(options) {
  const key = options.rapidapiKey || process.env.RAPIDAPI_KEY;
  const host = options.rapidapiHost || process.env.RAPIDAPI_HOST;
  const searchUrl = options.searchUrl || process.env.RAPIDAPI_SEARCH_URL;

  if (!key) throw new Error("Configure RAPIDAPI_KEY");
  if (!host) throw new Error("Configure RAPIDAPI_HOST");
  if (!searchUrl) throw new Error("Configure RAPIDAPI_SEARCH_URL");

  return {
    key,
    host,
    searchUrl,
    method: options.method || process.env.RAPIDAPI_METHOD || "GET",
    dailyLimit: Number(options.dailyLimit || process.env.RAPIDAPI_DAILY_LIMIT || 100),
    providerKey: options.provider || process.env.RAPIDAPI_PROVIDER_NAME || host,
    quotaPath: resolve(options.quotaPath || "data/outputs/rapidapi-quota.json"),
  };
}

function buildSearchUrl(template, params) {
  let url = template;
  for (const [key, value] of Object.entries(params)) {
    url = url.replaceAll(`{${key}}`, encodeURIComponent(String(value)));
  }
  return url;
}

function findPlacesArray(value) {
  if (Array.isArray(value)) return value;

  const candidates = [
    value?.data,
    value?.results,
    value?.places,
    value?.items,
    value?.businesses,
    value?.local_results,
    value?.data?.results,
    value?.data?.places,
    value?.data?.items,
  ];

  return candidates.find(Array.isArray) ?? [];
}

function pick(object, paths) {
  for (const path of paths) {
    const value = path.split(".").reduce((current, part) => current?.[part], object);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

async function readQuota(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return {};
  }
}

async function incrementQuota(path, provider) {
  const quota = await readQuota(path);
  quota[provider] ??= {};
  quota[provider][today()] = (quota[provider][today()] ?? 0) + 1;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(quota, null, 2)}\n`, "utf8");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
