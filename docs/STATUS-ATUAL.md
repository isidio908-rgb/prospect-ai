# Prospect AI - Status Atual do Projeto

**Data:** 04/07/2026  
**Estado:** produto interno operacional em `main`, com Autopilot SDR completo controlado e guia operacional mergeados. PR #19 adiciona a central de respostas comerciais.

Para a visao curta de continuidade, leia primeiro `docs/MAPA-INTERNO.md`. Para operar a pagina `/autopilot`, leia `docs/GUIA-USO-AUTOPILOT.md`.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina interna de prospeccao comercial. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens, gerencia credenciais, opera WhatsApp via Evolution API, usa IA contextual, organiza o pipeline no CRM Kanban e possui Autopilot SDR controlado.

O marco mais recente em `main` foi o merge do PR #18, que documentou o uso do Autopilot e atualizou o mapa interno. O PR #19 em producao adiciona `/autopilot/replies` para tratar respostas recebidas, sugerir proxima acao e atualizar CRM sem envio automatico.

## Marco Mais Recente Em Main - PR #18

PR #18 foi validado e mergeado.

Resultado final:

- Criado `docs/GUIA-USO-AUTOPILOT.md`.
- Atualizados README, mapa interno, TODO e status.
- Documentado fluxo diario seguro.
- Documentada diferenca entre aprovar lote e enviar mensagem para lead.
- Merge commit: `dc6dd77b4dd15dd602cf18e7b7876017b0d648e0`.

## Em Producao - PR #19

Objetivo: centralizar respostas recebidas e transformar cada retorno em acao comercial.

Entregas:

- Nova pagina `/autopilot/replies`.
- Novo endpoint `GET /api/autopilot/replies/inbox`.
- Novo endpoint `POST /api/autopilot/replies/:leadId/action`.
- Classificacao heuristica de respostas.
- Resposta sugerida copiavel.
- Acoes seguras para CRM: respondeu, reuniao, sem interesse, proxima acao/tratar preco.
- Registro em `lead_followups`.
- Testes para inbox, isolamento por usuario e aplicacao de acao.
- Sem envio automatico de resposta para lead.

## Stack Atual

- Backend: Node.js + Express + ESModules, PostgreSQL, porta 3001.
- Frontend: React + Vite + Tailwind CSS v4, porta 5173.
- Banco: PostgreSQL 16 via Docker.
- WhatsApp: Evolution API + Redis via Docker.
- Infra local: `docker compose`.
- Autenticacao: JWT.
- Criptografia: AES-256-GCM para API keys.

## Modulos Operacionais

| Modulo | Estado | Observacao |
|---|---|---|
| Autenticacao e perfil | Operacional | Cadastro, login, JWT, profissao, nicho e contexto interno. |
| Leads | Operacional | CRUD, importacao, exportacao, analise e detalhes. |
| Coleta | Operacional | Serper, Apify, RapidAPI e CSV/manual. |
| Historico/log/cache | Operacional | Runs, logs, cache, TTL visual e limpeza manual. |
| Credenciais | Operacional | Scrapers e LLMs com chave criptografada e mascarada. |
| Deduplicacao | Operacional | IDs externos, telefone, dominio e nome+cidade. |
| Auditoria de site | Operacional | Tracking, WhatsApp, formulario, tecnologias e conversao. |
| IA/LLM | Operacional | Tarefas comerciais com contexto profissional do usuario. |
| WhatsApp | Operacional | Conexao, chat, midia/audio, webhook e verificacao de numero. |
| CRM Kanban | Operacional | Drag-and-drop, filtros e edicao rapida. |
| Dashboard | Operacional | Funil, fontes, periodo, nicho, cidade e conversao. |
| Autopilot SDR | Operacional controlado | Regras, fila, lotes, scheduler, worker controlado, follow-ups, resposta, agendamento e diagnostico. |
| Central de respostas | PR #19 | Inbox comercial em `/autopilot/replies`, sem envio automatico. |

## Validacoes Ja Realizadas

### Core e Infra

- Backend `npm test` passando nas validacoes recentes.
- Backend `npm audit --json` com 0 vulnerabilidades apos atualizacao controlada do `bcrypt`.
- Frontend `npm run build` passando nas validacoes recentes.
- `docker compose build backend frontend` passando.
- `docker compose up -d backend frontend` passando.
- `/health` retornando 200.
- Frontend validado em rotas principais: `/`, `/collections`, `/profile`, `/leads`, `/dashboard`, `/crm`, `/autopilot`.

### Providers

- Serper: credencial real testada e coleta real validada.
- Apify: credencial real testada e coleta real validada com input `{ language, location, max_results, query }`.
- RapidAPI: credencial real testada e coleta real validada.
- RapidAPI 403 `not subscribed`: mensagem amigavel implementada.
- Apify `full-permission-actor-not-approved`: mensagem amigavel implementada.

### WhatsApp

- Evolution API conectada.
- Envio real para lead de teste validado.
- Historico de mensagens atualizado apos envio.
- Verificacao de existencia de WhatsApp durante coleta validada.
- Webhook real processou aprovacao de lote do Autopilot.

### Seguranca

- Chaves retornam mascaradas no frontend/API.
- API keys criptografadas no banco.
- Logs recentes sem padroes de segredo.
- Nenhum item de lote aprovado foi enviado automaticamente para lead.
- Aprovacao em lote aceita apenas o `approval_whatsapp` do usuario.
- Envio real do worker exige confirmacao explicita.
- PR #19 mantem respostas como acao assistida/copia, sem envio automatico.

## Autopilot SDR Atual

### Implementado

- Tabelas `automation_rules`, `automation_runs`, `message_queue`.
- Tabelas `approval_batches` e `approval_batch_items`.
- CRUD autenticado de regras em `/api/autopilot/rules`.
- Listagem da fila em `/api/autopilot/queue`.
- Aprovar/cancelar mensagem individual por API/UI.
- Criar/listar/detalhar lotes de aprovacao.
- Enviar e reenviar solicitacao de aprovacao ao WhatsApp pessoal.
- Processar comandos pelo webhook real da Evolution API.
- Fallback autenticado para processar comando pela API.
- Scheduler assistido.
- Worker controlado.
- Stop-on-reply.
- Follow-ups assistidos.
- Classificacao heuristica.
- Agendamento assistido.
- Diagnostico Markdown.
- Em PR #19: central de respostas e proxima acao recomendada.

### Comandos Suportados

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3,5
CANCELAR 42:2,4
```

### Importante

Aprovar lote ou mensagem apenas muda `message_queue.status` para `approved`. O envio real para lead acontece somente pelo worker controlado, em modo avancado, com confirmacao explicita.

A central de respostas copia sugestoes e registra acoes no CRM. Ela nao envia resposta automatica para leads.

## O Que Ainda Falta

Prioridade alta da V2 comercial:

1. Validar e mergear PR #19: central de respostas e proxima acao recomendada.
2. PR #20: templates comerciais por nicho e profissao.
3. PR #21: diagnostico comercial avancado.
4. PR #22: agendamento comercial assistido.

Prioridade media:

1. Cron controlado futuro.
2. PDF binario com template visual.
3. Classificacao por LLM com custo/limite.
4. Integracao Google Calendar/Calendly.

## Proximo Passo Recomendado

Validar PR #19 pela CLI local.

Motivo: depois que a operacao de envio esta controlada e documentada, o maior ganho comercial vem de responder melhor e mais rapido quem demonstrou interesse.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 98% pronto.
- Operacao interna local: 97% pronta.
- Autopilot assistido/controlado: 90% pronto.
- Produto comercial: 65% pronto.
- Documentacao: em atualizacao continua.