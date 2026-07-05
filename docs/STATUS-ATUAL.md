# Prospect AI - Status Atual do Projeto

**Data:** 05/07/2026  
**Estado:** produto interno operacional em `main` com Autopilot SDR controlado, respostas, templates e diagnostico comercial avancado. PR atual adiciona o Autopilot Comercial Semi-Automatico em `/autopilot/semi-auto`.

Para a visao curta de continuidade, leia primeiro `docs/MAPA-INTERNO.md`. Para operar o novo cockpit diario, leia `docs/AUTOPILOT-SEMI-AUTO.md`. Para operar a central manual/avancada, leia `docs/GUIA-USO-AUTOPILOT.md`.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina interna de prospeccao comercial. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens, gerencia credenciais, opera WhatsApp via Evolution API, usa IA contextual, organiza o pipeline no CRM Kanban e possui Autopilot SDR controlado.

A evolucao atual conecta esses blocos em uma rotina semi-automatica: o sistema le historico, sugere o proximo recorte, simula o ciclo, coleta somente com aprovacao, analisa os leads, gera mensagens, cria lote de aprovacao e processa apenas mensagens ja aprovadas.

## Marco Mais Recente Em Main

PR #21 foi validado e mergeado antes desta etapa.

Resultado final:

- Criada pagina `/autopilot/diagnostics`.
- Criado diagnostico curto para WhatsApp.
- Criado diagnostico completo em Markdown.
- Criado roteiro de Loom/audio.
- Criado roteiro de reuniao.
- Criada sugestao de oferta baseada em dados observados.
- Aplicar diagnostico atualiza lead e registra historico.
- Nenhum envio automatico de WhatsApp no fluxo.

## PR Atual - Autopilot Comercial Semi-Automatico

Objetivo: deixar o sistema trabalhar a rotina diaria com menos cliques e mais controle.

Entregas:

- Nova pagina `/autopilot/semi-auto`.
- Novo endpoint `GET /api/autopilot/semi-auto/plan`.
- Novo endpoint `POST /api/autopilot/semi-auto/run`.
- Novo servico `semiAutoCommercialService.mjs`.
- Plano baseado em historico de coletas, credenciais, estatisticas da fila e leads.
- Botao de simulacao segura com `dry_run=true`.
- Execucao real protegida por `approve_collection=true`.
- Coleta, WhatsApp check, deduplicacao e persistencia.
- Analise dos leads salvos.
- Criacao/atualizacao de regra assistida.
- Enfileiramento de mensagens `pending`.
- Criacao de lote e envio opcional para WhatsApp pessoal.
- Stop-on-reply antes do worker.
- Worker processando apenas mensagens `approved`.
- Testes puros do plano semi-automatico.
- Guia operacional `docs/AUTOPILOT-SEMI-AUTO.md`.

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
| Autopilot semi-auto | PR atual | Cockpit diario em `/autopilot/semi-auto`. |
| Central de respostas | Operacional | Inbox comercial em `/autopilot/replies`, sem envio automatico. |
| Templates comerciais | Operacional | Mensagens por nicho/contexto em `/autopilot/templates`, sem envio automatico. |
| Diagnostico avancado | Operacional | Material comercial em `/autopilot/diagnostics`, sem envio automatico. |

## Validacoes Ja Realizadas

### Core e Infra

- Backend `npm test` passando nas validacoes recentes.
- Backend `npm audit --json` com 0 vulnerabilidades apos atualizacao controlada do `bcrypt`.
- Frontend `npm run build` passando nas validacoes recentes.
- `docker compose build backend frontend` passando.
- `docker compose up -d backend frontend` passando.
- `/health` retornando 200.
- Frontend validado em rotas principais: `/`, `/collections`, `/profile`, `/leads`, `/dashboard`, `/crm`, `/autopilot`, `/autopilot/replies`, `/autopilot/templates`, `/autopilot/diagnostics`.

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
- Semi-auto deve processar somente fila `approved` e exigir aprovacao para coleta real.

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
- Diagnostico Markdown.
- Central de respostas e proxima acao recomendada.
- Templates comerciais por nicho e profissao.
- Diagnostico comercial avancado.
- Em PR atual: ciclo semi-automatico completo.

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

## O Que Ainda Falta

Prioridade alta:

1. Validar PR atual: Autopilot Comercial Semi-Automatico.
2. Proximo PR: agendamento comercial assistido.

Prioridade media:

1. Cron controlado futuro.
2. PDF binario com template visual.
3. Classificacao por LLM com custo/limite.
4. Integracao Google Calendar/Calendly.

## Proximo Passo Recomendado

Validar o PR semi-automatico pela CLI local.

Motivo: ele conecta coleta, analise, lote de aprovacao e worker de aprovadas em uma rotina diaria clara para vender mais com menos operacao manual.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 98% pronto.
- Operacao interna local: 98% pronta.
- Autopilot assistido/controlado: 96% pronto.
- Produto comercial: 72% pronto.
- Documentacao: em atualizacao continua.
