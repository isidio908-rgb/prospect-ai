# Coleta De Leads - Guia Operacional

Este guia descreve como operar a coleta de leads no Prospect AI.

## Objetivo

Coletar empresas locais por nicho e localizacao, normalizar dados, validar WhatsApp quando necessario, remover duplicados, salvar leads e registrar historico operacional.

## Fontes Suportadas

- Serper.dev Google Places.
- RapidAPI Local Business Data.
- Apify Google Maps Scraper.
- CSV/manual.

## Fluxo Da Coleta

```text
Nicho + Localizacao + Provider + Credencial
      -> cria collection_run
      -> verifica cache
      -> chama provider quando nao ha cache valido
      -> normaliza dados
      -> opcionalmente valida WhatsApp
      -> remove duplicados
      -> salva leads
      -> grava logs e contadores
      -> mostra resultado em /collections
```

## Campos Operacionais

Na tela de coleta, revisar:

- provider/credencial;
- pais;
- estado/regiao;
- cidade;
- nicho;
- modificador;
- limite;
- extrair contatos extras, quando RapidAPI permitir;
- verificar WhatsApp antes de salvar;
- forcar nova coleta ignorando cache.

## Quando Usar Cache

Use cache quando:

- estiver repetindo a mesma busca para revisar resultado;
- nao quiser consumir cota do provider;
- estiver testando frontend/historico.

Use `forceRefresh` quando:

- precisar de dados novos;
- mudou provider ou credencial;
- mudou nicho/cidade/modificador;
- quer validar se o provider continua funcionando.

## Provider: Serper

Uso recomendado:

- buscas pequenas e rapidas;
- validacao operacional;
- coleta inicial quando precisa testar fluxo completo.

Validacao esperada:

- teste de credencial retorna statusCode 200;
- coleta registra `provider_collected`;
- logs nao contem key.

## Provider: RapidAPI

Uso recomendado:

- coleta via Local Business Data;
- enriquecimento de dados de negocios locais;
- buscas com rating, reviews e site quando disponiveis.

Erro comum:

`You are not subscribed to this API`

Acao:

- conferir se a conta RapidAPI esta inscrita na API exata;
- conferir API project/API key selecionada;
- conferir `x-rapidapi-host` copiado do playground da API assinada;
- testar credencial pela tela antes de coletar.

## Provider: Apify

Uso recomendado:

- Google Maps Scraper quando o Actor esta aprovado e funcionando;
- coleta controlada com input conhecido.

Input validado:

```json
{
  "language": "pt",
  "location": "Cidade, Estado, Pais",
  "max_results": 25,
  "query": "nicho ou termo de busca"
}
```

Erro comum:

`full-permission-actor-not-approved`

Acao:

- aprovar o Actor na conta Apify;
- testar o Actor manualmente no console;
- repetir coleta somente apos aprovacao.

## Validacao WhatsApp Na Coleta

Ative quando quiser salvar apenas leads com telefone confirmado no WhatsApp.

Efeito operacional:

- reduz volume salvo;
- melhora qualidade de contato;
- consome tempo de validacao adicional;
- exige instancia WhatsApp conectada.

Contadores esperados:

- `wa_verified`
- `wa_rejected`
- `without_phone`

## Logs Esperados

Execucao sem cache:

- `collection_started`
- `cache_miss`
- `whatsapp_connection_ok`, se verificacao estiver ativa
- `provider_collected`
- `whatsapp_verified`, se verificacao estiver ativa
- `database_saved`

Execucao com cache:

- `collection_started`
- `cache_hit`
- `whatsapp_verified`, se aplicavel
- `database_saved`

## Regras De Qualidade

- Comecar com lotes pequenos.
- Revisar duplicados antes de aumentar volume.
- Priorizar nichos com ticket medio alto.
- Nao usar multiplas chaves para burlar limites.
- Manter logs sem credenciais.
- Medir resposta comercial por nicho e cidade.

## Checklist Antes De Rodar Coleta Real

- [ ] Credencial ativa e testada.
- [ ] Provider correto selecionado.
- [ ] Nicho e cidade revisados.
- [ ] Limite baixo para primeiro teste.
- [ ] WhatsApp conectado se a verificacao estiver ativa.
- [ ] `forceRefresh` definido conscientemente.
- [ ] Resultado conferido em `/collections`.
- [ ] Leads conferidos no CRM.

## Checklist Pos-Coleta

- [ ] Total encontrado revisado.
- [ ] Total salvo revisado.
- [ ] Duplicados revisados.
- [ ] Rejeicoes WhatsApp revisadas.
- [ ] Logs sem segredos.
- [ ] Leads priorizados no Kanban.
- [ ] Mensagens revisadas antes de abordagem.
