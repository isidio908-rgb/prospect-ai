# Historico do Projeto - Prospect AI

Este arquivo consolida o historico operacional do projeto. Documentos antigos de sprint continuam no repositorio, mas este passa a ser o registro principal e atualizado.

## 03/07/2026 - API Do Autopilot SDR

### Implementado

- Criadas rotas autenticadas em `/api/autopilot`.
- Criado CRUD de regras em `/api/autopilot/rules`.
- Criada listagem de fila em `/api/autopilot/queue`.
- Criada aprovacao de mensagens pendentes em `/api/autopilot/queue/:id/approve`.
- Criado cancelamento de mensagens em `/api/autopilot/queue/:id/cancel`.
- Adicionado cliente frontend `autopilot` em `frontend/src/services/api.js`.
- Adicionado teste HTTP real em `backend/tests/autopilot-routes-http.test.mjs`.

### Regras De Seguranca

- Todas as rotas exigem JWT.
- Regras sao filtradas por `user_id`.
- Fila e filtrada por `user_id`.
- Usuario nao aprova nem cancela mensagem de outro usuario.
- Modo `assistido` sempre forca `require_manual_approval=true`.
- Modo `automatico` pode liberar aprovacao manual apenas quando configurado explicitamente.
- A API nao executa envio WhatsApp automaticamente nesta etapa.
- A API nao cria scheduler nem worker automatico nesta etapa.

### Observacoes

- Esta etapa prepara controle operacional de regras e fila, mas ainda sem disparo automatico.
- Proximas etapas: tela do Autopilot, scheduler assistido, worker de envio controlado, stop-on-reply, IA de resposta e agendamento.
- Precisa de validacao local com backend tests, audit, frontend build e Docker build/up antes do merge.

## 03/07/2026 - Fundacao Do Autopilot SDR

### Implementado

- Criado schema do Autopilot SDR em `backend/src/database/autopilotSchema.mjs`.
- `initDatabase()` passa a criar automaticamente as tabelas do Autopilot.
- Adicionadas tabelas:
  - `automation_rules`
  - `automation_runs`
  - `message_queue`
- Criado servico `backend/src/services/autopilot/autopilotService.mjs`.
- Adicionadas regras puras para decidir se um lead pode entrar na fila de primeira abordagem.
- Adicionado calculo de janela segura de envio.
- Modo padrao definido como `assistido`, com aprovacao manual obrigatoria.
- Modo `automatico` existe, mas so aprova envio sem revisao quando a regra explicitamente permitir.
- Adicionados testes unitarios em `backend/tests/autopilot-service.test.mjs`.
- Criada documentacao operacional `docs/AUTOPILOT-SDR.md`.

### Regras De Seguranca

- Regra desligada nao enfileira mensagens.
- Lead sem contato utilizavel nao entra na fila.
- Lead abaixo do score minimo nao entra na fila.
- Lead fora de fonte/cidade/nicho da regra nao entra na fila.
- Mensagem inicial duplicada ativa e bloqueada.
- Horario de envio respeita janela configurada.
- Fila nao armazena tokens, API keys ou credenciais.
- Envio automatico real ainda nao foi ativado nesta etapa.

### Observacoes

- Esta e uma fundacao passiva: cria schema, decisao e fila, mas nao dispara WhatsApp automaticamente.
- Proximas etapas: API/UI de regras, tela de fila, scheduler assistido, worker de envio, stop-on-reply, IA de resposta e agendamento.
- Precisa de validacao local com backend tests, audit, frontend build e Docker build/up antes do merge.

## 03/07/2026 - Testes HTTP Das Rotas De Collections

### Implementado

- Adicionado teste automatizado HTTP para as rotas `/api/collections`.
- Validada resposta `401` quando a listagem de historico e chamada sem token.
- Validada listagem autenticada de execucoes de coleta por usuario.
- Validado isolamento entre usuarios: runs de outro usuario nao aparecem na listagem.
- Validada leitura de logs por run sem exposicao de padroes de segredo.
- Validada rejeicao ao tentar limpar cache de execucao pertencente a outro usuario.
- Validada limpeza de cache da execucao do proprio usuario e remocao de TTL na listagem posterior.

### Observacoes

- O teste monta um app Express em porta aleatoria e usa JWT real contra o middleware `authenticate`.
- Nao adiciona dependencias novas.
- Validado localmente antes do merge: backend tests, audit, frontend build, Docker build/up, `/collections`, logs, limpeza de cache e scan de segredos.

## 03/07/2026 - Dashboard Comercial Com Filtros

### Implementado

- Adicionados filtros por periodo e fonte no endpoint `/api/stats`.
- Mantido periodo padrao `all` para preservar as metricas historicas ja exibidas no dashboard.
- Adicionados periodos rapidos: hoje, ultimos 7 dias, ultimos 30 dias, ultimos 90 dias e mes atual.
- Adicionado periodo personalizado com `dateFrom` e `dateTo`.
- Adicionada listagem de fontes disponiveis para selecao no dashboard.
- Atualizada pagina `/dashboard` com filtros comerciais, badges do recorte aplicado e botao de atualizacao manual.
- Adicionado teste unitario para normalizacao dos filtros e montagem parametrizada do `WHERE` SQL.

### Observacoes

- O filtro usa `data_coleta` como base temporal.
- A fonte e filtrada por `fonte`, tratando valores vazios como `indefinida`.
- A montagem do SQL continua parametrizada; valores de filtro nao sao interpolados diretamente.
- Validado localmente antes do merge: backend tests, backend audit, frontend build, Docker build/up, `/dashboard`, `/api/stats` sem filtros, periodos `7d` e `30d`, periodo customizado, filtro `fonte=serper` e scan de segredos.

## 03/07/2026 - Kanban Comercial Avancado

### Implementado

- Atualizada pagina `/crm` com drag-and-drop nativo entre colunas do pipeline.
- Adicionados filtros por status, prioridade, cidade, nicho, responsavel e busca livre.
- Adicionada contagem de valor potencial por coluna e no resumo geral.
- Adicionada edicao rapida de responsavel, proxima acao e valor potencial direto no card.
- Mantido botao de avanco rapido para a proxima etapa do funil.
- Mantido link para detalhe completo do lead.
- Mantido uso do enum atual de status para evitar reintroduzir status legado invalido.

### Observacoes

- A mudanca usa o `PATCH /api/leads/:id` ja existente.
- Nao adiciona dependencia nova.
- Validado localmente antes do merge: backend tests, frontend build, Docker build/up, `/crm`, `/leads/27`, filtros, drag-and-drop funcional por contrato, edicao rapida e scan de segredos.

## 03/07/2026 - Validacao Pos-Merge Em Main

### Validado

- `git checkout main` e `git pull origin main` executados com sucesso.
- Backend `npm test`: 32 testes passando.
- Frontend `npm run build`: passando.
- `docker compose build backend frontend`: passando.
- `docker compose up -d backend frontend`: passando.
- Stack final saudavel: backend, frontend, postgres, redis e evolution-api.
- `GET /health`: ok.
- Frontend HTTP 200 em `/`, `/collections`, `/profile`, `/leads` e `/dashboard`.
- Credenciais reais Serper, RapidAPI e Apify testadas com statusCode 200.
- API keys retornando mascaradas; nenhuma chave completa observada em respostas/logs.
- WhatsApp conectado via Evolution API.
- Envio real de mensagem para lead de teste executado com sucesso.
- Historico de mensagens atualizado apos envio.
- Coletas reais com verificacao WhatsApp ligada:
  - Serper: run 17, total 3, duplicates 2, wa_verified 2, wa_rejected 1.
  - Apify: run 18, total 1, wa_verified 0, wa_rejected 1.
  - RapidAPI: run 19, total 5, duplicates 3, wa_verified 3, wa_rejected 2.
- Cache hit confirmado ao repetir Serper sem `forceRefresh`: run 20.
- `/api/collections` lista os runs novos.
- CRM/Kanban validado com status `contato_enviado`.
- Backend rejeita corretamente status antigo invalido como `em_contato`.
- Logs dos runs sem `api_key`, `Bearer`, `x-api-key`, `x-rapidapi-key` ou `token`.
- Working tree limpo em `main...origin/main` ao fim da validacao local.

### Observacao

- `npm install` do backend ainda reporta 2 vulnerabilidades altas no audit.
- Nao foi aplicado `npm audit fix` para evitar mudancas de dependencias fora do escopo.

## 03/07/2026 - PR #6: Historico, Logs, Cache E Providers

### Implementado e validado

- Historico persistente de coletas com tabela `collection_runs`.
- Logs persistentes de execucao com tabela `collection_run_logs`.
- Cache de busca/coleta com tabela `collection_cache`.
- Rotas `/api/collections` e `/api/collections/:id/logs`.
- Pagina `Historico` em `/collections`.
- Toggle para forcar nova coleta ignorando cache.
- Testes automatizados de persistencia de runs/logs/cache.
- Mensagem amigavel para RapidAPI 403 `not subscribed`.
- Mensagem amigavel para Apify `full-permission-actor-not-approved`.
- Validacao de Serper, Apify e RapidAPI em coletas pequenas.
- Confirmacao de logs/cache sem padroes de segredo.

## 03/07/2026 - Atualizacao de Estado, IA e WhatsApp na Coleta

### Implementado

- Adicionado cliente `ai` em `frontend/src/services/api.js`.
- Criado `frontend/src/components/AiAssistant.jsx`.
- Inserido Assistente IA em `LeadDetails.jsx` depois da mensagem de follow-up e antes do chat WhatsApp.
- Ajustada pagina `Credentials.jsx` para separar visualmente credenciais de scraper e IA.
- Ajustada pagina `Credentials.jsx` para exibir provedores LLM e campo `model`.
- Atualizado endpoint `GET /api/credentials/providers` para retornar scrapers e LLMs.
- Adicionada verificacao opcional de existencia de WhatsApp na coleta.
- Adicionado client Evolution para `POST /chat/whatsappNumbers/:instance`.
- Adicionado servico `verifyLeadPhonesOnWhatsApp`.
- Ajustada rota `POST /api/leads/collect` para filtrar leads por WhatsApp confirmado quando a opcao estiver ativa.
- Ajustado salvamento de leads para gravar campo `whatsapp` quando validado.
- Corrigido healthcheck do frontend no `docker-compose.yml` para `127.0.0.1`.
- Rebuild e subida local Docker de backend e frontend.

### Validado

- `node --check` nos arquivos backend alterados.
- `npm run build` do frontend.
- `docker compose build --no-cache backend frontend`.
- `docker compose up -d --no-deps --force-recreate backend frontend`.
- Stack final com backend, frontend, postgres, redis e evolution-api saudaveis.

### Observacoes

- Nao foi necessaria migration separada para IA/LLM; `init.mjs` ja cria/migra `credentials.category` e `credentials.model`.
- A verificacao WhatsApp depende de instancia conectada e foi validada posteriormente em coletas reais no `main`.

## 02/07/2026 - Backend, Credenciais, Deduplicacao e Frontend Base

### Implementado

- Autenticacao com JWT.
- CRUD de leads.
- Importacao manual e CSV.
- Exportacao CSV e JSON.
- Auditoria de site.
- Lead Score.
- Diagnostico comercial.
- Mensagens WhatsApp e follow-up por regras.
- Sistema de credenciais com criptografia AES-256-GCM.
- Controle diario/mensal de uso por credencial.
- Scheduler de reset de cotas.
- Deduplicacao por IDs externos, telefone, dominio e nome+cidade.
- Normalizacao de campos de deduplicacao.
- Provedores de scraper: RapidAPI, Apify e Serper.
- Frontend com Dashboard, Coleta, Leads, Detalhes, Credenciais e WhatsApp.
- Dark mode via `themeStore`.
- Design system em `frontend/src/index.css`.

### Documentos historicos gerados

- `SPRINT-1-COMPLETO.md`
- `SPRINT-2-COMPLETO.md`
- `MODULO-CREDENCIAIS-COMPLETO.md`
- `TESTES-COMPLETOS.md`
- `IMPLEMENTACAO-CONCLUIDA.md`
- `BACKEND-COMPLETO.md`
- `BACKEND-FINALIZADO.md`

## Marco Atual

O projeto esta pronto para uso interno controlado, desde que:

- As credenciais de scraper estejam cadastradas e ativas.
- A credencial LLM esteja cadastrada se o usuario quiser usar o Assistente IA.
- A instancia WhatsApp esteja conectada se for usar chat ou verificacao de existencia de WhatsApp na coleta.
- A operacao respeite limites dos provedores e nao use rotacao abusiva de chaves.

## Proximos Marcos

1. UI do Autopilot SDR e fila de mensagens pendentes.
2. Scheduler assistido para enfileirar leads elegiveis.
3. Worker de envio WhatsApp com limites e stop-on-reply.
4. Resposta IA e agendamento automatico.
5. Exportacao PDF com diagnostico por lead.
