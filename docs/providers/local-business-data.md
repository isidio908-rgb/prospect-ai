# Provider: RapidAPI Local Business Data

Fonte: RapidAPI Hub

API: Local Business Data

Provider: letscrape

Uso no Prospect AI: coletar negocios locais vindos de dados do Google Maps/Google Business Profile via RapidAPI.

> Nunca salvar chaves reais neste arquivo, no README ou em commits. Chaves devem ficar em variaveis de ambiente na V1 e, depois, criptografadas no modulo de Credenciais da plataforma.

---

## 1. Identificacao da Credencial

Cadastro recomendado na plataforma:

```text
Nome: RapidAPI - Local Business Data
Tipo: rapidapi
Provedor: letscrape_local_business_data
API Host: local-business-data.p.rapidapi.com
Base URL: https://local-business-data.p.rapidapi.com
Endpoint principal: /search
Endpoint auxiliar: /reverse-geocoding
Status: ativo
Limite Diario: conforme plano da conta RapidAPI
```

Headers padrao:

```http
x-rapidapi-key: {{api_key}}
x-rapidapi-host: local-business-data.p.rapidapi.com
Content-Type: application/json
```

---

## 2. Endpoint Principal Confirmado: Search

Este e o endpoint correto para prospeccao por nicho + cidade.

```http
GET /search?query=Hotels%20in%20San%20Francisco%2C%20USA&limit=20&lat=37.359428&lng=-121.925337&zoom=13&language=en&region=us&extract_emails_and_contacts=false HTTP/1.1
X-Rapidapi-Key: {{RAPIDAPI_KEY}}
X-Rapidapi-Host: local-business-data.p.rapidapi.com
Content-Type: application/json
Host: local-business-data.p.rapidapi.com
```

cURL sem chave real:

```bash
curl --request GET \
  --url "https://local-business-data.p.rapidapi.com/search?query=Hotels%20in%20San%20Francisco%2C%20USA&limit=20&lat=37.359428&lng=-121.925337&zoom=13&language=en&region=us&extract_emails_and_contacts=false" \
  --header "x-rapidapi-key: {{RAPIDAPI_KEY}}" \
  --header "x-rapidapi-host: local-business-data.p.rapidapi.com" \
  --header "Content-Type: application/json"
```

### Uso no Brasil

Exemplo para Cuiaba:

```text
/search?query=imobiliarias%20em%20Cuiaba%2C%20MT&limit=20&lat=-15.6014&lng=-56.0979&zoom=13&language=pt&region=br&extract_emails_and_contacts=false
```

---

## 3. Parametros do Search

| Parametro | Tipo | Obrigatorio | Exemplo | Uso |
|---|---|---:|---|---|
| `query` | string | sim | `imobiliarias em Cuiaba, MT` | Termo principal da busca |
| `limit` | integer | sim | `20` | Quantidade de resultados solicitada |
| `lat` | number | recomendado | `-15.6014` | Latitude do centro da busca |
| `lng` | number | recomendado | `-56.0979` | Longitude do centro da busca |
| `zoom` | integer | recomendado | `13` | Nivel de aproximacao/regiao da busca |
| `language` | string | sim | `pt` | Idioma da resposta |
| `region` | string | sim | `br` | Pais/regiao da busca |
| `extract_emails_and_contacts` | boolean/string | opcional | `false` | Pode aumentar custo/tempo; ativar apenas quando necessario |

Recomendacao inicial:

```text
language=pt
region=br
zoom=13
extract_emails_and_contacts=false
```

Usar `extract_emails_and_contacts=true` apenas em leads de alta prioridade ou quando o plano gratuito permitir sem consumir muita cota.

---

## 4. Schema de Resposta do Search

Schema informado pelo playground:

```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string" },
    "request_id": { "type": "string" },
    "parameters": {
      "type": "object",
      "properties": {
        "query": { "type": "string" },
        "language": { "type": "string" },
        "region": { "type": "string" },
        "lat": { "type": "number" },
        "lng": { "type": "number" },
        "zoom": { "type": "integer" },
        "limit": { "type": "integer" }
      }
    },
    "data": {
      "type": "array",
      "items": { "type": "object" }
    }
  }
}
```

---

## 5. Exemplo de Resposta do Search

Payload real recebido, reduzido:

```json
{
  "status": "OK",
  "request_id": "d0a56fde-2387-438d-9de1-0d989eef6a11",
  "parameters": {
    "query": "Hotels in San Francisco, USA",
    "language": "en",
    "region": "us",
    "lat": 37.359428,
    "lng": -121.925337,
    "zoom": 13,
    "limit": 20
  },
  "data": [
    {
      "business_id": "0x8085808b287f3b3b:0xa49802f84f7ddb35",
      "google_id": "0x8085808b287f3b3b:0xa49802f84f7ddb35",
      "place_id": "ChIJOzt_KIuAhYARNdt9T_gCmKQ",
      "phone_number": "+14154336600",
      "name": "Hilton San Francisco Financial District",
      "latitude": 37.7952284,
      "longitude": -122.40407289999999,
      "full_address": "Hilton San Francisco Financial District, 750 Kearny St, San Francisco, CA 94108",
      "review_count": 4627,
      "rating": 3.9,
      "website": "https://www.hilton.com/en/hotels/sfofdhf-hilton-san-francisco-financial-district/",
      "verified": true,
      "place_link": "https://www.google.com/maps/place/data=!3m1!4b1!4m2!3m1!1s0x8085808b287f3b3b:0xa49802f84f7ddb35",
      "business_status": "OPEN",
      "type": "Hotel",
      "subtypes": ["Hotel"],
      "address": "750 Kearny St, San Francisco, CA 94108",
      "district": "Chinatown",
      "street_address": "750 Kearny St",
      "city": "San Francisco",
      "zipcode": "94108",
      "state": "California",
      "country": "US"
    }
  ]
}
```

---

## 6. Endpoint Auxiliar: Reverse Geocoding

Tambem confirmado no playground:

```bash
curl --request GET \
  --url "https://local-business-data.p.rapidapi.com/reverse-geocoding?lat=40.6958453&lng=-73.9799119&region=us&language=en" \
  --header "x-rapidapi-key: {{RAPIDAPI_KEY}}" \
  --header "x-rapidapi-host: local-business-data.p.rapidapi.com" \
  --header "Content-Type: application/json"
```

Uso: descobrir negocios/lugares proximos de uma coordenada quando nao houver query textual.

Para prospeccao ativa, priorizar `/search`.

---

## 7. Mapeamento para o Contrato Interno

| Campo Local Business Data | Campo Prospect AI | Observacao |
|---|---|---|
| `name` | `nome_empresa` | Nome comercial do negocio |
| `website` | `site` | Enviar para auditoria tecnica se existir |
| `phone_number` | `telefone` | Pode ser convertido para WhatsApp em etapas futuras |
| `city` | `cidade` | Priorizar cidade da resposta; fallback para cidade do comando |
| `type` | `categoria` | Categoria principal |
| `subtypes` | `observacoes.subtypes` | Categorias secundarias |
| `rating` | `observacoes.rating` | Usar tambem no score |
| `review_count` | `observacoes.reviews` | Usar tambem no score |
| `place_link` | `observacoes.maps` | Link do Google Maps |
| `reviews_link` | `observacoes.reviews_link` | Link de reviews |
| `full_address` ou `address` | `observacoes.address` | Endereco completo |
| `business_id` | `observacoes.business_id` | Identificador externo |
| `google_id` | `observacoes.google_id` | Identificador externo |
| `place_id` | `observacoes.place_id` | Melhor chave para deduplicacao |
| `verified` | `observacoes.verified` | Perfil reivindicado/verificado |
| `business_status` | `observacoes.business_status` | Exemplo: OPEN |
| `district` | `observacoes.district` | Bairro/regiao |
| `street_address` | `observacoes.street_address` | Rua/endereco curto |
| `zipcode` | `observacoes.zipcode` | CEP |
| `state` | `observacoes.state` | Estado |
| `country` | `observacoes.country` | Pais |
| `latitude` | `observacoes.latitude` | Latitude do negocio |
| `longitude` | `observacoes.longitude` | Longitude do negocio |
| `about.summary` | `observacoes.about` | Resumo do negocio, quando existir |

---

## 8. Normalizacao Recomendada

Formato final esperado pelo CSV de entrada do analisador:

```csv
nome_empresa,site,telefone,cidade,nicho,categoria,fonte,observacoes
```

Exemplo:

```csv
"Hilton San Francisco Financial District","https://www.hilton.com/en/hotels/sfofdhf-hilton-san-francisco-financial-district/","+14154336600","San Francisco","hoteis","Hotel","letscrape_local_business_data","rating=3.9 | reviews=4627 | maps=https://www.google.com/maps/place/data=!3m1!4b1!4m2!3m1!1s0x8085808b287f3b3b:0xa49802f84f7ddb35 | address=Hilton San Francisco Financial District, 750 Kearny St, San Francisco, CA 94108 | place_id=ChIJOzt_KIuAhYARNdt9T_gCmKQ | status=OPEN | verified=true | district=Chinatown"
```

---

## 9. Regras de Qualidade

1. Se `business_status` for diferente de `OPEN`, o lead deve receber prioridade menor ou ser filtrado.
2. Se `website` vier vazio, o lead ainda pode ser util para oferta de site, estrutura digital, Google Ads ou Google Business Profile.
3. Se `website` existir, enviar para auditoria tecnica.
4. Deduplicar preferencialmente por `place_id`.
5. Se `place_id` nao existir, deduplicar por `business_id`, `google_id`, telefone, dominio ou nome + cidade.
6. Leads com `review_count` alto e sem site/tracking devem receber score comercial maior.
7. Usar `/search` como endpoint principal.
8. Usar `/reverse-geocoding` apenas como fallback por coordenadas.
9. Nao ativar `extract_emails_and_contacts=true` em massa sem validar custo/cota.

---

## 10. Exemplo de configuracao `.env` V1

```env
RAPIDAPI_KEY=cole_sua_chave_aqui
RAPIDAPI_HOST=local-business-data.p.rapidapi.com
RAPIDAPI_PROVIDER_NAME=letscrape_local_business_data
RAPIDAPI_SEARCH_URL=https://local-business-data.p.rapidapi.com/search?query={query}&limit={limit}&lat={lat}&lng={lng}&zoom={zoom}&language={language}&region={region}&extract_emails_and_contacts={extractEmailsAndContacts}
RAPIDAPI_DAILY_LIMIT=100
```

---

## 11. Comando recomendado

Cuiaba, MT:

```bash
npm run collect -- \
  --query "imobiliarias em Cuiaba, MT" \
  --city "Cuiaba" \
  --niche "imobiliarias" \
  --lat -15.6014 \
  --lng -56.0979 \
  --zoom 13 \
  --region br \
  --language pt \
  --extractEmailsAndContacts false \
  --limit 20
```

Depois:

```bash
npm run analyze -- --input data/inputs/ARQUIVO_GERADO.csv --city "Cuiaba" --niche "imobiliarias"
```

---

## 12. Prompt para Codex

```text
Ajuste o coletor RapidAPI do Prospect AI para suportar o provider `letscrape_local_business_data` usando o endpoint principal `/search`.

Contexto:
- API Host: local-business-data.p.rapidapi.com
- Endpoint principal: GET /search?query={query}&limit={limit}&lat={lat}&lng={lng}&zoom={zoom}&language={language}&region={region}&extract_emails_and_contacts={extractEmailsAndContacts}
- Endpoint auxiliar: GET /reverse-geocoding?lat={lat}&lng={lng}&region={region}&language={language}
- A resposta vem com `status`, `request_id`, `parameters` e `data[]`.

Requisitos:

1. Adicionar argumentos no CLI collect:
- --lat
- --lng
- --zoom, default 13
- --region, default br
- --language, default pt
- --extractEmailsAndContacts, default false

2. Atualizar `buildSearchUrl` para substituir tambem:
- {lat}
- {lng}
- {zoom}
- {region}
- {language}
- {extractEmailsAndContacts}

3. Se o endpoint configurado contiver `{lat}` ou `{lng}`, exigir `--lat` e `--lng`.

4. Normalizar `json.data[]` usando o mapeamento:
- name -> nome_empresa
- website -> site
- phone_number -> telefone
- city -> cidade, fallback para options.city
- type -> categoria
- place_link -> observacoes maps
- reviews_link -> observacoes reviews_link
- full_address ou address -> observacoes address
- rating -> observacoes rating
- review_count -> observacoes reviews
- place_id -> observacoes place_id
- business_id -> observacoes business_id
- google_id -> observacoes google_id
- business_status -> observacoes status
- verified -> observacoes verified
- district -> observacoes district
- street_address -> observacoes street_address
- zipcode -> observacoes zipcode
- state -> observacoes state
- country -> observacoes country
- latitude -> observacoes latitude
- longitude -> observacoes longitude
- about.summary -> observacoes about

5. Criar teste unitario com fixture usando uma resposta real do `/search`.

6. Garantir que a API key nunca seja logada no terminal, CSV ou JSON de saida.

7. Atualizar README com exemplo:

npm run collect -- --query "imobiliarias em Cuiaba, MT" --city "Cuiaba" --niche "imobiliarias" --lat -15.6014 --lng -56.0979 --zoom 13 --region br --language pt --extractEmailsAndContacts false --limit 20
```
