# Autopilot SDR - Modelo Operacional

**Atualizado em:** 04/07/2026

O Autopilot SDR e a camada de automacao comercial do Prospect AI. O objetivo e transformar coleta, priorizacao, abordagem, follow-up e agendamento em um fluxo cada vez mais automatico, sem perder controle operacional nem colocar a conta WhatsApp em risco.

## Principio

A automacao nasce em modo assistido.

Isso significa:

- o sistema pode avaliar leads automaticamente;
- o sistema pode criar fila de mensagens automaticamente;
- o sistema pode sugerir horario de envio;
- por padrao, a mensagem fica pendente de aprovacao manual;
- o usuario pode aprovar mensagens em lote pelo WhatsApp pessoal;
- aprovacao muda a fila para `approved`, mas nao envia mensagem ao lead;
- envio automatico real so deve ser ativado quando houver worker validado e regra explicita.

## Estado Atual

Concluido e validado:

- Fundacao com `automation_rules`, `automation_runs` e `message_queue`.
- API autenticada para regras e fila.
- Lotes de aprovacao com `approval_batches` e `approval_batch_items`.
- Campo `approval_whatsapp` no perfil do usuario.
- Envio de solicitacao de aprovacao ao WhatsApp pessoal.
- Processamento de comandos pelo webhook real da Evolution API.
- Fallback autenticado para processar comandos pela API.
- Validacao real: `APROVAR LOTE 26` aprovou um lote real pelo webhook, com 2 itens `approved` e 0 itens `sent`.

Pendente:

- UI assistida em `/autopilot`.
- Scheduler diario assistido.
- Worker de envio controlado.
- Stop-on-reply para follow-ups.
- Classificacao de respostas por IA.
- Agendamento assistido.

## Modulos Da Fundacao

### `automation_rules`

Define uma regra de automacao.

Campos principais:

- `enabled`: liga/desliga a regra.
- `mode`: `assistido` ou `automatico`.
- `source_type`: fonte de coleta desejada, como Serper, Apify ou RapidAPI.
- `niche`: nicho alvo.
- `city`: cidade alvo.
- `min_score`: score minimo para entrar na fila.
- `max_daily_sends`: limite diario de disparos.
- `max_hourly_sends`: limite horario de disparos.
- `send_window_start`: inicio da janela de envio.
- `send_window_end`: fim da janela de envio.
- `timezone`: timezone operacional.
- `require_manual_approval`: exige aprovacao manual antes do envio.
- `stop_on_reply`: para follow-ups se o lead responder.
- `followup_1_delay_hours`: atraso do primeiro follow-up.
- `followup_2_delay_hours`: atraso do segundo follow-up.

### `automation_runs`

Registra cada execucao automatica ou assistida.

Uso esperado:

- execucao diaria de selecao de leads;
- execucao de follow-up;
- execucao de reprocessamento;
- logs de quantos leads foram avaliados, enfileirados ou ignorados.

### `message_queue`

Fila de mensagens comerciais.

Status esperados:

- `pending`: aguardando aprovacao manual.
- `approved`: aprovado para envio futuro.
- `queued`: reservado por worker de envio.
- `sent`: enviado.
- `skipped`: ignorado por regra.
- `failed`: falhou.
- `cancelled`: cancelado.

Tipos iniciais:

- `initial`
- `followup_1`
- `followup_2`

### `approval_batches`

Representa um lote de mensagens pendentes enviado ao WhatsApp pessoal do usuario para aprovacao.

Status esperados:

- `pending`
- `partially_approved`
- `approved`
- `cancelled`
- `expired`

### `approval_batch_items`

Preserva a numeracao do lote enviada pelo WhatsApp.

Exemplo: no comando `APROVAR 42:1,3`, os itens `1` e `3` sao resolvidos por esta tabela, e nao pela ordem atual da fila.

## API Atual

Todas as rotas exigem JWT e isolam dados por `user_id`.

### Regras

| Metodo | Rota | Uso |
|---|---|---|
| `GET` | `/api/autopilot/rules` | Lista regras do usuario autenticado. |
| `POST` | `/api/autopilot/rules` | Cria regra de automacao. |
| `PATCH` | `/api/autopilot/rules/:id` | Atualiza regra do usuario autenticado. |
| `DELETE` | `/api/autopilot/rules/:id` | Remove regra do usuario autenticado. |

### Fila

| Metodo | Rota | Uso |
|---|---|---|
| `GET` | `/api/autopilot/queue` | Lista mensagens da fila do usuario autenticado. |
| `PATCH` | `/api/autopilot/queue/:id/approve` | Aprova mensagem pendente para envio futuro. |
| `PATCH` | `/api/autopilot/queue/:id/cancel` | Cancela mensagem pendente, aprovada ou enfileirada. |

### Lotes De Aprovacao

| Metodo | Rota | Uso |
|---|---|---|
| `GET` | `/api/autopilot/approval-batches` | Lista lotes do usuario autenticado. |
| `POST` | `/api/autopilot/approval-batches` | Cria lote com mensagens `pending`. |
| `GET` | `/api/autopilot/approval-batches/:id` | Detalha um lote e seus itens. |
| `POST` | `/api/autopilot/approval-batches/process-command` | Processa comando manual/fallback como `APROVAR LOTE 42`. |

Payload recomendado para teste sem chamada externa:

```json
{
  "limit": 5,
  "send_approval_request": false
}
```

Payload para enviar ao WhatsApp de aprovacao:

```json
{
  "limit": 5,
  "send_approval_request": true
}
```

Fallback autenticado:

```json
{
  "text": "APROVAR LOTE 42"
}
```

## Comandos Pelo WhatsApp

O lote enviado ao WhatsApp pessoal aceita:

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3,5
CANCELAR 42:2,4
```

Regras:

- somente o numero salvo em `approval_whatsapp` pode aprovar;
- lote expirado nao pode ser aprovado;
- item fora do lote e ignorado;
- aprovar muda status da fila para `approved`;
- cancelar muda status da fila para `cancelled`;
- nenhum comando envia mensagem ao lead nesta etapa.

## Cliente Frontend

O cliente `autopilot` em `frontend/src/services/api.js` centraliza:

- `listRules`
- `createRule`
- `updateRule`
- `deleteRule`
- `listQueue`
- `approveMessage`
- `cancelMessage`
- `listApprovalBatches`
- `createApprovalBatch`
- `getApprovalBatch`

Pendente para PR #16:

- adicionar metodo para `process-command` se a UI precisar reprocessar comando manualmente;
- criar pagina `/autopilot`;
- adicionar menu lateral para Autopilot.

## Regras De Seguranca

1. O modo padrao e assistido.
2. O envio automatico real nao deve ser ativado sem configuracao explicita.
3. Leads sem telefone ou WhatsApp nao entram na fila.
4. Leads abaixo do score minimo nao entram na fila.
5. Leads fora do nicho/cidade/fonte da regra nao entram na fila.
6. Mensagem inicial duplicada nao deve ser criada.
7. Envio deve respeitar janela de horario.
8. Follow-up deve parar quando houver resposta do lead.
9. A fila nao deve conter credenciais, tokens ou API keys.
10. Toda execucao precisa gerar contadores auditaveis.
11. Todas as rotas `/api/autopilot` exigem JWT.
12. Regras, fila e lotes sao isolados por `user_id`.
13. O modo `assistido` sempre forca aprovacao manual.
14. Aprovar uma mensagem nao envia WhatsApp ao lead nesta etapa; apenas muda o status para envio futuro controlado.
15. Respostas do webhook sao aceitas apenas do `approval_whatsapp` do usuario.
16. Worker automatico so pode existir com limite diario, limite horario, janela de envio, retry controlado e stop-on-reply.

## Fluxo Atual Validado

```text
Mensagem pendente
↓
Criar lote de aprovacao
↓
Enviar solicitacao ao WhatsApp pessoal
↓
Usuario responde APROVAR LOTE {id}
↓
Webhook Evolution recebe resposta
↓
Sistema valida numero aprovador
↓
Fila muda para approved
↓
Nada e enviado ao lead ainda
```

## Fluxo V1 Assistido

```text
Regra habilitada
↓
Scheduler diario avalia leads
↓
Lead passa por score, contato, fonte, cidade e nicho
↓
Sistema calcula proximo horario seguro
↓
Mensagem entra como pending
↓
Sistema cria lote de aprovacao
↓
Usuario aprova pelo WhatsApp pessoal
↓
Mensagem muda para approved
↓
Worker futuro envia pelo WhatsApp com limites
```

## Fluxo Futuro

```text
Lead respondeu
↓
IA classifica intencao
↓
Se interessado, oferece horarios
↓
Lead escolhe horario
↓
Agenda cria reuniao
↓
WhatsApp confirma agendamento
↓
Kanban move para reuniao_marcada
```

## Roadmap De PRs

### PR 1 - Fundacao - Concluido

- Tabelas do Autopilot.
- Servico de decisao de elegibilidade.
- Testes unitarios de regras.
- Documentacao operacional.

### PR 2 - API De Regras E Fila - Concluido

- CRUD de regras de automacao.
- Listagem de mensagens da fila.
- Aprovar/cancelar mensagens pendentes.
- Cliente frontend para consumo futuro.
- Testes HTTP de rotas autenticadas.

### PR 3 - Aprovacao Em Lote Via WhatsApp - Concluido

- Campo `approval_whatsapp` no perfil.
- Tabelas de lotes e itens.
- Criacao/listagem/detalhe de lotes.
- Envio de solicitacao ao WhatsApp pessoal.
- Processamento de resposta via webhook Evolution API.
- Fallback autenticado para reprocessar comandos.
- Confirmacao de resultado ao usuario.
- Validacao real com WhatsApp pessoal.

### PR 4 - UI Assistida - Proximo

- Tela `/autopilot`.
- Configuracao de regras.
- Tela de fila e lotes de aprovacao.
- Criacao de lote pela interface.
- Aprovacao/cancelamento manual pela interface.
- Indicadores de regras ativas e mensagens pendentes.
- Alerta de seguranca: aprovacao nao envia mensagem ao lead.

### PR 5 - Scheduler Assistido

- Job diario para criar fila.
- Logs de execucao.
- Respeito a limites por dia/hora.
- Dashboard de enfileiramento.
- Sem envio automatico para leads.

### PR 6 - Envio Controlado

- Worker de envio WhatsApp.
- Modo automatico com limites.
- Retry seguro.
- Stop-on-reply.

### PR 7 - Resposta IA E Agendamento

- Classificacao de resposta.
- Sugestao de proximo passo.
- Integracao Google Calendar ou Calendly.
- Confirmacao automatica de reuniao.
