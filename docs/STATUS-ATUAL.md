# Prospect AI - Status Atual do Projeto

**Data:** 04/07/2026  
**Estado:** produto interno operacional em `main`, com Autopilot SDR assistido validado por WhatsApp real.

Para a visao curta de continuidade, leia primeiro `docs/MAPA-INTERNO.md`.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina interna de prospeccao comercial. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens, gerencia credenciais, opera WhatsApp via Evolution API, usa IA contextual e organiza o pipeline no CRM Kanban.

O marco mais recente foi a aprovacao em lote do Autopilot SDR pelo WhatsApp pessoal do usuario. Um lote real foi aprovado pelo webhook real da Evolution API, mudando mensagens para `approved` sem enviar nada automaticamente para leads.

## Marco Mais Recente - PR #15

PR #15 foi validado e mergeado.

Resultado final:

- Stack local saudavel com `/health` ok.
- Novo lote real criado: `#26`.
- Solicitacao chegou no WhatsApp pessoal.
- Resposta `APROVAR LOTE 26` foi processada pelo webhook real.
- Lote virou `approved`.
- 2 itens viraram `approved`.
- Nenhum item virou `sent`.
- Logs recentes sem padroes de segredo.
- Merge commit: `3404742ca7632e30b8556b3874bc84ee45d463f7`.

Conclusao: o Autopilot assistido esta pronto para aprovar mensagens em lote. O envio automatico para leads ainda nao esta ativo e deve nascer apenas em PR futura com limites e stop-on-reply.

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
| Autopilot SDR backend | Operacional | Regras, fila, lotes e aprovacao via WhatsApp. |
| Autopilot SDR frontend | Pendente | Proximo passo recomendado: pagina `/autopilot`. |

## Validacoes Ja Realizadas

### Core e Infra

- Backend `npm test` passando nas validacoes recentes.
- Backend `npm audit --json` com 0 vulnerabilidades apos atualizacao controlada do `bcrypt`.
- Frontend `npm run build` passando nas validacoes recentes.
- `docker compose build backend frontend` passando.
- `docker compose up -d backend frontend` passando.
- `/health` retornando 200.
- Frontend validado em rotas principais: `/`, `/collections`, `/profile`, `/leads`, `/dashboard`, `/crm`.

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

## Autopilot SDR Atual

### Implementado

- Tabelas `automation_rules`, `automation_runs`, `message_queue`.
- Tabelas `approval_batches` e `approval_batch_items`.
- CRUD autenticado de regras em `/api/autopilot/rules`.
- Listagem da fila em `/api/autopilot/queue`.
- Aprovar/cancelar mensagem individual por API.
- Criar/listar/detalhar lotes de aprovacao.
- Enviar solicitacao de aprovacao ao WhatsApp pessoal.
- Processar comandos pelo webhook real da Evolution API.
- Fallback autenticado para processar comando pela API.

### Comandos Suportados

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3,5
CANCELAR 42:2,4
```

### Importante

Aprovar lote ou mensagem apenas muda `message_queue.status` para `approved`. O envio automatico real para lead ainda nao existe.

## O Que Ainda Falta

Prioridade alta:

1. UI assistida do Autopilot SDR em `/autopilot`.
2. Operacao controlada de prospeccao real com baixo volume.
3. Scheduler assistido para criar fila `pending`, sem envio.

Prioridade media:

1. Worker de envio controlado para mensagens `approved`.
2. Stop-on-reply para follow-ups.
3. Dashboard especifico do Autopilot.
4. Classificacao de respostas por IA.

Prioridade baixa:

1. Exportacao PDF por lead.
2. Templates comerciais por nicho.
3. Priorizacao inteligente avancada.
4. Agendamento assistido.

## Proximo Passo Recomendado

Fazer PR #16 com a tela `/autopilot` antes de criar scheduler ou worker.

Motivo: o backend do Autopilot ja esta pronto, mas o usuario precisa operar regras, fila e lotes visualmente antes de qualquer automacao diaria ou envio controlado.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 97% pronto.
- Operacao interna local: 96% pronta.
- Autopilot assistido: 70% pronto.
- Produto comercial: 58% pronto.
- Documentacao: atualizada pos-PR #15.
