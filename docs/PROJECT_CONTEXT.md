# Prospect AI - Contexto do Projeto

**Atualizado em:** 04/07/2026

Prospect AI e uma ferramenta interna para gerar oportunidades comerciais para uma agencia/gestor de trafego.

O objetivo atual nao e vender uma plataforma para terceiros. O objetivo e produzir leads qualificados, organizar abordagem comercial e evoluir automacoes assistidas para vender mais servicos de trafego, tracking, criativos e estrutura digital.

## Decisoes Centrais

- Projeto separado do Performance Hub.
- Uso proprio primeiro; arquitetura preparada para produto comercial no futuro.
- Operacao com provedores autorizados: Serper, Apify, RapidAPI e fontes manuais/CSV.
- Sem rotacao agressiva ou tentativa de burlar limites.
- Sem tentativa de burlar captcha, login, bloqueios ou termos de plataformas.
- Cache, controle de cota e logs sao parte obrigatoria da operacao.
- WhatsApp deve operar com limites, cuidado e rastreabilidade.
- Autopilot nasce assistido; envio automatico real so entra depois de UI, scheduler, worker controlado e stop-on-reply.

## Estado Atual

O sistema ja possui:

1. Coleta de empresas locais por provider.
2. Historico persistente de coletas.
3. Logs persistentes de execucao.
4. Cache de busca/coleta.
5. Credenciais criptografadas e mascaradas.
6. Deduplicacao avancada.
7. Auditoria de site.
8. Lead Score.
9. Diagnostico e mensagens comerciais.
10. CRM Kanban.
11. Dashboard comercial.
12. IA contextual baseada na profissao, nicho e instrucoes internas do usuario.
13. WhatsApp via Evolution API.
14. Verificacao de numero WhatsApp durante coleta.
15. Autopilot SDR backend com regras, fila e lotes.
16. Aprovacao em lote pelo WhatsApp pessoal validada com webhook real.

## Fluxo Operacional Atual

1. Escolher nicho, cidade e provider.
2. Coletar lote pequeno de leads.
3. Validar WhatsApp quando fizer sentido.
4. Revisar qualidade dos contatos.
5. Usar score e diagnostico para priorizar.
6. Trabalhar leads no CRM Kanban.
7. Usar IA para ajustar abordagem.
8. Criar mensagens pendentes quando usar Autopilot.
9. Aprovar lotes pelo WhatsApp pessoal.
10. Enviar/seguir abordagem de forma controlada.

## Nichos Iniciais Recomendados

- Imobiliarias.
- Clinicas odontologicas.
- Clinicas de estetica.
- Academias premium.
- Auto centers.
- Energia solar.
- Moveis planejados.
- Advocacia especializada.
- Educacao privada.

## Indicadores Analisados

- Site online/offline.
- HTTPS.
- Pixel Meta.
- Google Tag Manager.
- GA4.
- Google Ads Tag.
- WhatsApp no site.
- Formulario.
- Instagram/Facebook linkados.
- Tempo de carregamento.
- Tamanho da pagina.
- Tecnologias basicas: WordPress, Elementor, Shopify.
- Rating e quantidade de avaliacoes.
- Presenca de telefone/WhatsApp.
- Score comercial e prioridade.

## Autopilot SDR

Marco atual: aprovacao em lote via WhatsApp real concluida.

O Autopilot hoje pode:

- manter regras;
- manter fila de mensagens;
- criar lotes de aprovacao;
- enviar solicitacao ao WhatsApp pessoal;
- processar comandos de aprovacao/cancelamento;
- mudar mensagens para `approved` ou `cancelled`.

O Autopilot ainda nao deve:

- enviar mensagens automaticamente para leads;
- criar follow-ups automaticos sem stop-on-reply;
- agendar reunioes sozinho;
- rodar em volume alto sem limites por hora/dia.

## Proximo Passo Tecnico

Issue #16: UI assistida do Autopilot SDR.

Escopo resumido:

- criar pagina `/autopilot`;
- listar e editar regras;
- listar fila;
- listar e criar lotes;
- aprovar/cancelar mensagens pela interface;
- deixar claro que aprovacao nao envia mensagem ao lead.

## Documentos Guia

- `docs/MAPA-INTERNO.md`: mapa curto e fonte de continuidade.
- `docs/STATUS-ATUAL.md`: estado atual consolidado.
- `docs/TODO.md`: proximas acoes.
- `docs/AUTOPILOT-SDR.md`: modelo tecnico do Autopilot.
- `docs/HISTORICO.md`: historico operacional.
