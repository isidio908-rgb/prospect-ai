# Roadmap - Prospect AI

**Atualizado em:** 03/07/2026

## V1 - Producao Interna de Leads

Status: implementado.

- Coleta via RapidAPI Local Business Data.
- Coleta via Apify e Serper.
- Entrada manual e CSV.
- Auditoria tecnica de sites.
- Lead Score.
- Diagnostico comercial.
- Mensagem inicial de WhatsApp.
- Mensagem de follow-up.
- Exportacao CSV e JSON.
- Controle simples de cota.
- Deduplicacao antes de salvar.

Pendencia residual:

- Historico persistente de coletas.

## V2 - Credenciais na Plataforma

Status: implementado.

- Tela de credenciais.
- Cadastro de API Key.
- Cadastro de host/base URL/endpoint.
- Campo de modelo para LLM.
- Teste de credencial.
- Controle de status.
- Controle de uso diario/mensal.
- Mascara da chave no frontend.
- Criptografia no banco.
- Separacao visual entre Scrapers de Leads e Inteligencia Artificial.

## V3 - Banco, Deduplicacao e Historico

Status: parcialmente implementado.

Implementado:

- PostgreSQL.
- Deduplicacao avancada.
- Campos normalizados.
- Historico de uso de credenciais.
- Historico de follow-up do lead.
- Controle de status do lead.
- Controle de cotas por credencial.

Pendente:

- Historico persistente de coletas.
- Logs de execucao por coleta.
- Jobs de coleta assíncronos.
- Cache de coleta.

## V4 - CRM Interno

Status: implementado em formato basico.

Implementado:

- Status por lead.
- Responsavel.
- Proxima acao.
- Valor potencial.
- Motivo de perda.
- Notas e follow-ups.
- Historico de mensagens WhatsApp.
- Atualizacao automatica para `respondeu` quando mensagem recebida casa com lead.

Pendente:

- Kanban comercial.
- Filtros avancados de pipeline.
- Automacoes de follow-up.
- Relatorios de conversao.

## V5 - Dashboard

Status: implementado em formato basico.

Implementado:

- Total de leads.
- Leads analisados.
- Oportunidades.
- Score medio.
- Leads por prioridade.
- Leads por status.
- Presenca digital.
- Funil comercial basico.

Pendente:

- Taxa de resposta.
- Reunioes marcadas.
- Propostas enviadas.
- Clientes fechados.
- Conversao por nicho/cidade.
- Leads por fonte.
- Leads com WhatsApp confirmado.

## V6 - WhatsApp Operacional

Status: implementado em versao inicial.

Implementado:

- Evolution API via Docker.
- QR code.
- Status de conexao.
- Opcoes anti-bloqueio.
- Chat no detalhe do lead.
- Envio de texto, midia e audio.
- Webhook de mensagens.
- Armazenamento de mensagens.
- Verificacao opcional de existencia de WhatsApp antes de salvar lead.

Pendente:

- Teste operacional extensivo com numeros reais.
- Melhor tratamento de falhas do provedor.
- Metricas de conversas/respostas.

## V7 - IA Avancada

Status: implementado em versao inicial.

Implementado:

- Provedores LLM: OpenAI, Anthropic, Gemini, Groq, OpenRouter, Cerebras e Mistral.
- Credenciais LLM.
- Teste de credencial LLM.
- Tarefas de IA por lead.
- Assistente IA no detalhe do lead.
- Aplicacao do resultado em diagnostico ou mensagens quando permitido.

Pendente:

- Geracao de PDF.
- Sugestao de oferta por nicho.
- Priorizacao inteligente.
- Argumentos comerciais por segmento.
- Avaliacao de qualidade das respostas.

## V8 - Produto Comercial

Status: futuro.

Necessario antes de vender como produto:

- Multi-tenant mais robusto.
- Billing/assinaturas.
- Auditoria de seguranca.
- Logs de operacao.
- Backup/restore.
- Observabilidade.
- Controle de permissao por usuario/equipe.
- Termos de uso e LGPD.
- Deploy em ambiente gerenciado.
