import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { credentials as credentialsApi } from '../services/api';

const EMPTY_FORM = {
  name: '',
  type: 'rapidapi',
  provider: 'Local Business Data',
  api_host: 'local-business-data.p.rapidapi.com',
  api_key: '',
  base_url: 'https://local-business-data.p.rapidapi.com',
  search_endpoint: '/search',
  daily_limit: 100,
  monthly_limit: 3000,
  notes: '',
};

const Credentials = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await credentialsApi.list();
      setCredentials(response.data.credentials || []);
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
        return;
      }
      setError('Erro ao carregar credenciais');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await credentialsApi.update(editingId, formData);
      } else {
        await credentialsApi.create(formData);
      }

      await loadCredentials();

      setShowForm(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar credencial');
    }
  };

  const handleTest = async (id) => {
    setTestingId(id);
    setError('');

    try {
      const response = await credentialsApi.test(id);
      const data = response.data;

      if (data.success) {
        alert('✅ Credencial válida!');
      } else {
        alert(`❌ Erro: ${data.message}`);
      }

      await loadCredentials();
    } catch (err) {
      alert(`❌ Erro ao testar: ${err.response?.data?.message || err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await credentialsApi.updateStatus(id, newStatus);
      await loadCredentials();
    } catch (err) {
      setError('Erro ao alterar status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta credencial?')) return;

    try {
      await credentialsApi.remove(id);
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
      notes: credential.notes || '',
    });
    setShowForm(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      limit_reached: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      error_auth: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
      error_provider: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: '🟢',
      inactive: '⚫',
      limit_reached: '🔴',
      error_auth: '🟠',
      error_provider: '🔴',
      paused: '🟡',
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
      paused: 'Pausada',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando credenciais...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">🔑 Credenciais</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gerencie suas chaves de API para coleta de leads
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 px-4 py-3 rounded-lg relative">
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
          className="btn btn-primary flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span>
          Nova Credencial
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            {editingId ? 'Editar Credencial' : 'Nova Credencial'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Ex: Local Business Data - Prod"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provedor
                </label>
                <input
                  type="text"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  className="input"
                  placeholder="Ex: Local Business Data"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Host *
                </label>
                <input
                  type="text"
                  value={formData.api_host}
                  onChange={(e) => setFormData({ ...formData, api_host: e.target.value })}
                  className="input"
                  placeholder="Ex: local-business-data.p.rapidapi.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Base URL *
                </label>
                <input
                  type="url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  className="input"
                  placeholder="https://..."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key * {editingId && <span className="text-xs text-gray-500 dark:text-gray-400">(deixe em branco para não alterar)</span>}
                </label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="input"
                  placeholder="Sua chave de API"
                  required={!editingId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Limite Diário *
                </label>
                <input
                  type="number"
                  value={formData.daily_limit}
                  onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                  className="input"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Limite Mensal *
                </label>
                <input
                  type="number"
                  value={formData.monthly_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_limit: parseInt(e.target.value) })}
                  className="input"
                  min="1"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows="2"
                  placeholder="Observações sobre esta credencial..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Atualizar' : 'Criar'} Credencial
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData(EMPTY_FORM);
                }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🔑</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Nenhuma credencial cadastrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Adicione sua primeira credencial para começar a coletar leads
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            + Adicionar Credencial
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {credentials.map((cred) => (
            <div key={cred.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {cred.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cred.status)}`}>
                      {getStatusIcon(cred.status)} {getStatusLabel(cred.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Provedor</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{cred.provider || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">API Key</p>
                      <p className="font-mono text-sm text-gray-900 dark:text-gray-100">{cred.api_key_masked}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Uso Hoje</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {cred.used_today} / {cred.daily_limit}
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          ({Math.round((cred.used_today / cred.daily_limit) * 100)}%)
                        </span>
                      </p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Uso Mensal</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {cred.used_month} / {cred.monthly_limit}
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          ({Math.round((cred.used_month / cred.monthly_limit) * 100)}%)
                        </span>
                      </p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Último Uso</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {cred.last_used_at
                          ? new Date(cred.last_used_at).toLocaleString('pt-BR')
                          : 'Nunca usado'}
                      </p>
                    </div>
                  </div>

                  {cred.notes && (
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 p-2 rounded">
                      📝 {cred.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleTest(cred.id)}
                  disabled={testingId === cred.id}
                  className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-4 py-2 rounded hover:bg-blue-200 dark:hover:bg-blue-900/60 transition disabled:opacity-50"
                >
                  {testingId === cred.id ? '⏳ Testando...' : '🧪 Testar'}
                </button>
                <button
                  onClick={() => handleEdit(cred)}
                  className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  ✏️ Editar
                </button>
                {cred.status === 'active' ? (
                  <button
                    onClick={() => handleStatusChange(cred.id, 'paused')}
                    className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 px-4 py-2 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition"
                  >
                    ⏸️ Pausar
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(cred.id, 'active')}
                    className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-4 py-2 rounded hover:bg-green-200 dark:hover:bg-green-900/60 transition"
                  >
                    ▶️ Ativar
                  </button>
                )}
                <button
                  onClick={() => handleDelete(cred.id)}
                  className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-4 py-2 rounded hover:bg-red-200 dark:hover:bg-red-900/60 transition ml-auto"
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
