# Autopilot SDR - Modelo Operacional

O Autopilot SDR e a camada de automacao comercial do Prospect AI. O objetivo e transformar coleta, priorizacao, abordagem, follow-up e agendamento em um fluxo cada vez mais automatico, sem perder controle operacional nem expor a conta WhatsApp a risco desnecessario.

## Principio

A automacao nasce em modo assistido.

Isso significa:

- o sistema pode avaliar leads automaticamente;
- o sistema pode criar fila de mensagens automaticamente;
- o sistema pode sugerir horario de envio;
- por padrao, a mensagem fica pendente de aprovacao manual;
- o usuario pode aprovar mensagens em lote pelo WhatsApp pessoal;
- envio automatico real so deve ser ativado quando houver regra explicita para isso.

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
- `approved`: aprovado para envio.
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

A API atual permite operar regras, fila e lotes de aprovacao com autenticacao, mas ainda nao executa envio WhatsApp automatico para leads.

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

### Cliente Frontend

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

## Fluxo V1

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
Worker futuro envia pelo WhatsApp
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
Google Calendar cria reuniao
↓
WhatsApp confirma agendamento
↓
Kanban move para reuniao_marcada
```

## Roadmap

### PR 1 - Fundacao

- Tabelas do Autopilot.
- Servico de decisao de elegibilidade.
- Testes unitarios de regras.
- Documentacao operacional.

### PR 2 - API De Regras E Fila

- CRUD de regras de automacao.
- Listagem de mensagens da fila.
- Aprovar/cancelar mensagens pendentes.
- Cliente frontend para consumo futuro.
- Testes HTTP de rotas autenticadas.

### PR 3 - Aprovacao Em Lote Via WhatsApp

- Campo `approval_whatsapp` no perfil.
- Tabelas de lotes e itens.
- Criacao/listagem/detalhe de lotes.
- Envio de solicitacao ao WhatsApp pessoal.
- Processamento de resposta via webhook Evolution API.
- Confirmacao de resultado ao usuario.

### PR 4 - UI Assistida

- Tela de configuracao do Autopilot.
- Tela de fila e lotes de aprovacao.
- Aprovacao/cancelamento manual pela interface.
- Indicadores de regras ativas e mensagens pendentes.

### PR 5 - Scheduler Assistido

- Job diario para criar fila.
- Logs de execucao.
- Respeito a limites por dia/hora.
- Dashboard de enfileiramento.

### PR 6 - Envio Controlado

- Worker de envio WhatsApp.
- Modo automatico com limites.
- Retry seguro.
- Stop-on-reply.

### PR 7 - Resposta IA E Agendamento

- Classificacao de resposta.
- Sugestao de proximo passo.
- Integracao Google Calendar.
- Confirmacao automatica de reuniao.
