# Prospect AI - Status Atual do Projeto

**Data:** 03/07/2026  
**Estado:** produto interno em fase de validacao operacional, com historico de coleta, logs, cache, CRM, dashboard comercial e providers validados no PR #6.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina de prospeccao comercial, nao apenas como scraper. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens de WhatsApp, gerencia credenciais de scraper e LLM, conversa via WhatsApp/Evolution API e usa IA para melhorar textos e diagnosticos.

A versao atual inclui contexto profissional do usuario no cadastro e na pagina de perfil, prompts internos de IA ajustados por profissao/nicho/instrucoes, pagina CRM Kanban, historico persistente de coletas, logs de execucao, cache de busca/coleta e dashboard comercial ampliado.

O PR #6 validou backend, frontend, build Docker, historico/logs/cache, providers Serper/Apify/RapidAPI e mensagens amigaveis para erros conhecidos de provider.

## Stack Atual

- Backend: Node.js + Express + ESModules, PostgreSQL, porta 3001.
- Frontend: React + Vite + Tailwind CSS v4, porta 5173.
- Banco: PostgreSQL 16 via Docker.
- WhatsApp: Evolution API + Redis via Docker.
- Infra local: `docker compose` em `docker-compose.yml`.
- Autenticacao: JWT.
- Criptografia: AES-256-GCM para API keys.

## Modulos Implementados

### Autenticacao e Perfil Profissional

- Registro, login e JWT.
- Middleware de autenticacao aplicado nas rotas protegidas.
- Cadastro com campos profissionais: `profession`, `primary_niche` e `internal_context`.
- Edicao posterior do perfil em `/profile` via `PATCH /api/auth/me`.
- Layout exibe profissao e nicho foco do usuario.
- Prompts internos de IA usam esses campos para adaptar diagnosticos, mensagens, e-mails, roteiros e propostas ao ponto de vista do usuario.

Arquivos principais:

- `backend/src/api/routes/auth.mjs`
- `backend/src/api/middleware/auth.mjs`
- `backend/src/database/init.mjs`
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Profile.jsx`
- `frontend/src/store/authStore.js`
- `frontend/src/components/Layout.jsx`

### Leads e CRM

- CRUD de leads.
- Importacao manual.
- Importacao CSV.
- Listagem com filtros.
- Exportacao CSV e JSON.
- Analise em lote.
- Status comercial do lead.
- Responsavel, proxima acao, valor potencial, motivo de perda.
- Historico de follow-up e notas.
- Pagina CRM Kanban em `/crm` com colunas por status e movimentacao rapida do lead.

Arquivos principais:

- `backend/src/api/routes/leads.mjs`
- `backend/src/services/csvImporter.mjs`
- `frontend/src/pages/Leads.jsx`
- `frontend/src/pages/LeadDetails.jsx`
- `frontend/src/pages/CrmKanban.jsx`

### Coleta, Historico, Logs e Cache

Fontes suportadas:

- RapidAPI Local Business Data.
- Apify Google Maps Scraper.
- Serper.dev Google Places.

A coleta permite selecionar:

- Credencial/fonte.
- Pais, estado/regiao e cidade.
- Nicho.
- Modificador.
- Quantidade de leads.
- Extracao adicional de contatos no RapidAPI.
- Verificacao opcional de existencia de WhatsApp antes de salvar.
- Forcar nova coleta ignorando cache.

Persistencia operacional implementada:

- `collection_runs`: uma linha por execucao de coleta.
- `collection_run_logs`: eventos, erros e etapas da execucao.
- `collection_cache`: cache por assinatura de busca para evitar chamadas repetidas ao provider.
- Rota `GET /api/collections` para listar execucoes.
- Rota `GET /api/collections/:id/logs` para ver logs da execucao.
- Pagina `/collections` para visualizar historico, cache hit, totais e logs.

Arquivos principais:

- `backend/src/api/routes/leads.mjs`
- `backend/src/api/routes/collectionRuns.mjs`
- `backend/src/services/collectionRunService.mjs`
- `backend/src/services/scraperCollector.mjs`
- `backend/src/services/scrapers/rapidApiLocalBusiness.mjs`
- `backend/src/services/scrapers/apifyGoogleMaps.mjs`
- `backend/src/services/scrapers/serper.mjs`
- `frontend/src/pages/Collect.jsx`
- `frontend/src/pages/CollectionHistory.jsx`

### Validacao De Providers

Estado registrado no PR #6:

- Serper: coleta real pequena passou, total 3, saved 3, duplicates 0.
- Apify: coleta real pequena passou, total 1, saved 1, com input `{ language, location, max_results, query }`.
- RapidAPI: coleta real pequena passou no ambiente do PR, total 5, saved 3, duplicates 2.
- RapidAPI 403 `not subscribed`: mensagem amigavel implementada e coberta por teste.
- Apify `full-permission-actor-not-approved`: mensagem amigavel implementada e coberta por teste.

Observacao: se a interface local do usuario retornar 403 `You are not subscribed to this API` no RapidAPI, validar assinatura da API exata, projeto/API key selecionado e `x-rapidapi-host` copiado do playground da API assinada.

### Verificacao de WhatsApp na Coleta

Opcao adicionada na pagina de coleta:

- `Verificar se o telefone existe no WhatsApp antes de salvar`.

Comportamento:

- Requer WhatsApp conectado.
- Valida a conexao antes de consumir cota do scraper.
- Consulta a Evolution API com os telefones encontrados.
- Salva apenas leads com WhatsApp confirmado.
- Preenche o campo `whatsapp` do lead com o telefone validado.
- Retorna estatisticas de confirmados, rejeitados e sem telefone.
- Registra os contadores no historico da coleta.

Status: implementado, mas ainda falta teste real com instancia conectada.

Arquivos principais:

- `backend/src/services/whatsapp/evolutionClient.mjs`
- `backend/src/services/whatsapp/whatsappService.mjs`
- `backend/src/api/routes/leads.mjs`
- `frontend/src/pages/Collect.jsx`

### Credenciais

- CRUD completo.
- Teste de credencial.
- Status ativo, inativo, pausado, erro e limite atingido.
- Uso diario e mensal.
- Historico diario de uso.
- Mascara de API key no frontend.
- Criptografia da chave no banco.
- Provedores agrupados visualmente em Scrapers de Leads e Inteligencia Artificial.

Scrapers suportados:

- RapidAPI Local Business Data.
- Apify Google Maps Scraper.
- Serper.dev Google Places.

LLMs suportados:

- OpenAI.
- Anthropic.
- Google Gemini.
- Groq.
- OpenRouter.
- Cerebras.
- Mistral AI.

### Deduplicacao

Deduplicacao ativa antes de salvar leads.

Prioridade atual:

1. `place_id`
2. `business_id`
3. `google_id`
4. telefone normalizado
5. dominio normalizado
6. nome normalizado + cidade

Tambem existem endpoints para listar duplicatas, mesclar leads e normalizar dados.

### Auditoria de Site

A auditoria detecta site online, HTTPS, tempo de carregamento, Meta Pixel, GTM, GA4, Google Ads Tag, WhatsApp no site, formularios, redes sociais, tecnologias e pontos basicos de conversao.

### IA / LLM

Implementado:

- Cadastro de credenciais LLM.
- Teste de credencial LLM.
- Status de IA ativa.
- Catalogo de provedores.
- Catalogo de tarefas.
- Execucao de tarefas por lead.
- Aplicacao do resultado em campos do lead quando permitido.
- Assistente IA dentro da pagina de detalhes do lead.
- Prompt-base dinamico com profissao, nicho foco e instrucoes internas do usuario.

Tarefas atuais:

- Diagnostico comercial aprofundado.
- Mensagem de WhatsApp de primeira abordagem.
- Mensagem de follow-up.
- E-mail de prospeccao.
- Roteiro de video Loom.
- Resumo e posicionamento.
- Estrutura de proposta.

### Dashboard

Implementado dashboard comercial com:

- Total de leads.
- Score medio.
- Oportunidades.
- WhatsApp confirmado.
- Distribuicao por prioridade.
- Distribuicao por status.
- Presenca digital.
- Funil comercial.
- Taxa de resposta.
- Valor fechado.
- Fontes de coleta.
- Conversao por nicho.
- Conversao por cidade.

Arquivos principais:

- `backend/src/api/routes/stats.mjs`
- `frontend/src/pages/Dashboard.jsx`

## Banco de Dados

Tabelas principais:

- `users`
- `user_settings` legado
- `rapidapi_usage` legado
- `credentials`
- `credential_usage`
- `collection_runs`
- `collection_run_logs`
- `collection_cache`
- `leads`
- `lead_followups`
- `whatsapp_instances`
- `whatsapp_messages`

Migracoes idempotentes relevantes:

- `users.profession`
- `users.primary_niche`
- `users.internal_context`
- `credentials.category`
- `credentials.model`
- tabelas de historico/log/cache de coleta
- campos normalizados em `leads`
- indices de deduplicacao

## O Que Ainda Falta

Prioridade alta:

1. Teste real da verificacao WhatsApp em coleta com instancia conectada.
2. Revalidacao dos providers no frontend apos merge usando credenciais reais do usuario.

Prioridade media:

1. Kanban comercial avancado com drag-and-drop, filtros e edicao rapida.
2. Filtros por periodo/fonte no dashboard comercial.
3. TTL visual e limpeza manual de cache.
4. Documentacao especifica de operacao WhatsApp/IA/coleta/credenciais.

Prioridade baixa:

1. Exportacao PDF.
2. Roteiros comerciais por nicho.
3. Sugestao de oferta por nicho.
4. Relatorios de performance de prospeccao.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 94% pronto.
- Operacao interna local: 91% pronta.
- Produto comercial: 54% pronto.
- Documentacao: em atualizacao.

O sistema ja pode ser usado internamente para coletar, analisar, priorizar e abordar leads, desde que as credenciais estejam configuradas e o WhatsApp esteja conectado quando a verificacao de existencia for usada.
