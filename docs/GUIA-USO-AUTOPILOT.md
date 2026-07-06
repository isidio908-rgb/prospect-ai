# Guia De Uso - Autopilot

**Atualizado em:** 06/07/2026  
**Objetivo:** explicar como usar o Autopilot no dia a dia sem precisar entender motores internos.

O Autopilot e a central que prepara oportunidades comerciais para voce. Ele pode coletar leads, analisar, priorizar, gerar mensagens, pedir sua aprovacao por lote e enviar somente o que voce aprovou.

## Ideia Principal

Voce nao precisa operar paginas separadas de respostas, templates, diagnostico ou agendamento. Essas partes sao motores internos ou aparecem dentro do CRM/detalhe do lead quando fizer sentido.

Pense assim:

| Voce faz | O sistema faz por tras |
|---|---|
| Define o alvo do dia | Monta a busca e prepara parametros tecnicos. |
| Clica em verificar | Confere o plano sem criar coleta, lote, fila ou envio. |
| Clica em preparar oportunidades | Coleta, analisa, pontua e cria lote de aprovacao. |
| Aprova no WhatsApp pessoal | Libera apenas as mensagens boas. |
| Clica em enviar aprovadas | Dispara somente itens aprovados. |
| Trabalha o CRM | Organiza respostas, reunioes e proximas acoes. |

## Rotina Mais Simples

### 1. Confira se esta tudo conectado

Antes de operar, veja:

- WhatsApp conectado em `/whatsapp`.
- Credencial de coleta cadastrada em `/credentials`.
- Perfil preenchido em `/profile`, com profissao, nicho foco e instrucoes internas.

### 2. Abra o Autopilot

Entre em `/autopilot`.

O bloco principal agora e **Operacao diaria guiada**. Use ele antes das configuracoes detalhadas.

Preencha:

- busca do dia;
- credencial de coleta;
- cidade;
- nicho;
- limite de leads;
- score minimo;
- se quer receber pedido de aprovacao no WhatsApp pessoal.

### 3. Leia a proxima acao recomendada

No topo da tela, o Autopilot mostra o que falta ou o que voce deve fazer agora.

Exemplos:

- informar credencial;
- informar busca/cidade/nicho;
- verificar sem executar;
- preparar oportunidades;
- aprovar lote;
- enviar mensagens aprovadas.

### 4. Verifique antes de executar

Clique em **Verificar sem executar** quando quiser conferir se a configuracao faz sentido.

Essa acao nao deve criar coleta, lote, fila nem envio. Ela serve para reduzir erro antes de rodar de verdade.

### 5. Prepare oportunidades

Clique em **Preparar oportunidades**.

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

### 6. Aprove pelo WhatsApp pessoal

Quando o lote chegar no seu WhatsApp, responda com:

```text
APROVAR LOTE 42
CANCELAR LOTE 42
APROVAR 42:1,3
CANCELAR 42:2
```

Aprovacao de lote apenas muda mensagens para `approved`. Ainda nao envia para o lead.

### 7. Envie somente as aprovadas

Quando quiser disparar, use **Enviar aprovadas**.

Essa acao deve processar somente mensagens com status `approved`.

Antes de enviar, o sistema deve respeitar:

- stop-on-reply;
- limite configurado;
- WhatsApp conectado;
- confirmacao visual do usuario.

### 8. Trabalhe respostas e reunioes no CRM

Depois dos disparos, use `/crm` para acompanhar:

- leads para responder agora;
- reunioes marcadas;
- proximas acoes;
- propostas enviadas;
- clientes fechados;
- leads sem interesse.

O CRM tem um painel de foco com:

- **Responder agora**;
- **Agenda interna**.

## Onde Cada Coisa Fica

| Necessidade | Tela certa |
|---|---|
| Ver resultado geral | Dashboard |
| Buscar novos leads manualmente | Coletar |
| Ver historico e logs | Historico |
| Ver lista completa | Leads |
| Trabalhar respostas, reunioes e funil | CRM Kanban |
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
Configurar alvo -> Verificar -> Preparar oportunidades -> Aprovar lote -> Enviar aprovadas -> Trabalhar CRM
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

## Melhorias Entregues Nesta Rodada

- wizard de operacao diaria;
- proxima acao recomendada no topo;
- checagem de prontidao;
- respostas e reunioes destacadas no CRM;
- agenda interna inicial no CRM;
- cron automatico mantido desligado por seguranca.
