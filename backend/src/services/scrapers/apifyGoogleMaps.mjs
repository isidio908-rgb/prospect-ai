/**
 * Coleta via Apify - Google Maps Scraper.
 *
 * Usa o endpoint run-sync-get-dataset-items, que dispara o Actor e retorna
 * os itens do dataset quando a execução termina (síncrono).
 *
 * Actor de referência: damilo/google-maps-scraper, cujo input é
 *   { keyword: string[], location: string, max_result_per_keyword: number }
 * e a saída traz place_id, name, full_address, phone, website, total_score,
 * reviews_count, category, google_maps_url, latitude, longitude.
 *
 * A normalização abaixo aceita também nomes de campos alternativos
 * (title/address/totalScore/reviewsCount/phoneNumber/url) para funcionar com
 * outros Actors de Google Maps do store.
 */
function firstDefined(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function normalizeApifyPlace(item, context = {}) {
  const name = firstDefined(item.name, item.title, item.placeName) || '';
  const address = firstDefined(item.full_address, item.address, item.formattedAddress) || '';
  const phone = firstDefined(item.phone, item.phoneNumber, item.phone_number) || '';
  const website = firstDefined(item.website, item.website, item.url && !String(item.url).includes('google.') ? item.url : undefined) || '';
  const rating = firstDefined(item.total_score, item.totalScore, item.rating);
  const reviews = firstDefined(item.reviews_count, item.reviewsCount, item.review_count, item.userRatingCount);
  const category = firstDefined(item.category, item.categoryName, Array.isArray(item.categories) ? item.categories[0] : undefined) || '';
  const mapsUrl = firstDefined(item.google_maps_url, item.googleMapsUrl, item.url, item.placeUrl) || null;
  const placeId = firstDefined(item.place_id, item.placeId, item.cid) || null;
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
    business_id: null,
    google_id: null,

    rating: rating ?? null,
    total_avaliacoes: reviews ?? null,
    google_maps_url: mapsUrl,

    observacoes: observacoesParts.join(' | '),
  };
}

export async function collect(apiKey, credential, options) {
  const { query: searchQuery, city, niche, limit = 20 } = options;

  const base = (credential.base_url || 'https://api.apify.com/v2').replace(/\/$/, '');
  const actorId = (credential.search_endpoint || 'damilo~google-maps-scraper')
    .trim()
    .replace(/^\//, '')
    .replace('/', '~');

  const keyword = searchQuery || (niche && city ? `${niche} em ${city}` : niche || city || '');
  if (!keyword) {
    throw new Error('Informe uma busca (query) ou nicho + cidade para o Apify');
  }

  const body = {
    keyword: [keyword],
    location: city || '',
    max_result_per_keyword: Math.max(1, Math.min(limit, 500)),
  };

  const url = `${base}/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apify retornou ${response.status}: ${error.slice(0, 200)}`);
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
