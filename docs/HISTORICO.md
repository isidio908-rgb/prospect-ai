# Historico do Projeto - Prospect AI

Este arquivo consolida o historico operacional do projeto. Documentos antigos de sprint continuam no repositorio, mas este passa a ser o registro principal e atualizado.

## 03/07/2026 - Atualizacao de Estado, IA e WhatsApp na Coleta

### Implementado

- Adicionado cliente `ai` em `frontend/src/services/api.js`.
- Criado `frontend/src/components/AiAssistant.jsx`.
- Inserido Assistente IA em `LeadDetails.jsx` depois da mensagem de follow-up e antes do chat WhatsApp.
- Ajustada pagina `Credentials.jsx` para separar visualmente credenciais de scraper e IA.
- Ajustada pagina `Credentials.jsx` para exibir provedores LLM e campo `model`.
- Atualizado endpoint `GET /api/credentials/providers` para retornar scrapers e LLMs.
- Adicionada verificacao opcional de existencia de WhatsApp na coleta.
- Adicionado client Evolution para `POST /chat/whatsappNumbers/:instance`.
- Adicionado servico `verifyLeadPhonesOnWhatsApp`.
- Ajustada rota `POST /api/leads/collect` para filtrar leads por WhatsApp confirmado quando a opcao estiver ativa.
- Ajustado salvamento de leads para gravar campo `whatsapp` quando validado.
- Corrigido healthcheck do frontend no `docker-compose.yml` para `127.0.0.1`.
- Rebuild e subida local Docker de backend e frontend.

### Validado

- `node --check` nos arquivos backend alterados.
- `npm run build` do frontend.
- `docker compose build --no-cache backend frontend`.
- `docker compose up -d --no-deps --force-recreate backend frontend`.
- Stack final com backend, frontend, postgres, redis e evolution-api saudaveis.

### Observacoes

- Nao foi necessaria migration separada para IA/LLM; `init.mjs` ja cria/migra `credentials.category` e `credentials.model`.
- A verificacao WhatsApp depende de instancia conectada e deve ser testada com numero real para confirmar o shape exato de resposta da Evolution API.

## 02/07/2026 - Backend, Credenciais, Deduplicacao e Frontend Base

### Implementado

- Autenticacao com JWT.
- CRUD de leads.
- Importacao manual e CSV.
- Exportacao CSV.
- Auditoria de site.
- Lead Score.
- Diagnostico comercial.
- Mensagens WhatsApp e follow-up por regras.
- Sistema de credenciais com criptografia AES-256-GCM.
- Controle diario/mensal de uso por credencial.
- Scheduler de reset de cotas.
- Deduplicacao por IDs externos, telefone, dominio e nome+cidade.
- Normalizacao de campos de deduplicacao.
- Provedores de scraper: RapidAPI, Apify e Serper.
- Frontend com Dashboard, Coleta, Leads, Detalhes, Credenciais e WhatsApp.
- Dark mode via `themeStore`.
- Design system em `frontend/src/index.css`.

### Documentos historicos gerados

- `SPRINT-1-COMPLETO.md`
- `SPRINT-2-COMPLETO.md`
- `MODULO-CREDENCIAIS-COMPLETO.md`
- `TESTES-COMPLETOS.md`
- `IMPLEMENTACAO-CONCLUIDA.md`
- `BACKEND-COMPLETO.md`
- `BACKEND-FINALIZADO.md`

## Marco Atual

O projeto esta pronto para uso interno controlado, desde que:

- As credenciais de scraper estejam cadastradas e ativas.
- A credencial LLM esteja cadastrada se o usuario quiser usar o Assistente IA.
- A instancia WhatsApp esteja conectada se for usar chat ou verificacao de existencia de WhatsApp na coleta.
- A operacao respeite limites dos provedores e nao use rotacao abusiva de chaves.

## Proximos Marcos

1. Exportacao JSON.
2. Historico persistente de coletas.
3. Logs de execucao.
4. Cache de busca.
5. Testes automatizados dos modulos novos.
6. Kanban comercial.
7. Dashboard comercial avancado.
