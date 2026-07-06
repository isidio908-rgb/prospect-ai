# Mapa Interno - Prospect AI

**Atualizado em:** 06/07/2026  
**Estado atual:** produto interno operacional em `main`, com Autopilot como superficie unica de automacao comercial.

Este documento e a bussola curta do projeto. Use ele para nao perder o fio entre prospeccao real, manutencao tecnica e proximas PRs.

## Objetivo Do Projeto

Prospect AI existe para gerar oportunidades comerciais para um gestor de trafego.

A ferramenta deve:

1. Coletar empresas por nicho, cidade e fonte.
2. Validar e enriquecer contatos.
3. Priorizar leads com score comercial.
4. Gerar diagnosticos e mensagens com IA/templates internos.
5. Organizar o funil no CRM/Kanban.
6. Apoiar disparos e follow-ups pelo WhatsApp com controle humano.
7. Tratar respostas recebidas e sugerir proxima acao comercial.
8. Automatizar a rotina diaria sem perder aprovacao humana nos pontos sensiveis.
9. Ajudar o usuario a marcar reunioes e vender servicos digitais.

## Decisao De Produto Atual

O usuario leigo nao deve navegar por motores internos.

A superficie visivel de automacao e apenas:

- `/autopilot`

As funcoes abaixo continuam existindo como motores internos do Autopilot, mas nao devem aparecer como itens de menu nem como paginas normais de operacao:

- semi-auto;
- respostas;
- templates;
- diagnostico;
- agendamento;
- scheduler;
- worker;
- fila tecnica.

## Fonte De Verdade

Ordem de confianca:

1. Codigo em `main`.
2. `docs/MAPA-INTERNO.md`.
3. `docs/REVISAO-UX-USUARIO-LEIGO.md`.
4. `docs/GUIA-USO-AUTOPILOT.md`.
5. `docs/STATUS-ATUAL.md`.
6. `docs/TODO.md`.
7. `docs/HISTORICO.md`.
8. Documentos operacionais especificos.

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
| Aprovacao em lote | Concluido | WhatsApp pessoal aprovou lote real via webhook. |
| Autopilot controlado | Concluido | Coleta, analise, score, lotes, aprovacao, envio de aprovadas, respostas, follow-ups e agendamento como motores internos. |
| UX simplificada | Em validacao | Menu e roteamento frontend focados em Autopilot como tela unica de automacao. |

## Estado Operacional Atual

O sistema pode ser usado hoje para:

- coletar leads reais em baixo volume;
- validar WhatsApp antes de salvar;
- revisar leads no CRM;
- gerar abordagem com IA/templates internos;
- preparar diagnosticos comerciais;
- criar fila de mensagens pendentes pelo Autopilot;
- aprovar lotes pelo WhatsApp pessoal;
- enviar mensagens aprovadas com worker controlado;
- cancelar follow-ups quando houver resposta;
- medir funil no dashboard;
- registrar reunioes e proximas acoes no CRM.

O sistema ainda nao deve:

- rodar cron automatico em background sem configuracao explicita;
- disparar em volume alto sem acompanhamento diario;
- responder leads automaticamente sem revisao;
- criar evento em calendario externo sem confirmacao;
- usar LLM paga em background sem limites claros;
- inventar informacoes comerciais ou tecnicas que nao foram observadas;
- expor motores internos como paginas principais para o usuario.

## Mapa Dos Modulos Visiveis

| Modulo | Rota/Tela | Backend | Estado |
|---|---|---|---|
| Dashboard | `/dashboard` | `/api/stats` | Operacional |
| Coleta | `/collect` | `/api/leads/collect` | Operacional |
| Historico | `/collections` | `/api/collections` | Operacional |
| Leads | `/leads` e `/leads/:id` | `/api/leads` | Operacional |
| CRM | `/crm` | `/api/leads/:id` | Operacional |
| Autopilot | `/autopilot` | `/api/autopilot` | Operacional controlado |
| Credenciais | `/credentials` | `/api/credentials` | Operacional |
| Perfil | `/profile` | `/api/auth/me` | Operacional |
| WhatsApp | `/whatsapp` | `/api/whatsapp` | Operacional |
| IA | Detalhe do lead | `/api/ai` | Operacional |

## Motores Internos Do Autopilot

| Motor | Responsabilidade | Exposicao correta |
|---|---|---|
| Semi-auto | Orquestrar coleta, analise, lote e fila aprovada. | Interna ao Autopilot. |
| Respostas | Interpretar retorno e sugerir proxima acao. | CRM/detalhe do lead. |
| Templates | Gerar mensagens por nicho, score e profissao. | Interna ao Autopilot/lead. |
| Diagnostico | Gerar contexto comercial para abordagem/reuniao. | Detalhe do lead/CRM. |
| Agendamento | Registrar reuniao e proxima acao. | CRM/detalhe do lead. |
| Scheduler | Encontrar elegiveis. | Auditoria/log. |
| Worker | Enviar apenas mensagens aprovadas. | Acao controlada no Autopilot. |

## Fluxo Para Usuario Leigo

1. Abrir `Credenciais` e conectar fontes.
2. Abrir `WhatsApp` e conectar numero.
3. Preencher `Perfil` para ensinar contexto a IA.
4. Usar `Coletar` para busca manual ou `Autopilot` para rotina assistida.
5. Aprovar lotes pelo WhatsApp pessoal.
6. Enviar somente mensagens aprovadas.
7. Trabalhar respostas e reunioes no `CRM Kanban`.
8. Medir resultado no `Dashboard`.

## Proximas PRs Sugeridas

| Prioridade | PR sugerido | Objetivo |
|---|---|---|
| Alta | Wizard de operacao diaria | Transformar configuracao do Autopilot em perguntas simples. |
| Alta | Estado operacional claro | Mostrar WhatsApp, credencial, leads bons, fila e proxima acao. |
| Alta | Respostas/agendamento no CRM | Levar a proxima acao para onde o comercial trabalha. |
| Media | Agenda interna | Ver reunioes marcadas por data. |
| Media | Cron controlado | Rodar ciclos em horarios definidos com limites. |
| Media | PDF comercial visual | Transformar diagnostico em material apresentavel. |

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
11. Central de respostas pode sugerir e copiar textos, mas nao deve enviar resposta automatica sem confirmacao explicita.
12. Templates podem atualizar texto do lead, mas nao podem enviar WhatsApp automaticamente.
13. Diagnosticos podem atualizar texto do lead, mas nao podem criar fila nem enviar WhatsApp automaticamente.
14. Autopilot pode processar mensagens aprovadas, mas somente `message_queue.status = approved`.
15. Coleta automatizada real exige aprovacao explicita.
16. Agendamento assistido pode registrar CRM/historico, mas nao pode enviar WhatsApp nem criar calendario externo automaticamente.

## Prompt De Validacao Padrao

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
