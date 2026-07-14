# Release ALO-25 - Preparacao De Producao Prospect AI 2.0

Data: 2026-07-13

## Status

Preparacao local concluida. Promocao para producao nao executada.

Motivo: a ALO-25 exige aprovacao manual explicita para promover deployment validado. O projeto tambem esta sem uso de Vercel/deploy nesta etapa.

## Gates Tecnicos Locais

- Backend completo: 115 testes / 28 suites passando.
- Testes da raiz: 11 testes passando.
- Frontend lint: exit code 0, com warnings nao bloqueantes conhecidos.
- Frontend build: sucesso, com aviso de bundle principal acima de 500 kB.
- Evidencia de QA local: `docs/QA-ALO-23.md`.

## Itens Entregues Nesta Release

- Multi-tenant base por organizacao/workspace.
- Auditoria de operacoes criticas.
- Billing interno com planos, limites e bloqueios no servidor.
- Historico e exportacao de custos/uso LLM.
- Automacoes BDR/SDR com filas, limites, seguranca e falhas controladas.
- Otimizacao de nichos com base em resultado historico.
- Suporte a multiplos numeros de WhatsApp.
- Exclusao de leads.
- QA backend completo e build frontend validado localmente.

## Checklist Antes De Producao

- Definir provedor de hospedagem aprovado que nao seja Vercel.
- Configurar dominio, HTTPS e variaveis de ambiente fora do repositorio.
- Provisionar PostgreSQL e Redis gerenciados ou infraestrutura equivalente.
- Criar backup inicial do banco antes de migrations.
- Executar migrations em ambiente de staging.
- Rodar suite backend completa contra staging.
- Rodar build frontend contra variaveis de staging.
- Executar smoke test de autenticacao, leads, CRM, relatorios, billing, WhatsApp e Autopilot.
- Validar logs, alertas e monitoramento.
- Revisar juridicamente termos de uso, privacidade, LGPD e politica de dados.
- Obter aprovacao manual explicita para promover producao.

## Plano De Backup

Antes da promocao:

```powershell
pg_dump $env:DATABASE_URL --format=custom --file=backup-prospect-ai-pre-release.dump
```

Validar restore em banco temporario:

```powershell
createdb prospect_ai_restore_check
pg_restore --dbname=prospect_ai_restore_check backup-prospect-ai-pre-release.dump
```

Guardar o arquivo de backup em armazenamento seguro com acesso restrito.

## Plano De Rollback

1. Pausar workers, cron jobs e automacoes de envio.
2. Reverter a aplicacao para a imagem/commit anterior aprovado.
3. Se houver migration destrutiva, restaurar backup validado.
4. Rodar smoke test minimo:
   - login;
   - listagem de leads;
   - CRM/Kanban;
   - dashboard;
   - status WhatsApp;
   - health check da API.
5. Registrar incidente e decisao no Linear.

## Smoke Test De Producao

Executar somente apos aprovacao manual:

- `GET /health` retorna sucesso.
- Cadastro/login ou login de conta operacional funciona.
- `GET /api/leads` responde sem erro.
- Criacao de lead de teste funciona respeitando limite de plano.
- Atualizacao de status no Kanban registra historico.
- Dashboard carrega metricas.
- Perfil mostra billing/uso.
- Credenciais aparecem mascaradas.
- WhatsApp desconectado falha de forma controlada.
- Autopilot em modo seguro nao envia sem aprovacao.

## Itens Bloqueados

- Promocao de preview para producao.
- Smoke test em producao.
- Acompanhamento real de erros pos-release.
- Core Web Vitals e matriz browser completa.

## Atividades Futuras

- ALO-47: criar suite browser QA sem Vercel para desktop/mobile, acessibilidade e performance.
- Criar atividade de higiene tecnica para warnings do oxlint.
- Criar atividade de otimizacao de bundle/code splitting.
- Criar atividade juridica/compliance para termos, privacidade e LGPD com revisao profissional.
