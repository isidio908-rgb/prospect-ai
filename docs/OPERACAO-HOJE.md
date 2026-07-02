# Operacao Para Comecar Hoje

Objetivo deste arquivo: executar a primeira operacao manual/semi-automatica do Prospect AI ainda hoje, sem depender de dashboard, banco de dados ou automacao completa.

Meta do primeiro dia:

- Montar 30 leads.
- Rodar a analise.
- Separar os 10 melhores.
- Abordar manualmente pelo WhatsApp.
- Registrar quem respondeu.

---

## 1. Caminho recomendado hoje: lista manual

Preencha `data/inputs/meus-leads.csv` com este cabecalho:

```csv
nome_empresa,site,telefone,cidade,nicho,categoria,fonte,observacoes
```

Exemplo:

```csv
Imobiliaria X,https://site.com.br,65999999999,Cuiaba,imobiliarias,Imobiliaria,busca manual,Lead encontrado em diretorio publico
```

Para comecar rapido, busque empresas manualmente em fontes publicas como:

- Google Maps.
- Instagram.
- Diretorios publicos.
- Sites de associacoes comerciais.
- Indicacoes e listas internas.

Prioridade inicial sugerida:

```text
cidade: Cuiaba
nicho: imobiliarias
quantidade: 30 leads
```

---

## 2. Opcional: coletar via RapidAPI

Use esta opcao quando ja tiver um provider de Google Maps/Places configurado na RapidAPI.

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

Depois rode a analise usando o arquivo gerado:

```bash
npm run analyze -- --input data/inputs/ARQUIVO-GERADO.csv --city Cuiaba --niche imobiliarias
```

---

## 3. Opcional: extrair leads de uma pagina publica

Se voce tiver uma pagina de diretorio publico, rode:

```bash
npm run discover -- --url https://site-publico.com/lista-de-imobiliarias --city Cuiaba --niche imobiliarias
```

Se preferir salvar o HTML da pagina no navegador, coloque em `data/inputs/pagina.html` e rode:

```bash
npm run discover -- --html data/inputs/pagina.html --city Cuiaba --niche imobiliarias
```

Esse comando gera um CSV em `data/inputs`.

Depois rode a analise usando o CSV gerado.

---

## 4. Rodar analise

Para a lista manual:

```bash
npm run analyze -- --input data/inputs/meus-leads.csv --city Cuiaba --niche imobiliarias
```

Para testar com o arquivo de exemplo:

```bash
npm run demo
```

O sistema vai auditar os sites, calcular score, definir prioridade, gerar diagnostico e gerar mensagem de abordagem.

---

## 5. Usar a saida

O sistema gera arquivos em `data/outputs`:

- CSV para planilha/CRM.
- JSON para automacao/n8n.

Ordem de uso:

1. Abra o CSV de resultado.
2. Ordene por `score` do maior para o menor.
3. Comece pelos leads com `Prioridade maxima` e `Alta`.
4. Use a coluna `mensagem_whatsapp` para a primeira abordagem.
5. Registre manualmente quem respondeu.

---

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

---

## 7. Controle manual recomendado

Enquanto nao existir CRM interno, registre em uma planilha simples:

```csv
empresa,telefone,site,score,prioridade,status,data_abordagem,proxima_acao,observacoes
```

Status sugeridos:

```text
novo
abordado
respondeu
chamada_marcada
sem_interesse
follow_up
cliente
```

---

## 8. Comandos rapidos

Criar/editar lista manual:

```bash
code data/inputs/meus-leads.csv
```

Rodar analise:

```bash
npm run analyze -- --input data/inputs/meus-leads.csv --city Cuiaba --niche imobiliarias
```

Ver ajuda:

```bash
npm start
```
