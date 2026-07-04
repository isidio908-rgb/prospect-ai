# WhatsApp Evolution - Guia Operacional

Este guia descreve como operar o modulo WhatsApp do Prospect AI com Evolution API.

## Objetivo

Usar uma instancia WhatsApp conectada para:

- enviar mensagens para leads;
- manter historico de conversa;
- validar se um telefone existe no WhatsApp durante a coleta;
- reduzir leads sem contato valido antes de entrar no CRM;
- receber aprovacoes em lote do Autopilot SDR pelo WhatsApp pessoal do usuario.

## Pre-requisitos

- Stack Docker ativa com Evolution API e Redis saudaveis.
- Usuario autenticado no Prospect AI.
- Instancia WhatsApp criada no sistema.
- Celular conectado por QR code quando necessario.
- Lead com telefone valido para teste.
- Campo `approval_whatsapp` configurado no perfil para usar aprovacao em lote.

## Configuracao

1. Subir a stack local.
2. Acessar a area de WhatsApp no frontend.
3. Criar ou selecionar uma instancia.
4. Conectar a instancia pelo QR code.
5. Confirmar status conectado antes de enviar mensagens ou validar numeros.
6. Acessar `/profile` e configurar o WhatsApp pessoal de aprovacao em formato com DDI e DDD.

## Validacao Manual

Checklist minimo:

- Evolution API aparece saudavel no Docker.
- Instancia retorna status conectado.
- Envio de mensagem para lead de teste funciona.
- Historico de mensagens aumenta apos envio.
- Resposta da API nao contem tokens, API keys ou headers sensiveis.
- Coleta com `verifyWhatsAppExists=true` registra logs de verificacao.
- WhatsApp de aprovacao configurado no perfil quando for testar Autopilot.

## Validacao Na Coleta

Ao ativar `Verificar se o telefone existe no WhatsApp antes de salvar`:

1. O backend valida a conexao WhatsApp antes de consumir provider de leads.
2. O provider coleta empresas.
3. Os telefones encontrados sao enviados para a Evolution API.
4. Leads com WhatsApp confirmado sao salvos.
5. Leads rejeitados entram nos contadores da execucao.
6. A execucao registra logs em `/collections`.

Logs esperados:

- `collection_started`
- `cache_miss` ou `cache_hit`
- `whatsapp_connection_ok`
- `provider_collected`
- `whatsapp_verified`
- `database_saved`

## Aprovacao Em Lote Do Autopilot

A aprovacao em lote usa a mesma instancia WhatsApp conectada, mas envia mensagens apenas para o numero pessoal configurado em `approval_whatsapp`.

Fluxo:

1. Existem mensagens `pending` em `message_queue`.
2. O usuario cria um lote em `POST /api/autopilot/approval-batches`.
3. O sistema envia a lista de mensagens para `approval_whatsapp`.
4. O usuario responde pelo proprio WhatsApp.
5. O webhook da Evolution API processa o comando.
6. A fila muda para `approved` ou `cancelled`.
7. O sistema envia confirmacao ao WhatsApp de aprovacao.
8. Nenhuma mensagem e enviada ao lead nesta etapa.

Comandos aceitos:

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3,5
CANCELAR 42:2,4
```

Para teste local sem enviar mensagem externa, usar:

```json
{
  "limit": 5,
  "send_approval_request": false
}
```

## Erros Comuns

### Instancia desconectada

Sintoma: coleta falha antes de chamar provider, envio de mensagem nao acontece ou lote de aprovacao nao e enviado.

Acao:

- reconectar pelo QR code;
- confirmar status da instancia;
- repetir apenas depois de conectado.

### WhatsApp de aprovacao nao configurado

Sintoma: criacao de lote retorna erro solicitando configurar WhatsApp de aprovacao.

Acao:

- acessar `/profile`;
- preencher `approval_whatsapp` com DDI e DDD;
- salvar perfil;
- criar o lote novamente.

### Comando ignorado

Sintoma: resposta como `APROVAR LOTE 42` nao altera a fila.

Acao:

- confirmar se a resposta veio exatamente do numero salvo em `approval_whatsapp`;
- confirmar se o lote nao expirou;
- confirmar se o ID do lote existe e pertence ao usuario;
- conferir se a mensagem veio como texto comum no webhook.

### Telefone rejeitado

Sintoma: lead nao e salvo quando a verificacao WhatsApp esta ativa.

Acao:

- confirmar se o numero tem DDI/DDD correto;
- testar telefone manualmente;
- verificar logs da coleta para `wa_rejected` e `without_phone`.

### Formato de resposta diferente da Evolution API

Sintoma: numeros validos sao rejeitados em massa ou comandos de aprovacao nao sao detectados.

Acao:

- capturar shape da resposta sem expor token;
- ajustar parser no servico WhatsApp ou no servico do Autopilot;
- criar teste cobrindo o novo shape.

## Regras De Seguranca

- Nunca salvar token da Evolution API em README, logs ou prints.
- Nunca expor headers de autenticacao no frontend.
- Nao enviar mensagens em massa sem controle operacional.
- Validar mensagens antes de disparar para evitar bloqueio do numero.
- Respeitar boas praticas de abordagem e opt-out.
- Aprovacao em lote nao envia mensagem ao lead; apenas aprova/cancela itens da fila.
- Aceitar comandos de aprovacao somente do `approval_whatsapp` configurado.

## Checklist Antes De Prospectar

- [ ] Instancia conectada.
- [ ] Mensagem de teste enviada.
- [ ] Lead de teste recebeu a mensagem.
- [ ] Historico registrou o envio.
- [ ] Coleta pequena validada com WhatsApp ligado.
- [ ] WhatsApp de aprovacao configurado em `/profile`.
- [ ] Lote de aprovacao criado com `send_approval_request:false` em teste local.
- [ ] Lote real enviado ao WhatsApp pessoal.
- [ ] Comando de aprovacao/cancelamento processado.
- [ ] Logs revisados sem segredos.
