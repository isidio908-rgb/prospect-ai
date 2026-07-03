# Historico do Projeto - Prospect AI

Este arquivo consolida o historico operacional do projeto. Documentos antigos de sprint continuam no repositorio, mas este passa a ser o registro principal e atualizado.

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

1. Avaliar e corrigir as 2 vulnerabilidades altas do `npm audit` do backend.
2. Iniciar operacao controlada de prospeccao real com baixo volume.
3. Kanban comercial avancado com drag-and-drop, filtros e edicao rapida.
4. Dashboard comercial com filtros por periodo/fonte.
5. Documentacao operacional especifica para WhatsApp, IA, coleta e credenciais.
