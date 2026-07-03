import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema } from '../src/api/routes/auth.mjs';
import { LEAD_STATUSES, updateLeadSchema } from '../src/api/validators/leads.mjs';
import { buildProfessionalContext, buildSystemPrompt, getTask } from '../src/services/llm/tasks.mjs';
import { LEAD_STATUSES as KANBAN_STATUSES, KANBAN_COLUMNS } from '../../frontend/src/data/leadStatuses.js';

describe('perfil profissional, prompts e CRM Kanban', () => {
  test('buildProfessionalContext inclui profissão, nicho e instruções internas sem permitir invenção de dados', () => {
    const prompt = buildProfessionalContext({
      profession: 'Consultor comercial',
      primary_niche: 'Clínicas odontológicas',
      internal_context: 'Priorizar auditoria de funil e captação local.'
    });

    assert.match(prompt, /Consultor comercial/);
    assert.match(prompt, /Clínicas odontológicas/);
    assert.match(prompt, /Priorizar auditoria/);
    assert.match(prompt, /não autorizam inventar dados do lead/i);
  });

  test('buildSystemPrompt mantém fallback para gestor de tráfego e permite outras profissões', () => {
    const task = getTask('diagnostico');
    const defaultPrompt = buildSystemPrompt(task, {});
    const customPrompt = buildSystemPrompt(task, {
      profession: 'Consultor de vendas B2B',
      primary_niche: 'Imobiliárias'
    });

    assert.match(defaultPrompt, /Gestor de Tráfego/);
    assert.match(defaultPrompt, /prospecção comercial/i);
    assert.match(customPrompt, /Consultor de vendas B2B/);
    assert.match(customPrompt, /Imobiliárias/);
    assert.match(customPrompt, /sem inventar dados/i);
  });

  test('schema de cadastro aceita os novos campos profissionais', () => {
    const parsed = registerSchema.parse({
      email: 'teste@prospect.ai',
      password: 'senha123',
      name: 'Usuário Teste',
      profession: 'Gestor de Tráfego',
      primary_niche: 'Estética',
      internal_context: 'Usar tom consultivo e direto.'
    });

    assert.equal(parsed.profession, 'Gestor de Tráfego');
    assert.equal(parsed.primary_niche, 'Estética');
    assert.equal(parsed.internal_context, 'Usar tom consultivo e direto.');
  });

  test('status do Kanban são compatíveis com o validator de leads', () => {
    assert.deepEqual(KANBAN_STATUSES, LEAD_STATUSES);
    assert.deepEqual(KANBAN_COLUMNS.map((column) => column.id), LEAD_STATUSES);

    for (const status of KANBAN_STATUSES) {
      assert.equal(updateLeadSchema.parse({ status }).status, status);
    }
  });
});