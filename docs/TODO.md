# TODO - Prospect AI

**Atualizado em:** 03/07/2026

Este arquivo substitui listas antigas de proximas acoes que ja foram executadas. A prioridade aqui considera o estado real atual do codigo.

## Prioridade Alta

### 1. Historico persistente de coletas

Objetivo: registrar cada execucao de coleta para auditoria operacional e futura tela de historico.

Tabela sugerida: `collection_runs`.

Campos sugeridos:

- `id`
- `user_id`
- `credential_id`
- `source_type`
- `query`
- `niche`
- `city`
- `region`
- `limit_requested`
- `total_found`
- `saved_count`
- `duplicate_count`
- `error_count`
- `whatsapp_check_enabled`
- `whatsapp_verified_count`
- `whatsapp_rejected_count`
- `without_phone_count`
- `status`
- `error_message`
- `started_at`
- `finished_at`

Arquivos provaveis:

- `backend/src/database/init.mjs`
- `backend/src/api/routes/leads.mjs`
- `frontend/src/pages/Collect.jsx`
- futura pagina `frontend/src/pages/CollectionHistory.jsx`

### 2. Logs persistentes de execucao

Objetivo: registrar erros e eventos importantes de coleta sem depender apenas de console/log Docker.

Escopo sugerido:

- Criar tabela `collection_run_logs` ou campo JSON em `collection_runs`.
- Registrar erros por lead quando salvar falhar.
- Registrar falhas de provedor e falhas de verificacao WhatsApp.
- Exibir detalhes no frontend apenas para o usuario dono da coleta.

### 3. Cache de coleta

Objetivo: evitar chamadas repetidas desnecessarias para o mesmo nicho/local/fonte.

Escopo sugerido:

- Criar assinatura da busca com `source + query + city + region + limit + params`.
- Reusar resultado recente por periodo configuravel.
- Permitir forcar nova coleta quando necessario.
- Nao usar cache para burlar limite de provedor; usar para reduzir custo.

### 4. Validar verificacao WhatsApp em uso real

Objetivo: confirmar resposta real do endpoint Evolution usado para checar existencia de numeros.

Checklist:

- Conectar uma instancia WhatsApp real.
- Coletar leads com telefones conhecidos.
- Ativar `Verificar se o telefone existe no WhatsApp antes de salvar`.
- Confirmar que leads sem WhatsApp nao sao salvos.
- Confirmar que `whatsapp` e preenchido nos leads aprovados.
- Ajustar parser de resposta se a Evolution retornar shape diferente.

### 5. Perfil profissional editavel

Objetivo: permitir alterar depois do cadastro a profissao, nicho foco e instrucoes internas usadas pela IA.

Escopo sugerido:

- Criar rota `GET /api/auth/me` ja existente como fonte de dados.
- Criar rota `PATCH /api/auth/me` para atualizar `name`, `profession`, `primary_niche` e `internal_context`.
- Criar pagina `Perfil` ou secao em Configuracoes.
- Atualizar `authStore` e `localStorage` depois de salvar.

## Prioridade Media

### 6. Testes automatizados dos modulos novos

Cobrir:

- Credenciais LLM.
- Rotas `/api/ai/*`.
- Personalizacao profissional dos prompts de IA.
- CRM Kanban e mudanca de status.
- Verificacao WhatsApp na coleta.
- Salvamento do campo `whatsapp`.
- Exportacao JSON de leads.
- Deduplicacao com `place_id`, `business_id`, `google_id`, telefone, dominio e nome+cidade.

### 7. Kanban comercial avancado

O Kanban basico ja existe em `/crm`. Melhorias futuras:

- Drag-and-drop.
- Filtros por responsavel, nicho, cidade e prioridade.
- Contagem de valor potencial por coluna.
- Edicao rapida de proxima acao.
- Registro automatico de follow-up ao mover card.

### 8. Dashboard comercial avancado

Adicionar:

- Taxa de resposta.
- Reunioes marcadas.
- Propostas enviadas.
- Clientes fechados.
- Conversao por nicho.
- Conversao por cidade.
- Leads com WhatsApp confirmado.
- Leads por fonte de coleta.

### 9. Documentacao operacional especifica

Criar guias separados:

- `docs/WHATSAPP-EVOLUTION.md`
- `docs/IA-LLM.md`
- `docs/COLETA-LEADS.md`
- `docs/CREDENCIAIS.md`

## Prioridade Baixa

### 10. Exportacao PDF

Gerar PDF com diagnostico por lead para enviar em conversa comercial.

### 11. Templates comerciais por nicho

Criar argumentos e mensagens adaptadas para nichos como imobiliarias, clinicas, odontologia, estetica, advocacia, construtoras e educacao.

### 12. Priorizacao inteligente avancada

Usar IA para sugerir:

- Melhor argumento comercial.
- Oferta mais provavel.
- Canal ideal de abordagem.
- Urgencia do lead.

## Itens Concluidos Recentemente

- Cadastro com contexto profissional do usuario (`profession`, `primary_niche`, `internal_context`).
- Prompts internos de IA ajustados pela profissao/nicho/instrucoes do usuario.
- Pagina CRM Kanban basica em `/crm`.
- Menu lateral com link para CRM Kanban.
- Exportacao JSON de leads com filtros.
- Credenciais de scraper e LLM agrupadas na UI.
- Campo `model` para credenciais IA/LLM.
- Assistente IA em detalhes do lead.
- Rotas `/api/ai/providers`, `/api/ai/tasks`, `/api/ai/status`, `/api/ai/run`.
- Verificacao opcional de WhatsApp existente na coleta.
- Rebuild e subida Docker local de backend/frontend.
- Healthcheck do frontend corrigido para `127.0.0.1`.