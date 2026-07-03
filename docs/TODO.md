# TODO - Prospect AI

**Atualizado em:** 03/07/2026

Este arquivo substitui listas antigas de proximas acoes que ja foram executadas. A prioridade aqui considera o estado real atual do codigo e a validacao registrada no PR #6.

## Prioridade Alta

### 1. Validar verificacao WhatsApp em uso real

Objetivo: confirmar resposta real do endpoint Evolution usado para checar existencia de numeros durante a coleta.

Checklist:

- Conectar uma instancia WhatsApp real.
- Coletar leads com telefones conhecidos.
- Ativar `Verificar se o telefone existe no WhatsApp antes de salvar`.
- Confirmar que leads sem WhatsApp nao sao salvos.
- Confirmar que `whatsapp` e preenchido nos leads aprovados.
- Confirmar que a execucao aparece em Historico com contadores de confirmados, rejeitados e sem telefone.
- Ajustar parser de resposta se a Evolution retornar shape diferente.

### 2. Revalidar providers no frontend apos merge

Objetivo: confirmar, na interface final, que as credenciais reais do usuario continuam apontando para o provider correto depois do merge do PR #6.

Checklist:

- Serper: executar coleta pequena e confirmar leads salvos.
- Apify: executar coleta pequena e confirmar input `{ language, location, max_results, query }`.
- RapidAPI: executar teste de credencial e coleta pequena com a API assinada na conta correta.
- RapidAPI: se retornar `You are not subscribed to this API`, conferir API assinada, projeto/API key e `x-rapidapi-host`.
- Confirmar que nenhum token, key, header sensivel ou segredo aparece em logs, cache, CSV ou JSON.

## Prioridade Media

### 3. Melhorar controle visual de cache

O backend ja possui cache de coleta por assinatura de busca, historico indica `cache_hit` e a tela de coleta ja possui toggle para forcar nova coleta.

Melhorias futuras:

- Mostrar TTL restante do cache no historico.
- Permitir limpar cache manualmente por busca.
- Indicar visualmente quando o lead veio de cache versus provider real.

### 4. Testes automatizados complementares

Ja existem testes para assinatura de cache, persistencia de runs/logs/cache, erro RapidAPI sem expor key e erro Apify sem expor token.

Cobrir proximas camadas:

- Rotas `/api/collections` com HTTP real.
- Credenciais LLM.
- Rotas `/api/ai/*`.
- Personalizacao profissional dos prompts de IA em fluxo HTTP.
- CRM Kanban e mudanca de status via frontend.
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

- Validacao local do PR #6: backend `npm test`, frontend `npm run build` e `docker compose build backend frontend`.
- Validacao local das rotas `/health`, `/collections`, `/profile`, `/leads` e `/dashboard`.
- Historico persistente de coletas com tabela `collection_runs`.
- Logs persistentes de execucao com tabela `collection_run_logs`.
- Cache de busca/coleta com tabela `collection_cache`.
- Rotas `/api/collections` e `/api/collections/:id/logs`.
- Pagina `Historico` em `/collections`.
- Toggle para forcar nova coleta ignorando cache.
- Testes automatizados de persistencia de runs/logs/cache.
- Teste unitario da assinatura de cache de coleta.
- Serper validado com coleta real pequena.
- Apify validado com coleta real pequena e input `{ language, location, max_results, query }`.
- RapidAPI validado com coleta real pequena no ambiente do PR.
- Mensagem amigavel para RapidAPI 403 `not subscribed`.
- Mensagem amigavel para Apify `full-permission-actor-not-approved`.
- Edicao posterior do perfil profissional em `/profile` e `PATCH /api/auth/me`.
- Dashboard comercial com funil, fontes, WhatsApp confirmado e conversao por nicho/cidade.
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
