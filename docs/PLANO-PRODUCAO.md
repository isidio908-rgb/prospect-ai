# Plano de Produção - Prospect AI

## 🎯 Objetivo
Transformar o Prospect AI em uma aplicação web completa, rodando em Docker local, pronta para prospecção profissional.

---

## 📋 Fase 1: Back-end (Node.js) - Status: ✅ 90% Completo

### O que já funciona:
- ✅ CLI funcional com comandos: collect, analyze, discover
- ✅ Análise de sites (Pixel, GTM, GA4, WhatsApp, Formulários)
- ✅ Lead Score (0-100) com classificação de prioridade
- ✅ Geração de diagnóstico personalizado
- ✅ Mensagem de WhatsApp para abordagem
- ✅ Exportação CSV/JSON
- ✅ Integração RapidAPI (Google Maps/Places)
- ✅ Descoberta de leads em páginas públicas
- ✅ Extração de emails e telefones

### O que precisa adicionar/melhorar:
- [ ] API REST (Express.js) para o front-end se conectar
- [ ] PostgreSQL para persistir dados (leads, histórico, status)
- [ ] Sistema de autenticação simples (JWT)
- [ ] Endpoints REST:
  - `POST /api/leads/collect` - Coletar leads via RapidAPI
  - `POST /api/leads/discover` - Descobrir leads de URL/HTML
  - `POST /api/leads/analyze` - Analisar leads do CSV/DB
  - `GET /api/leads` - Listar todos os leads (com filtros)
  - `GET /api/leads/:id` - Detalhes de um lead
  - `PATCH /api/leads/:id` - Atualizar status/observações
  - `DELETE /api/leads/:id` - Deletar lead
  - `GET /api/stats` - Estatísticas gerais
- [ ] Sistema de cache para evitar re-análise
- [ ] Controle de cota RapidAPI
- [ ] Validações e tratamento de erros
- [ ] Testes automatizados básicos

---

## 📋 Fase 2: Front-end (React) - Status: ❌ A Fazer

### Tecnologias sugeridas:
- **Framework:** React 18 + Vite
- **UI Components:** Tailwind CSS + shadcn/ui (ou Material-UI)
- **Gerenciamento de Estado:** Zustand ou Context API
- **Requisições HTTP:** Axios
- **Tabelas:** TanStack Table (React Table v8)
- **Gráficos:** Recharts ou Chart.js
- **Formulários:** React Hook Form + Zod

### Páginas principais:
1. **Dashboard (/)** 
   - Resumo: total de leads, por prioridade, por status
   - Gráficos: distribuição por nicho, cidade, score
   - Últimas atividades

2. **Leads (/leads)**
   - Tabela com todos os leads
   - Filtros: cidade, nicho, prioridade, status, score
   - Busca: por nome, site, telefone
   - Ações: visualizar, editar, deletar, marcar como contatado
   - Paginação

3. **Coletar Leads (/collect)**
   - Form: query, cidade, nicho, limite
   - Escolher método: RapidAPI, Discover URL, Upload CSV
   - Progresso da coleta
   - Preview dos leads coletados

4. **Analisar (/analyze)**
   - Selecionar leads para análise
   - Progresso da análise
   - Resultados em tempo real

5. **Detalhes do Lead (/leads/:id)**
   - Todas as informações
   - Diagnóstico completo
   - Mensagem de WhatsApp
   - Botão para copiar mensagem
   - Botão para abrir WhatsApp Web
   - Histórico de interações (futuro)
   - Editar status e observações

6. **Configurações (/settings)**
   - 🔑 **RapidAPI Credentials** (salva no banco por usuário)
     - RapidAPI Key
     - RapidAPI Host
     - Provider Name
     - Search URL Template
     - Daily Limit
   - Preferências de análise
   - Backup/Export de dados
   - Gerenciar conta

### Features adicionais:
- [ ] Kanban board (arrastar leads entre status)
- [ ] Exportação para CSV/Google Sheets
- [ ] Notificações (quando análise terminar)
- [ ] Dark mode
- [ ] Responsivo (mobile-friendly)

---

## 📋 Fase 3: Docker - Status: ❌ A Fazer

### Estrutura Docker:
```
docker-compose.yml
├── app (Node.js Backend + API)
├── postgres (Banco de dados)
├── frontend (React Web App)
└── nginx (Reverse proxy opcional)
```

### Arquivos necessários:
1. **Dockerfile.backend** - Node.js + API
2. **Dockerfile.frontend** - React build otimizado
3. **docker-compose.yml** - Orquestração completa
4. **.dockerignore** - Otimizar build
5. **nginx.conf** - Configuração reverse proxy (opcional)

### Volumes Docker:
- `./data` - Persistir dados coletados
- `postgres-data` - Persistir banco de dados
- `.env` - Apenas variáveis do sistema (DB, JWT, PORT)

### ⚠️ IMPORTANTE: Configurações de API por Usuário
**As credenciais RapidAPI NÃO ficam no .env!**
- Cada usuário configura suas próprias chaves via Front-end
- Credenciais são salvas no banco (criptografadas)
- Cada usuário tem suas próprias cotas e limites
- Permite multi-usuário com contas diferentes

### Comandos esperados:
```bash
# Subir tudo
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar tudo
docker-compose down

# Rebuild
docker-compose up -d --build
```

---

## 🚀 Ordem de Execução

### Semana 1: Back-end
1. Criar API REST (Express.js)
2. Configurar PostgreSQL
3. Migrar lógica do CLI para endpoints
4. Testar todos os endpoints

### Semana 2: Front-end
1. Setup projeto React + Vite
2. Criar layout base (sidebar, header)
3. Implementar Dashboard
4. Implementar página de Leads (tabela + filtros)
5. Implementar Coletar/Analisar
6. Implementar Detalhes do Lead

### Semana 3: Docker + Integração
1. Criar Dockerfiles
2. Configurar docker-compose.yml
3. Testar integração completa
4. Documentar uso
5. Deploy local

---

## 📦 Estrutura de Pastas Final

```
prospect-ai/
├── backend/
│   ├── src/
│   │   ├── api/          # Express routes
│   │   ├── services/     # Business logic
│   │   ├── models/       # DB models
│   │   ├── collectors/   # Já existe
│   │   ├── auditor.mjs   # Já existe
│   │   ├── scoring.mjs   # Já existe
│   │   └── server.mjs    # Entry point
│   ├── migrations/       # DB migrations
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/     # API calls
│   │   ├── hooks/
│   │   ├── store/
│   │   └── App.jsx
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── data/                 # Mantém arquivos CSV/JSON
├── docs/                 # Documentação
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ✅ Checklist de Funcionalidades

### Back-end API
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] GET /api/auth/me
- [ ] POST /api/leads/collect
- [ ] POST /api/leads/discover
- [ ] POST /api/leads/analyze
- [ ] GET /api/leads (com filtros e paginação)
- [ ] GET /api/leads/:id
- [ ] PATCH /api/leads/:id
- [ ] DELETE /api/leads/:id
- [ ] GET /api/stats
- [ ] 🔑 GET /api/settings - Buscar configurações do usuário
- [ ] 🔑 PUT /api/settings - Salvar/atualizar credenciais RapidAPI
- [ ] 🔑 GET /api/settings/quota - Ver uso da cota RapidAPI

### Front-end
- [ ] Login page
- [ ] Dashboard com stats
- [ ] Tabela de leads com filtros
- [ ] Formulário de coleta
- [ ] Página de análise
- [ ] Detalhes do lead
- [ ] Exportar CSV
- [ ] Configurações

### Docker
- [ ] Dockerfile backend
- [ ] Dockerfile frontend
- [ ] docker-compose.yml
- [ ] Persistência de dados
- [ ] Variáveis de ambiente
- [ ] README com instruções

---

## 🎨 Design System

### Cores sugeridas:
- **Primary:** #3B82F6 (Azul)
- **Success:** #10B981 (Verde)
- **Warning:** #F59E0B (Laranja)
- **Danger:** #EF4444 (Vermelho)
- **Background:** #F9FAFB (Cinza claro)
- **Dark:** #1F2937 (Cinza escuro)

### Prioridades (visual):
- **Máxima:** Badge vermelho
- **Alta:** Badge laranja
- **Média:** Badge amarelo
- **Baixa:** Badge cinza

---

## 📝 Próximo Passo

Qual fase você quer começar agora?

1. **Completar Back-end** - Criar API REST + PostgreSQL
2. **Iniciar Front-end** - Setup React + primeiras telas
3. **Docker** - Dockerizar o que já existe

**Aguardando sua decisão para começar! 🚀**
