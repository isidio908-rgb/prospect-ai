# Prompt Para CLI Local - Validar Pendencias Do Prospect AI

Use este prompt na CLI local do Codex para validar o estado atual do projeto e trabalhar nas pendencias listadas em `README.md`, `docs/TODO.md` e `docs/STATUS-ATUAL.md`.

```text
Voce esta no repositorio local do Prospect AI.

Objetivo: validar e, quando seguro, implementar as pendencias atuais do projeto sem quebrar o main e sem expor credenciais.

Repositorio: isidio908-rgb/prospect-ai
Branch base: main
Branch de trabalho sugerida: chore/validate-current-pending-items

Contexto atual validado:
- O main ja foi validado pos-merge com backend, frontend, Docker, providers reais, WhatsApp conectado, coletas reais, historico, cache e CRM.
- Serper, RapidAPI e Apify ja tiveram credenciais reais testadas com statusCode 200.
- WhatsApp/Evolution API ja enviou mensagem real para lead de teste.
- Coletas reais com verificacao WhatsApp ligada ja foram validadas nos providers Serper, Apify e RapidAPI.
- Cache hit ja foi validado repetindo Serper sem forceRefresh.
- CRM/Kanban ja foi validado com status contato_enviado.
- Logs validados nao continham api_key, Bearer, x-api-key, x-rapidapi-key ou token.

Pendencias atuais do README:

1. Avaliar e corrigir as 2 vulnerabilidades altas apontadas pelo npm audit do backend.
2. Kanban com drag-and-drop, filtros e edicao rapida.
3. Filtros por periodo/fonte no dashboard comercial.
4. TTL visual e limpeza manual de cache.
5. Documentacao operacional especifica para WhatsApp, IA, coleta e credenciais.

Regras obrigatorias:

- Nao commitar .env, API keys, tokens, node_modules, dumps ou arquivos locais sensiveis.
- Nao imprimir credenciais completas no terminal, logs, JSON, CSV ou documentacao.
- Antes de alterar dependencias por causa do npm audit, explicar exatamente quais pacotes serao atualizados e se existe risco de breaking change.
- Nao rodar npm audit fix automaticamente sem revisar o impacto.
- Manter compatibilidade com o fluxo ja validado: Serper, RapidAPI, Apify, WhatsApp, historico, cache e CRM.
- Criar testes proporcionais para qualquer mudanca funcional.
- Atualizar README, docs/TODO.md, docs/STATUS-ATUAL.md e docs/HISTORICO.md se alguma pendencia for concluida.

Passo 1 - Preparacao:

1. Garantir que esta no main atualizado:
   - git checkout main
   - git pull origin main
2. Criar branch:
   - git checkout -b chore/validate-current-pending-items
3. Verificar estado inicial:
   - git status --short --branch

Passo 2 - Baseline obrigatorio:

Executar:

- cd backend && npm install
- cd backend && npm test
- cd frontend && npm install
- cd frontend && npm run build
- docker compose build backend frontend
- docker compose up -d backend frontend
- Validar GET /health
- Validar frontend em /, /collections, /profile, /leads, /dashboard e /crm

Se algo falhar no baseline, parar e corrigir antes de implementar novas features.

Passo 3 - Avaliar npm audit backend:

1. Rodar no backend:
   - npm audit --json
   - npm audit
2. Identificar:
   - pacote vulneravel;
   - severidade;
   - pacote raiz que puxa a dependencia;
   - versao instalada;
   - versao corrigida;
   - se a correcao exige major upgrade ou breaking change.
3. Se houver atualizacao segura:
   - aplicar update controlado;
   - rodar backend npm test;
   - rodar frontend npm run build se necessario;
   - rodar docker compose build backend frontend.
4. Se nao houver correcao segura:
   - documentar em docs/TODO.md e docs/STATUS-ATUAL.md como risco aceito temporario;
   - nao aplicar mudanca arriscada.

Passo 4 - Kanban com drag-and-drop, filtros e edicao rapida:

Validar primeiro o estado atual de frontend/src/pages/CrmKanban.jsx e backend/src/api/routes/leads.mjs.

Implementar de forma incremental:

- Drag-and-drop entre colunas usando biblioteca ja existente no projeto, se houver; se nao houver, escolher uma dependencia pequena e justificar.
- Filtros por busca, responsavel, nicho, cidade, prioridade e status quando os dados existirem.
- Edicao rapida de proxima acao, responsavel e valor potencial sem abrir tela completa, se o backend ja suportar esses campos.
- Manter botoes atuais de avanco de status funcionando.
- Respeitar enum atual de status do backend; nao reintroduzir status antigo invalido como em_contato.

Testes/validacoes minimas:

- Mover lead entre colunas atualiza status via PATCH /api/leads/:id.
- Filtros nao quebram cards vazios.
- Status invalido continua rejeitado pelo backend.
- Build do frontend passa.

Passo 5 - Dashboard com filtros por periodo/fonte:

Validar primeiro frontend/src/pages/Dashboard.jsx e backend/src/api/routes/stats.mjs.

Implementar:

- Filtro de periodo: hoje, 7 dias, 30 dias, mes atual e personalizado se simples.
- Filtro de fonte/provider: serper, rapidapi, apify, csv/manual quando houver dados.
- Garantir que os filtros sejam enviados para o backend ou aplicados com consistencia no frontend, conforme arquitetura atual.
- Nao quebrar metricas ja existentes: total de leads, score medio, oportunidades, WhatsApp confirmado, funil, fontes, conversao por nicho/cidade.

Testes/validacoes minimas:

- Dashboard carrega sem filtros.
- Dashboard carrega com periodo.
- Dashboard carrega com fonte.
- Filtros combinados nao quebram resposta vazia.

Passo 6 - TTL visual e limpeza manual de cache:

Validar primeiro:
- backend/src/services/collectionRunService.mjs
- backend/src/api/routes/collectionRuns.mjs
- frontend/src/pages/CollectionHistory.jsx
- frontend/src/pages/Collect.jsx

Implementar:

- Mostrar TTL restante do cache no historico de coletas quando houver cache associado.
- Mostrar se a execucao veio de cache hit ou provider real.
- Criar acao segura para limpar cache manualmente por busca/cache key ou por run, com confirmacao no frontend.
- Backend deve validar usuario dono do cache antes de limpar.
- Registrar log/evento quando cache for limpo, se fizer sentido com o modelo atual.

Testes/validacoes minimas:

- Cache hit continua funcionando.
- Limpar cache remove apenas cache do usuario atual.
- Depois de limpar cache, nova coleta chama provider quando forceRefresh=false.
- Nenhuma credencial aparece em resposta/log.

Passo 7 - Documentacao operacional:

Criar ou atualizar:

- docs/WHATSAPP-EVOLUTION.md
- docs/IA-LLM.md
- docs/COLETA-LEADS.md
- docs/CREDENCIAIS.md

Cada guia deve conter:

- Objetivo do modulo.
- Como configurar.
- Como validar.
- Erros comuns.
- Checklist operacional.
- Regras de seguranca.

Nao incluir credenciais reais, prints com tokens ou dados sensiveis.

Passo 8 - Validacao final obrigatoria:

Rodar:

- backend npm test
- frontend npm run build
- docker compose build backend frontend
- docker compose up -d backend frontend
- GET /health
- Validar frontend em /, /collections, /profile, /leads, /dashboard, /crm
- Validar que logs/respostas nao contem: api_key, apiKey, secret, Bearer, x-api-key, x-rapidapi-key, token
- Validar git status para conferir arquivos alterados

Passo 9 - Entrega:

Se houver mudancas:

- Commit com mensagem clara.
- Push da branch.
- Abrir PR draft para main.
- No corpo do PR, incluir:
  - resumo do que mudou;
  - pendencias concluidas;
  - comandos executados;
  - resultado dos testes;
  - riscos restantes;
  - confirmacao de que credenciais nao foram expostas.

Se nao houver mudancas seguras:

- Nao forcar implementacao.
- Entregar relatorio objetivo com o que foi validado, o que bloqueou e qual decisao tecnica recomenda.
```
