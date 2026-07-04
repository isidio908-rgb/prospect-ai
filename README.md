# Prospect AI

Ferramenta interna de prospeccao comercial para gestor de trafego pago. O sistema encontra empresas locais, enriquece dados, remove duplicados, audita presenca digital, calcula score de oportunidade, gera diagnosticos, prepara mensagens comerciais, opera WhatsApp e usa IA para melhorar abordagens.

O objetivo inicial e uso proprio, separado do Performance Hub. A arquitetura ja foi organizada para poder evoluir para produto comercial no futuro.

## Status Atual

**Atualizado em:** 03/07/2026  
**Estado:** produto interno operacional em `main`, com melhorias continuas por PRs pequenos e validaveis.

Stack local validada com Docker:

- PostgreSQL
- Redis
- Evolution API
- Backend Node.js/Express
- Frontend React/Vite

Documentacao principal:

- `docs/STATUS-ATUAL.md`
- `docs/TODO.md`
- `docs/HISTORICO.md`
- `docs/README.md`
- `docs/WHATSAPP-EVOLUTION.md`
- `docs/IA-LLM.md`
- `docs/COLETA-LEADS.md`
- `docs/CREDENCIAIS.md`

## O Que O Sistema Faz Hoje

- Autenticacao com JWT.
- Cadastro com contexto profissional do usuario: profissao, nicho foco e instrucoes internas para IA.
- Edicao posterior do perfil profissional em `/profile`.
- Cadastro, listagem, edicao e exclusao de leads.
- Importacao manual e CSV.
- Exportacao CSV e JSON.
- Coleta por RapidAPI Local Business Data, Apify e Serper.
- Historico persistente de coletas em `/collections`.
- Logs persistentes de execucao por coleta.
- Cache de busca/coleta para evitar chamadas repetidas ao mesmo provider.
- Toggle para forcar nova coleta ignorando cache.
- TTL visual e limpeza manual de cache em `/collections`.
- Cadastro de credenciais de scraper e IA/LLM.
- Criptografia e mascara de API keys.
- Controle de uso diario/mensal por credencial.
- Deduplicacao avancada antes de salvar leads.
- Auditoria de sites.
- Lead Score.
- Diagnostico comercial.
- Mensagem WhatsApp inicial e follow-up.
- CRM com status, responsavel, proxima acao, valor potencial e motivo de perda.
- Pagina CRM Kanban com drag-and-drop, filtros e edicao rapida.
- Historico de follow-up.
- WhatsApp via Evolution API com chat no lead, envio de texto/midia/audio e webhook.
- Verificacao de existencia de WhatsApp durante a coleta.
- IA/LLM com tarefas comerciais dentro do detalhe do lead.
- Prompts internos de IA ajustados pela profissao, nicho foco e instrucoes internas do usuario.
- Dashboard comercial com funil, fontes, WhatsApp confirmado, conversao por nicho/cidade e filtros por periodo/fonte.
- Documentacao operacional para WhatsApp, IA, coleta e credenciais.
- Dark mode.

## Fluxo Principal

```text
Nicho + Localizacao + Fonte + Credencial
      ↓
Cria execucao de coleta
      ↓
Verifica cache da busca
      ↓
Coleta empresas locais quando nao ha cache valido
      ↓
Opcional: verifica se telefone existe no WhatsApp
      ↓
Normaliza dados
      ↓
Remove duplicados
      ↓
Salva leads
      ↓
Grava logs e resumo da execucao
      ↓
Audita sites
      ↓
Calcula score
      ↓
Gera diagnostico e mensagens conforme profissao/contexto do usuario
      ↓
Usa CRM Kanban, WhatsApp e IA para abordagem
```

## Fontes De Coleta

- RapidAPI Local Business Data.
- Apify Google Maps Scraper.
- Serper.dev Google Places.
- CSV/manual.

## Historico, Logs e Cache

A coleta possui persistencia operacional:

- `collection_runs`: uma linha por execucao.
- `collection_run_logs`: eventos e erros por execucao.
- `collection_cache`: resposta recente por assinatura de busca.

A tela `/collections` mostra busca executada, credencial/fonte, totais, duplicados, erros, cache hit, TTL do cache, limpeza manual de cache e logs detalhados.

## Credenciais

A tela de credenciais suporta scrapers de leads e provedores de IA/LLM.

Scrapers:

- RapidAPI.
- Apify.
- Serper.

LLMs:

- OpenAI.
- Anthropic.
- Gemini.
- Groq.
- OpenRouter.
- Cerebras.
- Mistral.

Regras:

- API key nunca aparece completa no frontend.
- API key e criptografada no banco.
- API key nao deve ser colocada em README, logs ou commits.
- Uso diario/mensal e controlado por credencial.

## Personalizacao Interna

No cadastro e na pagina `/profile`, o usuario informa:

- Profissao/função.
- Nicho foco.
- Instrucoes internas de como a IA deve pensar, escrever e priorizar.

Esses dados sao usados para exibir o perfil correto no layout e ajustar prompts internos das LLMs ao ponto de vista profissional do usuario.

## CRM Kanban

A pagina `/crm` organiza os leads em pipeline visual:

- Novo.
- Analisado.
- Mensagem pronta.
- Contato enviado.
- Respondeu.
- Reuniao marcada.
- Proposta enviada.
- Cliente fechado.
- Sem interesse.
- Nao respondeu.

Recursos atuais:

- Drag-and-drop entre colunas.
- Filtros por status, prioridade, cidade, nicho, responsavel e busca livre.
- Contagem de valor potencial por coluna.
- Edicao rapida de responsavel, proxima acao e valor potencial.
- Botao de avanco rapido para a proxima etapa.
- Abertura do detalhe completo do lead.

## Dashboard Comercial

A pagina `/dashboard` mostra:

- Total de leads.
- Score medio.
- Oportunidades.
- WhatsApp confirmado.
- Distribuicao por prioridade.
- Distribuicao por status.
- Presenca digital.
- Funil comercial.
- Taxa de resposta.
- Valor fechado.
- Fontes de coleta.
- Conversao por nicho.
- Conversao por cidade.
- Filtros por periodo e fonte.

Periodos suportados:

- Todo periodo.
- Hoje.
- Ultimos 7 dias.
- Ultimos 30 dias.
- Ultimos 90 dias.
- Mes atual.
- Periodo personalizado.

## WhatsApp

O modulo WhatsApp usa Evolution API.

Implementado e validado:

- Conexao por QR code.
- Status da instancia.
- Configuracoes anti-bloqueio.
- Chat por lead.
- Envio de texto, midia e audio.
- Webhook de mensagens.
- Historico de mensagens.
- Verificacao de existencia de WhatsApp durante a coleta.
- Envio real para lead de teste.
- Coletas reais com verificacao WhatsApp ligada nos providers Serper, Apify e RapidAPI.

Guia operacional: `docs/WHATSAPP-EVOLUTION.md`.

## IA

O Assistente IA aparece no detalhe do lead.

Tarefas atuais:

- Diagnostico comercial aprofundado.
- Mensagem de WhatsApp.
- Follow-up.
- E-mail.
- Roteiro Loom.
- Resumo e posicionamento.
- Estrutura de proposta.

Todas as tarefas usam o contexto profissional cadastrado pelo usuario.

Guia operacional: `docs/IA-LLM.md`.

## Rodar Localmente

```bash
docker compose up -d
```

Acessos:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Evolution API: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

Rebuild backend/frontend apos alteracoes:

```bash
docker compose build --no-cache backend frontend
docker compose up -d --no-deps --force-recreate backend frontend
```

## Desenvolvimento Local Sem Docker

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## O Que Falta

Principais proximos passos:

1. Testes automatizados complementares dos fluxos novos.
2. Exportacao PDF com diagnostico por lead.
3. Templates comerciais por nicho e priorizacao inteligente avancada.
4. Comparativos semanais/mensais, custo por fonte e metas no dashboard comercial.

Lista completa em `docs/TODO.md`.

## Seguranca

- Nunca commitar credenciais reais.
- Nunca logar headers completos de autenticacao.
- Nunca exportar chaves em CSV/JSON.
- Mascarar chaves no frontend.
- Respeitar limites de provedores.
- Nao usar rotacao de credenciais para burlar bloqueios.

## Fonte De Verdade

A fonte de verdade atual e:

1. Codigo atual.
2. `docs/STATUS-ATUAL.md`.
3. `docs/TODO.md`.
4. `docs/HISTORICO.md`.

Documentos antigos de sprint/backend foram mantidos como historico e podem estar parcialmente desatualizados.
