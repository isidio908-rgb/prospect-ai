# Operacao Para Comecar Hoje

## 1. Opcao A: coletar via RapidAPI

Copie `.env.example` para `.env` e preencha:

```env
RAPIDAPI_KEY=
RAPIDAPI_HOST=
RAPIDAPI_SEARCH_URL=
RAPIDAPI_DAILY_LIMIT=100
```

Depois rode:

```bash
npm run collect -- --query "imobiliarias Cuiaba" --city Cuiaba --niche imobiliarias --limit 20
```

O comando gera um CSV em `data/inputs`.

## 2. Opcao B: criar uma lista inicial manual

Preencha `data/inputs/meus-leads.csv` com este cabecalho:

```csv
nome_empresa,site,telefone,cidade,nicho,categoria,fonte,observacoes
```

Exemplo:

```csv
Imobiliaria X,https://site.com.br,65999999999,Cuiaba,imobiliarias,Imobiliaria,busca manual,Lead encontrado em diretorio publico
```

## 3. Opcao C: extrair leads de uma pagina publica

Se voce tiver uma pagina de diretorio publico, rode:

```bash
npm run discover -- --url https://site-publico.com/lista-de-imobiliarias --city Cuiaba --niche imobiliarias
```

Se preferir salvar o HTML da pagina no navegador, coloque em `data/inputs/pagina.html` e rode:

```bash
npm run discover -- --html data/inputs/pagina.html --city Cuiaba --niche imobiliarias
```

Esse comando gera um CSV em `data/inputs`.

## 4. Rodar analise

```bash
npm run analyze -- --input data/inputs/meus-leads.csv --city Cuiaba --niche imobiliarias
```

## 5. Usar a saida

O sistema gera arquivos em `data/outputs`:

- CSV para planilha/CRM.
- JSON para automacao/n8n.

Ordene por `score` e comece pelos leads com `Prioridade maxima` e `Alta`.

## 6. Abordagem recomendada

Nao envie proposta direta. Envie a mensagem gerada na coluna `mensagem_whatsapp`.

Quando a pessoa responder, envie um diagnostico curto:

```text
Perfeito. Eu fiz uma analise rapida e encontrei 3 pontos:

1. [ponto 1]
2. [ponto 2]
3. [ponto 3]

Isso normalmente impacta a geracao de chamadas no WhatsApp e pedidos de orcamento.
Posso te mostrar em uma chamada rapida de 15 minutos?
```

## 7. Meta do primeiro dia

- Montar 30 leads.
- Rodar a analise.
- Separar os 10 melhores.
- Abordar manualmente pelo WhatsApp.
- Registrar quem respondeu.
