# IA e LLM - Guia Operacional

Este guia descreve como operar os recursos de IA do Prospect AI.

## Objetivo

Usar LLMs para transformar dados de leads em ativos comerciais:

- diagnostico comercial;
- mensagem inicial de WhatsApp;
- follow-up;
- e-mail de prospeccao;
- roteiro de Loom;
- resumo e posicionamento;
- estrutura de proposta.

## Contexto Profissional

O Prospect AI ajusta os prompts internos usando os dados do usuario:

- profissao;
- nicho foco;
- instrucoes internas.

Para um gestor de trafego, a IA deve priorizar:

- rastreamento;
- geracao de leads;
- WhatsApp;
- qualidade da conversao;
- oportunidades de campanhas;
- clareza comercial sem inventar dados do lead.

## Configuracao De Credencial LLM

1. Acessar Credenciais.
2. Criar credencial de categoria IA/LLM.
3. Selecionar provider.
4. Informar modelo quando aplicavel.
5. Salvar chave com criptografia.
6. Testar credencial.

Providers previstos:

- OpenAI
- Anthropic
- Gemini
- Groq
- OpenRouter
- Cerebras
- Mistral

## Regras De Prompt

A IA deve:

- usar apenas dados existentes do lead;
- deixar claro quando alguma informacao estiver ausente;
- evitar promessas absolutas;
- escrever de forma comercial e objetiva;
- adaptar linguagem ao perfil profissional cadastrado;
- nao inventar faturamento, verba, resultados ou historico da empresa.

A IA nao deve:

- inventar dados de contato;
- afirmar que analisou algo que nao foi coletado;
- expor tokens, prompts internos sensiveis ou headers;
- gerar spam agressivo;
- usar linguagem que prometa resultado garantido.

## Validacao Manual

Checklist minimo:

- Credencial LLM salva e testada.
- `/api/ai/status` indica provider disponivel.
- Lead possui dados suficientes para teste.
- Tarefa de diagnostico retorna texto coerente.
- Mensagem WhatsApp gerada cita apenas fatos conhecidos.
- Resultado pode ser aplicado ao lead quando a tarefa permitir.

## Tarefas Recomendadas Por Etapa Do CRM

### Novo

- Diagnostico comercial.
- Mensagem inicial de WhatsApp.

### Mensagem Pronta

- Revisao da mensagem.
- Ajuste de tom por nicho.

### Contato Enviado

- Follow-up curto.
- Follow-up com oportunidade especifica.

### Respondeu

- Roteiro de conversa.
- Perguntas de qualificacao.

### Reuniao Marcada

- Roteiro de Loom.
- Estrutura de proposta.

## Erros Comuns

### Provider sem credencial ativa

Acao:

- conferir credencial ativa;
- testar provider;
- revisar modelo configurado.

### Resultado generico demais

Acao:

- melhorar `profession`, `primary_niche` e `internal_context` no perfil;
- enriquecer lead com site, nicho, cidade, rating, problemas e score;
- ajustar prompt da tarefa.

### IA inventando informacao

Acao:

- reforcar regra de nao inventar dados;
- revisar `buildSystemPrompt`;
- criar teste unitario para a tarefa.

## Regras De Seguranca

- Nunca logar API key LLM.
- Nunca enviar segredo no prompt.
- Nunca gravar headers de autenticacao em logs.
- Mascarar chaves no frontend.
- Guardar somente uso, status e erro tratado.

## Checklist Operacional

- [ ] Perfil profissional atualizado.
- [ ] Credencial LLM ativa.
- [ ] Modelo definido.
- [ ] Lead com dados suficientes.
- [ ] Diagnostico testado.
- [ ] Mensagem revisada antes de enviar.
- [ ] Nenhum segredo em logs/respostas.
