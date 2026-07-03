# Documentacao - Prospect AI

**Ultima Atualizacao:** 03/07/2026  
**Status:** Produto interno funcional em validacao operacional

## Leitura Rapida

### Quero entender o estado atual

1. Leia `STATUS-ATUAL.md`.
2. Veja o que falta em `TODO.md`.
3. Consulte o historico em `HISTORICO.md`.

### Quero operar localmente

1. Suba a stack com `docker compose up -d`.
2. Acesse o frontend em `http://localhost:5173`.
3. Acesse a API em `http://localhost:3001`.
4. Cadastre credenciais em `/credentials`.
5. Configure WhatsApp em `/whatsapp` se for usar chat ou verificacao de numeros.

### Quero continuar o desenvolvimento

1. Priorize `TODO.md`.
2. Antes de alterar modulos sensiveis, leia `STATUS-ATUAL.md`.
3. Mantenha este README, `STATUS-ATUAL.md`, `TODO.md` e `HISTORICO.md` atualizados.

## Documentos Principais

| Documento | Finalidade | Status |
|---|---|---|
| `STATUS-ATUAL.md` | Estado real atual do projeto | Atual |
| `TODO.md` | Lista de afazeres priorizada | Atual |
| `PROXIMAS-ACOES.md` | Alias/compatibilidade para TODO | Atual |
| `HISTORICO.md` | Historico consolidado de implementacoes | Atual |
| `ROADMAP.md` | Visao por fases | Precisa revisao fina |
| `PROJECT_CONTEXT.md` | Contexto original do produto | Estavel |
| `OPERACAO-HOJE.md` | Guia operacional antigo | Parcial |
| `PLANO-PRODUCAO.md` | Plano antigo de producao | Parcial |

## Documentos Historicos

Estes arquivos registram etapas anteriores e podem estar parcialmente desatualizados. Use como referencia historica, nao como fonte principal de verdade.

- `SPRINT-1-COMPLETO.md`
- `SPRINT-2-COMPLETO.md`
- `MODULO-CREDENCIAIS-COMPLETO.md`
- `IMPLEMENTACAO-CONCLUIDA.md`
- `BACKEND-COMPLETO.md`
- `BACKEND-FINALIZADO.md`
- `PROJETO-COMPLETO-FINAL.md`
- `STATUS-BACKEND.md`
- `STATUS-IMPLEMENTACAO.md`
- `TESTES-COMPLETOS.md`
- `ANALISE-ROTAS.md`
- `RESUMO-EXECUTIVO.md`

## Modulos Atuais

### Backend

- Autenticacao JWT.
- CRUD de leads.
- Importacao manual e CSV.
- Exportacao CSV e JSON.
- Coleta via RapidAPI, Apify e Serper.
- Deduplicacao avancada.
- Auditoria de site.
- Lead Score.
- Diagnostico e mensagens por regras.
- Credenciais de scraper e LLM.
- IA/LLM por tarefa.
- WhatsApp Evolution API.
- CRM/followups.
- Dashboard/stats.

### Frontend

- Login/registro.
- Dashboard.
- Coleta de leads.
- Lista de leads.
- Detalhes do lead.
- CRM e historico.
- Chat WhatsApp.
- Assistente IA.
- Credenciais de scraper e IA.
- Configuracao WhatsApp.
- Dark mode.

### Infra Local

Servicos em Docker:

- `postgres`
- `redis`
- `evolution-api`
- `backend`
- `frontend`

## Estado Validado

Em 03/07/2026, a stack local foi rebuildada e recriada:

```bash
docker compose build --no-cache backend frontend
docker compose up -d --no-deps --force-recreate backend frontend
```

Status observado:

- backend healthy
- frontend healthy
- postgres healthy
- redis healthy
- evolution-api healthy

## Regras De Seguranca

- Nunca commitar API keys reais.
- Nunca expor API key completa no frontend.
- Nunca logar headers de autenticacao completos.
- Nunca exportar chaves em CSV/JSON.
- Usar `credentials.api_key_encrypted` para armazenamento.
- Usar apenas mascara de chave no frontend.
- Respeitar limites dos provedores.
- Nao usar rotacao de credenciais para burlar bloqueios.

## Fonte De Verdade

A fonte de verdade operacional agora e:

1. Codigo atual.
2. `STATUS-ATUAL.md`.
3. `TODO.md`.
4. `HISTORICO.md`.
