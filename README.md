# Prospect AI

Ferramenta interna de prospeccao comercial para gestor de trafego. O sistema encontra empresas locais, enriquece dados, remove duplicados, calcula score, prepara mensagens, pede aprovacao por lote e ajuda a organizar o funil no CRM.

O objetivo atual e uso proprio. A arquitetura pode virar produto comercial depois, mas a experiencia principal precisa ser simples para operar no dia a dia.

## Status Atual

**Atualizado em:** 06/07/2026  
**Estado:** operacional em `main`, com Autopilot como unica superficie visivel de automacao comercial.

Stack local validada com Docker:

- PostgreSQL
- Redis
- Evolution API
- Backend Node.js/Express
- Frontend React/Vite

## Fluxo Simples De Uso

Para um usuario leigo, o caminho normal e:

1. **Credenciais**: cadastrar fontes de coleta e IA.
2. **WhatsApp**: conectar o numero pela Evolution API.
3. **Perfil**: informar profissao, nicho foco e instrucoes internas para IA.
4. **Coletar**: buscar leads manualmente quando quiser.
5. **Autopilot**: preparar oportunidades, criar lotes e processar mensagens aprovadas.
6. **WhatsApp pessoal**: aprovar ou cancelar lotes.
7. **CRM Kanban**: trabalhar respostas, reunioes, propostas e fechamentos.
8. **Dashboard**: medir resultado por fonte, nicho, cidade e funil.

## Telas Principais

| Tela | Para que serve |
|---|---|
| Dashboard | Ver resultado geral da prospeccao. |
| Coletar | Buscar novos leads por nicho, cidade e fonte. |
| Historico | Ver coletas, logs, cache, erros e duplicados. |
| Leads | Ver e editar todos os contatos encontrados. |
| CRM Kanban | Trabalhar leads ate reuniao, proposta e fechamento. |
| Autopilot | Rodar automacao controlada com aprovacao humana. |
| WhatsApp | Conectar e monitorar canal de envio/resposta. |
| Credenciais | Cadastrar APIs sem expor chaves. |
| Perfil | Ensinar a IA a escrever do ponto de vista do usuario. |

## Decisao De Produto

O usuario nao deve operar motores internos como paginas separadas.

Estas funcoes existem por tras do Autopilot, mas nao devem aparecer como menu principal:

- semi-auto;
- respostas;
- templates;
- diagnostico;
- agendamento;
- scheduler;
- worker;
- fila tecnica.

Elas devem alimentar o Autopilot, CRM, detalhe do lead e auditoria.

## O Que O Sistema Faz Hoje

- Autenticacao com JWT.
- Cadastro com contexto profissional do usuario.
- Edicao de perfil profissional em `/profile`.
- CRUD de leads.
- Importacao manual e CSV.
- Exportacao CSV e JSON.
- Coleta por RapidAPI Local Business Data, Apify e Serper.
- Historico persistente de coletas.
- Logs persistentes por coleta.
- Cache de busca/coleta com TTL visual e limpeza manual.
- Cadastro de credenciais de scraper e IA/LLM.
- Criptografia e mascara de API keys.
- Controle de uso diario/mensal por credencial.
- Deduplicacao avancada antes de salvar leads.
- Auditoria de sites.
- Lead Score.
- Diagnostico comercial.
- Mensagem WhatsApp inicial e follow-up.
- CRM Kanban com drag-and-drop, filtros e edicao rapida.
- Historico de follow-up.
- WhatsApp via Evolution API com chat no lead, envio de texto/midia/audio e webhook.
- Verificacao de existencia de WhatsApp durante a coleta.
- IA/LLM com tarefas comerciais dentro do detalhe do lead.
- Dashboard comercial com funil, fontes, WhatsApp confirmado, conversao por nicho/cidade e filtros por periodo/fonte.
- Autopilot controlado com regras, fila, lotes, aprovacao em lote, stop-on-reply, follow-ups, resposta, agendamento e diagnostico como motores internos.

## Autopilot

O Autopilot e a central de automacao comercial.

Ele pode:

1. Ler historico e plano atual.
2. Coletar leads quando autorizado.
3. Analisar leads salvos.
4. Calcular score e prioridade.
5. Gerar mensagens.
6. Criar lote de aprovacao.
7. Enviar solicitacao para o WhatsApp pessoal.
8. Processar apenas mensagens aprovadas.
9. Parar follow-ups quando houver resposta.
10. Apoiar CRM, diagnostico e agendamento.

Regra central:

> Aprovar lote nao envia mensagem para lead. Aprovacao apenas libera a mensagem para a fila `approved`.

O envio real deve processar somente mensagens aprovadas e exigir confirmacao clara.

## Fontes De Coleta

- RapidAPI Local Business Data.
- Apify Google Maps Scraper.
- Serper.dev Google Places.
- CSV/manual.

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

## Proximos Passos

Principais proximos passos da V2 comercial:

1. Wizard de operacao diaria dentro do Autopilot.
2. Estado operacional claro: WhatsApp, credencial, leads bons, fila e proxima acao.
3. Respostas e agendamento dentro do CRM/detalhe do lead.
4. Agenda interna de reunioes.
5. Cron controlado futuro.
6. PDF comercial visual.

Lista completa em `docs/TODO.md`.

## Seguranca

- Nunca commitar credenciais reais.
- Nunca logar headers completos de autenticacao.
- Nunca exportar chaves em CSV/JSON.
- Mascarar chaves no frontend.
- Respeitar limites de provedores.
- Nao usar rotacao de credenciais para burlar bloqueios.
- Nunca enviar mensagem para lead apenas por aprovar lote.
- Envio real do Autopilot exige confirmacao explicita.
- Templates podem gerar/aplicar textos, mas nao enviar WhatsApp automaticamente.
- Diagnosticos podem gerar/aplicar textos, mas nao criar fila nem enviar WhatsApp automaticamente.
- Agendamento assistido pode registrar reuniao no CRM, mas nao enviar WhatsApp nem criar calendario externo automaticamente.

## Fonte De Verdade

A fonte de verdade atual e:

1. Codigo atual em `main`.
2. `docs/MAPA-INTERNO.md`.
3. `docs/REVISAO-UX-USUARIO-LEIGO.md`.
4. `docs/GUIA-USO-AUTOPILOT.md`.
5. `docs/STATUS-ATUAL.md`.
6. `docs/TODO.md`.
7. `docs/HISTORICO.md`.

Documentos antigos de sprint/backend foram mantidos como historico e podem estar parcialmente desatualizados.
