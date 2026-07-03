import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Credentials = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'rapidapi',
    provider: 'Local Business Data',
    api_host: 'local-business-data.p.rapidapi.com',
    api_key: '',
    base_url: 'https://local-business-data.p.rapidapi.com',
    search_endpoint: '/search',
    daily_limit: 100,
    monthly_limit: 3000,
    notes: ''
  });

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:3001/api/credentials', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      const data = await response.json();
      setCredentials(data.credentials || []);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar credenciais');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('token');
      const url = editingId 
        ? `http://localhost:3001/api/credentials/${editingId}`
        : 'http://localhost:3001/api/credentials';
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao salvar credencial');
      }

      // Recarregar lista
      await loadCredentials();
      
      // Limpar formulário
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        type: 'rapidapi',
        provider: 'Local Business Data',
        api_host: 'local-business-data.p.rapidapi.com',
        api_key: '',
        base_url: 'https://local-business-data.p.rapidapi.com',
        search_endpoint: '/search',
        daily_limit: 100,
        monthly_limit: 3000,
        notes: ''
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTest = async (id) => {
    setTestingId(id);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/credentials/${id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert('✅ Credencial válida!');
      } else {
        alert(`❌ Erro: ${data.message}`);
      }

      await loadCredentials();
    } catch (err) {
      alert(`❌ Erro ao testar: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/credentials/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      await loadCredentials();
    } catch (err) {
      setError('Erro ao alterar status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta credencial?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/credentials/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      await loadCredentials();
    } catch (err) {
      setError('Erro ao deletar credencial');
    }
  };

  const handleEdit = (credential) => {
    setEditingId(credential.id);
    setFormData({
      name: credential.name,
      type: credential.type,
      provider: credential.provider || '',
      api_host: credential.api_host || '',
      api_key: '',
      base_url: credential.base_url || '',
      search_endpoint: credential.search_endpoint || '/search',
      daily_limit: credential.daily_limit,
      monthly_limit: credential.monthly_limit,
      notes: credential.notes || ''
    });
    setShowForm(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      limit_reached: 'bg-red-100 text-red-800',
      error_auth: 'bg-orange-100 text-orange-800',
      error_provider: 'bg-red-100 text-red-800',
      paused: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: '🟢',
      inactive: '⚫',
      limit_reached: '🔴',
      error_auth: '🟠',
      error_provider: '🔴',
      paused: '🟡'
    };
    return icons[status] || '⚪';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Ativa',
      inactive: 'Inativa',
      limit_reached: 'Limite Atingido',
      error_auth: 'Erro de Autenticação',
      error_provider: 'Erro do Provedor',
      paused: 'Pausada'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando credenciais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🔑 Credenciais</h1>
        <p className="mt-2 text-gray-600">
          Gerencie suas chaves de API para coleta de leads
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError('')}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>
      )}

      {/* Add Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mb-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Nova Credencial
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Editar Credencial' : 'Nova Credencial'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Local Business Data - Prod"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provedor
                </label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Local Business Data"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Host *
                </label>
                <input
                  type="text"
                  value={formData.api_host}
                  onChange={(e) => setFormData({ ...formData, api_host: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: local-business-data.p.rapidapi.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base URL *
                </label>
                <input
                  type="url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key * {editingId && <span className="text-xs text-gray-500">(deixe em branco para não alterar)</span>}
                </label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sua chave de API"
                  required={!editingId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite Diário *
                </label>
                <input
                  type="number"
                  value={formData.daily_limit}
                  onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limite Mensal *
                </label>
                <input
                  type="number"
                  value={formData.monthly_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_limit: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Observações sobre esta credencial..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {editingId ? 'Atualizar' : 'Criar'} Credencial
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">🔑</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhuma credencial cadastrada
          </h3>
          <p className="text-gray-600 mb-6">
            Adicione sua primeira credencial para começar a coletar leads
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            + Adicionar Credencial
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {credentials.map((cred) => (
            <div key={cred.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {cred.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cred.status)}`}>
                      {getStatusIcon(cred.status)} {getStatusLabel(cred.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">Provedor</p>
                      <p className="font-medium">{cred.provider || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">API Key</p>
                      <p className="font-mono text-sm">{cred.api_key_masked}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Uso Hoje</p>
                      <p className="font-medium">
                        {cred.used_today} / {cred.daily_limit}
                        <span className="text-xs text-gray-500 ml-2">
                          ({Math.round((cred.used_today / cred.daily_limit) * 100)}%)
                        </span>
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            (cred.used_today / cred.daily_limit) >= 0.9 ? 'bg-red-500' :
                            (cred.used_today / cred.daily_limit) >= 0.7 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((cred.used_today / cred.daily_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Uso Mensal</p>
                      <p className="font-medium">
                        {cred.used_month} / {cred.monthly_limit}
                        <span className="text-xs text-gray-500 ml-2">
                          ({Math.round((cred.used_month / cred.monthly_limit) * 100)}%)
                        </span>
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            (cred.used_month / cred.monthly_limit) >= 0.9 ? 'bg-red-500' :
                            (cred.used_month / cred.monthly_limit) >= 0.7 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min((cred.used_month / cred.monthly_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Último Uso</p>
                      <p className="text-sm">
                        {cred.last_used_at 
                          ? new Date(cred.last_used_at).toLocaleString('pt-BR')
                          : 'Nunca usado'}
                      </p>
                    </div>
                  </div>

                  {cred.notes && (
                    <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      📝 {cred.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={() => handleTest(cred.id)}
                  disabled={testingId === cred.id}
                  className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 transition disabled:opacity-50"
                >
                  {testingId === cred.id ? '⏳ Testando...' : '🧪 Testar'}
                </button>
                <button
                  onClick={() => handleEdit(cred)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition"
                >
                  ✏️ Editar
                </button>
                {cred.status === 'active' ? (
                  <button
                    onClick={() => handleStatusChange(cred.id, 'paused')}
                    className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded hover:bg-yellow-200 transition"
                  >
                    ⏸️ Pausar
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(cred.id, 'active')}
                    className="bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 transition"
                  >
                    ▶️ Ativar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(cred.id)}
                  className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition ml-auto"
                >
                  🗑️ Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Credentials;
