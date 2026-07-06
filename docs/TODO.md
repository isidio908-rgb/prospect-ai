# TODO - Prospect AI

**Atualizado em:** 06/07/2026

Este arquivo lista as proximas acoes praticas. Para visao geral do projeto, estado atual e sequencia de PRs, use `docs/MAPA-INTERNO.md`. Para uso diario do Autopilot, use `docs/GUIA-USO-AUTOPILOT.md`.

## Entregue Nesta Rodada

### 1. Wizard De Operacao Diaria No Autopilot

Estado: implementado em `/autopilot`.

Resultado:

- Bloco **Operacao diaria guiada** no topo da tela.
- Campos simples: busca do dia, credencial, cidade, nicho, limite e score minimo.
- Acoes principais: verificar sem executar, preparar oportunidades e enviar aprovadas.
- Configuracoes detalhadas continuam abaixo, mas nao sao mais o primeiro contato do usuario.

### 2. Estado Operacional Claro No Topo Do Autopilot

Estado: implementado em `/autopilot`.

Resultado:

- Proxima acao recomendada.
- Checagem de credencial.
- Checagem de alvo comercial.
- Checagem de aprovacao por WhatsApp pessoal.
- Checagem de plano do Autopilot.
- Checagem de mensagens aprovadas para envio.

### 3. Respostas E Agendamento Dentro Do CRM

Estado: primeira versao implementada em `/crm`.

Resultado:

- Card **Responder agora** para leads que responderam ou estao em contato enviado.
- Card **Agenda interna** para leads em reuniao marcada ou com proxima acao ligada a reuniao.
- Links levam ao detalhe do lead, onde o comercial pode editar status, proxima acao e historico.
- As antigas paginas tecnicas continuam fora do menu.

### 4. Agenda Interna Inicial

Estado: primeira versao implementada em `/crm`.

Resultado:

- Lista de reunioes e proximas acoes sem depender de Google Calendar/Calendly.
- Mantem reuniao como atividade interna ate o fluxo estar maduro.

### 5. Cron Controlado Futuro

Estado: documentado e mantido desligado por padrao.

Resultado:

- Nenhum cron automatico foi ligado nesta rodada.
- Regra de seguranca preservada: envio real exige `approved`, janela segura, limites e stop-on-reply.

## Prioridade Alta Seguinte

### 1. Validar PR De UX Guiada Na CLI

Executar a validacao completa indicada em `docs/PR-25-AUTOPILOT-GUIADO.md`.

Criterios de aceite:

- Backend tests passam.
- Frontend build passa.
- Docker build/up passa.
- `/health` retorna ok.
- `/autopilot` mostra wizard, prontidao e proxima acao.
- `/crm` mostra Responder agora e Agenda interna.
- Nao existe envio real em dry-run.
- Logs/respostas nao expoem segredos reais.

### 2. Melhorar Detalhe Do Lead Como Mesa De Trabalho

Objetivo: o detalhe do lead virar o lugar de fechamento comercial.

Escopo sugerido:

- Mostrar resposta recebida mais recente.
- Mostrar proxima acao recomendada.
- Botao rapido: marcar reuniao.
- Botao rapido: marcar sem interesse.
- Botao rapido: gerar diagnostico comercial.
- Registrar acoes em `lead_followups`.

### 3. Melhorar Autopilot Com Seletor De Credencial Amigavel

Objetivo: evitar que usuario precise digitar ID numerico da credencial.

Escopo sugerido:

- Buscar credenciais ativas no frontend.
- Exibir select com nome/fonte/status.
- Bloquear preparacao se nao houver credencial ativa.
- Linkar para `/credentials` quando faltar credencial.

### 4. Prontidao Real De WhatsApp

Objetivo: mostrar no Autopilot se o WhatsApp esta conectado antes de enviar pedido de aprovacao ou mensagens aprovadas.

Escopo sugerido:

- Consultar status do WhatsApp.
- Mostrar conectado/desconectado na checagem de prontidao.
- Linkar para `/whatsapp` quando desconectado.
- Manter bloqueio backend como fonte de verdade.

## Prioridade Media

### 5. Cron Controlado Com Interface Simples

Objetivo: rodar ciclos em horarios definidos sem perder controle.

Escopo futuro:

- Scheduler configuravel por horario.
- Limite por regra e por janela.
- Logs por execucao.
- Pausa automatica em erro.
- Opcao de rodar apenas verificacao em horarios automaticos.
- Nunca enviar direto sem configuracao explicita.

Criterios de aceite:

- Cron nasce desligado por padrao.
- Toda regra automatica tem limite diario.
- Envio real continua exigindo status `approved` e janela segura.
- Stop-on-reply roda antes de qualquer envio.

### 6. Integracao Google Calendar/Calendly

Objetivo: criar evento externo somente quando o fluxo assistido ja estiver validado.

Escopo futuro:

- Cadastro de provider de agenda.
- Teste de credencial.
- Criacao de evento com confirmacao explicita.
- Registro do link no lead.
- Sem envio automatico de convite sem revisao.

### 7. PDF Comercial Visual

Objetivo: transformar diagnostico em material apresentavel para reuniao ou follow-up.

Escopo futuro:

- Template visual simples.
- Dados observados do lead.
- Dores detectadas.
- Oportunidades recomendadas.
- Proxima acao sugerida.
- Exportacao PDF.

## Operacao Comercial Recomendada Agora

1. Abrir `/dashboard` para ver resultado geral.
2. Abrir `/collect` quando quiser buscar novos leads manualmente.
3. Abrir `/autopilot` para configurar alvo, verificar, preparar oportunidades, aprovar lotes e enviar aprovadas.
4. Aprovar ou cancelar lotes pelo WhatsApp pessoal.
5. Abrir `/crm` para trabalhar respostas, reunioes, propostas e fechamentos.
6. Abrir o detalhe do lead quando precisar ajustar status, mensagem, diagnostico ou proxima acao.

## Regras Permanentes

- Nunca commitar `.env`, tokens, API keys ou dumps.
- Nunca logar headers completos de autenticacao.
- Nunca retornar API key completa no frontend.
- Nunca enviar mensagem para lead apenas por aprovar lote.
- Modo `assistido` sempre exige aprovacao manual.
- Worker automatico so pode existir com limite diario, limite horario, janela de envio e stop-on-reply.
- Template comercial pode gerar, copiar e aplicar textos no lead, mas nao pode enviar WhatsApp automaticamente.
- Diagnostico comercial pode gerar, copiar e aplicar texto no lead, mas nao pode criar fila nem enviar WhatsApp automaticamente.
- Autopilot pode processar fila aprovada, mas somente itens `approved`.
- Coleta automatizada real exige aprovacao explicita.
- Agendamento assistido pode registrar reuniao no CRM, mas nao pode enviar WhatsApp nem criar calendario externo automaticamente.
- Toda PR deve terminar com testes, build, Docker e scan basico de segredos.
