# Prospect AI - Status Atual do Projeto

**Data:** 04/07/2026  
**Estado:** produto interno operacional em `main`, com Autopilot SDR completo controlado, guia operacional e central de respostas mergeados. PR #20 adiciona templates comerciais por nicho e profissao.

Para a visao curta de continuidade, leia primeiro `docs/MAPA-INTERNO.md`. Para operar a pagina `/autopilot`, leia `docs/GUIA-USO-AUTOPILOT.md`.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina interna de prospeccao comercial. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens, gerencia credenciais, opera WhatsApp via Evolution API, usa IA contextual, organiza o pipeline no CRM Kanban e possui Autopilot SDR controlado.

O marco mais recente em `main` foi o merge do PR #19, que adicionou a central `/autopilot/replies` para tratar respostas recebidas, sugerir proxima acao e atualizar CRM sem envio automatico. O PR #20 em producao adiciona `/autopilot/templates` para gerar mensagens por nicho, tom e contexto profissional.

## Marco Mais Recente Em Main - PR #19

PR #19 foi validado e mergeado.

Resultado final:

- Criada pagina `/autopilot/replies`.
- Criado inbox autenticado de respostas recebidas.
- Filtros por busca, intencao e status.
- Resposta sugerida copiavel.
- Acoes seguras para CRM.
- Registro em `lead_followups`.
- Isolamento por usuario validado.
- Nenhum envio automatico de WhatsApp no fluxo.
- Merge commit: `c8ba8ab913e83b09b7b0ec843a1141753274d315`.

## Em Producao - PR #20

Objetivo: melhorar a qualidade da abordagem comercial antes do envio.

Entregas:

- Nova pagina `/autopilot/templates`.
- Novo endpoint `GET /api/autopilot/templates/catalog`.
- Novo endpoint `POST /api/autopilot/templates/preview`.
- Novo endpoint `POST /api/autopilot/templates/apply`.
- Biblioteca de nichos e tons comerciais.
- Deteccao de dores observaveis no lead.
- Mensagem inicial, follow-up, diagnostico curto e contexto profissional para LLM.
- Uso de `profession`, `primary_niche` e `internal_context` do usuario.
- Aplicacao de template no lead sem envio automatico.
- Registro em `lead_followups`.
- Testes para catalogo, previa, isolamento por usuario e aplicacao.

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
| Central de respostas | Operacional | Inbox comercial em `/autopilot/replies`, sem envio automatico. |
| Templates comerciais | PR #20 | Mensagens por nicho/contexto em `/autopilot/templates`, sem envio automatico. |

## Validacoes Ja Realizadas

### Core e Infra

- Backend `npm test` passando nas validacoes recentes.
- Backend `npm audit --json` com 0 vulnerabilidades apos atualizacao controlada do `bcrypt`.
- Frontend `npm run build` passando nas validacoes recentes.
- `docker compose build backend frontend` passando.
- `docker compose up -d backend frontend` passando.
- `/health` retornando 200.
- Frontend validado em rotas principais: `/`, `/collections`, `/profile`, `/leads`, `/dashboard`, `/crm`, `/autopilot`, `/autopilot/replies`.

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
- Central de respostas mantem respostas como acao assistida/copia, sem envio automatico.
- PR #20 aplica templates no cadastro do lead, mas nao envia WhatsApp automaticamente.

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
- Central de respostas e proxima acao recomendada.
- Em PR #20: templates comerciais por nicho e profissao.

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

A central de templates gera, copia e aplica textos no lead. Ela nao envia mensagem para leads.

## O Que Ainda Falta

Prioridade alta da V2 comercial:

1. Validar e mergear PR #20: templates comerciais por nicho e profissao.
2. PR #21: diagnostico comercial avancado.
3. PR #22: agendamento comercial assistido.

Prioridade media:

1. Cron controlado futuro.
2. PDF binario com template visual.
3. Classificacao por LLM com custo/limite.
4. Integracao Google Calendar/Calendly.

## Proximo Passo Recomendado

Validar PR #20 pela CLI local.

Motivo: templates por nicho melhoram a qualidade da abordagem antes de usar lotes, fila e envio controlado.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 98% pronto.
- Operacao interna local: 97% pronta.
- Autopilot assistido/controlado: 92% pronto.
- Produto comercial: 68% pronto.
- Documentacao: em atualizacao continua.