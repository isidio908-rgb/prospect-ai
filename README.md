# Prospect AI

Ferramenta interna de prospeccao comercial para gestor de trafego pago. O sistema encontra empresas locais, enriquece dados, remove duplicados, audita presenca digital, calcula score de oportunidade, gera diagnosticos, prepara mensagens comerciais, opera WhatsApp e usa IA para melhorar abordagens.

O objetivo inicial e uso proprio, separado do Performance Hub. A arquitetura ja foi organizada para poder evoluir para produto comercial no futuro.

## Status Atual

**Atualizado em:** 03/07/2026  
**Estado:** funcional para uso interno local, em validacao operacional.

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
- Cadastro de credenciais de scraper e IA/LLM.
- Criptografia e mascara de API keys.
- Controle de uso diario/mensal por credencial.
- Deduplicacao avancada antes de salvar leads.
- Auditoria de sites.
- Lead Score.
- Diagnostico comercial.
- Mensagem WhatsApp inicial e follow-up.
- CRM basico com status, responsavel, proxima acao, valor potencial e motivo de perda.
- Pagina CRM Kanban para mover leads pelo pipeline comercial.
- Historico de follow-up.
- WhatsApp via Evolution API com chat no lead, envio de texto/midia/audio e webhook.
- Verificacao opcional de existencia de WhatsApp na coleta.
- IA/LLM com tarefas comerciais dentro do detalhe do lead.
- Prompts internos de IA ajustados pela profissao, nicho foco e instrucoes internas do usuario.
- Dashboard comercial com funil, fontes, WhatsApp confirmado e conversao por nicho/cidade.
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

A assinatura de cache considera credencial, query, cidade, nicho, regiao, idioma, limite, coordenadas e opcoes como extracao de contatos e verificacao WhatsApp.

A tela `/collections` mostra:

- Busca executada.
- Credencial/fonte.
- Total encontrado.
- Leads salvos.
- Duplicados.
- Erros.
- Cache hit.
- Logs detalhados da execucao.

## Credenciais

A tela de credenciais suporta:

- Scrapers de leads.
- Provedores de IA/LLM.

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

Esses dados sao usados para:

- Exibir o perfil correto no layout.
- Ajustar prompts internos das LLMs.
- Adaptar diagnosticos, mensagens, follow-ups, e-mails, roteiros e propostas ao ponto de vista profissional do usuario.

Exemplo: para um gestor de trafego focado em imobiliario, a IA prioriza qualidade do lead, WhatsApp, rastreamento, oportunidades de captação e conversao em reunioes.

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

Cada card permite abrir o detalhe do lead e mover rapidamente para a proxima etapa.

## WhatsApp

O modulo WhatsApp usa Evolution API.

Implementado:

- Conexao por QR code.
- Status da instancia.
- Configuracoes anti-bloqueio.
- Chat por lead.
- Envio de texto, midia e audio.
- Webhook de mensagens.
- Historico de mensagens.
- Verificacao de existencia de WhatsApp durante a coleta.

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

1. Validar build/test desta sprint no ambiente local atualizado.
2. Teste real da verificacao WhatsApp em coleta com instancia conectada.
3. Toggle visual para forcar nova coleta ignorando cache.
4. Testes automatizados com banco para historico/logs/cache.
5. Kanban com drag-and-drop e edicao rapida.
6. Filtros por periodo/fonte no dashboard comercial.

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
