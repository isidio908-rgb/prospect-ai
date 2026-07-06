# Guia De Uso - Autopilot

**Atualizado em:** 06/07/2026  
**Objetivo:** explicar como usar o Autopilot no dia a dia sem precisar entender motores internos.

O Autopilot e a central que prepara oportunidades comerciais para voce. Ele pode coletar leads, analisar, priorizar, gerar mensagens, pedir sua aprovacao por lote e enviar somente o que voce aprovou.

## Ideia Principal

Voce nao precisa operar paginas separadas de respostas, templates, diagnostico ou agendamento. Essas partes viraram motores internos do Autopilot.

Pense assim:

| Voce faz | O sistema faz por tras |
|---|---|
| Escolhe nicho/cidade/fonte | Busca e organiza leads. |
| Define limite e score minimo | Prioriza quem parece melhor. |
| Roda o Autopilot | Coleta, analisa, gera mensagem e cria lote. |
| Aprova no WhatsApp pessoal | Libera apenas as mensagens boas. |
| Envia aprovadas | Dispara somente itens aprovados. |
| Acompanha o CRM | Organiza respostas, reunioes e proximas acoes. |

## Rotina Mais Simples

### 1. Confira se esta tudo conectado

Antes de operar, veja:

- WhatsApp conectado em `/whatsapp`.
- Credencial de coleta cadastrada em `/credentials`.
- Perfil preenchido em `/profile`, com profissao, nicho foco e instrucoes internas.

### 2. Abra o Autopilot

Entre em `/autopilot`.

Use essa tela para configurar o alvo do dia:

- credencial de coleta;
- busca do dia;
- cidade;
- nicho;
- limite de leads;
- score minimo;
- tamanho do lote;
- se quer enviar lote para seu WhatsApp pessoal.

### 3. Verifique antes de executar

Clique em **Verificar sem executar** quando quiser conferir se a configuracao faz sentido.

Essa acao nao deve criar coleta, lote, fila nem envio. Ela serve para reduzir erro antes de rodar de verdade.

### 4. Rode o Autopilot

Clique em **Rodar Autopilot agora**.

O sistema pode:

- coletar leads;
- verificar WhatsApp;
- salvar sem duplicar;
- analisar dados;
- calcular score;
- gerar mensagens;
- criar lote de aprovacao;
- enviar solicitacao ao seu WhatsApp pessoal, se estiver marcado.

Mensagens novas ficam aguardando aprovacao. Elas nao sao enviadas automaticamente para leads.

### 5. Aprove pelo WhatsApp pessoal

Quando o lote chegar no seu WhatsApp, responda com:

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3
CANCELAR 42:2
```

Aprovacao de lote apenas muda mensagens para `approved`. Ainda nao envia para o lead.

### 6. Envie somente as aprovadas

Quando quiser disparar, use **Enviar aprovadas agora**.

Essa acao deve processar somente mensagens com status `approved`.

Antes de enviar, o sistema deve respeitar:

- stop-on-reply;
- limite configurado;
- WhatsApp conectado;
- confirmacao visual do usuario.

### 7. Trabalhe o CRM

Depois dos disparos, use `/crm` para acompanhar:

- quem respondeu;
- quem precisa de follow-up;
- quem quer reuniao;
- propostas enviadas;
- clientes fechados;
- leads sem interesse.

## Onde Cada Coisa Fica

| Necessidade | Tela certa |
|---|---|
| Ver resultado geral | Dashboard |
| Buscar novos leads manualmente | Coletar |
| Ver historico e logs | Historico |
| Ver lista completa | Leads |
| Trabalhar funil comercial | CRM Kanban |
| Rodar automacao controlada | Autopilot |
| Conectar WhatsApp | WhatsApp |
| Cadastrar APIs | Credenciais |
| Ensinar contexto para IA | Perfil |

## O Que Nao Deve Aparecer Como Operacao Normal

Estas funcoes existem por tras, mas nao devem ser caminho normal do usuario:

- scheduler;
- worker;
- templates;
- diagnostico;
- central de respostas;
- agendamento separado;
- fila tecnica.

Se alguma dessas coisas voltar a aparecer como menu principal, a UX provavelmente regrediu.

## Regra De Ouro

O Autopilot deve acelerar sua prospeccao, mas nao tirar seu controle.

Fluxo seguro:

```text
Configurar alvo -> Rodar Autopilot -> Aprovar lote -> Enviar aprovadas -> Trabalhar CRM
```

Nada deve ir para o lead antes da etapa de envio de mensagens aprovadas.

## Primeiro Teste Seguro

Para testar sem risco:

1. Use um lead com seu proprio numero controlado.
2. Configure nicho/cidade desse lead.
3. Clique em **Verificar sem executar**.
4. Rode Autopilot com limite pequeno.
5. Aprove o lote pelo seu WhatsApp pessoal.
6. Envie aprovadas apenas se o lead for seu numero de teste.
7. Confira se o CRM e historico foram atualizados.

## Melhorias Planejadas

Proximas melhorias de UX:

- wizard de primeiro uso;
- proxima acao recomendada no topo;
- respostas e agendamento dentro do CRM/detalhe do lead;
- agenda interna de reunioes;
- cron controlado com limites e logs.
