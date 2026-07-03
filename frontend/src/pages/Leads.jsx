import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leads } from '../services/api';
import toast from 'react-hot-toast';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Play,
  Eye,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';

const EMPTY_NEW_LEAD = {
  nome_empresa: '',
  site: '',
  telefone: '',
  cidade: '',
  nicho: '',
  categoria: '',
  observacoes: '',
};

export default function Leads() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    prioridade: '',
    status: '',
    cidade: ''
  });
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [newLead, setNewLead] = useState(EMPTY_NEW_LEAD);
  const [savingNewLead, setSavingNewLead] = useState(false);

  useEffect(() => {
    loadLeads();
  }, [page, search, filters]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const response = await leads.list({
        page,
        limit: 20,
        search,
        ...filters
      });
      setData(response.data.leads);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Selecione pelo menos um lead');
      return;
    }

    setAnalyzing(true);
    try {
      await leads.analyze(selectedLeads);
      toast.success(`${selectedLeads.length} leads analisados com sucesso!`);
      setSelectedLeads([]);
      loadLeads();
    } catch (error) {
      toast.error('Erro ao analisar leads');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await leads.export(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvContent = event.target.result;
        const response = await leads.importCSV(csvContent);
        toast.success(`${response.data.summary.imported} leads importados!`);
        if (response.data.summary.duplicates > 0) {
          toast(`${response.data.summary.duplicates} duplicados ignorados`, { icon: 'ℹ️' });
        }
        loadLeads();
      } catch (error) {
        toast.error('Erro ao importar CSV');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.nome_empresa.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return;
    }

    setSavingNewLead(true);
    try {
      await leads.import(newLead);
      toast.success('Lead criado com sucesso!');
      setNewLead(EMPTY_NEW_LEAD);
      setShowNewLeadForm(false);
      loadLeads();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao criar lead');
    } finally {
      setSavingNewLead(false);
    }
  };

  const toggleSelectLead = (id) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const getPriorityBadge = (prioridade) => {
    const styles = {
      'Prioridade maxima': 'badge-danger',
      'Alta': 'badge-warning',
      'Media': 'badge-info',
      'Baixa': 'badge-success'
    };
    return styles[prioridade] || 'badge-info';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600">Gerencie seus leads de prospecção</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewLeadForm((v) => !v)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Lead
          </button>
          <label className="btn btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" />
            Importar CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />
          </label>
          <button onClick={handleExport} className="btn btn-secondary flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exportar
          </button>
          <button
            onClick={handleAnalyze}
            disabled={selectedLeads.length === 0 || analyzing}
            className="btn btn-primary flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            {analyzing ? 'Analisando...' : `Analisar (${selectedLeads.length})`}
          </button>
        </div>
      </div>

      {/* Formulário de novo lead */}
      {showNewLeadForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Adicionar Lead Manualmente</h2>
          <form onSubmit={handleCreateLead} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da empresa *</label>
              <input
                type="text"
                value={newLead.nome_empresa}
                onChange={(e) => setNewLead({ ...newLead, nome_empresa: e.target.value })}
                className="input"
                placeholder="Ex: Imobiliária Alpha"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                type="text"
                value={newLead.telefone}
                onChange={(e) => setNewLead({ ...newLead, telefone: e.target.value })}
                className="input"
                placeholder="Ex: +5565999999999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <input
                type="text"
                value={newLead.site}
                onChange={(e) => setNewLead({ ...newLead, site: e.target.value })}
                className="input"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                value={newLead.cidade}
                onChange={(e) => setNewLead({ ...newLead, cidade: e.target.value })}
                className="input"
                placeholder="Ex: Cuiabá"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nicho</label>
              <input
                type="text"
                value={newLead.nicho}
                onChange={(e) => setNewLead({ ...newLead, nicho: e.target.value })}
                className="input"
                placeholder="Ex: imobiliarias"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <input
                type="text"
                value={newLead.categoria}
                onChange={(e) => setNewLead({ ...newLead, categoria: e.target.value })}
                className="input"
                placeholder="Ex: Imobiliária"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={newLead.observacoes}
                onChange={(e) => setNewLead({ ...newLead, observacoes: e.target.value })}
                className="input"
                rows="2"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" disabled={savingNewLead} className="btn btn-primary">
                {savingNewLead ? 'Salvando...' : 'Criar Lead'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewLeadForm(false); setNewLead(EMPTY_NEW_LEAD); }}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, site, telefone..."
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
            <select
              value={filters.prioridade}
              onChange={(e) => setFilters({ ...filters, prioridade: e.target.value })}
              className="input"
            >
              <option value="">Todas</option>
              <option value="Prioridade maxima">Prioridade Máxima</option>
              <option value="Alta">Alta</option>
              <option value="Media">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">Todos</option>
              <option value="novo">Novo</option>
              <option value="analisado">Analisado</option>
              <option value="mensagem_pronta">Mensagem pronta</option>
              <option value="contato_enviado">Contato enviado</option>
              <option value="respondeu">Respondeu</option>
              <option value="reuniao_marcada">Reunião marcada</option>
              <option value="proposta_enviada">Proposta enviada</option>
              <option value="cliente_fechado">Cliente fechado</option>
              <option value="sem_interesse">Sem interesse</option>
              <option value="nao_respondeu">Não respondeu</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input
              type="text"
              value={filters.cidade}
              onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
              placeholder="Filtrar por cidade"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLeads(data.map(l => l.id));
                      } else {
                        setSelectedLeads([]);
                      }
                    }}
                    checked={selectedLeads.length === data.length && data.length > 0}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nicho</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                data.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{lead.nome_empresa}</div>
                      <div className="text-xs text-gray-500">{lead.site}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{lead.cidade}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{lead.nicho}</td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-bold text-gray-900">{lead.score || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.prioridade && (
                        <span className={`badge ${getPriorityBadge(lead.prioridade)}`}>
                          {lead.prioridade}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-info capitalize">{lead.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary flex items-center gap-1"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
