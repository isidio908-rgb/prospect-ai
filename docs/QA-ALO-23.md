# QA ALO-23 - E2E, Acessibilidade E Performance

Data: 2026-07-13

## Escopo Validado Localmente

- Fluxos críticos de API: autenticação, leads, CRM/Kanban, relatórios, credenciais, WhatsApp, Autopilot, BDR/SDR, multi-tenant, billing e relatório LLM.
- Regressão backend completa com banco PostgreSQL local via Docker.
- Testes unitários da raiz do projeto.
- Lint e build de produção do frontend.

## Evidências

### Backend

Comando:

```powershell
$url = docker exec prospect-ai-v2test-backend-1 printenv DATABASE_URL
$url = $url -replace '@postgres:', '@127.0.0.1:'
$env:DATABASE_URL=$url
npm test
```

Resultado:

- 115 testes executados.
- 28 suítes executadas.
- 115 passaram.
- 0 falharam.

Correção feita durante a validação:

- `backend/tests/autopilot-approval-command-route.test.mjs` não usa mais `ON CONFLICT (user_id)` em `whatsapp_instances`, porque o schema não possui constraint única nessa coluna. A inserção direta mantém o teste fiel ao schema atual.

### Testes Da Raiz

Comando:

```powershell
npm test
```

Resultado:

- 11 testes executados.
- 11 passaram.
- 0 falharam.

### Frontend Lint

Comando:

```powershell
npm run lint
```

Resultado:

- Exit code 0.
- Warnings existentes: variáveis/catch não usados e dependências de `useEffect`.
- Nenhum erro bloqueante.

### Frontend Build

Comando:

```powershell
npm run build
```

Resultado:

- Build Vite concluído com sucesso.
- Aviso existente: bundle principal acima de 500 kB após minificação.

## Limitações Não Executadas

- Matriz visual desktop/mobile, inspeção de console do navegador, acessibilidade por teclado em browser e Core Web Vitals não foram automatizados porque o projeto não possui Playwright, Cypress, axe ou Lighthouse configurados.
- Regressão após deploy não foi executada por decisão explícita do projeto de não usar Vercel/deploy nesta etapa.

## Próximas Melhorias Recomendadas

- Adicionar Playwright para fluxos reais de login, leads, CRM, relatórios, Perfil/Billing e Autopilot.
- Adicionar axe ou Lighthouse CI em ambiente aprovado que não dependa de Vercel.
- Quebrar bundle frontend com importação dinâmica para remover o aviso de chunk acima de 500 kB.
- Corrigir warnings do oxlint em uma atividade de higiene técnica separada.
