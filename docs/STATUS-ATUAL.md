# Prospect AI - Status Atual do Projeto

**Data:** 04/07/2026  
**Estado:** produto interno operacional em `main`, com Autopilot SDR completo controlado mergeado no PR #17.

Para a visao curta de continuidade, leia primeiro `docs/MAPA-INTERNO.md`. Para operar a pagina `/autopilot`, leia `docs/GUIA-USO-AUTOPILOT.md`.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina interna de prospeccao comercial. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens, gerencia credenciais, opera WhatsApp via Evolution API, usa IA contextual, organiza o pipeline no CRM Kanban e possui Autopilot SDR controlado.

O marco mais recente foi o merge do PR #17, que adicionou a central `/autopilot` para operar regras, fila, lotes, scheduler, envio controlado, stop-on-reply, follow-ups, classificacao de respostas, agendamento assistido e diagnostico base.

## Marco Mais Recente - PR #17

PR #17 foi validado e mergeado.

Resultado final:

- `/autopilot` refinada como central operacional comercial.
- Cards de proxima acao.
- Fluxo visual 1 a 11.
- Regras, fila e lotes operaveis pela interface.
- Scheduler assistido com `dry_run=true` por padrao.
- Worker de envio controlado, com envio real apenas se `dry_run=false` e `confirm_send=true`.
- Stop-on-reply para cancelar follow-ups quando ha resposta.
- Follow-ups assistidos.
- Classificacao heuristica de respostas.
- Agendamento assistido.
- Diagnostico/PDF base em Markdown.
- Reenvio de solicitacao de lote para WhatsApp pessoal conectado.
- Validacao final reportada: backend 60/60, frontend build, audit, Docker, `/health` e `/autopilot` ok.
- Merge commit: `78e62b205445d63a3b4dc768dc8de6794d8b302b`.

Conclusao: o Autopilot esta pronto para uso assistido diario, mantendo controle humano antes de qualquer envio real.

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

### Comandos Suportados

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3,5
CANCELAR 42:2,4
```

### Importante

Aprovar lote ou mensagem apenas muda `message_queue.status` para `approved`. O envio real para lead acontece somente pelo worker controlado, em modo avancado, com confirmacao explicita.

## O Que Ainda Falta

Prioridade alta da V2 comercial:

1. Guia de uso do Autopilot e mapa atualizado.
2. Central de respostas e proxima acao recomendada.
3. Templates comerciais por nicho e profissao.
4. Diagnostico comercial avancado.
5. Agendamento comercial assistido.

Prioridade media:

1. Cron controlado futuro.
2. PDF binario com template visual.
3. Classificacao por LLM com custo/limite.
4. Integracao Google Calendar/Calendly.

## Proximo Passo Recomendado

Fazer PR #18 com `docs/GUIA-USO-AUTOPILOT.md` e atualizacao de mapa/TODO/status.

Motivo: antes de adicionar novas funcoes comerciais, o usuario precisa entender claramente como operar o Autopilot atual.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 98% pronto.
- Operacao interna local: 97% pronta.
- Autopilot assistido/controlado: 88% pronto.
- Produto comercial: 62% pronto.
- Documentacao: em atualizacao pos-PR #17.
