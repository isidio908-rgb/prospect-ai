# Guia De Uso - Autopilot SDR

**Atualizado em:** 04/07/2026  
**Objetivo:** explicar como operar a pagina `/autopilot` no dia a dia sem risco de envio acidental.

O Autopilot SDR nao e um disparador automatico solto. Ele e uma central assistida para:

1. escolher quais leads entram na fila;
2. revisar mensagens antes de enviar;
3. aprovar lotes pelo seu WhatsApp pessoal;
4. simular envio antes de qualquer disparo real;
5. enviar apenas mensagens aprovadas quando voce confirmar;
6. parar follow-ups se o lead responder;
7. registrar reunioes e diagnosticos.

## Conceitos Basicos

| Termo | O que significa |
|---|---|
| Regra | Filtro que define quais leads entram na rotina: cidade, nicho, fonte, score minimo e limites. |
| Scheduler | Motor que encontra leads elegiveis e cria mensagens na fila. |
| Fila | Lista de mensagens em `message_queue`. Pode ter status `pending`, `approved`, `sent`, `cancelled` etc. |
| Lote | Grupo de mensagens pendentes enviado para aprovacao no seu WhatsApp pessoal. |
| Aprovar lote | Muda mensagens para `approved`. Nao envia para o lead. |
| Worker | Motor que envia mensagens `approved` para leads. Por padrao roda em simulacao. |
| `dry_run=true` | Simulacao. Mostra o que aconteceria, mas nao executa envio real. |
| `confirm_send=true` | Confirmacao explicita exigida para envio real pelo worker. |
| Stop-on-reply | Cancela follow-ups quando o lead respondeu. |

## Antes De Usar

Confira estes pontos:

1. Existem leads cadastrados em `/leads`.
2. Os leads tem `score`, `cidade`, `nicho`, `telefone/whatsapp` e mensagem pronta quando possivel.
3. Seu WhatsApp esta conectado em `/whatsapp`.
4. Seu numero pessoal de aprovacao esta configurado no perfil.
5. Voce sabe qual nicho/cidade quer trabalhar no dia.

## Fluxo Diario Seguro

Este e o fluxo recomendado para operar sem susto.

### 1. Criar ou revisar uma regra

Na caixa **Regras assistidas**:

- `Nome da regra`: exemplo `Imobiliarias Cuiaba - Manha`.
- `Modo`: mantenha `Assistido` para uso normal.
- `Score`: use algo como `60`, `70` ou `80`.
- `Fonte`: opcional, exemplo `serper`, `apify` ou `rapidapi`.
- `Cidade`: opcional, exemplo `Cuiaba`.
- `Nicho`: opcional, exemplo `imobiliarias`.
- `Limite diario`: quantas mensagens essa regra poderia enviar por dia.
- `Limite hora`: limite por hora.
- `Horario`: janela permitida para envio.
- `Aprovacao manual`: deixe marcado.
- `Stop-on-reply`: deixe marcado.

Clique em **Criar regra** ou **Atualizar regra**.

### 2. Simular leads elegiveis

No topo ou na sequencia operacional, clique em **Simular** no passo de scheduler.

Isso roda com `dry_run=true`.

Resultado esperado:

- mostra quantos leads seriam avaliados;
- mostra quantos entrariam na fila;
- nao cria mensagens;
- nao envia nada.

Use isso para conferir se a regra esta muito aberta ou muito restrita.

### 3. Enfileirar pendentes

Quando a simulacao fizer sentido, clique em **Criar pendentes**.

Isso cria mensagens com status `pending`.

Importante:

- ainda nao foi enviado nada para lead;
- essas mensagens aguardam aprovacao.

### 4. Criar lote

Na caixa **Criar lote**:

- `Limite`: quantidade de mensagens no lote, comece com 3 a 5.
- `Expira em minutos`: tempo para responder pelo WhatsApp, exemplo 120.
- `Score minimo`: opcional.
- `Fonte`, `Cidade`, `Nicho`: opcionais.
- `Enviar solicitacao ao WhatsApp pessoal`: marque apenas se seu WhatsApp estiver conectado e voce quiser receber a lista no seu numero.

Clique em **Criar lote**.

Se o checkbox estiver desmarcado, o lote e criado sem envio externo.  
Se estiver marcado, a solicitacao vai para o seu WhatsApp pessoal, nao para os leads.

### 5. Aprovar pelo WhatsApp pessoal

Quando receber o lote no WhatsApp, responda com um dos comandos:

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3
CANCELAR 42:2
```

Exemplo:

- `APROVAR LOTE 42`: aprova todas as mensagens pendentes do lote.
- `APROVAR 42:1,3`: aprova apenas os itens 1 e 3.
- `CANCELAR 42:2`: cancela apenas o item 2.

A aprovacao muda as mensagens para `approved`.

Ela ainda nao envia para os leads.

### 6. Simular envio das aprovadas

Clique em **Simular envio**.

Isso chama o worker com:

```text
dry_run=true
confirm_send=false
```

Resultado esperado:

- mostra quais mensagens seriam enviadas;
- nao envia nada;
- permite revisar antes do disparo real.

### 7. Enviar aprovadas de verdade

O envio real fica no **Modo avancado/tecnico**.

Use somente quando:

1. voce revisou o lote;
2. as mensagens estao `approved`;
3. voce simulou o envio;
4. o WhatsApp esta conectado;
5. voce tem certeza de que quer enviar.

A acao real usa:

```text
dry_run=false
confirm_send=true
```

O sistema tambem abre uma confirmacao visual no navegador.

### 8. Aplicar stop-on-reply

Depois de enviar mensagens, rode **Stop-on-reply**.

Ele procura leads que responderam e cancela follow-ups pendentes/aprovados desse lead.

Uso recomendado:

- rodar antes de criar follow-ups;
- rodar antes de qualquer envio real;
- rodar no inicio e no fim do dia.

### 9. Simular e criar follow-ups

Primeiro rode follow-up em simulacao.

Se fizer sentido, no modo avancado voce pode enfileirar follow-ups.

Regra importante:

- follow-up nao deve ser enviado se o lead respondeu;
- aprove lote/fila antes de envio real.

### 10. Classificar respostas

A classificacao interpreta respostas recentes e sugere intencao:

- interessado;
- preco;
- reuniao;
- pergunta;
- sem interesse;
- neutro;
- desconhecido.

Use primeiro em `dry_run=true`.

Depois, se fizer sentido, aplique a classificacao pelo modo avancado.

### 11. Registrar reuniao e gerar diagnostico

Use **Agendamento assistido** quando o lead respondeu positivamente.

- Busque o lead pelo nome.
- Informe data/horario combinado.
- Adicione observacao.
- Clique em **Registrar reuniao**.

Use **Diagnostico/PDF base** para gerar texto comercial do lead.

- Busque o lead pelo nome.
- Clique em **Gerar diagnostico**.
- Use o Markdown como base para WhatsApp, Loom, PDF futuro ou reuniao.

## Rotina Recomendada De Manha

1. Abrir `/dashboard` e ver resultado do dia anterior.
2. Abrir `/crm` e revisar respostas/reunioes.
3. Abrir `/autopilot`.
4. Rodar stop-on-reply.
5. Simular scheduler.
6. Criar pendentes se a lista estiver boa.
7. Criar lote pequeno com 3 a 5 mensagens.
8. Aprovar no WhatsApp pessoal.
9. Simular envio.
10. Enviar aprovadas somente se estiver tudo certo.
11. Atualizar CRM conforme respostas.

## Rotina Recomendada Durante O Dia

1. Ver respostas recebidas.
2. Classificar respostas em simulacao.
3. Registrar reunioes.
4. Gerar diagnosticos para leads interessados.
5. Rodar stop-on-reply antes de follow-ups.
6. Enfileirar follow-ups apenas para quem nao respondeu.

## Primeiro Teste Seguro

Para testar sem risco comercial:

1. Use um lead de teste com seu proprio numero controlado.
2. Crie regra com cidade/nicho desse lead.
3. Simule scheduler.
4. Crie pendente.
5. Crie lote sem envio externo.
6. Abra o lote e confira a mensagem.
7. Crie lote com envio para WhatsApp pessoal.
8. Aprove pelo seu WhatsApp.
9. Simule envio.
10. Faca envio real apenas se o numero do lead for seu numero de teste.

## Status Da Fila

| Status | Significado | Pode enviar? |
|---|---|---|
| `pending` | Aguardando aprovacao | Nao |
| `approved` | Aprovada para envio | Sim, apenas pelo worker controlado |
| `sent` | Enviada | Nao reenviar sem nova regra |
| `cancelled` | Cancelada | Nao |
| `failed` | Falhou no envio | Revisar antes de tentar de novo |
| `queued` | Na fila tecnica | Revisar contexto |

## Erros Comuns

### Nao aparece lead elegivel

Verifique:

- score minimo da regra;
- cidade escrita igual ao lead;
- nicho escrito igual ao lead;
- fonte filtrada;
- status do lead.

### Criar lote retorna erro de WhatsApp

Se marcou **Enviar solicitacao ao WhatsApp pessoal**, o sistema exige WhatsApp conectado.

Solucoes:

- conectar/reconectar em `/whatsapp`;
- criar lote sem envio externo;
- reenviar a solicitacao depois.

### Aprovei lote, mas nao enviou para o lead

Isso e correto.

Aprovar lote so muda status para `approved`. O envio real fica separado no worker.

### Tenho medo de disparar sem querer

Use apenas:

- simular scheduler;
- criar pendentes;
- criar lote;
- aprovar lote;
- simular envio.

Nao use **Enviar aprovadas** no modo avancado ate estar pronto.

## Regra De Ouro

O Autopilot deve aumentar sua velocidade comercial, mas nunca tirar seu controle.

Fluxo seguro:

```text
Lead elegivel -> Mensagem pending -> Lote -> Aprovacao pessoal -> Approved -> Simulacao -> Envio real confirmado
```

Nada deve ir para o lead antes da etapa final de envio real confirmado.
