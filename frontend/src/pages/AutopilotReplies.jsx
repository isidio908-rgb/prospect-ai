import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ban, CalendarClock, CheckCircle2, Copy, Inbox, RefreshCw, Search } from 'lucide-react';
import { autopilot } from '../services/api';

const INTENT_OPTIONS = [
  { value: '', label: 'Todas intencoes' },
  { value: 'interested', label: 'Interesse' },
  { value: 'pricing', label: 'Preco' },
  { value: 'meeting', label: 'Reuniao' },
  { value: 'question', label: 'Pergunta' },
  { value: 'not_interested', label: 'Sem interesse' },
  { value: 'neutral', label: 'Neutro' },
];

const ACTION_LABELS = {
  mark_responded: 'Marcar respondeu',
  mark_meeting: 'Reuniao',
  mark_not_interested: 'Sem interesse',
  create_followup: 'Criar acao',
  mark_pricing: 'Tratar preco',
};

const INTENT_BADGES = {
  interested: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200',
  pricing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  meeting: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  question: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
  not_interested: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function intentLabel(intent) {
  return INTENT_OPTIONS.find((item) => item.value === intent)?.label || intent || 'Nao classificada';
}

export default function AutopilotReplies() {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [filters, setFilters] = useState({ search: '', intent: '', status: '' });

  const counts = useMemo(() => ({
    total: replies.length,
    interested: replies.filter((reply) => ['interested', 'pricing', 'meeting', 'question'].includes(reply.classification?.intent)).length,
    meetings: replies.filter((reply) => reply.classification?.intent === 'meeting').length,
    notInterested: replies.filter((reply) => reply.classification?.intent === 'not_interested').length,
  }), [replies]);

  async function loadReplies(nextFilters = filters) {
    setLoading(true);
    try {
      const response = await autopilot.replyInbox({
        limit: 50,
        search: nextFilters.search || undefined,
        intent: nextFilters.intent || undefined,
        status: nextFilters.status || undefined,
      });
      setReplies(response.data.replies || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel carregar respostas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReplies({ search: '', intent: '', status: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyAction(reply, action) {
    setBusyAction(`${reply.lead_id}-${action}`);
    try {
      await autopilot.applyReplyAction(reply.lead_id, {
        action,
        note: reply.next_action || reply.classification?.nextAction || ACTION_LABELS[action],
      });
      toast.success('Acao aplicada ao lead');
      await loadReplies();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel aplicar acao');
    } finally {
      setBusyAction('');
    }
  }

  async function copySuggestedReply(reply) {
    try {
      await navigator.clipboard.writeText(reply.suggested_reply || '');
      toast.success('Resposta sugerida copiada');
    } catch {
      toast.error('Nao foi possivel copiar');
    }
  }

  function resetFilters() {
    const emptyFilters = { search: '', intent: '', status: '' };
    setFilters(emptyFilters);
    loadReplies(emptyFilters);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">Autopilot SDR</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Central de respostas</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Revise quem respondeu, copie uma resposta sugerida e registre a proxima acao comercial sem disparo automatico.
          </p>
        </div>
        <button
          onClick={() => loadReplies()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Respostas recentes" value={counts.total} tone="blue" />
        <SummaryCard label="Com potencial" value={counts.interested} tone="green" />
        <SummaryCard label="Pedem reuniao" value={counts.meetings} tone="purple" />
        <SummaryCard label="Sem interesse" value={counts.notInterested} tone="red" />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_140px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Buscar empresa, cidade ou nicho"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.intent}
            onChange={(event) => setFilters((current) => ({ ...current, intent: event.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {INTENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">Todos status</option>
            <option value="respondeu">Respondeu</option>
            <option value="contato_enviado">Contato enviado</option>
            <option value="reuniao_marcada">Reuniao marcada</option>
            <option value="sem_interesse">Sem interesse</option>
          </select>
          <div className="flex gap-2">
            <button onClick={() => loadReplies()} className="flex-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
              Filtrar
            </button>
            <button onClick={resetFilters} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100">
              Limpar
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <Inbox className="h-5 w-5 text-primary-600" />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Respostas recebidas</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Acoes aqui apenas atualizam CRM e historico; envio de mensagem continua manual/controlado.</p>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && <p className="px-4 py-8 text-sm text-gray-500">Carregando respostas...</p>}
          {!loading && replies.length === 0 && (
            <p className="px-4 py-8 text-sm text-gray-500">Nenhuma resposta encontrada para os filtros atuais.</p>
          )}
          {!loading && replies.map((reply) => (
            <ReplyCard
              key={`${reply.lead_id}-${reply.message_id}`}
              reply={reply}
              busyAction={busyAction}
              onApply={applyAction}
              onCopy={copySuggestedReply}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-200',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-200',
  };

  return (
    <div className={`rounded-lg p-4 ${colors[tone] || colors.blue}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm">{label}</p>
    </div>
  );
}

function ReplyCard({ reply, busyAction, onApply, onCopy }) {
  const intent = reply.classification?.intent || 'unknown';
  const confidence = Math.round((reply.classification?.confidence || 0) * 100);

  return (
    <article className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/leads/${reply.lead_id}`} className="font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-50 dark:hover:text-primary-300">
              {reply.nome_empresa}
            </Link>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${INTENT_BADGES[intent] || INTENT_BADGES.unknown}`}>
              {intentLabel(intent)} - {confidence}%
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {reply.cidade || '-'} - {reply.nicho || '-'} - score {reply.score ?? '-'} - status {reply.status || '-'} - {formatDate(reply.received_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={Copy} label="Copiar" onClick={() => onCopy(reply)} />
          <ActionButton icon={CheckCircle2} label="Respondeu" onClick={() => onApply(reply, 'mark_responded')} busy={busyAction === `${reply.lead_id}-mark_responded`} />
          <ActionButton icon={CalendarClock} label="Reuniao" onClick={() => onApply(reply, 'mark_meeting')} busy={busyAction === `${reply.lead_id}-mark_meeting`} />
          <ActionButton icon={Ban} label="Sem interesse" onClick={() => onApply(reply, 'mark_not_interested')} busy={busyAction === `${reply.lead_id}-mark_not_interested`} danger />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Mensagem recebida</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">{reply.text_content}</p>
        </div>
        <div className="rounded-lg bg-primary-50 p-3 dark:bg-primary-900/20">
          <p className="text-xs font-semibold uppercase text-primary-700 dark:text-primary-200">Resposta sugerida</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">{reply.suggested_reply}</p>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">Proxima acao: {reply.next_action}</p>
        </div>
      </div>
    </article>
  );
}

function ActionButton({ icon: Icon, label, onClick, busy, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-60 ${
        danger
          ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {busy ? 'Salvando...' : label}
    </button>
  );
}
