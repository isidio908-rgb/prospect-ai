# Revisao UX - Usuario Leigo

**Atualizado em:** 06/07/2026

Este documento resume como o Prospect AI deve se comportar para uma pessoa que nao quer entender motores internos, filas tecnicas ou endpoints. A ferramenta precisa parecer simples: escolher um alvo, deixar o sistema preparar oportunidades, aprovar o que faz sentido e acompanhar o CRM.

## Principio Do Produto

O usuario nao deve operar `scheduler`, `worker`, `templates`, `diagnostico`, `respostas` ou `agendamento` como telas separadas.

Essas funcoes devem existir como motores internos do Autopilot:

| Motor interno | O que faz por tras |
|---|---|
| Coleta | Busca empresas pelo nicho/cidade/fonte escolhida. |
| Analise | Audita site, WhatsApp, tracking e dados comerciais. |
| Score | Prioriza leads com maior chance de compra. |
| Mensagens | Gera abordagem inicial e follow-ups. |
| Aprovacao | Agrupa mensagens e pede permissao no WhatsApp pessoal. |
| Envio | Dispara somente mensagens aprovadas. |
| Respostas | Interpreta retorno e atualiza proxima acao. |
| Agendamento | Ajuda a transformar interesse em reuniao no CRM. |
| Diagnostico | Gera contexto para Loom, reuniao, proposta ou abordagem. |

## Caminho Simples Para O Usuario

O fluxo visivel deve ser:

1. **Credenciais**: conectar fontes, WhatsApp e IA.
2. **Coletar**: escolher nicho, cidade e quantidade quando quiser buscar novos leads manualmente.
3. **Autopilot**: configurar o alvo do dia e rodar a rotina assistida.
4. **WhatsApp pessoal**: aprovar ou cancelar lotes.
5. **CRM Kanban**: acompanhar respostas, reunioes, propostas e fechamentos.
6. **Dashboard**: medir o que esta dando resultado.

Tudo que for mais tecnico deve aparecer apenas como auditoria, logs ou explicacao curta.

## O Que Foi Simplificado Nesta Rodada

- `Autopilot` ficou como a unica tela de automacao no menu.
- Rotas antigas de frontend foram removidas:
  - `/autopilot/semi-auto`
  - `/autopilot/replies`
  - `/autopilot/templates`
  - `/autopilot/diagnostics`
  - `/autopilot/scheduling`
- Os motores backend continuam existindo para o Autopilot usar internamente.
- O frontend nao deve mais incentivar o usuario a abrir modulos separados para operar rotina comercial.

## Melhorias Recomendadas Para Proximas PRs

### 1. Wizard De Primeiro Uso

Criar uma tela ou bloco guiado com checklist:

- Conectar WhatsApp.
- Cadastrar credencial de coleta.
- Cadastrar credencial de IA, se for usar IA.
- Definir profissao, nicho foco e contexto interno.
- Fazer uma coleta pequena de teste.
- Rodar Autopilot em modo seguro.

Resultado esperado: o usuario sabe o que falta antes de tentar operar.

### 2. Autopilot Em Modo Assistente

Trocar campos soltos por perguntas simples:

- Qual nicho voce quer atacar hoje?
- Em qual cidade/regiao?
- Quantos leads voce quer preparar?
- Qual score minimo deve entrar no lote?
- Voce quer enviar o lote para seu WhatsApp pessoal?

Depois disso, o sistema preenche os campos tecnicos internamente.

### 3. Estado Operacional Claro

Mostrar no topo do Autopilot um resumo em linguagem humana:

- WhatsApp conectado ou pendente.
- Credencial de coleta selecionada ou pendente.
- Quantos leads bons existem hoje.
- Quantas mensagens aguardam aprovacao.
- Quantas mensagens aprovadas estao prontas para envio.
- Proxima acao recomendada.

### 4. Botoes Com Verbos De Negocio

Preferir nomes como:

- `Preparar oportunidades`
- `Pedir minha aprovacao`
- `Enviar aprovadas`
- `Atualizar respostas`
- `Organizar CRM`

Evitar nomes tecnicos como:

- `Scheduler`
- `Worker`
- `Dry-run`
- `Queue`
- `Process approved`

Termos tecnicos podem ficar em auditoria.

### 5. Respostas E Agendamento Dentro Do CRM

Quando o lead responde, o usuario deve ver isso no CRM ou no detalhe do lead:

- Resposta recebida.
- Intencao provavel.
- Proxima acao recomendada.
- Botao para marcar reuniao.
- Botao para gerar diagnostico.

Nao precisa haver uma tela separada para cada motor.

### 6. Explicacao Curta Em Cada Tela

Cada tela principal deve responder em uma frase:

| Tela | Frase guia |
|---|---|
| Dashboard | Veja se a prospeccao esta virando resposta, reuniao e cliente. |
| Coletar | Busque novos leads por nicho, cidade e fonte. |
| Historico | Confira o que foi coletado, salvo, duplicado ou rejeitado. |
| Leads | Veja e edite todos os contatos encontrados. |
| CRM Kanban | Trabalhe os leads ate reuniao, proposta e fechamento. |
| Autopilot | Deixe o sistema preparar, priorizar e pedir aprovacao para agir. |
| WhatsApp | Conecte e monitore o canal de envio e resposta. |
| Credenciais | Cadastre fontes de coleta e IA sem expor chaves. |
| Perfil | Ensine a IA a falar do ponto de vista do seu trabalho. |

## Regras De Produto

1. Uma automacao sensivel sempre precisa de trava clara.
2. O usuario nao deve precisar entender tabelas ou endpoints.
3. O menu deve ter poucas entradas.
4. Se uma funcao e motor interno, ela nao deve virar item de menu.
5. Se uma acao pode enviar mensagem, deve mostrar confirmacao.
6. Se uma acao so prepara dados, deve deixar isso explicito.
7. Se uma tela gerar duvida, o nome e a hierarquia devem ser revistos.

## Proxima Rodada Sugerida

Criar o **wizard de operacao diaria** dentro do Autopilot:

1. Escolher nicho e cidade.
2. Selecionar credencial.
3. Definir limite e score minimo.
4. Rodar checagem segura.
5. Preparar oportunidades.
6. Enviar lote para aprovacao.
7. Enviar aprovadas.
8. Mostrar respostas e proximas acoes no CRM.

Esse wizard deve reduzir a dependencia de documentacao e deixar a ferramenta natural para uso diario.
