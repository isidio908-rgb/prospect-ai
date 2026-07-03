import { normalizeLocalBusinessData } from '../localBusinessDataCollector.mjs';

const RAPIDAPI_NOT_SUBSCRIBED_MESSAGE =
  'Sua chave RapidAPI não está inscrita nesta API. Abra a página da API Local Business Data no RapidAPI, assine o plano desejado e tente novamente.';

function buildRapidApiError(status, text) {
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    // Mantem texto bruto quando o RapidAPI nao retornar JSON.
  }

  const message = payload?.message || text;
  if (status === 403 && /not subscribed/i.test(message)) {
    return RAPIDAPI_NOT_SUBSCRIBED_MESSAGE;
  }

  return `RapidAPI retornou ${status}: ${String(message || '').slice(0, 200)}`;
}

/**
 * Coleta via RapidAPI - Local Business Data.
 * Função pura: apenas faz a requisição e normaliza. Cota/uso e persistência
 * são responsabilidade do dispatcher (scraperCollector.mjs).
 */
export async function collect(apiKey, credential, options) {
  const {
    query: searchQuery,
    city,
    niche,
    limit = 20,
    lat,
    lng,
    zoom = 13,
    language = 'pt',
    region = 'br',
    extractEmailsAndContacts = false,
    remainingQuota = limit,
  } = options;

  const params = new URLSearchParams();
  params.append('query', searchQuery || `${niche} em ${city}`);
  params.append('limit', String(Math.max(1, Math.min(limit, remainingQuota))));

  if (lat) params.append('lat', lat);
  if (lng) params.append('lng', lng);
  if (zoom) params.append('zoom', zoom);
  if (language) params.append('language', language);
  if (region) params.append('region', region);
  if (extractEmailsAndContacts) params.append('extract_emails_and_contacts', 'true');

  const base = (credential.base_url || 'https://local-business-data.p.rapidapi.com').replace(/\/$/, '');
  const endpoint = credential.search_endpoint || '/search';
  const url = `${base}${endpoint}?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': credential.api_host || 'local-business-data.p.rapidapi.com',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(buildRapidApiError(response.status, error.slice(0, 500)));
  }

  const data = await response.json();
  const businesses = data.data || [];

  const leads = businesses.map((business) =>
    normalizeLocalBusinessData(business, { city, niche, source: 'local_business_data' })
  );

  return { leads };
}

/**
 * Testa a credencial fazendo uma busca mínima.
 */
export async function test(apiKey, credential) {
  const base = (credential.base_url || 'https://local-business-data.p.rapidapi.com').replace(/\/$/, '');
  const endpoint = credential.search_endpoint || '/search';
  const response = await fetch(`${base}${endpoint}?query=test&limit=1`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': credential.api_host || 'local-business-data.p.rapidapi.com',
    },
  });
  return { success: response.ok, statusCode: response.status };
}

export { RAPIDAPI_NOT_SUBSCRIBED_MESSAGE, buildRapidApiError };
