-- Executado automaticamente pelo container postgres na primeira inicialização
-- (montado em /docker-entrypoint-initdb.d/). Cria o banco dedicado à Evolution
-- API, separado do banco principal do Prospect AI (prospect_ai).
SELECT 'CREATE DATABASE evolution_api OWNER prospect_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evolution_api')
\gexec
