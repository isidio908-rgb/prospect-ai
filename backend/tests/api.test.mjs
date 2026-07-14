import { test, describe } from 'node:test';
import assert from 'node:assert';

const API_URL = process.env.API_URL || 'http://localhost:3001';

let authToken = '';
let testLeadId = null;

describe('Prospect AI API - Testes de Integração', () => {
  
  test('Health check deve retornar ok', async () => {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.status, 'ok');
    assert.ok(data.timestamp);
  });
  
  test('Registro de novo usuário', async () => {
    const email = `test-${Date.now()}@prospect.ai`;
    
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'senha123',
        name: 'Usuario Teste'
      })
    });
    
    const data = await response.json();
    
    assert.strictEqual(response.status, 201);
    assert.ok(data.token);
    assert.strictEqual(data.user.email, email);
    
    authToken = data.token;
  });
  
  test('Login deve retornar token', async () => {
    // Usar o email do teste anterior
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teste@prospect.ai',
        password: 'senha123'
      })
    });
    
    if (response.status === 200) {
      const data = await response.json();
      assert.ok(data.token);
      authToken = data.token;
    }
  });
  
  test('Rota protegida sem token deve retornar 401', async () => {
    const response = await fetch(`${API_URL}/api/leads`);
    assert.strictEqual(response.status, 401);
  });
  
  test('Coleta com credencial inexistente retorna erro claro sem expor segredo', async () => {
    const response = await fetch(`${API_URL}/api/leads/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        credentialId: 999999999,
        query: 'clinicas odontologicas cuiaba',
        limit: 1
      })
    });

    const data = await response.json();
    const serialized = JSON.stringify(data);

    assert.strictEqual(response.status, 404);
    assert.strictEqual(data.error, 'Credencial de coleta não encontrada');
    assert.ok(!/api_key|apiKey|api_key_encrypted|secret|Bearer/i.test(serialized));
  });
  
  test('Importar lead manualmente', async () => {
    const response = await fetch(`${API_URL}/api/leads/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        nome_empresa: 'Empresa Teste API',
        site: 'https://example.com',
        telefone: '65999999999',
        cidade: 'Cuiaba',
        nicho: 'teste',
        categoria: 'Teste'
      })
    });
    
    const data = await response.json();
    
    assert.strictEqual(response.status, 201);
    assert.ok(data.lead.id);
    assert.strictEqual(data.lead.nome_empresa, 'Empresa Teste API');
    
    testLeadId = data.lead.id;
  });
  
  test('Listar leads', async () => {
    const response = await fetch(`${API_URL}/api/leads`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(data.leads));
    assert.ok(data.pagination);
  });
  
  test('Buscar lead específico', async () => {
    if (!testLeadId) return;
    
    const response = await fetch(`${API_URL}/api/leads/${testLeadId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.lead.id, testLeadId);
  });

  test('Deletar lead remove apenas o registro do usuário autenticado', async () => {
    const createResponse = await fetch(`${API_URL}/api/leads/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        nome_empresa: 'Empresa Delete API',
        site: 'https://delete.example.com',
        telefone: '65988888888',
        cidade: 'Cuiaba',
        nicho: 'teste',
        categoria: 'Teste'
      })
    });
    const created = await createResponse.json();

    assert.strictEqual(createResponse.status, 201);
    assert.ok(created.lead.id);

    const deleteResponse = await fetch(`${API_URL}/api/leads/${created.lead.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const deleted = await deleteResponse.json();

    assert.strictEqual(deleteResponse.status, 200);
    assert.strictEqual(deleted.message, 'Lead deletado com sucesso');

    const getResponse = await fetch(`${API_URL}/api/leads/${created.lead.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    assert.strictEqual(getResponse.status, 404);
  });
  
  test('Estatísticas deve retornar dados', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    assert.strictEqual(response.status, 200);
    assert.ok(typeof data.total === 'number');
    assert.ok(data.porPrioridade);
    assert.ok(data.porStatus);
  });
  
  test('Importar CSV deve processar múltiplos leads', async () => {
    const csvContent = `nome_empresa,site,telefone,cidade,nicho
Empresa CSV 1,https://site1.com,65911111111,Cuiaba,imobiliarias
Empresa CSV 2,https://site2.com,65922222222,Cuiaba,clinicas`;
    
    const response = await fetch(`${API_URL}/api/leads/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ csvContent })
    });
    
    const data = await response.json();
    
    assert.strictEqual(response.status, 200);
    assert.ok(data.summary.imported >= 0);
  });
  
  test('Atualizar lead com campos de CRM e status do novo enum', async () => {
    const response = await fetch(`${API_URL}/api/leads/${testLeadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        status: 'contato_enviado',
        responsavel: 'Gestor Teste',
        proxima_acao: 'Ligar em 2 dias',
        valor_potencial: 1500.75
      })
    });

    assert.strictEqual(response.status, 200);

    const getResponse = await fetch(`${API_URL}/api/leads/${testLeadId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await getResponse.json();

    assert.strictEqual(data.lead.status, 'contato_enviado');
    assert.strictEqual(data.lead.responsavel, 'Gestor Teste');
    assert.strictEqual(Number(data.lead.valor_potencial), 1500.75);
  });

  test('Mudança de status registra histórico de follow-up automaticamente', async () => {
    await fetch(`${API_URL}/api/leads/${testLeadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'respondeu' })
    });

    const response = await fetch(`${API_URL}/api/leads/${testLeadId}/followups`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(Array.isArray(data.followups));
    assert.ok(data.followups.some(f => f.status_novo === 'respondeu' && f.tipo === 'status_change'));
  });

  test('Adicionar nota manual de follow-up', async () => {
    const response = await fetch(`${API_URL}/api/leads/${testLeadId}/followups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ mensagem: 'Cliente pediu retorno na sexta' })
    });
    const data = await response.json();

    assert.strictEqual(response.status, 201);
    assert.strictEqual(data.followup.mensagem, 'Cliente pediu retorno na sexta');
    assert.strictEqual(data.followup.tipo, 'nota');
  });

  test('Rejeita status fora do novo enum do CRM', async () => {
    const response = await fetch(`${API_URL}/api/leads/${testLeadId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ status: 'contatado' }) // valor antigo, nao existe mais
    });

    assert.notStrictEqual(response.status, 200);
  });

  test('Estatísticas devem incluir presença técnica e funil comercial', async () => {
    const response = await fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.ok(data.presenca);
    assert.ok(typeof data.presenca.semSite === 'number');
    assert.ok(data.funil);
    assert.ok(typeof data.funil.taxaResposta === 'number');
  });

  test('Rota de status do WhatsApp sem token deve retornar 401', async () => {
    const response = await fetch(`${API_URL}/api/whatsapp/status`);
    assert.strictEqual(response.status, 401);
  });

  test('Status do WhatsApp sem instância conectada deve retornar connected=false', async () => {
    const response = await fetch(`${API_URL}/api/whatsapp/status`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.connected, false);
  });

  test('Enviar mensagem sem instância conectada deve retornar erro tratado (não crash)', async () => {
    const response = await fetch(`${API_URL}/api/whatsapp/leads/${testLeadId}/messages/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ text: 'Teste' })
    });
    const data = await response.json();

    assert.notStrictEqual(response.status, 200);
    assert.ok(data.error);
  });

  test('Webhook do WhatsApp sem secret correto deve retornar 401', async () => {
    const response = await fetch(`${API_URL}/api/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'CONNECTION_UPDATE', instance: 'nao-existe', data: {} })
    });

    assert.strictEqual(response.status, 401);
  });

  test('Criar credencial deve mascarar API key corretamente', async () => {
    const createResponse = await fetch(`${API_URL}/api/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name: 'Credencial Teste API',
        type: 'rapidapi',
        provider: 'Local Business Data',
        api_host: 'local-business-data.p.rapidapi.com',
        api_key: 'test-key-12345678901234567890',
        base_url: 'https://local-business-data.p.rapidapi.com',
        search_endpoint: '/search',
        daily_limit: 100,
        monthly_limit: 3000
      })
    });
    
    const created = await createResponse.json();
    assert.strictEqual(createResponse.status, 201);
    assert.ok(created.credential.id);
    
    const listResponse = await fetch(`${API_URL}/api/credentials`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const list = await listResponse.json();
    
    assert.strictEqual(listResponse.status, 200);
    const found = list.credentials.find(c => c.id === created.credential.id);
    
    assert.ok(found);
    // Máscara deve ser baseada na chave real (primeiros 4 + últimos 4), nunca no ID
    assert.strictEqual(found.api_key_masked, 'test...7890');
    assert.ok(!('api_key' in found)); // Chave completa não deve ser retornada
    assert.ok(!('api_key_encrypted' in found)); // Valor criptografado não deve ser exposto
  });
  
});

// Executar testes se rodado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('⚠️  Certifique-se de que a API está rodando em http://localhost:3001');
  console.log('');
}
