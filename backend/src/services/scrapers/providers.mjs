/**
 * Catálogo de provedores de scraper suportados.
 *
 * Cada provedor descreve:
 * - type: chave usada na coluna credentials.type e para despacho no coletor
 * - label: nome amigável exibido no frontend
 * - auth: como a API key é enviada ('header_rapidapi' | 'token_query' | 'header_apikey')
 * - freeCredits: se o provedor oferece créditos gratuitos (mostra badge no front)
 * - docs: URL da documentação
 * - defaults: valores pré-preenchidos ao criar uma credencial deste provedor
 * - fields: campos técnicos editáveis pelo usuário no formulário (além de
 *   name/api_key/daily_limit/monthly_limit/notes que são comuns a todos)
 * - fieldHints: dica exibida abaixo de cada campo técnico
 */
export const SCRAPER_PROVIDERS = {
  rapidapi: {
    type: 'rapidapi',
    label: 'RapidAPI · Local Business Data',
    auth: 'header_rapidapi',
    freeCredits: false,
    docs: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/local-business-data',
    defaults: {
      provider: 'Local Business Data',
      api_host: 'local-business-data.p.rapidapi.com',
      base_url: 'https://local-business-data.p.rapidapi.com',
      search_endpoint: '/search',
      daily_limit: 100,
      monthly_limit: 3000,
    },
    fields: ['api_host', 'base_url', 'search_endpoint'],
    fieldHints: {
      api_host: 'Host informado pela RapidAPI (cabeçalho x-rapidapi-host).',
      base_url: 'URL base da API na RapidAPI.',
      search_endpoint: 'Caminho do endpoint de busca (ex: /search).',
    },
  },

  apify: {
    type: 'apify',
    label: 'Apify · Google Maps Scraper',
    auth: 'token_query',
    freeCredits: true,
    docs: 'https://apify.com/store?search=google%20maps%20scraper',
    defaults: {
      provider: 'Apify Google Maps Scraper',
      api_host: 'api.apify.com',
      base_url: 'https://api.apify.com/v2',
      // Actor ID no formato usuario~nome. O coletor atual envia o input:
      // { language, location, max_results, query }.
      // Use um Actor que aceite esse schema, igual ao testado no console da Apify.
      search_endpoint: 'damilo~google-maps-scraper',
      daily_limit: 50,
      monthly_limit: 1000,
    },
    fields: ['search_endpoint'],
    fieldHints: {
      search_endpoint:
        'ID do Actor no formato usuario~nome. O Actor precisa aceitar input { language, location, max_results, query }. Cole o token da API em API Key.',
    },
  },

  serper: {
    type: 'serper',
    label: 'Serper.dev · Google Places',
    auth: 'header_apikey',
    freeCredits: true,
    docs: 'https://serper.dev',
    defaults: {
      provider: 'Serper.dev',
      api_host: 'google.serper.dev',
      base_url: 'https://google.serper.dev',
      // /places retorna estabelecimentos locais (ideal para prospecção).
      search_endpoint: '/places',
      daily_limit: 100,
      monthly_limit: 2500,
    },
    fields: ['search_endpoint'],
    fieldHints: {
      search_endpoint:
        'Endpoint da Serper: /places (estabelecimentos), /maps ou /search.',
    },
  },
};

export function listProviders() {
  return Object.values(SCRAPER_PROVIDERS).map((p) => ({
    type: p.type,
    label: p.label,
    category: 'scraper',
    auth: p.auth,
    freeCredits: p.freeCredits,
    docs: p.docs,
    defaults: p.defaults,
    fields: p.fields,
    fieldHints: p.fieldHints,
  }));
}

export function getProvider(type) {
  return SCRAPER_PROVIDERS[type] || null;
}
