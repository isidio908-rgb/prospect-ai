# TODO - Prospect AI

**Atualizado em:** 03/07/2026

Este arquivo substitui listas antigas de proximas acoes que ja foram executadas. A prioridade aqui considera o estado real atual do codigo depois da validacao pos-merge em `main` e das melhorias recentes de operacao.

## Prioridade Alta

### 1. Preparar operacao controlada de prospeccao real

Objetivo: iniciar uso operacional com volume baixo e rastreavel.

Checklist:

- Definir nicho inicial.
- Definir cidade/regiao inicial.
- Coletar lote pequeno por provider ativo.
- Revisar duplicados e qualidade dos contatos.
- Usar CRM Kanban para acompanhar abordagem.
- Medir respostas, reunioes e clientes fechados.
- Ajustar mensagens por nicho a partir dos resultados reais.

## Prioridade Media

### 2. Dashboard comercial avancado - proxima camada

O dashboard ja mostra funil, resposta, valor fechado, presenca digital, fontes, conversao por nicho e conversao por cidade. Tambem ja permite filtrar metricas por periodo e fonte.

Melhorias futuras:

- Comparativo semanal/mensal.
- Custo por fonte de coleta.
- Receita potencial por nicho/cidade.
- Metas comerciais por periodo.

### 3. Testes automatizados complementares

Ja existem testes para assinatura de cache, persistencia de runs/logs/cache, rotas HTTP de `/api/collections`, erro RapidAPI sem expor key, erro Apify sem expor token e filtros do dashboard comercial.

Cobrir proximas camadas:

- Credenciais LLM.
- Rotas `/api/ai/*`.
- Personalizacao profissional dos prompts de IA em fluxo HTTP.
- CRM Kanban e mudanca de status via frontend.
- Verificacao WhatsApp na coleta com mocks mais completos da Evolution API.
- Salvamento do campo `whatsapp`.
- Exportacao JSON de leads.
- Deduplicacao com `place_id`, `business_id`, `google_id`, telefone, dominio e nome+cidade.

## Prioridade Baixa

### 4. Exportacao PDF

Gerar PDF com diagnostico por lead para enviar em conversa comercial.

### 5. Templates comerciais por nicho

Criar argumentos e mensagens adaptadas para nichos como imobiliarias, clinicas, odontologia, estetica, advocacia, construtoras e educacao.

### 6. Priorizacao inteligente avancada

Usar IA para sugerir:

- Melhor argumento comercial.
- Oferta mais provavel.
- Canal ideal de abordagem.
- Urgencia do lead.

## Itens Concluidos Recentemente

- Teste HTTP real das rotas `/api/collections`:
  - exige autenticação para listar histórico;
  - lista apenas execuções do usuário autenticado;
  - retorna logs por run sem vazar segredos;
  - rejeita limpeza de cache de execução de outro usuário;
  - limpa cache da execução do usuário e remove TTL visual da listagem.
- Filtros por periodo e fonte no dashboard comercial:
  - backend `/api/stats` aceita `period`, `fonte`, `dateFrom` e `dateTo`;
  - periodo padrao `all` preserva metricas historicas existentes;
  - periodo customizado usa datas de inicio/fim;
  - frontend `/dashboard` mostra filtros e badges do recorte aplicado;
  - teste unitario cobre normalizacao e montagem segura do filtro SQL.
- Kanban comercial avancado em `/crm`:
  - drag-and-drop nativo entre colunas;
  - filtros por status, prioridade, cidade, nicho, responsavel e busca livre;
  - contagem de valor potencial por coluna;
  - edicao rapida de responsavel, proxima acao e valor potencial;
  - manutencao do botao de avanco rapido de status.
- TTL visual e limpeza manual de cache em `/collections`.
- Documentacao operacional criada:
  - `docs/WHATSAPP-EVOLUTION.md`
  - `docs/IA-LLM.md`
  - `docs/COLETA-LEADS.md`
  - `docs/CREDENCIAIS.md`
- Avaliacao manual de `npm audit --json` do backend sem `npm audit fix`.
- Atualizacao segura de `bcrypt` de `^5.1.1` para `^6.0.0`, removendo a cadeia vulneravel `@mapbox/node-pre-gyp` -> `tar`.
- `npm audit --json` do backend limpo: 0 vulnerabilidades.
- `backend npm test`, `frontend npm run build` e `docker compose build backend frontend` passaram apos a atualizacao de dependencia.
- Validacao pos-merge em `main` com `git pull origin main`.
- Backend `npm test`: 32 testes passando.
- Frontend `npm run build`: passando.
- `docker compose build backend frontend`: passando.
- Stack local saudavel com backend, frontend, postgres, redis e evolution-api.
- Frontend HTTP 200 em `/`, `/collections`, `/profile`, `/leads` e `/dashboard`.
- Credenciais reais Serper, RapidAPI e Apify testadas com statusCode 200.
- WhatsApp conectado via Evolution API.
- Envio real de mensagem para lead de teste validado.
- Historico de mensagens atualizado apos envio real.
- Coleta real Serper com verificacao WhatsApp ligada: run 17.
- Coleta real Apify com verificacao WhatsApp ligada: run 18.
- Coleta real RapidAPI com verificacao WhatsApp ligada: run 19.
- Cache hit validado ao repetir Serper sem `forceRefresh`: run 20.
- `/api/collections` lista os runs novos.
- CRM/Kanban validado com status `contato_enviado`.
- Backend rejeita corretamente status antigo invalido como `em_contato`.
- Logs dos runs sem `api_key`, `Bearer`, `x-api-key`, `x-rapidapi-key` ou `token`.
- Historico persistente de coletas com tabela `collection_runs`.
- Logs persistentes de execucao com tabela `collection_run_logs`.
- Cache de busca/coleta com tabela `collection_cache`.
- Rotas `/api/collections` e `/api/collections/:id/logs`.
- Pagina `Historico` em `/collections`.
- Toggle para forcar nova coleta ignorando cache.
- Testes automatizados de persistencia de runs/logs/cache.
- Teste unitario da assinatura de cache de coleta.
- Serper validado com coleta real pequena.
- Apify validado com coleta real pequena e input `{ language, location, max_results, query }`.
- RapidAPI validado com coleta real pequena.
- Mensagem amigavel para RapidAPI 403 `not subscribed`.
- Mensagem amigavel para Apify `full-permission-actor-not-approved`.
- Edicao posterior do perfil profissional em `/profile` e `PATCH /api/auth/me`.
- Dashboard comercial com funil, fontes, WhatsApp confirmado e conversao por nicho/cidade.
- Cadastro com contexto profissional do usuario (`profession`, `primary_niche`, `internal_context`).
- Prompts internos de IA ajustados pela profissao/nicho/instrucoes do usuario.
- Pagina CRM Kanban basica em `/crm`.
- Menu lateral com link para CRM Kanban.
- Exportacao JSON de leads com filtros.
- Credenciais de scraper e LLM agrupadas na UI.
- Campo `model` para credenciais IA/LLM.
- Assistente IA em detalhes do lead.
- Rotas `/api/ai/providers`, `/api/ai/tasks`, `/api/ai/status`, `/api/ai/run`.
- Verificacao opcional de WhatsApp existente na coleta.
- Rebuild e subida Docker local de backend/frontend.
- Healthcheck do frontend corrigido para `127.0.0.1`.
