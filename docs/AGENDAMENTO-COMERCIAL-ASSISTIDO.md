# Agendamento Comercial Assistido

**Estado:** PR #23  
**Tela:** `/autopilot/scheduling`  
**Backend:** `/api/autopilot/scheduling/*`

Este guia explica como usar o agendamento comercial assistido dentro do Prospect AI.

## Objetivo

Transformar uma resposta positiva em reuniao marcada com menos atrito.

A tela ajuda a:

1. Escolher um lead que respondeu ou tem prioridade comercial.
2. Gerar uma mensagem de convite para reuniao.
3. Sugerir horarios comerciais.
4. Copiar a mensagem para enviar pelo canal desejado.
5. Registrar o horario combinado no CRM.
6. Gravar o historico em `lead_followups`.

## O Que E Automatico

| Acao | Automatico? | Observacao |
|---|---:|---|
| Buscar leads por score | Sim | A tela carrega os leads do usuario autenticado. |
| Gerar horarios sugeridos | Sim | Usa timezone, duracao e periodo preferido. |
| Gerar mensagem de convite | Sim | Usa nome da empresa e contexto profissional do usuario. |
| Copiar mensagem | Assistido | Usuario clica em copiar. |
| Registrar reuniao no CRM | Assistido | Usuario confirma explicitamente. |
| Gravar historico | Sim apos confirmacao | Cria registro em `lead_followups`. |
| Enviar WhatsApp | Nao | A tela nao envia mensagem. |
| Criar evento Google Calendar/Calendly | Nao | Apenas prepara o caminho para integracao futura. |

## Fluxo Diario

1. Abrir `/autopilot/replies` e identificar leads interessados.
2. Abrir `/autopilot/scheduling`.
3. Buscar ou selecionar o lead.
4. Escolher duracao e periodo preferido.
5. Gerar convite.
6. Copiar a mensagem e enviar manualmente ao lead.
7. Quando o lead aceitar um horario, preencher **Horario combinado**.
8. Confirmar reuniao no CRM.
9. Acompanhar o lead no Kanban como `reuniao_marcada`.

## Travas De Seguranca

- Nenhum WhatsApp e enviado automaticamente.
- Nenhum evento externo e criado automaticamente.
- A confirmacao exige clique explicito.
- O registro fica isolado por `user_id`.
- Se o lead nao pertence ao usuario autenticado, o backend retorna 404.

## Endpoints

### Gerar previa

```http
POST /api/autopilot/scheduling/preview
```

Payload:

```json
{
  "lead_id": 27,
  "timezone": "America/Cuiaba",
  "duration_minutes": 15,
  "preferred_period": "all",
  "note": "Lead pediu detalhes sobre Google Ads e WhatsApp."
}
```

Retorna:

- `lead`
- `slots`
- `suggested_message`
- `calendar_payload.external_event_created=false`
- `safety[]`

### Confirmar reuniao

```http
POST /api/autopilot/scheduling/confirm
```

Payload:

```json
{
  "lead_id": 27,
  "scheduled_for": "2026-07-07 15:30",
  "timezone": "America/Cuiaba",
  "duration_minutes": 15,
  "note": "Confirmar por WhatsApp antes da chamada."
}
```

Efeitos:

- Atualiza `leads.status` para `reuniao_marcada`.
- Atualiza `leads.proxima_acao`.
- Cria `lead_followups.tipo='reuniao'`.
- Nao envia mensagem.
- Nao cria evento externo.

## Proxima Evolucao

Depois de validar o uso diario, os proximos passos naturais sao:

1. Integrar agenda externa com confirmacao explicita.
2. Criar modelos de convite por tipo de resposta.
3. Sugerir horarios baseados em disponibilidade cadastrada.
4. Exibir reunioes marcadas em uma agenda interna.
5. Medir conversao resposta positiva -> reuniao -> proposta -> cliente.
