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

Servicos validados como saudaveis:

- `backend`
- `frontend`
- `postgres`
- `redis`
- `evolution-api`

Documentacao principal:

- `docs/STATUS-ATUAL.md`
- `docs/TODO.md`
- `docs/HISTORICO.md`
- `docs/README.md`

## O Que O Sistema Faz Hoje

- Autenticacao com JWT.
- Cadastro, listagem, edicao e exclusao de leads.
- Importacao manual e CSV.
- Exportacao CSV.
- Coleta por RapidAPI Local Business Data, Apify e Serper.
- Cadastro de credenciais de scraper e IA/LLM.
- Criptografia e mascara de API keys.
- Controle de uso diario/mensal por credencial.
- Deduplicacao avancada antes de salvar leads.
- Auditoria de sites.
- Lead Score.
- Diagnostico comercial.
- Mensagem WhatsApp inicial e follow-up.
- CRM basico com status, responsavel, proxima acao, valor potencial e motivo de perda.
- Historico de follow-up.
- WhatsApp via Evolution API com chat no lead, envio de texto/midia/audio e webhook.
- Verificacao opcional de existencia de WhatsApp na coleta.
- IA/LLM com tarefas comerciais dentro do detalhe do lead.
- Dashboard basico.
- Dark mode.

## Fluxo Principal

```text
Nicho + Localizacao + Fonte + Credencial
      ↓
Coleta empresas locais
      ↓
Opcional: verifica se telefone existe no WhatsApp
      ↓
Normaliza dados
      ↓
Remove duplicados
      ↓
Salva leads
      ↓
Audita sites
      ↓
Calcula score
      ↓
Gera diagnostico e mensagens
      ↓
Usa CRM, WhatsApp e IA para abordagem
```

## Fontes De Coleta

- RapidAPI Local Business Data.
- Apify Google Maps Scraper.
- Serper.dev Google Places.
- CSV/manual.

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

1. Exportacao JSON.
2. Historico persistente de coletas.
3. Logs persistentes de execucao.
4. Cache de busca/coleta.
5. Testes automatizados dos modulos novos.
6. Kanban comercial.
7. Dashboard comercial avancado.

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
