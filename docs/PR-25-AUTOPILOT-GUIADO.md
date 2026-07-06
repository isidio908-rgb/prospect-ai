# PR #25 - Autopilot Guiado Para Usuario Leigo

**Objetivo:** deixar o Prospect AI mais simples para operar no dia a dia, sem exigir que o usuario entenda motores internos como scheduler, worker, templates, respostas ou diagnostico.

## O Que Esta PR Entrega

### 1. Wizard De Operacao Diaria No Autopilot

A tela `/autopilot` passa a abrir com um bloco principal chamado **Operacao diaria guiada**.

Ele concentra os campos que o usuario realmente precisa entender:

- busca do dia;
- credencial de coleta;
- cidade;
- nicho;
- limite de leads;
- score minimo;
- envio do pedido de aprovacao para WhatsApp pessoal.

Acoes principais:

- **Verificar sem executar**: checa sem criar coleta/lote/fila/envio.
- **Preparar oportunidades**: executa a rotina controlada.
- **Enviar aprovadas**: processa somente mensagens ja aprovadas.

### 2. Estado Operacional Claro No Topo

O Autopilot agora mostra:

- proxima acao recomendada;
- credencial informada ou pendente;
- alvo comercial definido ou pendente;
- tipo de aprovacao do lote;
- plano pronto ou em revisao;
- mensagens aprovadas prontas para envio.

Objetivo: o usuario saber o proximo clique sem abrir log tecnico.

### 3. Respostas E Reunioes Dentro Do CRM

O CRM Kanban ganhou um painel de foco com:

- **Responder agora**: leads que responderam ou ainda estao em contato enviado.
- **Agenda interna**: leads com reuniao marcada ou proxima acao relacionada a reuniao.

Assim, respostas e agendamento ficam no fluxo comercial, nao em paginas tecnicas separadas.

### 4. Agenda Interna Inicial

A agenda interna ainda nao cria evento externo, mas ja mostra os leads que precisam de atencao para reuniao dentro do CRM.

Essa abordagem evita dependencia inicial de Google Calendar/Calendly e reduz risco operacional.

### 5. Cron Controlado Continua Como Estrutura Segura

Esta PR nao liga cron automatico em background.

A regra de produto permanece:

- cron nasce desligado;
- envio real exige mensagem `approved`;
- stop-on-reply deve rodar antes do envio;
- limites e janela de envio continuam obrigatorios;
- toda automacao sensivel precisa ser explicita.

## O Que Nao Foi Alterado

- Nenhuma chave ou credencial.
- Nenhum envio automatico novo.
- Nenhuma rota tecnica antiga voltou ao menu.
- Nenhum fluxo remove aprovacao humana.
- Nenhuma dependencia nova.

## Como Validar Pela CLI

```bash
git checkout main
git pull origin main
gh pr checkout 25

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

## Validacao Visual Obrigatoria

Verificar no navegador:

- `/autopilot` abre com **Assistente diario de prospeccao**.
- O bloco **Operacao diaria guiada** aparece antes das configuracoes detalhadas.
- A tela mostra **Proxima acao recomendada**.
- A tela mostra **Prontidao** com credencial, alvo, aprovacao, plano e fila aprovada.
- Nao aparecem no menu: Semi-auto, Respostas, Templates, Diagnostico ou Agendamento.
- `/crm` mostra os cards **Responder agora** e **Agenda interna**.
- O CRM continua com drag-and-drop, filtros e edicao rapida.

## Validacao Funcional Segura

Executar com usuario autenticado e sem disparo externo acidental:

- `GET /api/autopilot/rules`: 200.
- `GET /api/autopilot/queue`: 200.
- `GET /api/autopilot/approval-batches`: 200.
- `GET /api/autopilot/stats`: 200.
- `GET /api/autopilot/semi-auto/plan`: 200.
- Rodar Autopilot com `dry_run=true`: nao deve criar coleta, lote, fila ou envio.
- Preparar oportunidades deve criar mensagens novas como `pending`.
- Aprovar lote deve mudar itens para `approved`.
- Enviar aprovadas deve processar somente itens `approved`.
- Nenhum envio real deve ocorrer em dry-run.

## Scan De Seguranca

Confirmar que logs, respostas e arquivos alterados nao expoem valores reais destes padroes:

- `api_key`
- `apiKey`
- `api_key_encrypted`
- `secret`
- `Bearer`
- `x-api-key`
- `x-rapidapi-key`
- `token`

Hits em documentacao preventiva sao aceitaveis desde que nao contenham valores reais.
