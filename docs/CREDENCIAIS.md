# Credenciais - Guia Operacional

Este guia descreve como operar credenciais no Prospect AI.

## Objetivo

Centralizar chaves de provedores usados pelo sistema com seguranca operacional:

- scrapers de leads;
- providers de IA/LLM;
- controle de uso;
- teste de credenciais;
- mascaramento no frontend;
- criptografia no banco.

## Tipos De Credenciais

### Scrapers De Leads

- Serper
- RapidAPI
- Apify

### IA/LLM

- OpenAI
- Anthropic
- Gemini
- Groq
- OpenRouter
- Cerebras
- Mistral

## Campos Importantes

Campos comuns:

- nome;
- tipo;
- categoria;
- provider;
- API host;
- base URL;
- endpoint de busca;
- modelo, quando LLM;
- limite diario;
- limite mensal;
- status;
- observacoes.

A API key deve ser:

- enviada apenas pelo formulario;
- criptografada no banco;
- mascarada no frontend;
- nunca exibida completa novamente.

## Status Operacional

Status esperados:

- ativo;
- inativo;
- pausado;
- erro;
- limite atingido.

Ao atingir limite, o sistema deve evitar chamadas desnecessarias e orientar troca ou pausa operacional.

## Configuracao Por Provider

### Serper

Uso:

- Google Places via Serper;
- coleta rapida e validacao operacional.

Validacao:

- teste de credencial deve retornar statusCode 200;
- coleta pequena deve registrar `provider_collected`.

### RapidAPI

Uso:

- Local Business Data ou provider equivalente configurado.

Campos criticos:

- API key da conta/projeto correto;
- `x-rapidapi-host` exato da API assinada;
- endpoint correto;
- assinatura ativa no RapidAPI.

Erro comum:

`You are not subscribed to this API`

Acao:

- confirmar assinatura da API exata;
- confirmar se a key pertence ao mesmo projeto/conta;
- copiar host diretamente do playground;
- testar novamente na tela de credenciais.

### Apify

Uso:

- Actor Google Maps Scraper.

Campos criticos:

- token Apify;
- Actor/endpoint correto;
- Actor aprovado quando exigir permissao.

Erro comum:

`full-permission-actor-not-approved`

Acao:

- aprovar o Actor na conta Apify;
- testar manualmente no console Apify;
- repetir teste de credencial.

### LLMs

Uso:

- gerar diagnosticos e mensagens comerciais.

Campos criticos:

- provider;
- modelo;
- API key;
- status ativo.

Validacao:

- tarefa simples de IA deve retornar texto coerente;
- prompt nao deve receber credenciais;
- resposta nao deve inventar dados do lead.

## Regras De Seguranca

Obrigatorio:

- Nunca commitar `.env`.
- Nunca commitar API keys.
- Nunca logar headers completos.
- Nunca exportar chave em CSV/JSON.
- Nunca incluir token em prints ou documentacao.
- Mascarar chaves no frontend.
- Criptografar chaves no banco.
- Registrar apenas status, erro tratado e consumo.

Proibido:

- usar rotacao de credenciais para burlar limite;
- criar contas automaticamente para contornar provider;
- expor tokens no navegador;
- enviar chave LLM dentro de prompt.

## Checklist Ao Cadastrar Credencial

- [ ] Provider correto selecionado.
- [ ] Categoria correta: scraper ou LLM.
- [ ] Host/base URL conferidos.
- [ ] Endpoint conferido.
- [ ] Modelo preenchido quando LLM.
- [ ] Limite diario/mensal definido.
- [ ] Teste de credencial executado.
- [ ] Chave aparece mascarada depois de salvar.
- [ ] Nenhum segredo apareceu nos logs.

## Checklist Antes De Coletar

- [ ] Credencial ativa.
- [ ] Provider testado.
- [ ] Limite disponivel.
- [ ] Provider correto selecionado na tela de coleta.
- [ ] Logs antigos sem erros recorrentes.

## Diagnostico Rapido De Problemas

### Credencial testa, mas coleta falha

Verificar:

- endpoint de coleta diferente do endpoint de teste;
- parametros obrigatorios ausentes;
- limite do plano;
- provider retornando schema inesperado.

### Coleta funciona no console do provider, mas nao no sistema

Verificar:

- host/base URL;
- nome do provider no cadastro;
- endpoint salvo;
- parametros montados pelo backend;
- credencial selecionada no frontend.

### Logs mostram erro sem detalhe suficiente

Acao:

- melhorar mensagem tratada sem expor headers;
- adicionar teste unitario para o erro;
- registrar apenas payload seguro.
