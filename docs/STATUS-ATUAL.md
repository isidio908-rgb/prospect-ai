# Prospect AI - Status Atual do Projeto

**Data:** 03/07/2026  
**Estado:** stack local funcional em Docker, produto interno em fase de validacao operacional.

## Resumo Executivo

O Prospect AI ja funciona como uma maquina de prospeccao comercial, nao apenas como scraper. O sistema coleta empresas locais, salva leads com deduplicacao, audita sites, calcula score, gera diagnostico comercial, prepara mensagens de WhatsApp, gerencia credenciais de scraper e LLM, conversa via WhatsApp/Evolution API e usa IA para melhorar textos e diagnosticos.

## Stack Atual

- Backend: Node.js + Express + ESModules, PostgreSQL, porta 3001.
- Frontend: React + Vite + Tailwind CSS v4, porta 5173.
- Banco: PostgreSQL 16 via Docker.
- WhatsApp: Evolution API + Redis via Docker.
- Infra local: `docker compose` em `docker-compose.yml`.
- Autenticacao: JWT.
- Criptografia: AES-256-GCM para API keys.

## Modulos Implementados

### Autenticacao

- Registro, login e JWT.
- Middleware de autenticacao aplicado nas rotas protegidas.

Arquivos principais:

- `backend/src/api/routes/auth.mjs`
- `backend/src/api/middleware/auth.mjs`
- `frontend/src/store/authStore.js`

### Leads e CRM

- CRUD de leads.
- Importacao manual.
- Importacao CSV.
- Listagem com filtros.
- Exportacao CSV.
- Analise em lote.
- Status comercial do lead.
- Responsavel, proxima acao, valor potencial, motivo de perda.
- Historico de follow-up e notas.

Arquivos principais:

- `backend/src/api/routes/leads.mjs`
- `backend/src/services/csvImporter.mjs`
- `frontend/src/pages/Leads.jsx`
- `frontend/src/pages/LeadDetails.jsx`

### Coleta de Leads

Fontes suportadas:

- RapidAPI Local Business Data.
- Apify Google Maps Scraper.
- Serper.dev Google Places.

A coleta permite selecionar:

- Credencial/fonte.
- Pais, estado/regiao e cidade.
- Nicho.
- Modificador.
- Quantidade de leads.
- Extracao adicional de contatos no RapidAPI.
- Verificacao opcional de existencia de WhatsApp antes de salvar.

Arquivos principais:

- `backend/src/services/scraperCollector.mjs`
- `backend/src/services/scrapers/rapidApiLocalBusiness.mjs`
- `backend/src/services/scrapers/apifyGoogleMaps.mjs`
- `backend/src/services/scrapers/serper.mjs`
- `frontend/src/pages/Collect.jsx`

### Verificacao de WhatsApp na Coleta

Opcao adicionada na pagina de coleta:

- `Verificar se o telefone existe no WhatsApp antes de salvar`.

Comportamento:

- Requer WhatsApp conectado.
- Valida a conexao antes de consumir cota do scraper.
- Consulta a Evolution API com os telefones encontrados.
- Salva apenas leads com WhatsApp confirmado.
- Preenche o campo `whatsapp` do lead com o telefone validado.
- Retorna estatisticas de confirmados, rejeitados e sem telefone.

Arquivos principais:

- `backend/src/services/whatsapp/evolutionClient.mjs`
- `backend/src/services/whatsapp/whatsappService.mjs`
- `backend/src/api/routes/leads.mjs`
- `frontend/src/pages/Collect.jsx`

### Credenciais

- CRUD completo.
- Teste de credencial.
- Status ativo, inativo, pausado, erro e limite atingido.
- Uso diario e mensal.
- Historico diario de uso.
- Mascara de API key no frontend.
- Criptografia da chave no banco.
- Provedores agrupados visualmente em Scrapers de Leads e Inteligencia Artificial.

Scrapers suportados:

- RapidAPI Local Business Data.
- Apify Google Maps Scraper.
- Serper.dev Google Places.

LLMs suportados:

- OpenAI.
- Anthropic.
- Google Gemini.
- Groq.
- OpenRouter.
- Cerebras.
- Mistral AI.

Arquivos principais:

- `backend/src/api/routes/credentials.mjs`
- `backend/src/services/encryption.mjs`
- `backend/src/services/scrapers/providers.mjs`
- `backend/src/services/llm/providers.mjs`
- `frontend/src/pages/Credentials.jsx`

### Deduplicacao

Deduplicacao ativa antes de salvar leads.

Prioridade atual:

1. `place_id`
2. `business_id`
3. `google_id`
4. telefone normalizado
5. dominio normalizado
6. nome normalizado + cidade

Tambem existem endpoints para listar duplicatas, mesclar leads e normalizar dados.

Arquivos principais:

- `backend/src/services/deduplicator.mjs`
- `backend/src/database/migrations/add-normalized-fields.mjs`
- `backend/src/api/routes/leads.mjs`

### Auditoria de Site

A auditoria detecta:

- Site online.
- HTTPS.
- Tempo de carregamento.
- Tamanho da pagina.
- Meta Pixel.
- Google Tag Manager.
- GA4.
- Google Ads Tag.
- WhatsApp no site.
- Formularios.
- Instagram, Facebook e LinkedIn.
- WordPress.
- Elementor.
- Shopify.
- Pagina de contato.
- CTA visivel.
- Links placeholder/basicos quebrados.
- Telefones e e-mails encontrados.

Arquivos principais:

- `backend/src/services/analyzer.mjs`
- `backend/src/lib/analysis/auditor.mjs`
- `backend/src/lib/analysis/extractors.mjs`

### Lead Score e Mensagens

O score calcula oportunidade comercial com base em lacunas digitais e reputacao local.

Saidas geradas:

- `score`
- `prioridade`
- `oportunidades`
- `pontos_positivos`
- `diagnostico`
- `mensagem_whatsapp`
- `mensagem_whatsapp_followup`

Arquivos principais:

- `backend/src/lib/analysis/scoring.mjs`
- `backend/src/lib/analysis/messages.mjs`
- `backend/src/services/analyzer.mjs`

### WhatsApp Evolution API

Implementado:

- Criacao/conexao de instancia.
- QR code.
- Status de conexao.
- Desconectar/remover instancia.
- Opcoes anti-bloqueio.
- Chat por lead.
- Envio de texto, midia e audio.
- Webhook publico.
- Armazenamento de mensagens recebidas e enviadas.
- Vinculo de mensagens recebidas por telefone normalizado.
- Marcacao de leitura apenas ao responder.
- Verificacao de numero WhatsApp para a coleta.

Arquivos principais:

- `backend/src/api/routes/whatsapp.mjs`
- `backend/src/api/routes/whatsappWebhook.mjs`
- `backend/src/services/whatsapp/evolutionClient.mjs`
- `backend/src/services/whatsapp/whatsappService.mjs`
- `backend/src/services/whatsapp/mediaStorage.mjs`
- `frontend/src/pages/WhatsAppSettings.jsx`
- `frontend/src/components/whatsapp/WhatsAppChat.jsx`

### IA / LLM

Implementado:

- Cadastro de credenciais LLM.
- Teste de credencial LLM.
- Status de IA ativa.
- Catalogo de provedores.
- Catalogo de tarefas.
- Execucao de tarefas por lead.
- Aplicacao do resultado em campos do lead quando permitido.
- Assistente IA dentro da pagina de detalhes do lead.

Tarefas atuais:

- Diagnostico comercial aprofundado.
- Mensagem de WhatsApp de primeira abordagem.
- Mensagem de follow-up.
- E-mail de prospeccao.
- Roteiro de video Loom.
- Resumo e posicionamento.
- Estrutura de proposta.

Arquivos principais:

- `backend/src/api/routes/ai.mjs`
- `backend/src/services/llm/providers.mjs`
- `backend/src/services/llm/client.mjs`
- `backend/src/services/llm/tasks.mjs`
- `frontend/src/components/AiAssistant.jsx`
- `frontend/src/services/api.js`

### Dashboard

Implementado dashboard basico com metricas gerais:

- Total de leads.
- Leads analisados.
- Oportunidades.
- Score medio.
- Distribuicao por prioridade.
- Distribuicao por status.
- Presenca digital.
- Funil comercial basico.

Arquivos principais:

- `backend/src/api/routes/stats.mjs`
- `frontend/src/pages/Dashboard.jsx`

## Banco de Dados

Tabelas principais:

- `users`
- `user_settings` legado
- `rapidapi_usage` legado
- `credentials`
- `credential_usage`
- `leads`
- `lead_followups`
- `whatsapp_instances`
- `whatsapp_messages`

Migracoes idempotentes relevantes:

- `credentials.category`
- `credentials.model`
- campos normalizados em `leads`
- indices de deduplicacao

## Docker Local

Servicos atuais:

- `postgres`
- `redis`
- `evolution-api`
- `backend`
- `frontend`

Status validado em 03/07/2026:

- backend healthy
- frontend healthy
- postgres healthy
- redis healthy
- evolution-api healthy

## O Que Ainda Falta

Prioridade alta:

1. Exportacao JSON de leads.
2. Historico persistente de coletas (`collection_runs`).
3. Logs persistentes de execucao de coleta.
4. Cache/controle para evitar recoletar a mesma busca em curto intervalo.
5. Teste real da verificacao WhatsApp em coleta com instancia conectada.

Prioridade media:

1. Kanban comercial.
2. Dashboard comercial avancado.
3. Filtros adicionais no dashboard.
4. Testes automatizados para IA, WhatsApp e coleta.
5. Documentacao especifica de operacao WhatsApp/IA.

Prioridade baixa:

1. Exportacao PDF.
2. Roteiros comerciais por nicho.
3. Sugestao de oferta por nicho.
4. Relatorios de performance de prospeccao.

## Status Geral

Estimativa pragmatica:

- Core de prospeccao: 85% pronto.
- Operacao interna local: 80% pronta.
- Produto comercial: 45% pronto.
- Documentacao: em atualizacao.

O sistema ja pode ser usado internamente para coletar, analisar, priorizar e abordar leads, desde que as credenciais estejam configuradas e o WhatsApp esteja conectado quando a verificacao de existencia for usada.
