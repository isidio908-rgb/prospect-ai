# TODO - Prospect AI

**Atualizado em:** 05/07/2026

Este arquivo lista as proximas acoes praticas. Para visao geral do projeto, estado atual e sequencia de PRs, use `docs/MAPA-INTERNO.md`.

## Prioridade Alta

### 1. PR atual - Agendamento comercial assistido

Objetivo: deixar o caminho de resposta positiva ate reuniao mais curto.

Escopo:

- Criar pagina `/autopilot/scheduling`.
- Criar endpoint `POST /api/autopilot/scheduling/preview`.
- Criar endpoint `POST /api/autopilot/scheduling/confirm`.
- Sugerir horarios por timezone, duracao e periodo preferido.
- Gerar mensagem de convite para reuniao usando lead e perfil profissional.
- Permitir copiar a mensagem para envio manual.
- Registrar horario combinado no CRM.
- Atualizar lead para `reuniao_marcada`.
- Gravar historico em `lead_followups`.
- Documentar uso em `docs/AGENDAMENTO-COMERCIAL-ASSISTIDO.md`.

Criterios de aceite:

- Lead interessado vira `reuniao_marcada` com menos cliques.
- Gerar previa nao altera banco.
- Confirmar reuniao exige `scheduled_for`.
- Nenhum WhatsApp e enviado automaticamente.
- Nenhum evento externo e criado sem confirmacao.
- Outro usuario nao acessa lead de terceiro.

### 2. Proximo PR - Cron controlado futuro

Objetivo: automatizar horarios diarios sem perder controle.

Escopo futuro:

- Scheduler configuravel por horario.
- Limite por regra e por janela.
- Logs por execucao.
- Pausa automatica em erro.
- Opcao de rodar apenas simulacao em horarios automaticos.
- Nunca enviar direto sem configuracao explicita.

Criterios de aceite:

- Cron nasce desligado por padrao.
- Toda regra automatica tem limite diario.
- Envio real continua exigindo status `approved` e janela segura.
- Stop-on-reply roda antes de qualquer envio.

## Prioridade Media

### 3. Agenda interna de reunioes

Objetivo: visualizar reunioes marcadas sem depender de Google Calendar no primeiro momento.

Escopo futuro:

- Filtro de leads `reuniao_marcada`.
- Lista por data/periodo.
- Proxima acao e responsavel.
- Link para detalhe do lead.
- Campo de observacao da reuniao.

### 4. Integracao Google Calendar/Calendly

Objetivo: criar evento externo somente quando o fluxo assistido ja estiver validado.

Escopo futuro:

- Cadastro de provider de agenda.
- Teste de credencial.
- Criacao de evento com confirmacao explicita.
- Registro do link no lead.
- Sem envio automatico de convite sem revisao.

### 5. Operacao controlada de prospeccao real

Objetivo: continuar gerando oportunidades enquanto o produto evolui.

Checklist:

- Definir nicho do dia.
- Definir cidade/regiao do dia.
- Abrir `/autopilot/semi-auto`.
- Atualizar plano e simular ciclo.
- Rodar coleta aprovada em lote pequeno.
- Aprovar lote pelo WhatsApp pessoal.
- Processar aprovadas.
- Usar `/autopilot/replies` para tratar respostas recebidas.
- Usar `/autopilot/scheduling` para marcar reunioes.
- Usar `/crm` para registrar propostas e fechamentos.
- Medir respostas, reunioes e clientes fechados.
- Ajustar mensagens e criterios de score com base em respostas reais.

## Concluido Recentemente

### PR #22 - Autopilot Comercial Semi-Automatico

Validado e mergeado.

Resultado:

- Criada pagina `/autopilot/semi-auto`.
- Criado endpoint `GET /api/autopilot/semi-auto/plan`.
- Criado endpoint `POST /api/autopilot/semi-auto/run`.
- Criado servico `semiAutoCommercialService.mjs`.
- Plano baseado em historico de coletas, credenciais, estatisticas da fila e leads.
- Simulacao `dry_run=true` por padrao.
- Coleta real somente com `approve_collection=true`.
- Analise automatica dos leads salvos.
- Criacao/atualizacao de regra assistida.
- Enfileiramento de mensagens `pending`.
- Criacao de lote e envio opcional ao WhatsApp pessoal.
- Stop-on-reply antes de qualquer worker.
- Worker processando somente mensagens `approved`.
- Guia operacional `docs/AUTOPILOT-SEMI-AUTO.md`.
- Merge commit: `2b7775239faf3dfa2edd769c5b9d980b953b803d`.

### PR #21 - Diagnostico comercial avancado

Validado e mergeado.

Resultado:

- Criada pagina `/autopilot/diagnostics`.
- Criado diagnostico curto para WhatsApp.
- Criado diagnostico completo em Markdown.
- Criado roteiro de Loom/audio.
- Criado roteiro de reuniao.
- Criada oferta recomendada por dores observadas.
- Separados fatos observados de inferencias.
- Aplicar diagnostico atualiza lead e registra `lead_followups`.
- Nenhum envio automatico de WhatsApp no fluxo.

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
- Autopilot semi-auto pode processar fila aprovada, mas somente itens `approved`.
- Coleta semi-automatica real exige aprovacao explicita.
- Agendamento assistido pode registrar reuniao no CRM, mas nao pode enviar WhatsApp nem criar calendario externo automaticamente.
- Toda PR deve terminar com testes, build, Docker e scan basico de segredos.