# Autopilot SDR - Modelo Operacional

O Autopilot SDR e a camada de automacao comercial do Prospect AI. O objetivo e transformar coleta, priorizacao, abordagem, follow-up e agendamento em um fluxo cada vez mais automatico, sem perder controle operacional nem expor a conta WhatsApp a risco desnecessario.

## Principio

A automacao nasce em modo assistido.

Isso significa:

- o sistema pode avaliar leads automaticamente;
- o sistema pode criar fila de mensagens automaticamente;
- o sistema pode sugerir horario de envio;
- por padrao, a mensagem fica pendente de aprovacao manual;
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
Usuario aprova
↓
Worker envia pelo WhatsApp
↓
CRM atualiza status e historico
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

### PR 2 - API E UI

- CRUD de regras de automacao.
- Tela de configuracao do Autopilot.
- Tela de fila de mensagens.
- Aprovar/cancelar mensagens pendentes.

### PR 3 - Scheduler Assistido

- Job diario para criar fila.
- Logs de execucao.
- Respeito a limites por dia/hora.
- Dashboard de enfileiramento.

### PR 4 - Envio Controlado

- Worker de envio WhatsApp.
- Modo automatico com limites.
- Retry seguro.
- Stop-on-reply.

### PR 5 - Resposta IA E Agendamento

- Classificacao de resposta.
- Sugestao de proximo passo.
- Integracao Google Calendar.
- Confirmacao automatica de reuniao.
