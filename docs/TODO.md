# TODO - Prospect AI

**Atualizado em:** 05/07/2026

Este arquivo lista as proximas acoes praticas. Para visao geral do projeto, estado atual e sequencia de PRs, use `docs/MAPA-INTERNO.md`.

## Prioridade Alta

### 1. PR #21 - Diagnostico comercial avancado

Objetivo: transformar o diagnostico base em material de venda pronto para abordagem consultiva.

Escopo:

- Criar pagina `/autopilot/diagnostics`.
- Criar endpoint `GET /api/autopilot/diagnostics/:leadId/advanced`.
- Criar endpoint `POST /api/autopilot/diagnostics/:leadId/advanced/apply`.
- Gerar diagnostico curto para WhatsApp.
- Gerar diagnostico completo em Markdown.
- Gerar roteiro de Loom/audio.
- Gerar roteiro de reuniao de 15 minutos.
- Gerar sugestao de oferta: trafego, tracking, site/landing page, CRM, WhatsApp/conversao, criativos ou consultoria.
- Separar fatos observados de inferencias comerciais.
- Permitir copiar cada bloco na interface.
- Aplicar diagnostico no lead sem criar fila e sem enviar WhatsApp.
- Registrar historico em `lead_followups`.

Criterios de aceite:

- Usuario consegue usar o diagnostico na abordagem.
- Diagnostico diferencia fatos observados de inferencias.
- Diagnostico nao promete resultado financeiro sem dados.
- Aplicar diagnostico nao envia mensagem automaticamente.
- Outro usuario nao acessa diagnostico de lead de terceiro.

### 2. PR #22 - Agendamento comercial assistido

Objetivo: deixar o caminho de resposta positiva ate reuniao mais curto.

Escopo recomendado:

- Sugerir horarios disponiveis manualmente cadastrados.
- Gerar mensagem de convite para reuniao.
- Confirmar data/horario combinado.
- Registrar no lead e no historico.
- Preparar futura integracao Google Calendar/Calendly.

Criterios de aceite:

- Lead interessado vira `reuniao_marcada` com menos cliques.
- Nenhum evento externo e criado sem confirmacao.

## Prioridade Media

### 3. Operacao controlada de prospeccao real

Objetivo: continuar gerando oportunidades enquanto o produto evolui.

Checklist:

- Definir nicho do dia.
- Definir cidade/regiao do dia.
- Coletar lotes pequenos por provider ativo.
- Priorizar leads com WhatsApp confirmado e score alto.
- Usar CRM Kanban para registrar status e proxima acao.
- Usar `/autopilot/templates` para ajustar mensagem por nicho.
- Usar `/autopilot/diagnostics` para preparar diagnostico comercial antes de reuniao.
- Usar `/autopilot` para aprovar, simular e enviar com controle.
- Usar `/autopilot/replies` para tratar respostas recebidas.
- Medir respostas, reunioes e clientes fechados.
- Ajustar mensagens e criterios de score com base em respostas reais.

### 4. Cron controlado futuro

Objetivo: automatizar horarios diarios sem perder controle.

Escopo futuro:

- Scheduler configuravel por horario.
- Limite por regra.
- Logs por execucao.
- Pausa automatica em erro.
- Nunca enviar direto sem configuracao explicita.

## Concluido Recentemente

### PR #20 - Templates comerciais por nicho e profissao

Validado e mergeado.

Resultado:

- Criada pagina `/autopilot/templates`.
- Criado catalogo de nichos e tons comerciais.
- Criada deteccao de dores observaveis por lead.
- Gerada mensagem inicial, follow-up, diagnostico curto e contexto profissional para LLM.
- Usados `profession`, `primary_niche` e `internal_context` do usuario.
- Aplicar template atualiza lead e registra `lead_followups`.
- Nenhum envio automatico de WhatsApp no fluxo.
- Merge commit: `99bc8d786884a53b64876670044926a0df355982`.

### PR #19 - Central de respostas e proxima acao recomendada

Validado e mergeado.

Resultado:

- Criada pagina `/autopilot/replies`.
- Criado inbox autenticado de respostas recebidas.
- Classificacao de intencao.
- Resposta sugerida copiavel.
- Acoes seguras para CRM.
- Registro em `lead_followups`.
- Isolamento por usuario validado.
- Nenhum envio automatico de WhatsApp no fluxo.
- Merge commit: `c8ba8ab913e83b09b7b0ec843a1141753274d315`.

### PR #18 - Guia de uso do Autopilot e mapa atualizado

Validado e mergeado.

Resultado:

- Criado `docs/GUIA-USO-AUTOPILOT.md`.
- Atualizados README, mapa interno, TODO e status.
- Documentado fluxo diario seguro.
- Documentada diferenca entre aprovar lote e enviar mensagem para lead.
- Merge commit: `dc6dd77b4dd15dd602cf18e7b7876017b0d648e0`.

### PR #17 - Autopilot completo controlado

Validado e mergeado.

Resultado:

- `/autopilot` criada e refinada como central operacional comercial.
- Cards de proxima acao.
- Fluxo visual 1 a 11.
- Scheduler assistido.
- Worker controlado.
- Stop-on-reply.
- Follow-ups assistidos.
- Classificacao heuristica de respostas.
- Agendamento assistido.
- Diagnostico/PDF base em Markdown.
- Reenvio de lote para WhatsApp pessoal.
- Envio real restrito ao modo avancado com `dry_run=false` e `confirm_send=true`.
- Merge commit: `78e62b205445d63a3b4dc768dc8de6794d8b302b`.

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
- Template comercial pode gerar, copiar e aplicar textos no lead, mas nao pode enviar WhatsApp automaticamente.
- Diagnostico comercial pode gerar, copiar e aplicar texto no lead, mas nao pode criar fila nem enviar WhatsApp automaticamente.
- Toda PR deve terminar com testes, build, Docker e scan basico de segredos.
