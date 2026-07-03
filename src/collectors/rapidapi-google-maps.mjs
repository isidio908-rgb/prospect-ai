import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { toCsv } from "../csv.mjs";

export async function collectFromRapidApi(options) {
  const config = loadRapidApiConfig(options);
  const query = options.query || `${options.niche ?? ""} ${options.city ?? ""}`.trim();

  if (!query) throw new Error("Informe --query ou --niche com --city");

  // Parametros da Local Business Data (com valores padrao da especificacao)
  const zoom = options.zoom ?? 13;
  const region = options.region ?? "br";
  const language = options.language ?? "pt";
  const extractEmailsAndContacts = parseBoolean(options.extractEmailsAndContacts ?? false);

  // lat/lng sao obrigatorios quando o template da URL exige {lat}/{lng}
  const templateNeedsLatLng = /\{lat\}|\{lng\}/.test(config.searchUrl);
  if (templateNeedsLatLng && (options.lat === undefined || options.lng === undefined)) {
    throw new Error("Este provider exige --lat e --lng (ex: --lat -15.6014 --lng -56.0979)");
  }

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
    lat: options.lat ?? "",
    lng: options.lng ?? "",
    zoom,
    region,
    language,
    extractEmailsAndContacts,
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
    // A API key nunca deve aparecer no erro/log, apenas o status e um trecho do corpo
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

/**
 * Normaliza um registro de negocio para o contrato interno do Prospect AI.
 * Mapeamento oficial (docs/providers/local-business-data.md), com fallback
 * para chaves genericas de outros providers RapidAPI compativeis.
 */
export function normalizePlace(place, context = {}) {
  const site = pick(place, ["website", "site", "url", "business_website", "web_url", "links.website"]);
  const phone = pick(place, [
    "phone_number",
    "phone",
    "telephone",
    "international_phone_number",
    "formatted_phone_number",
  ]);
  const rating = pick(place, ["rating", "stars", "review_rating"]);
  const reviews = pick(place, ["review_count", "reviews", "reviews_count", "user_ratings_total"]);
  const mapsUrl = pick(place, ["place_link", "google_maps_url", "maps_url", "url", "link"]);
  const reviewsLink = pick(place, ["reviews_link"]);
  const address = pick(place, ["full_address", "address", "formatted_address"]);
  const about = pick(place, ["about.summary"]);
  const subtypes = Array.isArray(place?.subtypes) ? place.subtypes.join(",") : "";

  return {
    nome_empresa: pick(place, ["name", "title", "business_name", "place_name"]),
    site,
    telefone: phone,
    cidade: pick(place, ["city"]) || context.city,
    nicho: context.niche,
    categoria: pick(place, ["type", "category", "main_category", "business_type"]),
    fonte: context.source ?? "rapidapi",
    observacoes: [
      rating ? `rating=${rating}` : "",
      reviews ? `reviews=${reviews}` : "",
      mapsUrl ? `maps=${mapsUrl}` : "",
      reviewsLink ? `reviews_link=${reviewsLink}` : "",
      address ? `address=${address}` : "",
      pick(place, ["place_id"]) ? `place_id=${pick(place, ["place_id"])}` : "",
      pick(place, ["business_id"]) ? `business_id=${pick(place, ["business_id"])}` : "",
      pick(place, ["google_id"]) ? `google_id=${pick(place, ["google_id"])}` : "",
      pick(place, ["business_status"]) ? `status=${pick(place, ["business_status"])}` : "",
      pick(place, ["verified"]) ? `verified=${pick(place, ["verified"])}` : "",
      pick(place, ["district"]) ? `district=${pick(place, ["district"])}` : "",
      pick(place, ["street_address"]) ? `street_address=${pick(place, ["street_address"])}` : "",
      pick(place, ["zipcode"]) ? `zipcode=${pick(place, ["zipcode"])}` : "",
      pick(place, ["state"]) ? `state=${pick(place, ["state"])}` : "",
      pick(place, ["country"]) ? `country=${pick(place, ["country"])}` : "",
      pick(place, ["latitude"]) ? `latitude=${pick(place, ["latitude"])}` : "",
      pick(place, ["longitude"]) ? `longitude=${pick(place, ["longitude"])}` : "",
      subtypes ? `subtypes=${subtypes}` : "",
      about ? `about=${about}` : "",
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

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  return String(value).trim().toLowerCase() === "true";
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
