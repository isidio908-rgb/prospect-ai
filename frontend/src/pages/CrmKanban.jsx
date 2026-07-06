import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  CalendarClock,
  Check,
  DollarSign,
  GripVertical,
  MessageCircle,
  Pencil,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react';
import { leads as leadsApi } from '../services/api';
import { CLOSED_LEAD_STATUSES, KANBAN_COLUMNS, LEAD_STATUSES } from '../data/leadStatuses';

const PRIORITY_CLASSES = {
  'Prioridade maxima': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
  Alta: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
  Media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200',
  Baixa: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

const EMPTY_FILTERS = {
  status: '',
  prioridade: '',
  cidade: '',
  nicho: '',
  responsavel: '',
};

export default function CrmKanban() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draggingLeadId, setDraggingLeadId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [quickEdit, setQuickEdit] = useState({ responsavel: '', proxima_acao: '', valor_potencial: '' });

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

  const filterOptions = useMemo(() => {
    return {
      cidades: uniqueValues(leads.map((lead) => lead.cidade)),
      nichos: uniqueValues(leads.map((lead) => lead.nicho || lead.categoria)),
      responsaveis: uniqueValues(leads.map((lead) => lead.responsavel)),
      prioridades: uniqueValues(leads.map((lead) => lead.prioridade)),
    };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      const status = lead.status || 'novo';
      const matchesSearch = !term || [
        lead.nome_empresa,
        lead.cidade,
        lead.nicho,
        lead.categoria,
        lead.telefone,
        lead.site,
        lead.responsavel,
        lead.proxima_acao,
      ].some((value) => String(value || '').toLowerCase().includes(term));

      const matchesStatus = !filters.status || status === filters.status;
      const matchesPriority = !filters.prioridade || lead.prioridade === filters.prioridade;
      const matchesCity = !filters.cidade || lead.cidade === filters.cidade;
      const matchesNiche = !filters.nicho || (lead.nicho || lead.categoria) === filters.nicho;
      const matchesOwner = !filters.responsavel || lead.responsavel === filters.responsavel;

      return matchesSearch && matchesStatus && matchesPriority && matchesCity && matchesNiche && matchesOwner;
    });
  }, [leads, search, filters]);

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map((status) => {
      const columnLeads = filteredLeads.filter((lead) => (lead.status || 'novo') === status.id);
      const potential = columnLeads.reduce((sum, lead) => sum + Number(lead.valor_potencial || 0), 0);
      return { ...status, leads: columnLeads, potential };
    });
  }, [filteredLeads]);

  const totals = useMemo(() => ({
    total: filteredLeads.length,
    open: filteredLeads.filter((lead) => !CLOSED_LEAD_STATUSES.includes(lead.status)).length,
    answered: filteredLeads.filter((lead) => lead.status === 'respondeu').length,
    meetings: filteredLeads.filter((lead) => lead.status === 'reuniao_marcada').length,
    nextActions: filteredLeads.filter((lead) => String(lead.proxima_acao || '').trim()).length,
    won: filteredLeads.filter((lead) => lead.status === 'cliente_fechado').length,
    potential: filteredLeads.reduce((sum, lead) => sum + Number(lead.valor_potencial || 0), 0),
  }), [filteredLeads]);

  const replyQueue = useMemo(() => {
    return filteredLeads
      .filter((lead) => ['respondeu', 'contato_enviado'].includes(lead.status))
      .slice(0, 5);
  }, [filteredLeads]);

  const upcomingMeetings = useMemo(() => {
    return filteredLeads
      .filter((lead) => lead.status === 'reuniao_marcada' || String(lead.proxima_acao || '').toLowerCase().includes('reuni'))
      .slice(0, 5);
  }, [filteredLeads]);

  async function updateLead(leadId, patch, successMessage = 'Lead atualizado') {
    setUpdatingId(leadId);
    try {
      await leadsApi.update(leadId, patch);
      setLeads((current) => current.map((item) => item.id === leadId ? { ...item, ...patch } : item));
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar lead');
      return false;
    } finally {
      setUpdatingId(null);
    }
  }

  async function moveLead(lead, status) {
    if (!LEAD_STATUSES.includes(status) || (lead.status || 'novo') === status) return;
    await updateLead(lead.id, { status }, 'Lead movido no CRM');
  }

  function nextStatus(currentStatus) {
    const index = KANBAN_COLUMNS.findIndex((status) => status.id === (currentStatus || 'novo'));
    if (index < 0 || index >= KANBAN_COLUMNS.length - 1) return null;
    return KANBAN_COLUMNS[index + 1];
  }

  function startQuickEdit(lead) {
    setEditingLeadId(lead.id);
    setQuickEdit({
      responsavel: lead.responsavel || '',
      proxima_acao: lead.proxima_acao || '',
      valor_potencial: lead.valor_potencial ?? '',
    });
  }

  async function saveQuickEdit(lead) {
    const patch = {
      responsavel: quickEdit.responsavel.trim(),
      proxima_acao: quickEdit.proxima_acao.trim(),
    };

    const value = String(quickEdit.valor_potencial ?? '').trim();
    if (value) {
      const parsed = Number(value.replace(',', '.'));
      if (Number.isNaN(parsed) || parsed < 0) {
        toast.error('Valor potencial inválido');
        return;
      }
      patch.valor_potencial = parsed;
    } else {
      patch.valor_potencial = 0;
    }

    const saved = await updateLead(lead.id, patch, 'Dados comerciais atualizados');
    if (saved) {
      setEditingLeadId(null);
    }
  }

  function resetFilters() {
    setSearch('');
    setFilters(EMPTY_FILTERS);
  }

  function onDragStart(event, lead) {
    event.dataTransfer.setData('text/plain', String(lead.id));
    event.dataTransfer.effectAllowed = 'move';
    setDraggingLeadId(lead.id);
  }

  function onDrop(event, status) {
    event.preventDefault();
    const leadId = Number(event.dataTransfer.getData('text/plain'));
    const lead = leads.find((item) => item.id === leadId);
    setDraggingLeadId(null);
    setDragOverStatus(null);
    if (lead) moveLead(lead, status);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">CRM Kanban</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pipeline comercial dos leads, com respostas, próximas ações, reuniões e edição rápida no mesmo lugar.
          </p>
        </div>

        <button onClick={loadLeads} className="btn btn-secondary flex items-center justify-center gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        <Metric label="Leads no filtro" value={totals.total} />
        <Metric label="Em aberto" value={totals.open} />
        <Metric label="Responder" value={totals.answered} />
        <Metric label="Reuniões" value={totals.meetings} />
        <Metric label="Ações" value={totals.nextActions} />
        <Metric label="Fechados" value={totals.won} />
        <Metric label="Valor potencial" value={formatMoney(totals.potential)} />
      </div>

      <CrmFocusPanel replyQueue={replyQueue} upcomingMeetings={upcomingMeetings} />

      <div className="card space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-9"
              placeholder="Buscar lead, cidade, nicho, responsável..."
            />
          </div>

          <SelectFilter label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
            <option value="">Todos os status</option>
            {KANBAN_COLUMNS.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
          </SelectFilter>

          <SelectFilter label="Prioridade" value={filters.prioridade} onChange={(value) => setFilters((current) => ({ ...current, prioridade: value }))}>
            <option value="">Todas prioridades</option>
            {filterOptions.prioridades.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </SelectFilter>

          <SelectFilter label="Cidade" value={filters.cidade} onChange={(value) => setFilters((current) => ({ ...current, cidade: value }))}>
            <option value="">Todas cidades</option>
            {filterOptions.cidades.map((city) => <option key={city} value={city}>{city}</option>)}
          </SelectFilter>

          <SelectFilter label="Responsável" value={filters.responsavel} onChange={(value) => setFilters((current) => ({ ...current, responsavel: value }))}>
            <option value="">Todos responsáveis</option>
            {filterOptions.responsaveis.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
          </SelectFilter>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SelectFilter label="Nicho" value={filters.nicho} onChange={(value) => setFilters((current) => ({ ...current, nicho: value }))} className="sm:w-72">
            <option value="">Todos nichos</option>
            {filterOptions.nichos.map((niche) => <option key={niche} value={niche}>{niche}</option>)}
          </SelectFilter>

          <button type="button" onClick={resetFilters} className="btn btn-secondary">
            Limpar filtros
          </button>
        </div>
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
              onDragOver={(event) => { event.preventDefault(); setDragOverStatus(column.id); }}
              onDragLeave={() => setDragOverStatus((current) => current === column.id ? null : current)}
              onDrop={(event) => onDrop(event, column.id)}
              className={`w-80 flex-shrink-0 rounded-lg border bg-gray-50 transition-colors dark:bg-gray-900/60 ${
                dragOverStatus === column.id
                  ? 'border-primary-400 ring-2 ring-primary-200 dark:border-primary-500 dark:ring-primary-900/50'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">{column.label}</h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{column.description}</p>
                    {column.potential > 0 && (
                      <p className="mt-2 text-xs font-medium text-green-700 dark:text-green-300">
                        {formatMoney(column.potential)} em potencial
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                    {column.leads.length}
                  </span>
                </div>
              </div>

              <div className="min-h-32 space-y-3 p-3">
                {column.leads.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400 dark:border-gray-700">
                    Arraste leads para esta etapa
                  </div>
                ) : column.leads.map((lead) => {
                  const next = nextStatus(lead.status);
                  const isEditing = editingLeadId === lead.id;
                  return (
                    <article
                      key={lead.id}
                      draggable={!isEditing && updatingId !== lead.id}
                      onDragStart={(event) => onDragStart(event, lead)}
                      onDragEnd={() => { setDraggingLeadId(null); setDragOverStatus(null); }}
                      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-opacity dark:border-gray-700 dark:bg-gray-800 ${
                        draggingLeadId === lead.id ? 'opacity-50' : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-300" />
                            <Link
                              to={`/leads/${lead.id}`}
                              className="font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-300"
                            >
                              {lead.nome_empresa}
                            </Link>
                          </div>
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
                        {(lead.whatsapp || lead.tem_whatsapp_site) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-200">
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-4 space-y-2">
                          <input
                            value={quickEdit.responsavel}
                            onChange={(event) => setQuickEdit((current) => ({ ...current, responsavel: event.target.value }))}
                            className="input text-sm"
                            placeholder="Responsável"
                          />
                          <input
                            value={quickEdit.proxima_acao}
                            onChange={(event) => setQuickEdit((current) => ({ ...current, proxima_acao: event.target.value }))}
                            className="input text-sm"
                            placeholder="Próxima ação"
                          />
                          <input
                            value={quickEdit.valor_potencial}
                            onChange={(event) => setQuickEdit((current) => ({ ...current, valor_potencial: event.target.value }))}
                            className="input text-sm"
                            placeholder="Valor potencial"
                            inputMode="decimal"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={updatingId === lead.id}
                              onClick={() => saveQuickEdit(lead)}
                              className="btn btn-primary flex flex-1 items-center justify-center gap-1 py-2 text-xs"
                            >
                              <Check className="h-3 w-3" /> Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingLeadId(null)}
                              className="btn btn-secondary flex flex-1 items-center justify-center gap-1 py-2 text-xs"
                            >
                              <X className="h-3 w-3" /> Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                          {lead.telefone && <p>Tel: {lead.telefone}</p>}
                          {lead.responsavel && (
                            <p className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {lead.responsavel}
                            </p>
                          )}
                          {lead.proxima_acao && (
                            <p className="flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {lead.proxima_acao}
                            </p>
                          )}
                          {Number(lead.valor_potencial || 0) > 0 && (
                            <p className="flex items-center gap-1 text-green-700 dark:text-green-300">
                              <DollarSign className="h-3 w-3" />
                              {formatMoney(lead.valor_potencial)}
                            </p>
                          )}
                        </div>
                      )}

                      {!isEditing && (
                        <div className="mt-4 grid grid-cols-1 gap-2">
                          <button
                            type="button"
                            disabled={updatingId === lead.id}
                            onClick={() => startQuickEdit(lead)}
                            className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            <Pencil className="h-3 w-3" />
                            Edição rápida
                          </button>

                          {next && (
                            <button
                              type="button"
                              disabled={updatingId === lead.id}
                              onClick={() => moveLead(lead, next.id)}
                              className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              Mover para {next.label}
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
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

function CrmFocusPanel({ replyQueue, upcomingMeetings }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="card">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary-600 dark:text-primary-300" />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Responder agora</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Leads que responderam ou ainda estao em contato enviado.</p>
          </div>
        </div>
        <LeadFocusList leads={replyQueue} empty="Nenhuma resposta pendente no filtro." />
      </section>

      <section className="card">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary-600 dark:text-primary-300" />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Agenda interna</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Reunioes marcadas ou leads com proxima acao de reuniao.</p>
          </div>
        </div>
        <LeadFocusList leads={upcomingMeetings} empty="Nenhuma reuniao encontrada no filtro." />
      </section>
    </div>
  );
}

function LeadFocusList({ leads, empty }) {
  if (leads.length === 0) {
    return <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{empty}</p>;
  }

  return (
    <div className="mt-4 space-y-2">
      {leads.map((lead) => (
        <Link key={lead.id} to={`/leads/${lead.id}`} className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">{lead.nome_empresa}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{[lead.cidade, lead.nicho || lead.categoria].filter(Boolean).join(' • ') || 'Sem segmentacao'}</div>
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">{lead.status || 'novo'}</span>
          </div>
          {lead.proxima_acao ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{lead.proxima_acao}</p> : null}
        </Link>
      ))}
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

function SelectFilter({ label, value, onChange, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="input">
        {children}
      </select>
    </label>
  );
}

function uniqueValues(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}
