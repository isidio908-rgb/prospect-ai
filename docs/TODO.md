# TODO - Prospect AI

**Atualizado em:** 04/07/2026

Este arquivo lista as proximas acoes praticas. Para visao geral do projeto, estado atual e sequencia de PRs, use `docs/MAPA-INTERNO.md`.

## Prioridade Alta

### 1. PR #16 - UI Assistida do Autopilot SDR

Objetivo: permitir operar o Autopilot pela interface, sem depender de chamadas manuais de API.

Escopo recomendado:

- Criar pagina `/autopilot`.
- Adicionar item Autopilot no menu lateral.
- Listar regras de automacao.
- Criar, editar, ativar, pausar e excluir regras.
- Listar mensagens em `message_queue`.
- Filtrar fila por status, tipo, cidade, nicho e regra.
- Listar lotes de aprovacao.
- Criar lote de aprovacao pela interface.
- Exibir detalhe do lote com itens numerados.
- Aprovar/cancelar mensagem individual pela interface.
- Mostrar alerta claro: aprovacao muda status para `approved`, mas ainda nao envia mensagem ao lead.

Criterios de aceite:

- `/autopilot` carrega autenticado.
- Usuario consegue criar e editar uma regra.
- Usuario consegue listar fila e lotes.
- Usuario consegue criar lote sem envio externo.
- Usuario consegue criar lote com solicitacao para WhatsApp de aprovacao.
- Nenhum item vira `sent` apenas por aprovar.
- Frontend build passa.
- Backend tests passam.
- Docker build/up passa.
- Scan de logs/respostas nao encontra segredos.

### 2. Operacao controlada de prospeccao real

Objetivo: continuar gerando oportunidades enquanto o produto evolui.

Checklist:

- Definir nicho do dia.
- Definir cidade/regiao do dia.
- Coletar lotes pequenos por provider ativo.
- Priorizar leads com WhatsApp confirmado e score alto.
- Usar CRM Kanban para registrar status e proxima acao.
- Usar IA para ajustar mensagem por nicho.
- Medir respostas, reunioes e clientes fechados.
- Ajustar mensagens e criterios de score com base em respostas reais.

### 3. PR #17 - Scheduler assistido

Objetivo: enfileirar leads elegiveis automaticamente, sem envio automatico.

Escopo recomendado:

- Job diario configuravel.
- Criacao de `automation_runs`.
- Avaliacao de regras ativas.
- Enfileiramento apenas como `pending`.
- Respeito a score, fonte, cidade, nicho e contato.
- Respeito a duplicidade de mensagem inicial ativa.
- Logs de leads avaliados, enfileirados e ignorados.

Regra de seguranca: scheduler nao envia WhatsApp para leads.

## Prioridade Media

### 4. PR #18 - Worker de envio controlado

Objetivo: enviar mensagens `approved` pelo WhatsApp com limites e rastreabilidade.

Requisitos antes de implementar:

- UI do Autopilot concluida.
- Scheduler assistido validado.
- Aprovacao em lote funcionando em producao local.

Escopo minimo:

- Processar somente mensagens `approved`.
- Respeitar `max_daily_sends`.
- Respeitar `max_hourly_sends`.
- Respeitar janela de envio.
- Registrar tentativa, sucesso e falha.
- Nunca enviar se lead respondeu recentemente.
- Retry controlado.

### 5. Stop-on-reply e follow-ups

Objetivo: impedir follow-up automatico quando o lead responder.

Escopo:

- Detectar resposta recebida pelo webhook.
- Marcar lead como `respondeu` ou status equivalente.
- Cancelar follow-ups pendentes do lead.
- Registrar motivo no historico.
- Cobrir com teste.

### 6. Dashboard do Autopilot

Objetivo: acompanhar automacao sem misturar com dashboard comercial geral.

Metricas desejadas:

- Regras ativas.
- Mensagens pendentes.
- Mensagens aprovadas.
- Mensagens canceladas.
- Mensagens enviadas.
- Taxa de resposta por regra.
- Leads que viraram reuniao.
- Limite diario consumido.

## Prioridade Baixa

### 7. Exportacao PDF

Gerar PDF com diagnostico por lead para enviar em conversa comercial.

### 8. Templates comerciais por nicho

Criar argumentos e mensagens adaptadas para nichos como imobiliarias, clinicas, odontologia, estetica, advocacia, construtoras e educacao.

### 9. Priorizacao inteligente avancada

Usar IA para sugerir:

- melhor argumento comercial;
- oferta mais provavel;
- canal ideal de abordagem;
- urgencia do lead;
- melhor horario de contato.

### 10. Agendamento assistido

Objetivo futuro:

- Classificar resposta do lead.
- Sugerir horarios.
- Integrar Google Calendar ou Calendly.
- Confirmar agendamento pelo WhatsApp.
- Mover lead para `reuniao_marcada`.

## Concluido Recentemente

### PR #15 - Aprovacao em lote via WhatsApp real

Validado e mergeado.

Resultado:

- Lote real `#26` criado.
- Solicitacao chegou no WhatsApp pessoal.
- Resposta `APROVAR LOTE 26` foi processada pelo webhook real.
- Lote virou `approved`.
- 2 itens viraram `approved`.
- Nenhum item virou `sent`.
- Logs recentes sem padroes de segredo.
- Merge commit: `3404742ca7632e30b8556b3874bc84ee45d463f7`.

### Outros blocos concluidos

- Fundacao do Autopilot SDR.
- API autenticada do Autopilot SDR.
- Historico persistente de coletas.
- Logs persistentes de execucao.
- Cache de busca/coleta com TTL visual e limpeza manual.
- Validacao de Serper, Apify e RapidAPI.
- Mensagens amigaveis para erros comuns de providers.
- Dashboard comercial com filtros por periodo e fonte.
- CRM Kanban com drag-and-drop, filtros e edicao rapida.
- Documentacao operacional de WhatsApp, IA, coleta e credenciais.
- Atualizacao de `bcrypt` para remover vulnerabilidades do backend.
- `npm audit --json` do backend limpo com 0 vulnerabilidades.

## Regras Permanentes

- Nunca commitar `.env`, tokens, API keys ou dumps.
- Nunca logar headers completos de autenticacao.
- Nunca retornar API key completa no frontend.
- Nunca enviar mensagem para lead apenas por aprovar lote.
- Modo `assistido` sempre exige aprovacao manual.
- Worker automatico so pode existir com limite diario, limite horario, janela de envio e stop-on-reply.
- Toda PR deve terminar com testes, build, Docker e scan basico de segredos.
