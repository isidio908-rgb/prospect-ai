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

### 2. Autopilot SDR - proximas camadas

A fundacao do Autopilot SDR ja define tabelas, regras, servico de decisao/fila e API autenticada para regras e fila. O envio automatico real ainda deve nascer controlado por configuracao explicita.

Proximas etapas:

- Tela para configurar Autopilot SDR.
- Tela de fila de mensagens pendentes.
- Scheduler diario para enfileirar leads elegiveis.
- Worker de envio WhatsApp com limite diario/horario.
- Stop-on-reply para follow-ups.
- Classificacao de respostas por IA.
- Agendamento via Google Calendar ou Calendly.

## Prioridade Media

### 3. Dashboard comercial avancado - proxima camada

O dashboard ja mostra funil, resposta, valor fechado, presenca digital, fontes, conversao por nicho e conversao por cidade. Tambem ja permite filtrar metricas por periodo e fonte.

Melhorias futuras:

- Comparativo semanal/mensal.
- Custo por fonte de coleta.
- Receita potencial por nicho/cidade.
- Metas comerciais por periodo.

### 4. Testes automatizados complementares

Ja existem testes para assinatura de cache, persistencia de runs/logs/cache, rotas HTTP de `/api/collections`, erro RapidAPI sem expor key, erro Apify sem expor token, filtros do dashboard comercial, fundacao do Autopilot SDR e API HTTP do Autopilot.

Cobrir proximas camadas:

- Credenciais LLM.
- Rotas `/api/ai/*`.
- Personalizacao profissional dos prompts de IA em fluxo HTTP.
- CRM Kanban e mudanca de status via frontend.
- Verificacao WhatsApp na coleta com mocks mais completos da Evolution API.
- Salvamento do campo `whatsapp`.
- Exportacao JSON de leads.
- Deduplicacao com `place_id`, `business_id`, `google_id`, telefone, dominio e nome+cidade.
- Tela do Autopilot SDR.
- Scheduler assistido do Autopilot SDR.
- Worker de envio WhatsApp com limites e stop-on-reply.

## Prioridade Baixa

### 5. Exportacao PDF

Gerar PDF com diagnostico por lead para enviar em conversa comercial.

### 6. Templates comerciais por nicho

Criar argumentos e mensagens adaptadas para nichos como imobiliarias, clinicas, odontologia, estetica, advocacia, construtoras e educacao.

### 7. Priorizacao inteligente avancada

Usar IA para sugerir:

- Melhor argumento comercial.
- Oferta mais provavel.
- Canal ideal de abordagem.
- Urgencia do lead.

## Itens Concluidos Recentemente

- API do Autopilot SDR:
  - rotas autenticadas em `/api/autopilot`;
  - CRUD de regras em `/api/autopilot/rules`;
  - listagem de fila em `/api/autopilot/queue`;
  - aprovacao e cancelamento manual de mensagens pendentes;
  - isolamento por usuario em regras e fila;
  - modo `assistido` forcando aprovacao manual;
  - cliente frontend `autopilot` em `frontend/src/services/api.js`;
  - teste HTTP real das rotas de regras e fila;
  - nenhum envio WhatsApp automatico ativado nesta etapa.
- Fundacao do Autopilot SDR:
  - tabelas `automation_rules`, `automation_runs` e `message_queue`;
  - modo padrao assistido, com aprovacao manual;
  - servico de decisao para elegibilidade de leads;
  - verificacao de score, contato, status, fonte, cidade e nicho;
  - calculo de janela segura de envio;
  - teste unitario das regras de decisao;
  - documentacao `docs/AUTOPILOT-SDR.md`.
- Teste HTTP real das rotas `/api/collections`:
  - exige autenticacao para listar historico;
  - lista apenas execucoes do usuario autenticado;
  - retorna logs por run sem vazar segredos;
  - rejeita limpeza de cache de execucao de outro usuario;
  - limpa cache da execucao do usuario e remove TTL visual da listagem.
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
