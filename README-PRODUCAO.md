# Prospect AI - Sistema de Prospecção Inteligente

Sistema completo para coletar, auditar e priorizar leads de prospecção para gestores de tráfego.

## 🏗️ Arquitetura

```
prospect-ai/
├── backend/          # API REST (Node.js + Express + PostgreSQL)
├── frontend/         # Dashboard Web (React) - Em desenvolvimento
├── data/             # Dados coletados (CSV/JSON)
├── docs/             # Documentação
└── docker-compose.yml # Orquestração Docker
```

## 🚀 Como Rodar (Docker)

### Pré-requisitos
- Docker
- Docker Compose

### 1. Clone o repositório
```bash
git clone https://github.com/isidio908-rgb/prospect-ai.git
cd prospect-ai
```

### 2. Configure as variáveis de ambiente
```bash
# Crie um arquivo .env na raiz
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env
```

### 3. Suba os containers
```bash
docker-compose up -d
```

### 4. Verifique se está rodando
```bash
# Ver logs
docker-compose logs -f

# Testar API
curl http://localhost:3001/health
```

### 5. Acesse
- **API Backend:** http://localhost:3001
- **Frontend:** http://localhost:5173 (quando estiver pronto)
- **PostgreSQL:** localhost:5432

## 🗄️ Banco de Dados

O PostgreSQL é inicializado automaticamente com todas as tabelas necessárias:
- `users` - Usuários do sistema
- `user_settings` - Configurações por usuário
- `rapidapi_usage` - Controle de cota
- `leads` - Leads coletados

### Acessar PostgreSQL diretamente:
```bash
docker exec -it prospect-ai-db psql -U prospect_user -d prospect_ai
```

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Usuário logado

### Configurações (Autenticado)
- `GET /api/settings` - Buscar configurações
- `PUT /api/settings` - Salvar credenciais RapidAPI
- `GET /api/settings/quota` - Ver uso da cota

### Leads (Autenticado)
- `GET /api/leads` - Listar leads
- `GET /api/leads/:id` - Detalhes
- `PATCH /api/leads/:id` - Atualizar
- `DELETE /api/leads/:id` - Deletar
- `POST /api/leads/collect` - Coletar (em dev)
- `POST /api/leads/analyze` - Analisar (em dev)

### Estatísticas (Autenticado)
- `GET /api/stats` - Dashboard stats

## 🔑 Configuração de Credenciais

**IMPORTANTE:** As credenciais RapidAPI são configuradas por usuário via front-end, não no `.env`!

Cada usuário pode ter suas próprias chaves e limites.

## 🛠️ Desenvolvimento Local (Sem Docker)

### Backend

1. Instalar PostgreSQL localmente
2. Criar banco:
```bash
createdb prospect_ai
```

3. Configurar `.env`:
```bash
cd backend
cp .env.example .env
# Editar .env com suas configurações
```

4. Instalar dependências e rodar:
```bash
npm install
npm run dev
```

## 🧪 Testes

```bash
cd backend
npm test
```

## 📦 Build para Produção

```bash
# Build das imagens
docker-compose build

# Rodar em produção
docker-compose up -d
```

## 🔄 Comandos Úteis

```bash
# Parar tudo
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados!)
docker-compose down -v

# Ver logs do backend
docker-compose logs -f backend

# Ver logs do banco
docker-compose logs -f postgres

# Rebuild após mudanças
docker-compose up -d --build

# Acessar shell do container
docker exec -it prospect-ai-backend sh
```

## 📊 Status do Projeto

### ✅ Concluído
- [x] CLI funcional
- [x] Análise de sites
- [x] Lead Score
- [x] API REST completa
- [x] Autenticação JWT
- [x] PostgreSQL configurado
- [x] Sistema de configurações por usuário
- [x] Docker/Docker Compose

### 🚧 Em Desenvolvimento
- [ ] Front-end React
- [ ] Integração completa Collect/Analyze
- [ ] Testes automatizados

### 📅 Próximos Passos
- [ ] Dashboard React
- [ ] Kanban de leads
- [ ] Exportação CSV/Sheets
- [ ] IA para diagnósticos avançados

## 🤝 Contribuindo

Este é um projeto interno, mas sugestões são bem-vindas!

## 📝 Licença

UNLICENSED - Uso próprio

## 🆘 Problemas Comuns

### Porta já em uso
Se a porta 3001 ou 5432 já estiver em uso:
```bash
# Editar docker-compose.yml e mudar as portas
ports:
  - "3002:3001"  # Mudar porta externa
```

### Erro de conexão com banco
```bash
# Verificar se o PostgreSQL está rodando
docker-compose ps

# Ver logs do banco
docker-compose logs postgres
```

### Reset completo
```bash
# Parar tudo e limpar
docker-compose down -v
docker-compose up -d --build
```

## 📞 Suporte

Abra uma issue no GitHub ou contate o desenvolvedor.

---

**Desenvolvido com ❤️ para otimizar prospecção de leads**
