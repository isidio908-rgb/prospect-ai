# TODO - Prospect AI

**Atualizado em:** 04/07/2026

Este arquivo lista as proximas acoes praticas. Para visao geral do projeto, estado atual e sequencia de PRs, use `docs/MAPA-INTERNO.md`.

## Prioridade Alta

### 1. PR #18 - Guia de uso do Autopilot e mapa atualizado

Objetivo: garantir que o usuario saiba operar `/autopilot` sem depender de explicacao solta na conversa.

Escopo:

- Criar `docs/GUIA-USO-AUTOPILOT.md`.
- Explicar conceitos: regra, scheduler, fila, lote, aprovacao, worker, dry-run, stop-on-reply e follow-up.
- Explicar fluxo diario seguro.
- Explicar primeiro teste seguro.
- Explicar diferenca entre aprovar lote e enviar para lead.
- Atualizar `docs/MAPA-INTERNO.md` com PR #17 mergeado.
- Atualizar `docs/TODO.md` com V2 comercial.
- Atualizar `docs/STATUS-ATUAL.md` se necessario.

Criterios de aceite:

- Guia responde "como eu uso essa pagina?".
- Mapa nao fala mais que `/autopilot` esta pendente.
- Proximos PRs comerciais ficam claros.

### 2. PR #19 - Central de respostas e proxima acao recomendada

Objetivo: transformar respostas recebidas em acao comercial rapida.

Escopo recomendado:

- Criar bloco/tela de respostas recebidas.
- Listar leads com resposta recente.
- Mostrar ultima mensagem recebida.
- Classificar intencao: interesse, preco, reuniao, pergunta, sem interesse, neutro.
- Sugerir proxima acao.
- Permitir responder com IA, marcar reuniao, mover para sem interesse ou criar follow-up.
- Manter toda acao externa com confirmacao.

Criterios de aceite:

- Usuario ve rapidamente quem respondeu.
- Usuario entende qual proximo passo tomar.
- Nenhuma resposta automatica e enviada sem confirmacao.

### 3. PR #20 - Templates comerciais por nicho e profissao

Objetivo: melhorar qualidade das mensagens com base no nicho do lead e na profissao/contexto interno do usuario.

Escopo recomendado:

- Criar biblioteca de templates por nicho.
- Nichos iniciais: imobiliarias, clinicas, odontologia, estetica, advocacia, escolas, energia solar, moveis planejados.
- Criar argumentos por dor: sem pixel, sem GTM, sem GA4, sem WhatsApp no site, site lento, baixa prova social, sem campanha aparente.
- Adaptar prompts para ponto de vista de gestor de trafego.
- Permitir escolher tom: consultivo, direto, diagnostico, oportunidade.

Criterios de aceite:

- Mensagem inicial e follow-up ficam mais especificos por nicho.
- Prompt nao inventa dados do lead.
- Templates podem ser revisados antes de entrar em fila.

### 4. PR #21 - Diagnostico comercial avancado

Objetivo: transformar o diagnostico base em material de venda.

Escopo recomendado:

- Diagnostico curto para WhatsApp.
- Diagnostico completo em Markdown.
- Roteiro de Loom/audio.
- Roteiro de reuniao de 15 minutos.
- Sugestao de oferta: trafego, tracking, site, CRM, WhatsApp, criativos ou consultoria.
- Botao para copiar texto.

Criterios de aceite:

- Usuario consegue usar o diagnostico na abordagem.
- Diagnostico diferencia fatos observados de inferencias.
- Nao promete resultado financeiro sem dados.

### 5. PR #22 - Agendamento comercial assistido

Objetivo: deixar o caminho de resposta positiva ate reuniao mais curto.

Escopo recomendado:

- Sugerir horarios disponiveis manualmente cadastrados.
- Gerar mensagem de convite para reuniao.
- Confirmar data/horario combinado.
- Registrar no lead e no historico.
- Preparar futura integracao Google Calendar/Calendly.

Criterios de aceite:

- Lead interessado vira `reuniao_marcada` com menos cliques.
- Nenhum evento externo e criado sem confirmacao.

## Prioridade Media

### 6. Operacao controlada de prospeccao real

Objetivo: continuar gerando oportunidades enquanto o produto evolui.

Checklist:

- Definir nicho do dia.
- Definir cidade/regiao do dia.
- Coletar lotes pequenos por provider ativo.
- Priorizar leads com WhatsApp confirmado e score alto.
- Usar CRM Kanban para registrar status e proxima acao.
- Usar IA para ajustar mensagem por nicho.
- Usar `/autopilot` para aprovar, simular e enviar com controle.
- Medir respostas, reunioes e clientes fechados.
- Ajustar mensagens e criterios de score com base em respostas reais.

### 7. Cron controlado futuro

Objetivo: automatizar horarios diarios sem perder controle.

Escopo futuro:

- Scheduler configuravel por horario.
- Limite por regra.
- Logs por execucao.
- Pausa automatica em erro.
- Nunca enviar direto sem configuracao explicita.

## Concluido Recentemente

### PR #17 - Autopilot completo controlado

Validado e mergeado.

Resultado:

- `/autopilot` criada e refinada como central operacional comercial.
- Cards de proxima acao.
- Fluxo visual 1 a 11.
- Scheduler assistido.
- Worker controlado.
- Stop-on-reply.
- Follow-ups assistidos.
- Classificacao heuristica de respostas.
- Agendamento assistido.
- Diagnostico/PDF base em Markdown.
- Reenvio de lote para WhatsApp pessoal.
- Envio real restrito ao modo avancado com `dry_run=false` e `confirm_send=true`.
- Merge commit: `78e62b205445d63a3b4dc768dc8de6794d8b302b`.

### PR #15 - Aprovacao em lote via WhatsApp real

Validado e mergeado.

Resultado:

- Lote real `#26` criado.
- Solicitacao chegou no WhatsApp pessoal.
- Resposta `APROVAR LOTE 26` foi processada pelo webhook real.
- Lote virou `approved`.
- 2 itens viraram `approved`.
- Nenhum item virou `sent`.
- Logs recentes sem padroes de segredo.
- Merge commit: `3404742ca7632e30b8556b3874bc84ee45d463f7`.

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
- Toda PR deve terminar com testes, build, Docker e scan basico de segredos.
