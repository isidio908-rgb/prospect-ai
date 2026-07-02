# Prospect AI

Ferramenta interna de prospeccao para gestor de trafego, criada para encontrar empresas, analisar presenca digital, gerar score de oportunidade e preparar abordagens comerciais personalizadas.

O objetivo inicial e uso proprio: produzir leads qualificados para vender servicos de trafego pago, tracking, criativos, sites, automacoes e estrutura digital.

No futuro, o projeto podera evoluir para uma solucao comercial.

---

## Objetivo

O Prospect AI ajuda a responder:

- Quais empresas de um nicho/cidade tem potencial para contratar trafego pago?
- Quais possuem site, WhatsApp, Pixel, GTM ou GA4?
- Quais parecem perder oportunidades por falta de estrutura digital?
- Quais leads devem ser abordados primeiro?
- Qual mensagem enviar para iniciar uma conversa sem parecer spam?

---

## Fontes de Coleta

A V1 pode trabalhar com multiplas fontes:

- RapidAPI com APIs de busca no Google Maps
- Diretorios publicos de empresas
- Listas manuais em CSV
- Sites encontrados em busca organica
- Paginas publicas de contato

A fonte principal inicial sera RapidAPI, usando provedores de Google Maps/Places disponiveis na plataforma.

---

## Principios do Projeto

- Uso proprio antes de pensar em comercializacao
- Projeto separado do Performance Hub
- Arquitetura simples, mas preparada para escalar
- Cache obrigatorio para evitar consultas repetidas
- Controle de cota por chave/API
- Lead Score baseado em oportunidade comercial
- Abordagem consultiva, nao venda direta
- Respeito a limites, termos de uso e boas praticas de prospeccao

---

## Stack Inicial

- Node.js
- TypeScript futuramente
- PostgreSQL futuramente
- CSV/JSON na V1
- RapidAPI como fonte externa
- n8n futuramente para automacoes
- OpenAI/IA futuramente para diagnostico avancado

---

## Fluxo da V1

```text
Nicho + Cidade
      ↓
Buscar empresas via RapidAPI
      ↓
Salvar nome, telefone, site, categoria e endereco
      ↓
Remover duplicados
      ↓
Analisar site
      ↓
Detectar Pixel, GTM, GA4, WhatsApp e formulario
      ↓
Gerar Lead Score
      ↓
Gerar diagnostico
      ↓
Gerar mensagem de abordagem
      ↓
Exportar CSV/JSON
```

---

## Dados Coletados

Campos principais:

```text
nome_empresa
categoria
cidade
bairro
endereco
telefone
whatsapp
site
google_maps_url
rating
total_avaliacoes
fonte
data_coleta
```

Campos de analise:

```text
tem_site
site_online
tem_https
tem_pixel_meta
tem_gtm
tem_ga4
tem_google_ads_tag
tem_whatsapp_site
tem_formulario
instagram
facebook
tempo_carregamento_ms
score
prioridade
diagnostico
mensagem_whatsapp
```

---

## Lead Score

Exemplo de pontuacao:

```text
Sem site: +25
Site fora do ar: +20
Sem Pixel Meta: +20
Sem GTM: +15
Sem GA4: +15
Sem WhatsApp visivel: +15
Sem formulario: +8
Site lento: +10
Sem redes sociais visiveis: +6
Poucas avaliacoes: +10
```

Prioridade:

```text
0-34: Baixa
35-59: Media
60-79: Alta
80-100: Prioridade maxima
```

---

## RapidAPI

As chaves devem ficar em variaveis de ambiente.

Exemplo:

```env
RAPIDAPI_KEY=
RAPIDAPI_HOST=
RAPIDAPI_PROVIDER_NAME=
RAPIDAPI_DAILY_LIMIT=100
```

No futuro, o projeto podera suportar multiplas chaves/provedores autorizados:

```env
RAPIDAPI_KEYS=key_1,key_2,key_3
```

Regras obrigatorias:

- Registrar quantidade de requisicoes por chave
- Evitar consultar o mesmo lugar varias vezes
- Usar cache por `place_id`, telefone, dominio e nome da empresa
- Pausar automaticamente quando atingir o limite
- Registrar erro, status e provider usado

---

## Estrutura Planejada

```text
prospect-ai
├── src
│   ├── cli
│   ├── collectors
│   │   ├── rapidapi-google-maps
│   │   └── public-directory
│   ├── enrichers
│   │   ├── website-auditor
│   │   └── contact-extractor
│   ├── scoring
│   ├── messages
│   ├── exporters
│   └── database
├── data
│   ├── inputs
│   └── outputs
├── docs
└── README.md
```

---

## Comandos Planejados

Buscar empresas:

```bash
npm run collect -- --niche "imobiliarias" --city "Cuiaba" --limit 100
```

Analisar leads:

```bash
npm run analyze -- --input data/outputs/leads.csv
```

Exportar resultado:

```bash
npm run export -- --format csv
```

---

## Abordagem Comercial

Mensagem inicial:

```text
Ola, tudo bem?

Estava analisando algumas empresas em [cidade] e vi a [empresa].

Encontrei alguns pontos simples que podem estar fazendo voces perderem oportunidades no digital, principalmente em Google, site e WhatsApp.

Posso te enviar um diagnostico rapido, sem compromisso, mostrando o que encontrei?
```

Apos resposta positiva:

```text
Perfeito.

Fiz uma analise rapida e encontrei estes pontos:

1. [problema 1]
2. [problema 2]
3. [problema 3]

Isso normalmente impacta diretamente a quantidade de pessoas que chamam no WhatsApp ou solicitam orcamento.

Se fizer sentido, posso te mostrar em uma chamada rapida de 15 minutos como corrigir isso.
```

---

## Roadmap

### V1 - Producao rapida

- Coleta via RapidAPI
- Entrada manual CSV
- Auditoria tecnica do site
- Lead Score
- Mensagem de WhatsApp
- Exportacao CSV/JSON

### V2 - Banco e historico

- PostgreSQL
- Deduplicacao avancada
- Historico de coletas
- Controle de status do lead
- Controle de cotas por provider

### V3 - CRM interno

- Pipeline comercial
- Status por lead
- Follow-up
- Registro de resposta
- Proxima acao

### V4 - Dashboard

- Interface web
- Filtros por nicho, cidade, score e status
- Kanban de prospeccao
- Metricas de abordagem

### V5 - IA avancada

- Diagnostico personalizado
- Geracao de PDF
- Roteiro de Loom
- E-mail personalizado
- Priorizacao inteligente

---

## Status

Projeto em fase inicial.

Objetivo imediato: gerar os primeiros leads qualificados e iniciar prospeccao ainda hoje.
