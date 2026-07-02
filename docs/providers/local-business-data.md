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

## 2. Endpoint Confirmado: Reverse Geocoding

cURL recebido do playground da RapidAPI, com a chave removida:

```bash
curl --request GET \
  --url "https://local-business-data.p.rapidapi.com/reverse-geocoding?lat=40.6958453&lng=-73.9799119&region=us&language=en" \
  --header "x-rapidapi-key: {{RAPIDAPI_KEY}}" \
  --header "x-rapidapi-host: local-business-data.p.rapidapi.com" \
  --header "Content-Type: application/json"
```

### Observacao operacional

O endpoint `/reverse-geocoding` parte de coordenadas (`lat` e `lng`) e retorna empresas/lugares proximos daquele ponto.

Ele e util quando ja temos coordenadas de uma regiao, bairro ou ponto de referencia. Para prospeccao por nicho e cidade, o ideal ainda e confirmar se a API possui endpoint de busca por texto, por exemplo:

```text
/search?query=imobiliarias+cuiaba&region=br&language=pt
```

ou endpoint de busca por categoria/proximidade, se existir no provedor.

---

## 3. Parametros do Reverse Geocoding

| Parametro | Tipo | Obrigatorio | Exemplo | Uso |
|---|---|---:|---|---|
| `lat` | number | sim | `40.6958453` | Latitude do ponto de busca |
| `lng` | number | sim | `-73.9799119` | Longitude do ponto de busca |
| `region` | string | sim | `us`, `br` | Pais/regiao da busca |
| `language` | string | sim | `en`, `pt` | Idioma da resposta |

Para Brasil:

```text
region=br
language=pt
```

---

## 4. Formato de Resposta Recebido

Exemplo reduzido do payload real:

```json
{
  "status": "OK",
  "request_id": "4c37e6d3-fbaf-4dae-bb9e-cd33ce1bb1cc",
  "parameters": {
    "language": "en",
    "region": "us",
    "lat": 40.6958453,
    "lng": -73.9799119
  },
  "data": [
    {
      "business_id": "0x89c25bca7cf7c659:0xe153fe5bf602367f",
      "google_id": "0x89c25bca7cf7c659:0xe153fe5bf602367f",
      "place_id": "ChIJWcb3fMpbwokRfzYC9lv-U-E",
      "phone_number": null,
      "name": "8 Monument Walk",
      "latitude": 40.6958276,
      "longitude": -73.979916,
      "full_address": "8 Monument Walk, Brooklyn, NY 11205",
      "review_count": 0,
      "rating": null,
      "website": null,
      "verified": true,
      "place_link": "https://www.google.com/maps/place/data=!3m1!4b1!4m2!3m1!1s0x89c25bca7cf7c659:0xe153fe5bf602367f",
      "business_status": "OPEN",
      "type": "Building",
      "subtypes": ["Building"],
      "district": "Fort Greene",
      "street_address": "8 Monument Walk",
      "city": "Brooklyn",
      "zipcode": "11205",
      "state": "New York",
      "country": "US"
    }
  ]
}
```

---

## 5. Mapeamento para o Contrato Interno

| Campo Local Business Data | Campo Prospect AI | Observacao |
|---|---|---|
| `name` | `nome_empresa` | Nome comercial do negocio |
| `website` | `site` | Pode vir `null`; analisar apenas se existir |
| `phone_number` | `telefone` | Pode vir `null`; futuro: normalizar para WhatsApp quando possivel |
| `city` | `cidade` | Priorizar cidade da resposta; fallback para cidade do comando |
| `type` | `categoria` | Categoria principal |
| `subtypes` | `observacoes` | Categorias secundarias |
| `rating` | `observacoes.rating` | Usar tambem no score futuro |
| `review_count` | `observacoes.reviews` | Usar tambem no score futuro |
| `place_link` | `observacoes.maps` | Link do Google Maps |
| `full_address` | `observacoes.address` | Endereco completo |
| `business_id` | `observacoes.business_id` | Identificador externo |
| `google_id` | `observacoes.google_id` | Identificador externo |
| `place_id` | `observacoes.place_id` | Melhor chave para deduplicacao |
| `verified` | `observacoes.verified` | Perfil reivindicado/verificado |
| `business_status` | `observacoes.business_status` | Exemplo: OPEN |
| `district` | `observacoes.district` | Bairro/regiao |
| `state` | `observacoes.state` | Estado |
| `country` | `observacoes.country` | Pais |

---

## 6. Normalizacao Recomendada

Formato final esperado pelo CSV de entrada do analisador:

```csv
nome_empresa,site,telefone,cidade,nicho,categoria,fonte,observacoes
```

Exemplo usando o payload recebido:

```csv
"8 Monument Walk","","","Brooklyn","imobiliarias","Building","letscrape_local_business_data","reviews=0 | maps=https://www.google.com/maps/place/data=!3m1!4b1!4m2!3m1!1s0x89c25bca7cf7c659:0xe153fe5bf602367f | address=8 Monument Walk, Brooklyn, NY 11205 | place_id=ChIJWcb3fMpbwokRfzYC9lv-U-E | status=OPEN | verified=true"
```

---

## 7. Regras de Qualidade

1. Se `business_status` for diferente de `OPEN`, o lead deve receber prioridade menor ou ser filtrado.
2. Se `website` vier vazio, o lead ainda pode ser util para oferta de site, estrutura digital, Google Ads ou Google Business Profile.
3. Se `website` existir, enviar para auditoria tecnica.
4. Deduplicar preferencialmente por `place_id`.
5. Se `place_id` nao existir, deduplicar por `business_id`, `google_id`, telefone, dominio ou nome + cidade.
6. Leads com `review_count` alto e sem site/tracking devem receber score comercial maior.
7. O endpoint reverse-geocoding deve ser usado com uma lista de coordenadas quando a busca textual por nicho/cidade nao estiver disponivel.

---

## 8. Exemplo de configuracao `.env` V1

```env
RAPIDAPI_KEY=cole_sua_chave_aqui
RAPIDAPI_HOST=local-business-data.p.rapidapi.com
RAPIDAPI_PROVIDER_NAME=letscrape_local_business_data
RAPIDAPI_SEARCH_URL=https://local-business-data.p.rapidapi.com/reverse-geocoding?lat={lat}&lng={lng}&region=br&language=pt
RAPIDAPI_DAILY_LIMIT=100
```

Observacao: o coletor atual usa `{query}`, `{city}`, `{niche}` e `{limit}` como placeholders. Para usar reverse-geocoding, sera necessario adicionar suporte aos parametros `--lat`, `--lng`, `--region` e `--language`.

---

## 9. Prompt para Codex

```text
Ajuste o coletor RapidAPI do Prospect AI para suportar o provider `letscrape_local_business_data` e o endpoint `/reverse-geocoding`.

Contexto:
- API Host: local-business-data.p.rapidapi.com
- Endpoint confirmado: GET /reverse-geocoding?lat={lat}&lng={lng}&region={region}&language={language}
- A resposta vem com `status`, `request_id`, `parameters` e `data[]`.

Requisitos:

1. Adicionar argumentos no CLI collect:
- --lat
- --lng
- --region, default br
- --language, default pt

2. Atualizar `buildSearchUrl` para substituir tambem:
- {lat}
- {lng}
- {region}
- {language}

3. Se o endpoint configurado contiver `{lat}` ou `{lng}`, exigir `--lat` e `--lng`.

4. Normalizar `json.data[]` usando o mapeamento:
- name -> nome_empresa
- website -> site
- phone_number -> telefone
- city -> cidade, fallback para options.city
- type -> categoria
- place_link -> observacoes maps
- full_address ou address -> observacoes address
- rating -> observacoes rating
- review_count -> observacoes reviews
- place_id -> observacoes place_id
- business_id -> observacoes business_id
- google_id -> observacoes google_id
- business_status -> observacoes status
- verified -> observacoes verified
- district -> observacoes district
- state -> observacoes state
- country -> observacoes country

5. Criar teste unitario com fixture usando o JSON real deste documento.

6. Garantir que a API key nunca seja logada no terminal, CSV ou JSON de saida.

7. Atualizar README com exemplo:

npm run collect -- --lat -15.6014 --lng -56.0979 --region br --language pt --city Cuiaba --niche imobiliarias --limit 20
```
