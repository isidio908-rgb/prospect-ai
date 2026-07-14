import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leads } from '../services/api';
import toast from 'react-hot-toast';
import { 
  Search, 
  Download, 
  Upload, 
  Play,
  Eye,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2
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
    cidade: '',
    nicho: '',
    responsavel: '',
    whatsapp_instance_id: '',
    reply_status: ''
  });
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [newLead, setNewLead] = useState(EMPTY_NEW_LEAD);
  const [savingNewLead, setSavingNewLead] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState(null);
  const [deletingSelected, setDeletingSelected] = useState(false);

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

  const downloadBlob = (data, filename, type) => {
    const url = window.URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      const response = await leads.export(filters);
      downloadBlob(response.data, `leads-${new Date().toISOString()}.csv`, 'text/csv');
      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
    }
  };

  const handleExportJson = async () => {
    try {
      const response = await leads.exportJson(filters);
      downloadBlob(response.data, `leads-${new Date().toISOString()}.json`, 'application/json');
      toast.success('JSON exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar JSON');
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

  const handleDeleteLead = async (lead) => {
    const name = lead.nome_empresa || 'este lead';
    const confirmed = window.confirm(`Apagar "${name}"? Essa ação remove o lead e não pode ser desfeita.`);
    if (!confirmed) return;

    setDeletingLeadId(lead.id);
    try {
      await leads.delete(lead.id);
      toast.success('Lead apagado com sucesso');
      setSelectedLeads((prev) => prev.filter((id) => id !== lead.id));
      await loadLeads();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao apagar lead');
    } finally {
      setDeletingLeadId(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Selecione pelo menos um lead');
      return;
    }

    const confirmed = window.confirm(`Apagar ${selectedLeads.length} lead(s) selecionado(s)? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    setDeletingSelected(true);
    try {
      await Promise.all(selectedLeads.map((leadId) => leads.delete(leadId)));
      toast.success(`${selectedLeads.length} lead(s) apagado(s) com sucesso`);
      setSelectedLeads([]);
      await loadLeads();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao apagar leads selecionados');
    } finally {
      setDeletingSelected(false);
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Leads</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie seus leads de prospecção</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            Exportar CSV
          </button>
          <button onClick={handleExportJson} className="btn btn-secondary flex items-center gap-2">
            <Download className="w-5 h-5" />
            Exportar JSON
          </button>
          <button
            onClick={handleAnalyze}
            disabled={selectedLeads.length === 0 || analyzing || deletingSelected}
            className="btn btn-primary flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            {analyzing ? 'Analisando...' : `Analisar (${selectedLeads.length})`}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedLeads.length === 0 || deletingSelected || analyzing}
            className="btn btn-secondary flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-5 h-5" />
            {deletingSelected ? 'Apagando...' : `Apagar (${selectedLeads.length})`}
          </button>
        </div>
      </div>

      {/* Formulário de novo lead */}
      {showNewLeadForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Adicionar Lead Manualmente</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nicho</label>
            <input
              type="text"
              value={filters.nicho}
              onChange={(e) => setFilters({ ...filters, nicho: e.target.value })}
              placeholder="Filtrar por nicho"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
            <input
              type="text"
              value={filters.responsavel}
              onChange={(e) => setFilters({ ...filters, responsavel: e.target.value })}
              placeholder="BDR/SDR"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resposta</label>
            <select
              value={filters.reply_status}
              onChange={(e) => setFilters({ ...filters, reply_status: e.target.value })}
              className="input"
            >
              <option value="">Todas</option>
              <option value="has_reply">Com resposta</option>
              <option value="no_reply">Sem resposta</option>
              <option value="needs_human">Exige humano</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp ID</label>
            <input
              type="number"
              min="1"
              value={filters.whatsapp_instance_id}
              onChange={(e) => setFilters({ ...filters, whatsapp_instance_id: e.target.value })}
              placeholder="Número conectado"
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
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
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Carregando...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                data.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{lead.nome_empresa}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{lead.site}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">{lead.cidade}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200">{lead.nicho}</td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{lead.score || '-'}</span>
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
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="text-primary-600 hover:text-primary-700"
                          title="Ver detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead)}
                          disabled={deletingLeadId === lead.id || deletingSelected}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Apagar lead"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
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
