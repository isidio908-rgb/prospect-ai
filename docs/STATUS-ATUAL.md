# Prospect AI - Status Atual do Projeto

**Data:** 06/07/2026  
**Estado:** produto interno operacional em `main`, com Autopilot consolidado como a unica superficie visivel de automacao comercial.

Para a visao curta de continuidade, leia primeiro `docs/MAPA-INTERNO.md`. Para operar o Autopilot, leia `docs/GUIA-USO-AUTOPILOT.md`. Para a revisao de produto do ponto de vista de usuario leigo, leia `docs/REVISAO-UX-USUARIO-LEIGO.md`.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina interna de prospeccao comercial. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens, gerencia credenciais, opera WhatsApp via Evolution API, usa IA contextual, organiza o pipeline no CRM Kanban e possui Autopilot controlado.

A decisao atual de produto e simplificar a experiencia: o usuario nao deve operar motores internos como paginas separadas. O caminho normal passa por Dashboard, Coletar, Historico, Leads, CRM Kanban, Autopilot, WhatsApp, Credenciais e Perfil.

## Marco Mais Recente Em Main

PR #23 foi validado e mergeado.

Resultado final:

- Autopilot virou a central unica de automacao comercial.
- Menu lateral deixou de mostrar `Semi-auto`, `Respostas`, `Templates`, `Diagnostico` e `Agendamento`.
- Agendamento comercial assistido foi implementado como motor interno/fluxo controlado.
- Travas e auditoria ficaram visiveis no Autopilot.
- Mensagens novas continuam exigindo aprovacao em lote.
- Envio real continua restrito a mensagens `approved`.

## Limpeza Em Andamento

Branch atual de limpeza UX:

- remove rotas frontend antigas dos motores internos;
- remove arquivos de paginas antigas de Autopilot standalone;
- atualiza documentacao para orientar usuario leigo;
- adiciona `docs/REVISAO-UX-USUARIO-LEIGO.md`.

## Stack Atual

- Backend: Node.js + Express + ESModules, PostgreSQL, porta 3001.
- Frontend: React + Vite + Tailwind CSS v4, porta 5173.
- Banco: PostgreSQL 16 via Docker.
- WhatsApp: Evolution API + Redis via Docker.
- Infra local: `docker compose`.
- Autenticacao: JWT.
- Criptografia: AES-256-GCM para API keys.

## Modulos Operacionais Visiveis

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
| Autopilot | Operacional controlado | Coleta, analise, score, lotes, aprovacao, envio de aprovadas, respostas, follow-ups e agendamento como motores internos. |

## Motores Internos Do Autopilot

| Motor | Estado | Exposicao correta |
|---|---|---|
| Semi-auto | Operacional | Interno ao Autopilot. |
| Respostas | Operacional | CRM/detalhe do lead. |
| Templates | Operacional | Interno ao Autopilot/lead. |
| Diagnostico avancado | Operacional | Detalhe do lead/CRM. |
| Agendamento assistido | Operacional | CRM/detalhe do lead. |
| Scheduler | Operacional | Auditoria/log. |
| Worker | Operacional | Acao controlada no Autopilot. |

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
- Motores internos nao devem enviar WhatsApp automaticamente sem confirmacao/aprovacao.
- Autopilot processa somente fila `approved` para envio.
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
- Agendamento assistido.
- Diagnostico comercial.
- Ciclo semi-automatico completo.

### Comandos Suportados

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3,5
CANCELAR 42:2,4
```

### Importante

Aprovar lote ou mensagem apenas muda `message_queue.status` para `approved`. O envio real para lead acontece somente pelo worker controlado.

No Autopilot, o botao **Enviar aprovadas agora** processa somente itens `approved` e roda stop-on-reply antes.

No agendamento assistido, confirmar reuniao apenas atualiza CRM/historico. Nao envia WhatsApp e nao cria evento externo.

## O Que Ainda Falta

Prioridade alta:

1. Wizard de operacao diaria no Autopilot.
2. Estado operacional claro no topo do Autopilot.
3. Respostas e agendamento dentro do CRM/detalhe do lead.

Prioridade media:

1. PDF binario com template visual.
2. Classificacao por LLM com custo/limite.
3. Integracao Google Calendar/Calendly com confirmacao explicita.
4. Agenda interna de reunioes marcadas.
5. Cron controlado futuro.

## Proximo Passo Recomendado

Validar e mergear a limpeza de UX para usuario leigo.

Depois, criar o wizard de operacao diaria dentro do Autopilot.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 98% pronto.
- Operacao interna local: 98% pronta.
- Autopilot assistido/controlado: 97% pronto.
- Clareza para usuario leigo: 72% pronto.
- Produto comercial: 74% pronto.
- Documentacao: em atualizacao continua.
