# Autopilot Comercial Semi-Automatico

**Status:** PR em validacao  
**Tela:** `/autopilot/semi-auto`  
**Objetivo:** transformar prospeccao diaria em um fluxo guiado, com aprovacao humana nos pontos sensiveis e execucao automatica apenas da fila ja aprovada.

## O Que Ele Faz Para Voce

O modo semi-automatico reduz trabalho manual sem virar disparador cego.

Ele foi desenhado para este ciclo:

1. Ler historico de coletas e resultados anteriores.
2. Sugerir a proxima query, fonte, cidade, nicho e credencial.
3. Simular o ciclo antes de executar algo real.
4. Coletar leads somente quando voce aprovar a coleta.
5. Verificar WhatsApp, respeitando a configuracao marcada.
6. Salvar leads com deduplicacao.
7. Analisar leads salvos e gerar score, prioridade, diagnostico e mensagens.
8. Criar ou atualizar uma regra assistida para aquele recorte comercial.
9. Enfileirar mensagens como `pending`.
10. Criar lote de aprovacao e, se configurado, enviar para seu WhatsApp pessoal.
11. Rodar stop-on-reply antes de qualquer disparo.
12. Processar somente mensagens com status `approved`.

## O Que Nao E Automatico

Estas etapas continuam protegidas:

- A coleta real exige `approve_collection=true`.
- Mensagens novas entram como `pending`.
- Lote precisa ser aprovado pelo WhatsApp pessoal ou pela API autenticada.
- Envio para lead processa somente mensagens `approved`.
- O worker roda stop-on-reply antes de enviar.
- Credenciais, tokens e chaves nunca devem aparecer em logs, respostas ou prints.

## Como Usar Na Pratica

### 1. Abra o plano

Acesse:

```text
/autopilot/semi-auto
```

Clique em **Atualizar plano**.

O sistema vai mostrar:

- credencial sugerida;
- query sugerida;
- cidade/nicho do ultimo recorte produtivo;
- pendentes, aprovadas, enviadas e leads que precisam de analise;
- motivos e alertas;
- travas de seguranca.

### 2. Ajuste parametros

Revise:

- Query de coleta.
- ID da credencial.
- Limite de coleta.
- Cidade.
- Nicho.
- Score minimo.
- Itens por lote.
- Verificacao de WhatsApp.
- Uso de cache.
- Envio da solicitacao ao WhatsApp pessoal.

### 3. Simule primeiro

Clique em **Simular ciclo completo**.

Isso chama:

```http
POST /api/autopilot/semi-auto/run
```

com:

```json
{
  "dry_run": true,
  "approve_collection": true
}
```

Resultado esperado: o sistema mostra o que faria, mas nao coleta, nao salva, nao cria lote e nao envia mensagem.

### 4. Aprove a coleta e prepare o lote

Clique em **Aprovar coleta e preparar lote**.

Isso executa o ciclo real:

```json
{
  "dry_run": false,
  "approve_collection": true,
  "create_approval_batch": true,
  "send_approval_request": true,
  "process_approved": true
}
```

O sistema pode:

- coletar leads;
- verificar WhatsApp;
- salvar e deduplicar;
- analisar leads salvos;
- gerar mensagens;
- enfileirar `pending`;
- criar lote;
- enviar solicitacao ao WhatsApp pessoal;
- processar mensagens que ja estavam `approved` antes do ciclo e dentro do horario agendado.

Importante: os novos leads do lote continuam dependendo da aprovacao do lote.

### 5. Aprove pelo WhatsApp pessoal

Responda ao bot com um dos comandos:

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3,5
CANCELAR 42:2,4
```

A aprovacao muda itens da fila para `approved`.

### 6. Envie aprovadas

Depois de aprovar o lote, volte para `/autopilot/semi-auto` e clique em **Enviar aprovadas agora**.

Esse botao:

- nao coleta leads;
- nao cria novo lote;
- roda stop-on-reply;
- envia apenas mensagens `approved`;
- usa `ignore_schedule=true` para processar a fila aprovada imediatamente;
- exige confirmacao visual no navegador.

## Contrato Dos Endpoints

### Plano

```http
GET /api/autopilot/semi-auto/plan
```

Retorna:

- `ready`;
- `recommendation`;
- `queue`;
- `leads`;
- `source_history`;
- `reasons`;
- `safety`.

### Executar Ciclo

```http
POST /api/autopilot/semi-auto/run
```

Campos principais:

| Campo | Padrao | Uso |
|---|---:|---|
| `dry_run` | `true` | Simula sem executar efeitos reais. |
| `approve_collection` | `false` | Autoriza coleta real. |
| `credential_id` | recomendado pelo plano | Credencial scraper. |
| `query` | recomendado pelo plano | Query da coleta. |
| `city` | recomendado pelo plano | Cidade para regra/lote. |
| `niche` | recomendado pelo plano | Nicho para regra/lote. |
| `limit` | `20` | Limite de coleta. |
| `verify_whatsapp_exists` | `true` | Valida telefone no WhatsApp. |
| `force_refresh` | `false` | Ignora cache. |
| `analyze_saved_leads` | `true` | Analisa leads novos salvos. |
| `min_score` | `60` | Score minimo para regra/lote. |
| `create_approval_batch` | `true` | Cria lote de aprovacao. |
| `send_approval_request` | `true` | Envia pedido ao WhatsApp pessoal. |
| `process_approved` | `true` | Processa mensagens ja aprovadas. |
| `ignore_schedule` | `false` | Quando `true`, processa aprovadas mesmo se `scheduled_at` estiver no futuro. Usar apenas no botao de envio imediato. |
| `worker_limit` | `10` | Limite do worker de aprovadas. |

## Relacao Com A Pagina `/autopilot`

- `/autopilot`: central manual/avancada para operar regras, fila, lotes, respostas e diagnosticos.
- `/autopilot/semi-auto`: cockpit diario para executar a sequencia comercial com menos cliques.

Use `/autopilot/semi-auto` para rotina diaria.
Use `/autopilot` quando precisar investigar fila, lotes, regras e runs tecnicos.

## Regras De Seguranca

1. Nunca enviar para lead sem status `approved`.
2. Nunca transformar lote aprovado em envio automatico imediato sem worker controlado.
3. Sempre rodar stop-on-reply antes de enviar aprovadas.
4. Usar lotes pequenos ate validar qualidade das respostas.
5. Manter WhatsApp de aprovacao configurado no perfil.
6. Conferir logs quando provider falhar.
7. Nao usar varias credenciais para burlar limites de provedores.

## Validacao CLI Recomendada

```bash
git checkout main
git pull origin main
gh pr checkout 22

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

Validar tambem:

- `/autopilot/semi-auto`: HTTP 200.
- `GET /api/autopilot/semi-auto/plan`: 200 autenticado.
- `POST /api/autopilot/semi-auto/run` com `dry_run=true`: nao cria coleta, lote nem envio.
- `POST /api/autopilot/semi-auto/run` com `dry_run=false` e `approve_collection=false`: nao coleta.
- `POST /api/autopilot/semi-auto/run` com `dry_run=false` e `approve_collection=true`: cria run/lote conforme parametros.
- Botao **Enviar aprovadas agora** chama `ignore_schedule=true` e processa somente mensagens `approved`.
- Logs e respostas sem `api_key`, `apiKey`, `api_key_encrypted`, `secret`, `Bearer`, `x-api-key`, `x-rapidapi-key` ou token real.
