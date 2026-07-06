# Prospect AI - Status Atual do Projeto

**Data:** 05/07/2026  
**Estado:** produto interno operacional em `main` com Autopilot SDR controlado, respostas, templates, diagnostico comercial avancado e Autopilot Comercial Semi-Automatico. PR atual adiciona agendamento comercial assistido em `/autopilot/scheduling`.

Para a visao curta de continuidade, leia primeiro `docs/MAPA-INTERNO.md`. Para operar o cockpit diario, leia `docs/AUTOPILOT-SEMI-AUTO.md`. Para transformar resposta positiva em reuniao, leia `docs/AGENDAMENTO-COMERCIAL-ASSISTIDO.md`.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina interna de prospeccao comercial. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens, gerencia credenciais, opera WhatsApp via Evolution API, usa IA contextual, organiza o pipeline no CRM Kanban e possui Autopilot SDR controlado.

A evolucao atual fecha o trecho comercial entre resposta positiva e reuniao marcada: o sistema gera convite, sugere horarios, permite copiar a mensagem e registra a reuniao no CRM com historico, sem envio automatico e sem calendario externo.

## Marco Mais Recente Em Main

PR #22 foi validado e mergeado antes desta etapa.

Resultado final:

- Criada pagina `/autopilot/semi-auto`.
- Criado plano automatico baseado em historico de coletas, credenciais, fila e leads.
- Criada simulacao segura com `dry_run=true`.
- Coleta real protegida por `approve_collection=true`.
- Leads salvos podem ser analisados automaticamente.
- Regra assistida pode ser criada/atualizada para o recorte comercial.
- Mensagens novas entram como `pending`.
- Lotes podem ser enviados ao WhatsApp pessoal para aprovacao.
- Stop-on-reply roda antes do worker.
- Worker processa apenas mensagens `approved`.
- Guia operacional `docs/AUTOPILOT-SEMI-AUTO.md` criado.

## PR Atual - Agendamento Comercial Assistido

Objetivo: reduzir atrito entre resposta positiva e reuniao marcada.

Entregas:

- Nova pagina `/autopilot/scheduling`.
- Novo endpoint `POST /api/autopilot/scheduling/preview`.
- Novo endpoint `POST /api/autopilot/scheduling/confirm`.
- Novo servico `commercialSchedulingService.mjs`.
- Sugestao de horarios por timezone, duracao e periodo preferido.
- Mensagem de convite personalizada com nome do lead e contexto profissional do usuario.
- Copia manual do convite.
- Confirmacao explicita de reuniao.
- Atualizacao do lead para `reuniao_marcada`.
- Registro em `lead_followups`.
- Testes puros dos helpers de agendamento.
- Guia operacional `docs/AGENDAMENTO-COMERCIAL-ASSISTIDO.md`.

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
| Autopilot SDR | Operacional controlado | Regras, fila, lotes, scheduler, worker, follow-ups, respostas, agendamento base e diagnostico. |
| Autopilot semi-auto | Operacional | Cockpit diario em `/autopilot/semi-auto`. |
| Central de respostas | Operacional | Inbox comercial em `/autopilot/replies`, sem envio automatico. |
| Templates comerciais | Operacional | Mensagens por nicho/contexto em `/autopilot/templates`, sem envio automatico. |
| Diagnostico avancado | Operacional | Material comercial em `/autopilot/diagnostics`, sem envio automatico. |
| Agendamento assistido | PR atual | Convite, horarios sugeridos e confirmacao CRM em `/autopilot/scheduling`. |

## Validacoes Ja Realizadas

### Core e Infra

- Backend `npm test` passando nas validacoes recentes.
- Backend `npm audit --json` com 0 vulnerabilidades apos atualizacao controlada do `bcrypt`.
- Frontend `npm run build` passando nas validacoes recentes.
- `docker compose build backend frontend` passando.
- `docker compose up -d backend frontend` passando.
- `/health` retornando 200.
- Frontend validado em rotas principais: `/`, `/collections`, `/profile`, `/leads`, `/dashboard`, `/crm`, `/autopilot`, `/autopilot/replies`, `/autopilot/templates`, `/autopilot/diagnostics`, `/autopilot/semi-auto`.

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
- Diagnostico avancado aplica texto no lead, mas nao cria fila nem envia WhatsApp automaticamente.
- Semi-auto processa somente fila `approved` e exige aprovacao para coleta real.
- Agendamento assistido nao deve enviar WhatsApp nem criar calendario externo automaticamente.

## Autopilot Atual

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
- Agendamento base.
- Diagnostico Markdown.
- Central de respostas e proxima acao recomendada.
- Templates comerciais por nicho e profissao.
- Diagnostico comercial avancado.
- Ciclo semi-automatico completo.
- Em PR atual: agendamento comercial assistido.

### Comandos Suportados

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3,5
CANCELAR 42:2,4
```

### Importante

Aprovar lote ou mensagem apenas muda `message_queue.status` para `approved`. O envio real para lead acontece somente pelo worker controlado.

No semi-auto, o botao **Enviar aprovadas agora** processa somente itens `approved` e roda stop-on-reply antes.

No agendamento assistido, confirmar reuniao apenas atualiza CRM/historico. Nao envia WhatsApp e nao cria evento externo.

## O Que Ainda Falta

Prioridade alta:

1. Validar PR atual: agendamento comercial assistido.
2. Proximo PR: cron controlado futuro.

Prioridade media:

1. PDF binario com template visual.
2. Classificacao por LLM com custo/limite.
3. Integracao Google Calendar/Calendly com confirmacao explicita.
4. Agenda interna de reunioes marcadas.

## Proximo Passo Recomendado

Validar o PR de agendamento comercial assistido pela CLI local.

Motivo: ele fecha o caminho resposta positiva -> convite -> confirmacao -> reuniao marcada no CRM.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 98% pronto.
- Operacao interna local: 98% pronta.
- Autopilot assistido/controlado: 97% pronto.
- Produto comercial: 74% pronto.
- Documentacao: em atualizacao continua.