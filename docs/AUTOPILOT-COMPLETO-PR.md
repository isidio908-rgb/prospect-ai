# Autopilot Completo Controlado - PR

Este PR concentra a sequencia pratica 1 ao 11 em um unico pacote controlado.

## Principio De Seguranca

A automacao nao nasce disparando sozinha.

Tudo que pode gerar impacto externo tem trava:

- scheduler cria fila somente quando chamado;
- scheduler pode rodar em `dry_run`;
- worker de envio roda em `dry_run` por padrao;
- envio real exige `dry_run=false` e `confirm_send=true`;
- aprovacao em lote continua apenas mudando status para `approved`;
- stop-on-reply cancela follow-ups pendentes quando houver resposta;
- classificacao de respostas pode rodar em `dry_run` antes de aplicar alteracoes;
- agendamento assistido apenas registra status/proxima acao, nao cria evento externo ainda.

## Sequencia 1 ao 11

### 1. UI Autopilot SDR

Implementado:

- pagina `/autopilot`;
- item Autopilot no menu lateral;
- cards de metricas;
- gerenciamento de regras;
- visualizacao de fila;
- visualizacao e criacao de lotes;
- detalhe de lote;
- painel de runs e resultado da ultima acao.

### 2. Scheduler assistido

Implementado:

- `POST /api/autopilot/scheduler/run`;
- avalia regras ativas;
- avalia leads elegiveis por score, fonte, cidade, nicho e status;
- cria mensagens `pending` ou `approved` conforme regra;
- registra `automation_runs`;
- suporta `dry_run=true`.

### 3. Worker de envio controlado

Implementado:

- `POST /api/autopilot/worker/process-approved`;
- processa apenas mensagens `approved` e vencidas pela agenda;
- `dry_run=true` mostra o que seria enviado;
- envio real exige `dry_run=false` e `confirm_send=true`;
- registra sucesso/falha em `message_queue`;
- atualiza lead para `contato_enviado` quando aplicavel;
- usa `sendTextToLead` ja existente.

### 4. Stop-on-reply

Implementado:

- `POST /api/autopilot/stop-on-reply`;
- procura respostas recebidas no WhatsApp;
- cancela follow-ups pendentes/aprovados/enfileirados do lead;
- move lead para `respondeu` quando aplicavel.

### 5. Follow-up automatico assistido

Implementado:

- `POST /api/autopilot/followups/queue`;
- cria `followup_1` ou `followup_2` quando a mensagem anterior foi enviada e nao houve resposta;
- respeita delays da regra;
- suporta `dry_run=true`.

### 6. Classificacao de resposta

Implementado:

- `POST /api/autopilot/replies/classify`;
- classifica respostas recentes por heuristica segura;
- intents iniciais: `interested`, `pricing`, `meeting`, `question`, `not_interested`, `neutral`, `unknown`;
- pode aplicar status/proxima acao quando `dry_run=false`;
- registra nota em `lead_followups`.

### 7. Agendamento assistido

Implementado:

- `POST /api/autopilot/appointments`;
- registra lead como `reuniao_marcada`;
- grava `proxima_acao`;
- cria historico em `lead_followups`;
- ainda nao integra Google Calendar/Calendly.

### 8. Dashboard do Autopilot

Implementado na primeira versao dentro de `/autopilot`:

- regras ativas;
- fila pendente;
- fila aprovada;
- mensagens enviadas;
- lotes abertos;
- runs recentes.

Endpoint:

- `GET /api/autopilot/stats`;
- `GET /api/autopilot/runs`.

### 9. Melhorias comerciais

Implementado como base operacional:

- mensagens de fallback por tipo;
- uso de `mensagem_whatsapp` e `mensagem_whatsapp_followup` do lead quando existirem;
- painel de regra por nicho/cidade/fonte;
- classificacao de respostas com proxima acao.

### 10. PDF / mini diagnostico

Implementado como documento base em Markdown:

- `GET /api/autopilot/diagnostics/:leadId`;
- gera diagnostico comercial textual por lead;
- pronto para virar PDF em etapa posterior com biblioteca dedicada.

### 11. Hardening de producao

Implementado neste PR:

- `dry_run` por padrao nas operacoes sensiveis;
- envio real exige confirmacao dupla por payload;
- worker processa apenas `approved`;
- status e runs auditaveis;
- nenhuma chave/API key entra na fila;
- UI exibe aviso de seguranca;
- separacao de rotas novas em `autopilotOps.mjs`, evitando mexer nas rotas validadas.

## Rotas Novas

| Metodo | Rota | Uso |
|---|---|---|
| `GET` | `/api/autopilot/stats` | Metricas do Autopilot. |
| `GET` | `/api/autopilot/runs` | Runs recentes. |
| `POST` | `/api/autopilot/scheduler/run` | Simular/executar enfileiramento. |
| `POST` | `/api/autopilot/worker/process-approved` | Simular/enviar mensagens aprovadas. |
| `POST` | `/api/autopilot/followups/queue` | Simular/enfileirar follow-ups. |
| `POST` | `/api/autopilot/stop-on-reply` | Cancelar follow-ups quando houver resposta. |
| `POST` | `/api/autopilot/replies/classify` | Classificar respostas recentes. |
| `POST` | `/api/autopilot/appointments` | Registrar reuniao assistida. |
| `GET` | `/api/autopilot/diagnostics/:leadId` | Gerar diagnostico Markdown. |

## Validacao CLI Recomendada

```bash
git checkout main
git pull origin main
gh pr checkout <PR>

cd backend
npm install
npm test
npm audit --json

cd ../frontend
npm install
npm run build

cd ..
docker compose build backend frontend
docker compose up -d backend frontend
curl -s http://localhost:3001/health
```

## Validacao Funcional Recomendada

1. Acessar `/autopilot`.
2. Criar uma regra assistida.
3. Rodar scheduler em `dry_run=true`.
4. Rodar scheduler com `dry_run=false` para criar pendentes.
5. Criar lote sem envio externo.
6. Criar lote com envio para WhatsApp pessoal.
7. Aprovar lote pelo WhatsApp.
8. Simular worker com `dry_run=true`.
9. Validar que nada virou `sent` no dry-run.
10. Se for testar envio real, chamar worker com `dry_run=false` e `confirm_send=true` em lead de teste.
11. Validar stop-on-reply.
12. Validar follow-up em dry-run.
13. Validar classificacao de resposta em dry-run.
14. Validar agendamento assistido em lead de teste.
15. Validar diagnostico Markdown de lead.
16. Confirmar logs/respostas sem `api_key`, `apiKey`, `api_key_encrypted`, `secret`, `Bearer`, `x-api-key`, `x-rapidapi-key` ou token real.

## Fora Do Escopo Deste PR

- Cron automatico ligado em background.
- Integracao real com Google Calendar/Calendly.
- PDF binario gerado com template visual.
- Classificacao por LLM paga em background.
- Envio em massa sem confirmacao.
