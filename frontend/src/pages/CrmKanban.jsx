import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, CalendarClock, MessageCircle, RefreshCw, Search } from 'lucide-react';
import { leads as leadsApi } from '../services/api';

const STATUSES = [
  { id: 'novo', label: 'Novo', description: 'Lead recém coletado ou importado' },
  { id: 'analisado', label: 'Analisado', description: 'Já passou por auditoria/score' },
  { id: 'mensagem_pronta', label: 'Mensagem pronta', description: 'Copy pronta para abordagem' },
  { id: 'contato_enviado', label: 'Contato enviado', description: 'Primeira abordagem feita' },
  { id: 'respondeu', label: 'Respondeu', description: 'Abriu conversa' },
  { id: 'reuniao_marcada', label: 'Reunião marcada', description: 'Chamada ou diagnóstico agendado' },
  { id: 'proposta_enviada', label: 'Proposta enviada', description: 'Oferta enviada' },
  { id: 'cliente_fechado', label: 'Cliente fechado', description: 'Venda concluída' },
  { id: 'sem_interesse', label: 'Sem interesse', description: 'Lead recusou' },
  { id: 'nao_respondeu', label: 'Não respondeu', description: 'Sem retorno após follow-up' },
];

const PRIORITY_CLASSES = {
  'Prioridade maxima': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
  Alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
  Media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200',
  Baixa: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

export default function CrmKanban() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    try {
      const response = await leadsApi.list({ limit: 200, sortBy: 'created_at', sortOrder: 'DESC' });
      setLeads(response.data.leads || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao carregar Kanban');
    } finally {
      setLoading(false);
    }
  }

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) => [
      lead.nome_empresa,
      lead.cidade,
      lead.nicho,
      lead.categoria,
      lead.telefone,
      lead.site,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [leads, search]);

  const columns = useMemo(() => {
    return STATUSES.map((status) => ({
      ...status,
      leads: filteredLeads.filter((lead) => (lead.status || 'novo') === status.id),
    }));
  }, [filteredLeads]);

  const totals = useMemo(() => ({
    total: filteredLeads.length,
    open: filteredLeads.filter((lead) => !['cliente_fechado', 'sem_interesse', 'nao_respondeu'].includes(lead.status)).length,
    won: filteredLeads.filter((lead) => lead.status === 'cliente_fechado').length,
    meetings: filteredLeads.filter((lead) => lead.status === 'reuniao_marcada').length,
  }), [filteredLeads]);

  async function moveLead(lead, status) {
    setUpdatingId(lead.id);
    try {
      await leadsApi.update(lead.id, { status });
      setLeads((current) => current.map((item) => item.id === lead.id ? { ...item, status } : item));
      toast.success('Lead movido no CRM');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao mover lead');
    } finally {
      setUpdatingId(null);
    }
  }

  function nextStatus(currentStatus) {
    const index = STATUSES.findIndex((status) => status.id === (currentStatus || 'novo'));
    if (index < 0 || index >= STATUSES.length - 1) return null;
    return STATUSES[index + 1];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CRM Kanban</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pipeline comercial dos leads, pensado para rotina de prospecção e follow-up.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9 w-full sm:w-72"
              placeholder="Buscar lead, cidade, nicho..."
            />
          </div>
          <button onClick={loadLeads} className="btn btn-secondary flex items-center justify-center gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Leads no filtro" value={totals.total} />
        <Metric label="Em aberto" value={totals.open} />
        <Metric label="Reuniões" value={totals.meetings} />
        <Metric label="Fechados" value={totals.won} />
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          Carregando pipeline...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <section
              key={column.id}
              className="w-80 flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/60"
            >
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{column.label}</h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{column.description}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                    {column.leads.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-3">
                {column.leads.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400 dark:border-gray-700">
                    Sem leads aqui
                  </div>
                ) : column.leads.map((lead) => {
                  const next = nextStatus(lead.status);
                  return (
                    <article key={lead.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/leads/${lead.id}`}
                            className="font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-300"
                          >
                            {lead.nome_empresa}
                          </Link>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {[lead.cidade, lead.nicho || lead.categoria].filter(Boolean).join(' • ') || 'Sem segmentação'}
                          </p>
                        </div>
                        {lead.score != null && (
                          <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                            {lead.score}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {lead.prioridade && (
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${PRIORITY_CLASSES[lead.prioridade] || PRIORITY_CLASSES.Baixa}`}>
                            {lead.prioridade}
                          </span>
                        )}
                        {lead.tem_whatsapp_site && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-200">
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </span>
                        )}
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {lead.telefone && <p>Tel: {lead.telefone}</p>}
                        {lead.proxima_acao && (
                          <p className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {lead.proxima_acao}
                          </p>
                        )}
                      </div>

                      {next && (
                        <button
                          type="button"
                          disabled={updatingId === lead.id}
                          onClick={() => moveLead(lead, next.id)}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Mover para {next.label}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
