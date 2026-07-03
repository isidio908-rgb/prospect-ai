/**
 * Coleta via Apify - Google Maps Scraper.
 *
 * Usa o endpoint run-sync-get-dataset-items, que dispara o Actor e retorna
 * os itens do dataset quando a execução termina (síncrono).
 *
 * O Actor validado no console da Apify usa este input:
 *   { language: string, location: string, max_results: number, query: string }
 *
 * Exemplo validado:
 *   { language: 'en', location: 'San Francisco, CA, USA', max_results: 100, query: 'restaurant' }
 *
 * A normalização abaixo aceita nomes de campos alternativos para funcionar com
 * diferentes Actors de Google Maps do store.
 */
function firstDefined(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function splitQueryAndLocation(searchQuery = '') {
  const value = String(searchQuery || '').trim();
  const match = value.match(/\s+em\s+(.+)$/i);

  if (!match) {
    return { query: value, location: '' };
  }

  return {
    query: value.slice(0, match.index).trim(),
    location: match[1].trim(),
  };
}

export function buildApifyGoogleMapsInput(options = {}) {
  const { query: searchQuery, city, niche, limit = 20, language = 'pt', region } = options;
  const inferred = splitQueryAndLocation(searchQuery);
  const query = (niche || inferred.query || searchQuery || '').trim();
  const location = (inferred.location || city || region || '').trim();

  if (!query) {
    throw new Error('Informe uma busca (query) ou nicho para o Apify');
  }

  return {
    language: language || 'pt',
    location,
    max_results: Math.max(1, Math.min(Number(limit) || 20, 500)),
    query,
  };
}

function normalizeApifyPlace(item, context = {}) {
  const name = firstDefined(item.name, item.title, item.placeName, item.businessName) || '';
  const address = firstDefined(item.full_address, item.address, item.formattedAddress, item.street) || '';
  const phone = firstDefined(item.phone, item.phoneNumber, item.phone_number, item.telephone) || '';
  const website = firstDefined(item.website, item.url && !String(item.url).includes('google.') ? item.url : undefined) || '';
  const rating = firstDefined(item.total_score, item.totalScore, item.rating, item.stars);
  const reviews = firstDefined(item.reviews_count, item.reviewsCount, item.review_count, item.userRatingCount, item.reviews);
  const category = firstDefined(item.category, item.categoryName, item.type, Array.isArray(item.categories) ? item.categories[0] : undefined) || '';
  const mapsUrl = firstDefined(item.google_maps_url, item.googleMapsUrl, item.placeUrl, item.url) || null;
  const placeId = firstDefined(item.place_id, item.placeId, item.cid, item.googlePlaceId) || null;
  const lat = firstDefined(item.latitude, item.lat, item.location?.lat);
  const lng = firstDefined(item.longitude, item.lng, item.location?.lng);
  const city = firstDefined(item.city, context.city) || '';

  const observacoesParts = [
    address ? `address=${address}` : '',
    item.state ? `state=${item.state}` : '',
    item.postalCode || item.zipcode ? `zipcode=${item.postalCode || item.zipcode}` : '',
    lat !== undefined ? `latitude=${lat}` : '',
    lng !== undefined ? `longitude=${lng}` : '',
  ].filter(Boolean);

  return {
    nome_empresa: name,
    site: website,
    telefone: phone,
    cidade: city,
    nicho: context.niche || '',
    categoria: category,
    fonte: 'apify_google_maps',

    place_id: placeId,
    business_id: firstDefined(item.business_id, item.businessId) || null,
    google_id: firstDefined(item.google_id, item.googleId) || null,

    rating: rating ?? null,
    total_avaliacoes: reviews ?? null,
    google_maps_url: mapsUrl,

    observacoes: observacoesParts.join(' | '),
  };
}

function formatApifyError(status, text, requestBody) {
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    // Mantem texto bruto quando a Apify nao retornar JSON.
  }

  const message = payload?.error?.message || payload?.message || text;
  const type = payload?.error?.type || payload?.type;
  const hint = type === 'invalid-input'
    ? 'Verifique se o Actor usa o schema { language, location, max_results, query }.'
    : type === 'full-permission-actor-not-approved'
      ? 'Este Actor da Apify precisa ser aprovado na sua conta antes de executar.'
      : null;

  return `Apify retornou ${status}: ${[type, message, hint].filter(Boolean).join(' - ')} | input=${JSON.stringify(requestBody)}`;
}

export async function collect(apiKey, credential, options) {
  const { city, niche, limit = 20 } = options;

  const base = (credential.base_url || 'https://api.apify.com/v2').replace(/\/$/, '');
  const actorId = (credential.search_endpoint || 'damilo~google-maps-scraper')
    .trim()
    .replace(/^\//, '')
    .replace('/', '~');

  const body = buildApifyGoogleMapsInput(options);
  const url = `${base}/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(formatApifyError(response.status, error.slice(0, 500), body));
  }

  const items = await response.json();
  const list = Array.isArray(items) ? items : [];
  const leads = list.slice(0, limit).map((item) => normalizeApifyPlace(item, { city, niche }));

  return { leads };
}

/**
 * Testa o token validando a conta do usuário na Apify.
 */
export async function test(apiKey, credential) {
  const base = (credential.base_url || 'https://api.apify.com/v2').replace(/\/$/, '');
  const response = await fetch(`${base}/users/me?token=${encodeURIComponent(apiKey)}`);
  return { success: response.ok, statusCode: response.status };
}
