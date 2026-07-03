# TODO - Prospect AI

**Atualizado em:** 03/07/2026

Este arquivo substitui listas antigas de proximas acoes que ja foram executadas. A prioridade aqui considera o estado real atual do codigo.

## Prioridade Alta

### 1. Validar em ambiente local atualizado

Objetivo: confirmar no Docker/local a sprint de historico, logs, cache, perfil e dashboard.

Checklist:

- Rodar `backend npm test`.
- Rodar `frontend npm run build`.
- Rodar `docker compose build backend frontend`.
- Subir stack e validar `/health`.
- Validar `PATCH /api/auth/me`.
- Validar `/api/collections`.
- Fazer uma coleta pequena e conferir historico/logs/cache.

### 2. Validar verificacao WhatsApp em uso real

Objetivo: confirmar resposta real do endpoint Evolution usado para checar existencia de numeros.

Checklist:

- Conectar uma instancia WhatsApp real.
- Coletar leads com telefones conhecidos.
- Ativar `Verificar se o telefone existe no WhatsApp antes de salvar`.
- Confirmar que leads sem WhatsApp nao sao salvos.
- Confirmar que `whatsapp` e preenchido nos leads aprovados.
- Confirmar que a execucao aparece em Historico com contadores de confirmados, rejeitados e sem telefone.
- Ajustar parser de resposta se a Evolution retornar shape diferente.

### 3. Melhorar controle visual de cache

O backend ja possui cache de coleta por assinatura de busca e historico indica `cache_hit`.

Melhorias futuras:

- Mostrar toggle `Forcar nova coleta` na pagina de coleta.
- Mostrar TTL restante do cache no historico.
- Permitir limpar cache manualmente por busca.

## Prioridade Media

### 4. Testes automatizados complementares

Cobrir:

- Rotas `/api/collections`.
- Persistencia real de `collection_runs` e `collection_run_logs`.
- Cache hit/cache miss com banco de teste.
- Credenciais LLM.
- Rotas `/api/ai/*`.
- Personalizacao profissional dos prompts de IA.
- CRM Kanban e mudanca de status.
- Verificacao WhatsApp na coleta.
- Salvamento do campo `whatsapp`.
- Exportacao JSON de leads.
- Deduplicacao com `place_id`, `business_id`, `google_id`, telefone, dominio e nome+cidade.

### 5. Kanban comercial avancado

O Kanban basico ja existe em `/crm`. Melhorias futuras:

- Drag-and-drop.
- Filtros por responsavel, nicho, cidade e prioridade.
- Contagem de valor potencial por coluna.
- Edicao rapida de proxima acao.
- Registro automatico de follow-up ao mover card.

### 6. Dashboard comercial avancado - proxima camada

O dashboard ja mostra funil, resposta, valor fechado, presenca digital, fontes, conversao por nicho e conversao por cidade.

Melhorias futuras:

- Filtro por periodo.
- Filtro por fonte.
- Comparativo semanal/mensal.
- Custo por fonte de coleta.
- Receita potencial por nicho/cidade.

### 7. Documentacao operacional especifica

Criar guias separados:

- `docs/WHATSAPP-EVOLUTION.md`
- `docs/IA-LLM.md`
- `docs/COLETA-LEADS.md`
- `docs/CREDENCIAIS.md`

## Prioridade Baixa

### 8. Exportacao PDF

Gerar PDF com diagnostico por lead para enviar em conversa comercial.

### 9. Templates comerciais por nicho

Criar argumentos e mensagens adaptadas para nichos como imobiliarias, clinicas, odontologia, estetica, advocacia, construtoras e educacao.

### 10. Priorizacao inteligente avancada

Usar IA para sugerir:

- Melhor argumento comercial.
- Oferta mais provavel.
- Canal ideal de abordagem.
- Urgencia do lead.

## Itens Concluidos Recentemente

- Historico persistente de coletas com tabela `collection_runs`.
- Logs persistentes de execucao com tabela `collection_run_logs`.
- Cache de busca/coleta com tabela `collection_cache`.
- Rotas `/api/collections` e `/api/collections/:id/logs`.
- Pagina `Historico` em `/collections`.
- Edicao posterior do perfil profissional em `/profile` e `PATCH /api/auth/me`.
- Dashboard comercial com funil, fontes, WhatsApp confirmado e conversao por nicho/cidade.
- Teste unitario da assinatura de cache de coleta.
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
