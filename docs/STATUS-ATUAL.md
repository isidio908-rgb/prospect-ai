# Prospect AI - Status Atual do Projeto

**Data:** 05/07/2026  
**Estado:** produto interno operacional em `main`, com Autopilot SDR completo controlado, guia operacional, central de respostas e templates comerciais mergeados. PR #21 adiciona diagnostico comercial avancado.

Para a visao curta de continuidade, leia primeiro `docs/MAPA-INTERNO.md`. Para operar a pagina `/autopilot`, leia `docs/GUIA-USO-AUTOPILOT.md`.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina interna de prospeccao comercial. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens, gerencia credenciais, opera WhatsApp via Evolution API, usa IA contextual, organiza o pipeline no CRM Kanban e possui Autopilot SDR controlado.

O marco mais recente em `main` foi o merge do PR #20, que adicionou `/autopilot/templates` para gerar mensagens por nicho, tom e contexto profissional sem envio automatico. O PR #21 em producao adiciona `/autopilot/diagnostics` para transformar dados do lead em material comercial: resumo WhatsApp, Markdown, roteiro de Loom/audio, roteiro de reuniao e oferta recomendada.

## Marco Mais Recente Em Main - PR #20

PR #20 foi validado e mergeado.

Resultado final:

- Criada pagina `/autopilot/templates`.
- Criado catalogo de nichos e tons comerciais.
- Criada deteccao de dores observaveis por lead.
- Gerada mensagem inicial, follow-up, diagnostico curto e contexto profissional para LLM.
- Usados `profession`, `primary_niche` e `internal_context` do usuario.
- Aplicar template atualiza lead e registra `lead_followups`.
- Nenhum envio automatico de WhatsApp no fluxo.
- Merge commit: `99bc8d786884a53b64876670044926a0df355982`.

## Em Producao - PR #21

Objetivo: transformar diagnostico em material de venda consultivo.

Entregas:

- Nova pagina `/autopilot/diagnostics`.
- Novo endpoint `GET /api/autopilot/diagnostics/:leadId/advanced`.
- Novo endpoint `POST /api/autopilot/diagnostics/:leadId/advanced/apply`.
- Diagnostico curto para WhatsApp.
- Diagnostico completo em Markdown.
- Roteiro de Loom/audio.
- Roteiro de reuniao de 15 minutos.
- Sugestao de oferta: tracking, trafego, site/landing page, conversao WhatsApp/formulario, criativos, CRM ou consultoria.
- Separacao entre fatos observados e inferencias comerciais.
- Aplicacao de diagnostico no lead sem fila e sem envio automatico.
- Registro em `lead_followups`.
- Testes para geracao, isolamento por usuario e garantia de que nenhuma mensagem entra em `message_queue`.

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
| Templates comerciais | Operacional | Mensagens por nicho/contexto em `/autopilot/templates`, sem envio automatico. |
| Diagnostico avancado | PR #21 | Material comercial em `/autopilot/diagnostics`, sem envio automatico. |

## Validacoes Ja Realizadas

### Core e Infra

- Backend `npm test` passando nas validacoes recentes.
- Backend `npm audit --json` com 0 vulnerabilidades apos atualizacao controlada do `bcrypt`.
- Frontend `npm run build` passando nas validacoes recentes.
- `docker compose build backend frontend` passando.
- `docker compose up -d backend frontend` passando.
- `/health` retornando 200.
- Frontend validado em rotas principais: `/`, `/collections`, `/profile`, `/leads`, `/dashboard`, `/crm`, `/autopilot`, `/autopilot/replies`, `/autopilot/templates`.

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
- Templates aplicam textos no cadastro do lead, mas nao enviam WhatsApp automaticamente.
- PR #21 aplica diagnostico no lead, mas nao cria fila nem envia WhatsApp automaticamente.

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
- Templates comerciais por nicho e profissao.
- Em PR #21: diagnostico comercial avancado.

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

A central de diagnostico avancado gera, copia e aplica diagnostico no lead. Ela nao cria fila nem envia mensagem para leads.

## O Que Ainda Falta

Prioridade alta da V2 comercial:

1. Validar e mergear PR #21: diagnostico comercial avancado.
2. PR #22: agendamento comercial assistido.

Prioridade media:

1. Cron controlado futuro.
2. PDF binario com template visual.
3. Classificacao por LLM com custo/limite.
4. Integracao Google Calendar/Calendly.

## Proximo Passo Recomendado

Validar PR #21 pela CLI local.

Motivo: o diagnostico avancado aumenta autoridade na abordagem e facilita transformar resposta positiva em reuniao.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 98% pronto.
- Operacao interna local: 97% pronta.
- Autopilot assistido/controlado: 94% pronto.
- Produto comercial: 70% pronto.
- Documentacao: em atualizacao continua.
