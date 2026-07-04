# Mapa Interno - Prospect AI

**Atualizado em:** 04/07/2026  
**Estado atual:** produto interno operacional em `main`, com Autopilot SDR assistido validado por WhatsApp real.

Este documento e a bussola curta do projeto. Use ele para nao perder o fio entre prospeccao real, manutencao tecnica e proximas PRs.

## Objetivo Do Projeto

Prospect AI existe para gerar oportunidades comerciais para um gestor de trafego.

A ferramenta deve:

1. Coletar empresas por nicho, cidade e fonte.
2. Validar e enriquecer contatos.
3. Priorizar leads com score comercial.
4. Gerar diagnosticos e mensagens com IA.
5. Organizar o funil no CRM/Kanban.
6. Apoiar disparos e follow-ups pelo WhatsApp com controle humano.
7. Evoluir para automacao assistida e, depois, automacao controlada.

## Fonte De Verdade

Ordem de confianca:

1. Codigo em `main`.
2. `docs/MAPA-INTERNO.md`.
3. `docs/STATUS-ATUAL.md`.
4. `docs/TODO.md`.
5. `docs/HISTORICO.md`.
6. Documentos operacionais especificos.

Documentos antigos de sprint continuam no repositorio como historico, mas nao devem guiar decisoes atuais se divergirem destes arquivos.

## Marcos Concluidos

| Marco | Estado | Observacao |
|---|---|---|
| Core de leads | Concluido | CRUD, importacao, exportacao, detalhes e analise. |
| Coleta real | Concluido | Serper, Apify e RapidAPI validados em baixo volume. |
| Historico de coletas | Concluido | Runs, logs persistentes, cache e limpeza manual. |
| Credenciais | Concluido | Scrapers e LLMs com chave criptografada e mascarada. |
| WhatsApp Evolution | Concluido | Conexao, chat, envio, webhook e verificacao de numero. |
| CRM Kanban | Concluido | Drag-and-drop, filtros e edicao rapida. |
| Dashboard comercial | Concluido | Funil, fontes, periodo, conversao por nicho/cidade. |
| IA contextual | Concluido | Prompts ajustados por profissao, nicho e contexto interno. |
| Autopilot fundacao | Concluido | Regras, runs e fila. |
| Autopilot API | Concluido | CRUD de regras, fila e aprovar/cancelar mensagens. |
| Aprovacao em lote | Concluido | WhatsApp pessoal aprovou lote real via webhook. |

## Marco Mais Recente

PR #15 foi validado e mergeado.

Resultado:

- Lote real criado: `#26`.
- Solicitacao chegou no WhatsApp pessoal.
- Resposta `APROVAR LOTE 26` foi processada pelo webhook real.
- Lote virou `approved`.
- 2 itens viraram `approved`.
- Nenhum item virou `sent`.
- Logs recentes sem padroes de segredo.
- Merge commit: `3404742ca7632e30b8556b3874bc84ee45d463f7`.

Conclusao: o Autopilot assistido esta seguro para aprovar mensagens em lote, mas ainda nao envia automaticamente para leads.

## Estado Operacional Atual

O sistema pode ser usado hoje para:

- coletar leads reais em baixo volume;
- validar WhatsApp antes de salvar;
- revisar leads no CRM;
- gerar abordagem com IA;
- criar fila de mensagens pendentes;
- aprovar lotes pelo WhatsApp pessoal;
- manter mensagens aprovadas aguardando envio futuro controlado.

O sistema ainda nao deve:

- disparar automaticamente para leads sem worker validado;
- criar follow-ups automaticos sem stop-on-reply validado;
- agendar reunioes sozinho sem fluxo de confirmacao;
- rodar em volume alto sem limites por hora/dia.

## Mapa Dos Modulos

| Modulo | Rota/Tela | Backend | Estado |
|---|---|---|---|
| Dashboard | `/dashboard` | `/api/stats` | Operacional |
| Coleta | `/collect` | `/api/leads/collect` | Operacional |
| Historico | `/collections` | `/api/collections` | Operacional |
| Leads | `/leads` e `/leads/:id` | `/api/leads` | Operacional |
| CRM | `/crm` | `/api/leads/:id` | Operacional |
| Credenciais | `/credentials` | `/api/credentials` | Operacional |
| Perfil | `/profile` | `/api/auth/me` | Operacional |
| WhatsApp | `/whatsapp` | `/api/whatsapp` | Operacional |
| IA | Detalhe do lead | `/api/ai` | Operacional |
| Autopilot | A criar | `/api/autopilot` | Backend pronto; UI pendente |

## Autopilot SDR - Linha De Evolucao

### Concluido

1. Schema: `automation_rules`, `automation_runs`, `message_queue`.
2. API: regras, fila, aprovar/cancelar.
3. Lotes: criar/listar/detalhar lote de aprovacao.
4. WhatsApp pessoal: aprovacao/cancelamento por comando.
5. Webhook real: resposta do WhatsApp aprova lote.

### Proximo PR Recomendado

PR #16 - UI Assistida do Autopilot.

Escopo:

- criar pagina `/autopilot`;
- adicionar menu lateral para Autopilot;
- listar regras de automacao;
- criar/editar/desativar regras;
- listar fila `message_queue`;
- listar lotes `approval_batches`;
- criar lote de aprovacao pela interface;
- aprovar/cancelar item individual pela interface;
- exibir status de seguranca: `assistido`, `aprovacao manual`, `nenhum envio automatico ativo`;
- nao ativar worker de envio para leads.

Criterio de aceite:

- usuario consegue operar regras, fila e lotes sem usar API manual;
- nenhuma mensagem e enviada para lead ao aprovar;
- tela deixa claro que aprovacao apenas muda status para `approved`;
- frontend build passa;
- backend tests passam;
- Docker build/up passa;
- logs/respostas continuam sem segredos.

### PRs Depois Da UI

| Ordem | PR | Objetivo | Regra de seguranca |
|---|---|---|---|
| 17 | Scheduler assistido | Enfileirar leads elegiveis diariamente | Criar apenas `pending`, sem envio. |
| 18 | Worker de envio controlado | Enviar mensagens `approved` | Limite diario/horario e janela de envio. |
| 19 | Stop-on-reply | Parar follow-ups quando lead responder | Nunca enviar follow-up com resposta recente. |
| 20 | IA de resposta | Classificar interesse e sugerir proximo passo | Sugestao antes de acao automatica. |
| 21 | Agendamento | Integrar agenda/Calendly/Google Calendar | Confirmacao antes de marcar compromisso. |

## Regras De Seguranca Que Nao Podem Quebrar

1. Nunca commitar `.env`, tokens, API keys ou dumps.
2. Nunca logar headers completos de autenticacao.
3. Nunca retornar chave completa no frontend.
4. Nunca enviar mensagem para lead apenas por aprovar lote.
5. Modo `assistido` sempre exige aprovacao manual.
6. Worker automatico so pode existir com limite diario, limite horario, janela de envio e stop-on-reply.
7. Respostas de aprovacao por WhatsApp devem aceitar apenas `approval_whatsapp` do usuario.
8. Dados de usuario, fila e lotes devem permanecer isolados por `user_id`.
9. Provider externo deve respeitar cota/cache; nao usar rotacao abusiva de credenciais.
10. Toda PR precisa terminar com validacao de testes, build, Docker e scan basico de segredos.

## Operacao Comercial Enquanto Desenvolve

Enquanto novas PRs rodam, a operacao recomendada e:

1. Coletar pequenos lotes por cidade/nicho.
2. Priorizar leads com WhatsApp confirmado e score alto.
3. Usar CRM Kanban para status e proxima acao.
4. Usar IA para ajustar mensagem por nicho.
5. Fazer primeira abordagem manual ou assistida.
6. Medir respostas, reunioes e clientes fechados.
7. Ajustar criterios de score e mensagens com base nas respostas reais.

## Prompts De Validacao Padrao

Para cada PR, pedir para a CLI local validar:

```text
Valide a PR atual do Prospect AI sem expor segredos.

Execute:
- backend npm install
- backend npm test
- backend npm audit --json
- frontend npm install
- frontend npm run build
- docker compose build backend frontend
- docker compose up -d backend frontend
- GET /health

Valide as telas e rotas afetadas.
Confirme que logs/respostas nao expoem api_key, apiKey, api_key_encrypted, secret, Bearer, x-api-key, x-rapidapi-key ou token real.
Nao tire de draft e nao faca merge se houver falha funcional ou risco de envio automatico nao intencional.
Atualize o corpo do PR com resultados completos.
```

## Proxima Decisao

Fazer PR #16 com a tela `/autopilot` antes de criar scheduler ou worker.

Motivo: agora que a aprovacao por WhatsApp funciona, o usuario precisa operar regras, fila e lotes visualmente antes de permitir qualquer automacao diaria ou envio controlado.
