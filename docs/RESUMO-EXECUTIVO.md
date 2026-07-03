# Resumo Executivo - Prospect AI

**Atualizado em:** 03/07/2026

## O Que E

Prospect AI e uma ferramenta interna de prospeccao comercial para gestor de trafego pago. O objetivo e encontrar empresas com potencial de contratar servicos de trafego, tracking, site, criativos, automacoes e estrutura digital.

A ferramenta nao e apenas um scraper. Ela coleta empresas, enriquece dados, remove duplicados, analisa presenca digital, calcula score, gera diagnostico, prepara mensagens comerciais, opera WhatsApp e usa IA para melhorar abordagens.

## Estado Atual

O sistema ja esta funcional para uso interno local.

Implementado:

- Autenticacao.
- CRUD de leads.
- Coleta via RapidAPI, Apify e Serper.
- Credenciais de scraper e LLM.
- Criptografia de API keys.
- Controle de cota.
- Deduplicacao avancada.
- Auditoria de site.
- Lead Score.
- Diagnostico comercial.
- Mensagem WhatsApp inicial e follow-up.
- Exportacao CSV.
- CRM basico.
- Historico de follow-up.
- WhatsApp Evolution API.
- Chat no lead.
- Verificacao opcional de existencia de WhatsApp na coleta.
- IA/LLM com tarefas comerciais.
- Dashboard basico.
- Stack Docker local.

## Valor Pratico

O sistema consegue hoje:

1. Coletar empresas reais por nicho/localidade.
2. Salvar leads sem duplicar registros conhecidos.
3. Auditar sites automaticamente.
4. Identificar ausencia de Pixel, GTM, GA4, WhatsApp, formulario e estrutura de conversao.
5. Priorizar leads por oportunidade comercial.
6. Gerar diagnostico e mensagens de abordagem.
7. Conversar com leads via WhatsApp conectado.
8. Usar IA para refinar diagnosticos, mensagens, e-mails, roteiros e propostas.

## Principais Modulos

### Coleta

- RapidAPI Local Business Data.
- Apify Google Maps Scraper.
- Serper.dev Google Places.
- Filtros por pais, estado, cidade, nicho, modificador e limite.
- Verificacao opcional de WhatsApp antes de salvar.

### Credenciais

- Scrapers e LLMs na mesma tela.
- Campos dinamicos por provedor.
- API key criptografada.
- Mascara no frontend.
- Teste e controle de status.
- Uso diario/mensal.

### Analise

- Auditoria tecnica.
- Score de oportunidade.
- Diagnostico comercial.
- Mensagens prontas.

### CRM / WhatsApp

- Status comercial.
- Responsavel e proxima acao.
- Valor potencial e motivo de perda.
- Historico de follow-up.
- Chat WhatsApp por lead.
- Envio de texto, midia e audio.

### IA

- OpenAI, Anthropic, Gemini, Groq, OpenRouter, Cerebras e Mistral.
- Diagnostico aprofundado.
- Mensagem WhatsApp.
- Follow-up.
- E-mail.
- Roteiro Loom.
- Resumo de posicionamento.
- Estrutura de proposta.

## Lacunas Atuais

Prioridades reais:

1. Exportacao JSON.
2. Historico persistente de coletas.
3. Logs de execucao.
4. Cache para evitar recoletas desnecessarias.
5. Testes automatizados dos modulos novos.
6. Kanban comercial.
7. Dashboard comercial avancado.

## Risco Principal

A ferramenta ja esta forte para uso proprio, mas ainda precisa de historico de coletas, logs e testes automatizados para ficar segura como produto comercial.

## Conclusao

O Prospect AI esta em fase de validacao operacional interna. A prioridade agora nao e criar grandes modulos novos, mas consolidar confiabilidade: exportacao JSON, historico de coletas, logs, cache e testes.
