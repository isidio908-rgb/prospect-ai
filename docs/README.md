# 📚 DOCUMENTAÇÃO - PROSPECT AI

**Última Atualização:** 02/07/2026  
**Versão:** 1.0 - Em Desenvolvimento

---

## 🎯 INÍCIO RÁPIDO

### Novo no Projeto?
1. 📖 Comece com → [RESUMO-EXECUTIVO.md](./RESUMO-EXECUTIVO.md)
2. 🗺️ Veja o contexto → [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
3. 📋 Entenda o roadmap → [ROADMAP.md](./ROADMAP.md)

### Quer Implementar?
1. 📊 Veja o status → [STATUS-IMPLEMENTACAO.md](./STATUS-IMPLEMENTACAO.md)
2. 🎯 Próximos passos → [PROXIMAS-ACOES.md](./PROXIMAS-ACOES.md)
3. 🔑 Credenciais → [MODULO-CREDENCIAIS-COMPLETO.md](./MODULO-CREDENCIAIS-COMPLETO.md)

### Quer Usar Hoje?
1. ⚡ Operação → [OPERACAO-HOJE.md](./OPERACAO-HOJE.md)
2. 🚀 Plano de produção → [PLANO-PRODUCAO.md](./PLANO-PRODUCAO.md)

---

## 📑 ÍNDICE COMPLETO

### 📊 Visão Geral
| Documento | Descrição | Status |
|-----------|-----------|--------|
| [RESUMO-EXECUTIVO.md](./RESUMO-EXECUTIVO.md) | Visão geral do projeto, arquitetura, decisões técnicas | ✅ Atualizado |
| [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) | Contexto e objetivos do projeto | ✅ Estável |
| [ROADMAP.md](./ROADMAP.md) | Roadmap de features (V1 a V5) | ✅ Estável |

### 🔧 Status de Implementação
| Documento | Descrição | Status |
|-----------|-----------|--------|
| [STATUS-IMPLEMENTACAO.md](./STATUS-IMPLEMENTACAO.md) | ⭐ Status detalhado: o que foi feito, o que falta | ✅ Atualizado |
| [PROXIMAS-ACOES.md](./PROXIMAS-ACOES.md) | ⭐ Guia passo-a-passo das próximas ações | ✅ Atualizado |
| [STATUS-BACKEND.md](./STATUS-BACKEND.md) | Status específico do backend | 🟡 Desatualizado |

### 🎯 Módulos Específicos
| Documento | Descrição | Status |
|-----------|-----------|--------|
| [MODULO-CREDENCIAIS-COMPLETO.md](./MODULO-CREDENCIAIS-COMPLETO.md) | ⭐ Sistema de credenciais (criptografia, rotação) | ✅ Completo |
| [BACKEND-COMPLETO.md](./BACKEND-COMPLETO.md) | Documentação completa do backend | 🟡 Parcial |
| [BACKEND-FINALIZADO.md](./BACKEND-FINALIZADO.md) | Checklist de finalização do backend | 🟡 Parcial |

### 🚀 Deploy e Operação
| Documento | Descrição | Status |
|-----------|-----------|--------|
| [OPERACAO-HOJE.md](./OPERACAO-HOJE.md) | Como operar o sistema hoje | ✅ Atualizado |
| [PLANO-PRODUCAO.md](./PLANO-PRODUCAO.md) | Plano para colocar em produção | ✅ Atualizado |

### 📦 Arquivados
| Documento | Descrição | Status |
|-----------|-----------|--------|
| [PROJETO-COMPLETO-FINAL.md](./PROJETO-COMPLETO-FINAL.md) | Versão anterior da documentação | 📦 Arquivado |

---

## 🗂️ ESTRUTURA DO PROJETO

```
prospect-ai/
├── backend/                    # API Node.js
│   ├── src/
│   │   ├── api/
│   │   │   ├── middleware/    # Auth, errorHandler
│   │   │   ├── routes/        # auth, leads, credentials, stats, settings
│   │   │   └── validators/    # Zod schemas
│   │   ├── database/          # PostgreSQL init e queries
│   │   ├── services/          # Lógica de negócio
│   │   │   ├── analyzer.mjs           # Análise de sites
│   │   │   ├── collector.mjs          # Coleta de leads (RapidAPI)
│   │   │   ├── encryption.mjs         # Criptografia AES-256-GCM
│   │   │   ├── csvImporter.mjs        # Importar CSV
│   │   │   └── localBusinessDataCollector.mjs
│   │   └── server.mjs         # Entry point
│   └── tests/                 # Testes automatizados
│
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── components/        # Layout, etc
│   │   ├── pages/             # Dashboard, Leads, Login, Settings
│   │   │   └── Credentials.jsx  # ⏳ A CRIAR
│   │   ├── services/          # API client
│   │   └── store/             # Zustand (authStore)
│   └── public/
│
├── data/                      # CSVs de entrada/saída
│   ├── inputs/
│   └── outputs/
│
└── docs/                      # 📚 Você está aqui!
    ├── README.md              # Este arquivo
    ├── RESUMO-EXECUTIVO.md
    ├── STATUS-IMPLEMENTACAO.md
    ├── PROXIMAS-ACOES.md
    └── ...
```

---

## 🎓 GUIAS POR PERFIL

### 👨‍💻 Desenvolvedor Backend
1. Leia → [BACKEND-COMPLETO.md](./BACKEND-COMPLETO.md)
2. Implemente → [PROXIMAS-ACOES.md](./PROXIMAS-ACOES.md) (Ações 1-3)
3. Teste → [MODULO-CREDENCIAIS-COMPLETO.md](./MODULO-CREDENCIAIS-COMPLETO.md)

### 👩‍🎨 Desenvolvedor Frontend
1. Leia → [RESUMO-EXECUTIVO.md](./RESUMO-EXECUTIVO.md)
2. Implemente → [PROXIMAS-ACOES.md](./PROXIMAS-ACOES.md) (Fase 4)
3. Veja referência → `backend/API-DOCUMENTATION.md`

### 🧪 QA / Tester
1. Leia → [OPERACAO-HOJE.md](./OPERACAO-HOJE.md)
2. Prepare → [PLANO-PRODUCAO.md](./PLANO-PRODUCAO.md) (Checklist)
3. Execute → `backend/tests/api.test.mjs`

### 📊 Product Manager / Stakeholder
1. Leia → [RESUMO-EXECUTIVO.md](./RESUMO-EXECUTIVO.md)
2. Veja status → [STATUS-IMPLEMENTACAO.md](./STATUS-IMPLEMENTACAO.md)
3. Planeje → [ROADMAP.md](./ROADMAP.md)

---

## 🔑 CONCEITOS CHAVE

### 🎯 Lead
Empresa prospectada com dados básicos (nome, site, telefone, cidade, nicho) e análise técnica (pixels, GTM, score).

### 🔐 Credencial
API Key criptografada com controle de limites (diário/mensal) e rotação automática entre múltiplas chaves.

### 🤖 Análise
Processo de visitar o site do lead e extrair informações técnicas (Meta Pixel, GTM, GA4, Google Ads, WhatsApp, formulários).

### ⭐ Score
Pontuação de 0-100 baseada em presença/ausência de tecnologias. Quanto menor o score, maior a oportunidade.

### 🔄 Rotação
Distribuição inteligente de requisições entre múltiplas credenciais para respeitar limites e maximizar throughput.

### 🧹 Deduplicação
Identificação e mesclagem de leads duplicados por domínio, telefone ou nome similar.

---

## 📊 STATUS ATUAL (02/07/2026)

### ✅ Completo (60%)
- Backend base
- Autenticação
- CRUD de Leads
- Análise de sites
- Módulo de Credenciais (backend)
- Criptografia

### ⏳ Em Desenvolvimento (30%)
- Integração collector + credentials
- Rotação de credenciais
- Scheduler de reset
- Frontend de credenciais

### 🔲 Planejado (10%)
- Deduplicação
- Testes E2E
- Deploy pipeline

---

## 🚀 COMO CONTRIBUIR

### 1. Configurar Ambiente
```bash
# Backend
cd backend
npm install
cp .env.example .env
# Editar .env com suas configurações
npm run dev

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

### 2. Pegar Tarefa
Veja → [PROXIMAS-ACOES.md](./PROXIMAS-ACOES.md)

### 3. Desenvolver
- Siga os padrões do código existente
- Adicione testes se possível
- Atualize documentação se necessário

### 4. Testar
```bash
# Backend
npm test

# Manual
# Ver PROXIMAS-ACOES.md seção "Testar Tudo"
```

---

## 📞 SUPORTE

### Dúvidas Técnicas?
1. Consulte esta documentação
2. Veja código de referência em `backend/src/api/routes/credentials.mjs`
3. Verifique testes em `backend/tests/`

### Bugs ou Issues?
1. Verifique [STATUS-IMPLEMENTACAO.md](./STATUS-IMPLEMENTACAO.md)
2. Veja se já não está em desenvolvimento
3. Reporte com contexto e passos para reproduzir

---

## 📈 MÉTRICAS

### Documentação
- **Arquivos:** 12
- **Palavras:** ~25.000
- **Última Atualização:** 02/07/2026

### Código
- **Linhas (Backend):** ~3.500
- **Linhas (Frontend):** ~2.000
- **Cobertura de Testes:** 15% (melhorar!)

### Progresso
- **Features Completas:** 12/20 (60%)
- **Bugs Conhecidos:** 0
- **Tempo até Produção:** ~6 horas

---

## 🎯 PRÓXIMOS MARCOS

- [x] **M1:** Backend básico (Semana 1)
- [x] **M2:** Análise de sites (Semana 2)
- [x] **M3:** Módulo de Credenciais (Semana 3) ← **VOCÊ ESTÁ AQUI**
- [ ] **M4:** Frontend de Credenciais (Próxima semana)
- [ ] **M5:** Deduplicação (Semana 5)
- [ ] **M6:** Deploy em Produção (Semana 6)

---

**Mantido por:** Equipe Prospect AI  
**Contato:** prospect-ai@example.com  
**Licença:** Proprietária

---

*Esta documentação é viva e deve ser atualizada conforme o projeto evolui.*
