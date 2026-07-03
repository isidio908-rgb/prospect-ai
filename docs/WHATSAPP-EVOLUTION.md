# WhatsApp Evolution - Guia Operacional

Este guia descreve como operar o modulo WhatsApp do Prospect AI com Evolution API.

## Objetivo

Usar uma instancia WhatsApp conectada para:

- enviar mensagens para leads;
- manter historico de conversa;
- validar se um telefone existe no WhatsApp durante a coleta;
- reduzir leads sem contato valido antes de entrar no CRM.

## Pre-requisitos

- Stack Docker ativa com Evolution API e Redis saudaveis.
- Usuario autenticado no Prospect AI.
- Instancia WhatsApp criada no sistema.
- Celular conectado por QR code quando necessario.
- Lead com telefone valido para teste.

## Configuracao

1. Subir a stack local.
2. Acessar a area de WhatsApp no frontend.
3. Criar ou selecionar uma instancia.
4. Conectar a instancia pelo QR code.
5. Confirmar status conectado antes de enviar mensagens ou validar numeros.

## Validacao Manual

Checklist minimo:

- Evolution API aparece saudavel no Docker.
- Instancia retorna status conectado.
- Envio de mensagem para lead de teste funciona.
- Historico de mensagens aumenta apos envio.
- Resposta da API nao contem tokens, API keys ou headers sensiveis.
- Coleta com `verifyWhatsAppExists=true` registra logs de verificacao.

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

## Erros Comuns

### Instancia desconectada

Sintoma: coleta falha antes de chamar provider ou envio de mensagem nao acontece.

Acao:

- reconectar pelo QR code;
- confirmar status da instancia;
- repetir apenas depois de conectado.

### Telefone rejeitado

Sintoma: lead nao e salvo quando a verificacao WhatsApp esta ativa.

Acao:

- confirmar se o numero tem DDI/DDD correto;
- testar telefone manualmente;
- verificar logs da coleta para `wa_rejected` e `without_phone`.

### Formato de resposta diferente da Evolution API

Sintoma: numeros validos sao rejeitados em massa.

Acao:

- capturar shape da resposta sem expor token;
- ajustar parser no servico WhatsApp;
- criar teste cobrindo o novo shape.

## Regras De Seguranca

- Nunca salvar token da Evolution API em README, logs ou prints.
- Nunca expor headers de autenticacao no frontend.
- Nao enviar mensagens em massa sem controle operacional.
- Validar mensagens antes de disparar para evitar bloqueio do numero.
- Respeitar boas praticas de abordagem e opt-out.

## Checklist Antes De Prospectar

- [ ] Instancia conectada.
- [ ] Mensagem de teste enviada.
- [ ] Lead de teste recebeu a mensagem.
- [ ] Historico registrou o envio.
- [ ] Coleta pequena validada com WhatsApp ligado.
- [ ] Logs revisados sem segredos.
