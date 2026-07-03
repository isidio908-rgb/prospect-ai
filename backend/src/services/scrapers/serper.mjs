/**
 * Coleta via Serper.dev.
 *
 * O endpoint /places retorna estabelecimentos locais (Google Maps/Places),
 * ideal para prospecção. Cada item traz: title, address, latitude, longitude,
 * rating, ratingCount, category, phoneNumber, website, cid.
 *
 * Autenticação: header X-API-KEY. Corpo: { q, gl, hl }.
 */
function normalizeSerperPlace(place, context = {}) {
  const observacoesParts = [
    place.address ? `address=${place.address}` : '',
    place.latitude !== undefined ? `latitude=${place.latitude}` : '',
    place.longitude !== undefined ? `longitude=${place.longitude}` : '',
  ].filter(Boolean);

  return {
    nome_empresa: place.title || '',
    site: place.website || '',
    telefone: place.phoneNumber || '',
    cidade: context.city || '',
    nicho: context.niche || '',
    categoria: place.category || place.type || '',
    fonte: 'serper',

    place_id: place.cid ? String(place.cid) : null,
    business_id: place.fid ? String(place.fid) : null,
    google_id: place.placeId || null,

    rating: place.rating ?? null,
    total_avaliacoes: place.ratingCount ?? null,
    google_maps_url: place.cid ? `https://www.google.com/maps?cid=${place.cid}` : null,

    observacoes: observacoesParts.join(' | '),
  };
}

export async function collect(apiKey, credential, options) {
  const { query: searchQuery, city, niche, limit = 20, region = 'br', language = 'pt' } = options;

  const base = (credential.base_url || 'https://google.serper.dev').replace(/\/$/, '');
  const endpoint = credential.search_endpoint || '/places';
  const q = searchQuery || [niche, city].filter(Boolean).join(' em ');
  if (!q) {
    throw new Error('Informe uma busca (query) ou nicho + cidade para a Serper');
  }

  const body = {
    q,
    gl: (region || 'br').toLowerCase(),
    hl: (language || 'pt').toLowerCase(),
  };

  const response = await fetch(`${base}${endpoint}`, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Serper retornou ${response.status}: ${error.slice(0, 200)}`);
  }

  const data = await response.json();
  // /places -> data.places ; /maps -> data.places ; fallback para organic/local
  const places = data.places || data.local || [];
  const leads = places.slice(0, limit).map((p) => normalizeSerperPlace(p, { city, niche }));

  return { leads };
}

/**
 * Testa a chave fazendo uma busca mínima.
 */
export async function test(apiKey, credential) {
  const base = (credential.base_url || 'https://google.serper.dev').replace(/\/$/, '');
  const endpoint = credential.search_endpoint || '/places';
  const response = await fetch(`${base}${endpoint}`, {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: 'teste', gl: 'br', hl: 'pt' }),
  });
  return { success: response.ok, statusCode: response.status };
}
