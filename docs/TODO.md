# TODO - Prospect AI

**Atualizado em:** 06/07/2026

Este arquivo lista as proximas acoes praticas. Para visao geral do projeto, estado atual e sequencia de PRs, use `docs/MAPA-INTERNO.md`. Para a revisao focada em usuario leigo, use `docs/REVISAO-UX-USUARIO-LEIGO.md`.

## Prioridade Alta

### 1. Wizard de operacao diaria no Autopilot

Objetivo: deixar o Autopilot simples para uma pessoa leiga operar sem entender motores internos.

Escopo sugerido:

- Criar bloco guiado dentro de `/autopilot`.
- Perguntar nicho, cidade/regiao, credencial, limite e score minimo.
- Mostrar checagem de prontidao: WhatsApp, credencial, leads existentes e aprovacao pessoal.
- Preencher parametros tecnicos internamente.
- Rodar verificacao segura sem efeitos reais.
- Preparar oportunidades quando aprovado.
- Enviar lote para o WhatsApp pessoal.
- Processar apenas mensagens aprovadas.
- Mostrar proxima acao recomendada.

Criterios de aceite:

- Usuario consegue entender o fluxo sem ler documentacao longa.
- Nenhum termo tecnico aparece como acao principal.
- Nao existe envio real sem confirmacao.
- Mensagens novas continuam exigindo aprovacao em lote.
- Os motores internos nao voltam ao menu.

### 2. Estado operacional claro no topo do Autopilot

Objetivo: mostrar rapidamente o que falta para o sistema trabalhar.

Escopo sugerido:

- Card `WhatsApp conectado` ou `Conectar WhatsApp`.
- Card `Credencial pronta` ou `Cadastrar credencial`.
- Card `Leads bons hoje`.
- Card `Aguardando minha aprovacao`.
- Card `Aprovadas para envio`.
- Card `Proxima acao recomendada`.

Criterios de aceite:

- O usuario sabe qual e o proximo clique.
- Erros comuns viram orientacao clara.
- Nao precisa abrir logs para entender bloqueios simples.

### 3. Respostas e agendamento dentro do CRM/detalhe do lead

Objetivo: tratar resposta positiva sem abrir tela tecnica separada.

Escopo sugerido:

- No card do CRM ou detalhe do lead, mostrar resposta recebida e intencao provavel.
- Exibir proxima acao recomendada.
- Permitir marcar reuniao direto no lead.
- Permitir gerar diagnostico direto no lead.
- Registrar tudo em `lead_followups`.

Criterios de aceite:

- Lead interessado vira reuniao com poucos cliques.
- Nao ha tela separada para o comercial operar `respostas` ou `agendamento`.
- Nenhum WhatsApp e enviado automaticamente por diagnostico/agendamento.

## Prioridade Media

### 4. Agenda interna de reunioes

Objetivo: visualizar reunioes marcadas sem depender de Google Calendar no primeiro momento.

Escopo futuro:

- Filtro de leads `reuniao_marcada`.
- Lista por data/periodo.
- Proxima acao e responsavel.
- Link para detalhe do lead.
- Campo de observacao da reuniao.

### 5. Cron controlado futuro

Objetivo: automatizar horarios diarios sem perder controle.

Escopo futuro:

- Scheduler configuravel por horario.
- Limite por regra e por janela.
- Logs por execucao.
- Pausa automatica em erro.
- Opcao de rodar apenas verificacao em horarios automaticos.
- Nunca enviar direto sem configuracao explicita.

Criterios de aceite:

- Cron nasce desligado por padrao.
- Toda regra automatica tem limite diario.
- Envio real continua exigindo status `approved` e janela segura.
- Stop-on-reply roda antes de qualquer envio.

### 6. Integracao Google Calendar/Calendly

Objetivo: criar evento externo somente quando o fluxo assistido ja estiver validado.

Escopo futuro:

- Cadastro de provider de agenda.
- Teste de credencial.
- Criacao de evento com confirmacao explicita.
- Registro do link no lead.
- Sem envio automatico de convite sem revisao.

### 7. PDF comercial visual

Objetivo: transformar diagnostico em material apresentavel para reuniao ou follow-up.

Escopo futuro:

- Template visual simples.
- Dados observados do lead.
- Dores detectadas.
- Oportunidades recomendadas.
- Proxima acao sugerida.
- Exportacao PDF.

## Operacao Comercial Recomendada Agora

1. Abrir `/dashboard` para ver resultado geral.
2. Abrir `/collect` quando quiser buscar novos leads manualmente.
3. Abrir `/autopilot` para preparar oportunidades, pedir aprovacao e enviar somente aprovadas.
4. Aprovar ou cancelar lotes pelo WhatsApp pessoal.
5. Abrir `/crm` para trabalhar respostas, reunioes, propostas e fechamentos.
6. Abrir o detalhe do lead quando precisar ajustar mensagem, diagnostico ou proxima acao.

## Concluido Recentemente

### PR #23 - Autopilot como superficie unica de automacao

Validado e mergeado.

Resultado:

- Agendamento comercial assistido criado.
- Autopilot simplificado como central unica.
- Menu lateral sem `Semi-auto`, `Respostas`, `Templates`, `Diagnostico` e `Agendamento`.
- Motores internos deixam de ser superficie principal do produto.
- Travas e auditoria visiveis para explicar comportamento seguro.

### PR #22 - Autopilot Comercial Semi-Automatico

Validado e mergeado.

Resultado:

- Plano baseado em historico de coletas, credenciais, estatisticas da fila e leads.
- Simulacao `dry_run=true` por padrao.
- Coleta real somente com `approve_collection=true`.
- Analise automatica dos leads salvos.
- Criacao/atualizacao de regra assistida.
- Enfileiramento de mensagens `pending`.
- Criacao de lote e envio opcional ao WhatsApp pessoal.
- Stop-on-reply antes de qualquer worker.
- Worker processando somente mensagens `approved`.

### PR #21 - Diagnostico comercial avancado

Validado e mergeado.

Resultado:

- Diagnostico curto para WhatsApp.
- Diagnostico completo em Markdown.
- Roteiro de Loom/audio.
- Roteiro de reuniao.
- Oferta recomendada por dores observadas.
- Separacao entre fatos observados e inferencias.
- Nenhum envio automatico de WhatsApp no fluxo.

### PR #20 - Templates comerciais por nicho e profissao

Validado e mergeado.

Resultado:

- Catalogo de nichos e tons comerciais.
- Deteccao de dores observaveis por lead.
- Mensagem inicial, follow-up, diagnostico curto e contexto profissional para LLM.
- Uso de `profession`, `primary_niche` e `internal_context` do usuario.
- Nenhum envio automatico de WhatsApp no fluxo.

### PR #19 - Central de respostas e proxima acao recomendada

Validado e mergeado.

Resultado:

- Inbox autenticado de respostas recebidas.
- Classificacao de intencao.
- Resposta sugerida copiavel.
- Acoes seguras para CRM.
- Registro em `lead_followups`.
- Isolamento por usuario validado.
- Nenhum envio automatico de WhatsApp no fluxo.

### Outros blocos concluidos

- Fundacao do Autopilot SDR.
- API autenticada do Autopilot SDR.
- Historico persistente de coletas.
- Logs persistentes de execucao.
- Cache de busca/coleta com TTL visual e limpeza manual.
- Validacao de Serper, Apify e RapidAPI.
- Mensagens amigaveis para erros comuns de providers.
- Dashboard comercial com filtros por periodo e fonte.
- CRM Kanban com drag-and-drop, filtros e edicao rapida.
- Documentacao operacional de WhatsApp, IA, coleta e credenciais.
- Atualizacao de `bcrypt` para remover vulnerabilidades do backend.
- `npm audit --json` do backend limpo com 0 vulnerabilidades.

## Regras Permanentes

- Nunca commitar `.env`, tokens, API keys ou dumps.
- Nunca logar headers completos de autenticacao.
- Nunca retornar API key completa no frontend.
- Nunca enviar mensagem para lead apenas por aprovar lote.
- Modo `assistido` sempre exige aprovacao manual.
- Worker automatico so pode existir com limite diario, limite horario, janela de envio e stop-on-reply.
- Template comercial pode gerar, copiar e aplicar textos no lead, mas nao pode enviar WhatsApp automaticamente.
- Diagnostico comercial pode gerar, copiar e aplicar texto no lead, mas nao pode criar fila nem enviar WhatsApp automaticamente.
- Autopilot pode processar fila aprovada, mas somente itens `approved`.
- Coleta automatizada real exige aprovacao explicita.
- Agendamento assistido pode registrar reuniao no CRM, mas nao pode enviar WhatsApp nem criar calendario externo automaticamente.
- Toda PR deve terminar com testes, build, Docker e scan basico de segredos.
