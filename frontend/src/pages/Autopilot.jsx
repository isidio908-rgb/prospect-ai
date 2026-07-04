import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  ListChecks,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { autopilot } from '../services/api';

const EMPTY_RULE = {
  name: '',
  enabled: false,
  mode: 'assistido',
  source_type: '',
  niche: '',
  city: '',
  min_score: 60,
  max_daily_sends: 20,
  max_hourly_sends: 5,
  send_window_start: '09:00',
  send_window_end: '17:00',
  timezone: 'America/Cuiaba',
  require_manual_approval: true,
  stop_on_reply: true,
  followup_1_delay_hours: 24,
  followup_2_delay_hours: 48,
  notes: '',
};

const EMPTY_BATCH_FORM = {
  limit: 5,
  min_score: '',
  city: '',
  niche: '',
  source_type: '',
  expires_in_minutes: 120,
  send_approval_request: false,
};

const STATUS_LABELS = {
  pending: 'Pendente',
  approved: 'Aprovada',
  queued: 'Na fila',
  sent: 'Enviada',
  skipped: 'Ignorada',
  failed: 'Falhou',
  cancelled: 'Cancelada',
  partially_approved: 'Parcial',
  expired: 'Expirada',
  completed: 'Concluída',
  running: 'Executando',
};

const STATUS_BADGES = {
  pending: 'badge-warning',
  partially_approved: 'badge-warning',
  approved: 'badge-success',
  completed: 'badge-success',
  running: 'badge-info',
  queued: 'badge-info',
  sent: 'badge-success',
  skipped: 'badge-secondary',
  failed: 'badge-danger',
  cancelled: 'badge-danger',
  expired: 'badge-danger',
};

export default function Autopilot() {
  const [rules, setRules] = useState([]);
  const [queue, setQueue] = useState([]);
  const [batches, setBatches] = useState([]);
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
  const [batchForm, setBatchForm] = useState(EMPTY_BATCH_FORM);
  const [queueFilters, setQueueFilters] = useState({ status: 'pending', message_type: '', city: '', niche: '' });
  const [appointmentForm, setAppointmentForm] = useState({ lead_id: '', scheduled_for: '', note: '' });
  const [diagnosticLeadId, setDiagnosticLeadId] = useState('');
  const [diagnostic, setDiagnostic] = useState(null);

  useEffect(() => {
    loadAutopilot();
  }, []);

  async function loadAutopilot() {
    setLoading(true);
    try {
      const [rulesResponse, queueResponse, batchesResponse, statsResponse, runsResponse] = await Promise.all([
        autopilot.listRules(),
        autopilot.listQueue({ limit: 150 }),
        autopilot.listApprovalBatches({ limit: 30 }),
        autopilot.stats(),
        autopilot.runs({ limit: 10 }),
      ]);
      setRules(rulesResponse.data.rules || []);
      setQueue(queueResponse.data.messages || []);
      setBatches(batchesResponse.data.batches || []);
      setStats(statsResponse.data.stats || null);
      setRuns(runsResponse.data.runs || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao carregar Autopilot');
    } finally {
      setLoading(false);
    }
  }

  const filteredQueue = useMemo(() => queue.filter((message) => (
    (!queueFilters.status || message.status === queueFilters.status)
    && (!queueFilters.message_type || message.message_type === queueFilters.message_type)
    && (!queueFilters.city || message.cidade === queueFilters.city)
    && (!queueFilters.niche || message.nicho === queueFilters.niche)
  )), [queue, queueFilters]);

  const queueOptions = useMemo(() => ({
    cities: uniqueValues(queue.map((message) => message.cidade)),
    niches: uniqueValues(queue.map((message) => message.nicho)),
    types: uniqueValues(queue.map((message) => message.message_type)),
  }), [queue]);

  const localSummary = useMemo(() => ({
    rulesActive: stats?.rules_active ?? rules.filter((rule) => rule.enabled).length,
    pending: stats?.queue_pending ?? queue.filter((message) => message.status === 'pending').length,
    approved: stats?.queue_approved ?? queue.filter((message) => message.status === 'approved').length,
    sent: stats?.queue_sent ?? queue.filter((message) => message.status === 'sent').length,
    openBatches: stats?.batches_open ?? batches.filter((batch) => ['pending', 'partially_approved'].includes(batch.status)).length,
  }), [stats, rules, queue, batches]);

  async function runAction(actionKey, label, fn, reload = true) {
    setBusyAction(actionKey);
    try {
      const response = await fn();
      setLastResult({ label, data: response.data, at: new Date().toISOString() });
      toast.success(label);
      if (reload) await loadAutopilot();
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || `Erro: ${label}`);
      return null;
    } finally {
      setBusyAction('');
    }
  }

  function updateRuleField(field, value) {
    setRuleForm((current) => ({ ...current, [field]: value }));
  }

  function updateBatchField(field, value) {
    setBatchForm((current) => ({ ...current, [field]: value }));
  }

  function resetRuleForm() {
    setEditingRuleId(null);
    setRuleForm(EMPTY_RULE);
  }

  function editRule(rule) {
    setEditingRuleId(rule.id);
    setRuleForm({
      name: rule.name || '',
      enabled: Boolean(rule.enabled),
      mode: rule.mode || 'assistido',
      source_type: rule.source_type || '',
      niche: rule.niche || '',
      city: rule.city || '',
      min_score: Number(rule.min_score ?? 60),
      max_daily_sends: Number(rule.max_daily_sends ?? 20),
      max_hourly_sends: Number(rule.max_hourly_sends ?? 5),
      send_window_start: rule.send_window_start || '09:00',
      send_window_end: rule.send_window_end || '17:00',
      timezone: rule.timezone || 'America/Cuiaba',
      require_manual_approval: Boolean(rule.require_manual_approval),
      stop_on_reply: Boolean(rule.stop_on_reply),
      followup_1_delay_hours: Number(rule.followup_1_delay_hours ?? 24),
      followup_2_delay_hours: Number(rule.followup_2_delay_hours ?? 48),
      notes: rule.notes || '',
    });
  }

  async function saveRule(event) {
    event.preventDefault();
    await runAction('save-rule', editingRuleId ? 'Regra atualizada' : 'Regra criada', async () => {
      const payload = normalizeRulePayload(ruleForm);
      return editingRuleId ? autopilot.updateRule(editingRuleId, payload) : autopilot.createRule(payload);
    });
    resetRuleForm();
  }

  async function deleteRule(rule) {
    if (!window.confirm(`Excluir a regra "${rule.name}"?`)) return;
    await runAction(`delete-rule-${rule.id}`, 'Regra excluída', () => autopilot.deleteRule(rule.id));
  }

  async function toggleRule(rule) {
    await runAction(`toggle-rule-${rule.id}`, rule.enabled ? 'Regra pausada' : 'Regra ativada', () => autopilot.updateRule(rule.id, { enabled: !rule.enabled }));
  }

  async function updateQueueMessage(message, action) {
    await runAction(`${action}-${message.id}`, action === 'approve' ? 'Mensagem aprovada' : 'Mensagem cancelada', () => (
      action === 'approve' ? autopilot.approveMessage(message.id) : autopilot.cancelMessage(message.id)
    ));
  }

  async function createBatch(event) {
    event.preventDefault();
    const payload = normalizeBatchPayload(batchForm);
    const result = await runAction('create-batch', payload.send_approval_request ? 'Lote enviado para aprovação' : 'Lote criado sem envio externo', () => autopilot.createApprovalBatch(payload));
    setBatchForm(EMPTY_BATCH_FORM);
    if (result?.batch?.id) await openBatch(result.batch.id);
  }

  async function openBatch(id) {
    const result = await runAction(`open-batch-${id}`, 'Lote carregado', () => autopilot.getApprovalBatch(id), false);
    if (result) setSelectedBatch(result);
  }

  async function createAppointment(event) {
    event.preventDefault();
    const leadId = Number(appointmentForm.lead_id);
    if (!leadId) {
      toast.error('Informe o ID do lead');
      return;
    }
    await runAction('appointment', 'Reunião assistida registrada', () => autopilot.createAppointment({
      lead_id: leadId,
      scheduled_for: appointmentForm.scheduled_for,
      note: appointmentForm.note,
    }));
    setAppointmentForm({ lead_id: '', scheduled_for: '', note: '' });
  }

  async function loadDiagnostic(event) {
    event.preventDefault();
    const leadId = Number(diagnosticLeadId);
    if (!leadId) {
      toast.error('Informe o ID do lead');
      return;
    }
    const result = await runAction('diagnostic', 'Diagnóstico carregado', () => autopilot.diagnostic(leadId), false);
    if (result) setDiagnostic(result);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300">
            <Bot className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Autopilot SDR</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Operação assistida e controlada</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Regras, fila, lotes, scheduler, envio controlado, follow-ups, resposta, agendamento e diagnóstico em um só painel.
          </p>
        </div>

        <button type="button" onClick={loadAutopilot} className="btn btn-secondary flex items-center justify-center gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100">
        <div className="flex gap-3">
          <ShieldCheck className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Travas de segurança ativas</p>
            <p>Scheduler e follow-ups usam dry-run por padrão. O worker só envia para leads quando chamado com <strong>dry_run=false</strong> e <strong>confirm_send=true</strong>.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Regras ativas" value={localSummary.rulesActive} tone="blue" />
        <Metric label="Pendentes" value={localSummary.pending} tone="yellow" />
        <Metric label="Aprovadas" value={localSummary.approved} tone="green" />
        <Metric label="Enviadas" value={localSummary.sent} tone="gray" />
        <Metric label="Lotes abertos" value={localSummary.openBatches} tone="blue" />
      </div>

      <section className="card">
        <div className="mb-4 flex items-center gap-2">
          <Play className="h-5 w-5 text-primary-600 dark:text-primary-300" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Sequência operacional 1 ao 11</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ActionButton busy={busyAction === 'scheduler-dry'} onClick={() => runAction('scheduler-dry', 'Scheduler simulado', () => autopilot.runScheduler({ limit: 50, dry_run: true }))} title="1-2. Simular scheduler" description="Avalia leads elegíveis sem criar fila." />
          <ActionButton busy={busyAction === 'scheduler-run'} onClick={() => runAction('scheduler-run', 'Scheduler executado', () => autopilot.runScheduler({ limit: 50, dry_run: false }))} title="2. Enfileirar pendentes" description="Cria mensagens pending para aprovação." />
          <ActionButton busy={busyAction === 'worker-dry'} onClick={() => runAction('worker-dry', 'Worker simulado', () => autopilot.processApproved({ limit: 10, dry_run: true, confirm_send: false }))} title="3. Simular envio" description="Mostra aprovadas que seriam enviadas." />
          <ActionButton danger busy={busyAction === 'worker-send'} onClick={() => confirmDanger('Enviar mensagens aprovadas para leads agora?') && runAction('worker-send', 'Worker processado', () => autopilot.processApproved({ limit: 10, dry_run: false, confirm_send: true }))} title="3. Enviar aprovadas" description="Envia somente mensagens approved." />
          <ActionButton busy={busyAction === 'stop'} onClick={() => runAction('stop', 'Stop-on-reply aplicado', () => autopilot.stopOnReply())} title="4. Stop-on-reply" description="Cancela follow-ups se houve resposta." />
          <ActionButton busy={busyAction === 'followups-dry'} onClick={() => runAction('followups-dry', 'Follow-up simulado', () => autopilot.queueFollowups({ limit: 50, dry_run: true }))} title="5. Simular follow-up" description="Mostra follow-ups elegíveis." />
          <ActionButton busy={busyAction === 'followups-run'} onClick={() => runAction('followups-run', 'Follow-ups enfileirados', () => autopilot.queueFollowups({ limit: 50, dry_run: false }))} title="5. Enfileirar follow-up" description="Cria followups pending/approved." />
          <ActionButton busy={busyAction === 'classify-dry'} onClick={() => runAction('classify-dry', 'Respostas classificadas em simulação', () => autopilot.classifyReplies({ limit: 20, dry_run: true }))} title="6. Classificar respostas" description="Dry-run da intenção do lead." />
          <ActionButton busy={busyAction === 'classify-run'} onClick={() => runAction('classify-run', 'Classificação aplicada', () => autopilot.classifyReplies({ limit: 20, dry_run: false }))} title="6. Aplicar classificação" description="Atualiza status/próxima ação." />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <RulePanel
          rules={rules}
          form={ruleForm}
          editingRuleId={editingRuleId}
          busyAction={busyAction}
          onChange={updateRuleField}
          onSubmit={saveRule}
          onReset={resetRuleForm}
          onEdit={editRule}
          onToggle={toggleRule}
          onDelete={deleteRule}
        />

        <section className="space-y-6 xl:col-span-2">
          <QueuePanel
            queue={filteredQueue}
            filters={queueFilters}
            options={queueOptions}
            busyAction={busyAction}
            onFilterChange={(patch) => setQueueFilters((current) => ({ ...current, ...patch }))}
            onClear={() => setQueueFilters({ status: 'pending', message_type: '', city: '', niche: '' })}
            onApprove={(message) => updateQueueMessage(message, 'approve')}
            onCancel={(message) => updateQueueMessage(message, 'cancel')}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BatchPanel form={batchForm} busyAction={busyAction} onChange={updateBatchField} onSubmit={createBatch} />
            <BatchesList batches={batches} onOpen={openBatch} />
          </div>

          <UtilityPanel
            appointmentForm={appointmentForm}
            setAppointmentForm={setAppointmentForm}
            diagnosticLeadId={diagnosticLeadId}
            setDiagnosticLeadId={setDiagnosticLeadId}
            diagnostic={diagnostic}
            onCreateAppointment={createAppointment}
            onLoadDiagnostic={loadDiagnostic}
            busyAction={busyAction}
          />

          {selectedBatch && <BatchDetails selectedBatch={selectedBatch} />}
          <RunsPanel runs={runs} lastResult={lastResult} />
        </section>
      </div>
    </div>
  );
}

function RulePanel({ rules, form, editingRuleId, busyAction, onChange, onSubmit, onReset, onEdit, onToggle, onDelete }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary-600 dark:text-primary-300" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">1. Regras</h2>
        </div>
        {editingRuleId && <button type="button" onClick={onReset} className="btn btn-secondary text-xs py-1 px-2">Nova</button>}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input" value={form.name} onChange={(event) => onChange('name', event.target.value)} placeholder="Nome da regra" required />
        <div className="grid grid-cols-2 gap-3">
          <select className="input" value={form.mode} onChange={(event) => onChange('mode', event.target.value)}>
            <option value="assistido">Assistido</option>
            <option value="automatico">Automático controlado</option>
          </select>
          <input className="input" type="number" min="0" max="100" value={form.min_score} onChange={(event) => onChange('min_score', event.target.value)} placeholder="Score" />
          <input className="input" value={form.source_type} onChange={(event) => onChange('source_type', event.target.value)} placeholder="Fonte" />
          <input className="input" value={form.city} onChange={(event) => onChange('city', event.target.value)} placeholder="Cidade" />
          <input className="input" value={form.niche} onChange={(event) => onChange('niche', event.target.value)} placeholder="Nicho" />
          <input className="input" value={form.timezone} onChange={(event) => onChange('timezone', event.target.value)} placeholder="Timezone" />
          <input className="input" type="number" min="1" value={form.max_daily_sends} onChange={(event) => onChange('max_daily_sends', event.target.value)} placeholder="Limite diário" />
          <input className="input" type="number" min="1" value={form.max_hourly_sends} onChange={(event) => onChange('max_hourly_sends', event.target.value)} placeholder="Limite hora" />
          <input className="input" type="time" value={form.send_window_start} onChange={(event) => onChange('send_window_start', event.target.value)} />
          <input className="input" type="time" value={form.send_window_end} onChange={(event) => onChange('send_window_end', event.target.value)} />
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40 space-y-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(event) => onChange('enabled', event.target.checked)} /> Ativa</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.require_manual_approval} onChange={(event) => onChange('require_manual_approval', event.target.checked)} /> Aprovação manual</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.stop_on_reply} onChange={(event) => onChange('stop_on_reply', event.target.checked)} /> Stop-on-reply</label>
        </div>
        <textarea className="input min-h-20" value={form.notes} onChange={(event) => onChange('notes', event.target.value)} placeholder="Notas internas" />
        <button type="submit" className="btn btn-primary w-full" disabled={busyAction === 'save-rule'}>{editingRuleId ? 'Atualizar regra' : 'Criar regra'}</button>
      </form>

      <div className="mt-5 space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{rule.city || 'Todas'} • {rule.niche || 'Todos'} • score {rule.min_score}</div>
              </div>
              <span className={`badge ${rule.enabled ? 'badge-success' : 'badge-secondary'}`}>{rule.enabled ? 'ativa' : 'pausada'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onEdit(rule)} className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Pencil className="h-3 w-3" /> Editar</button>
              <button type="button" onClick={() => onToggle(rule)} className="btn btn-secondary text-xs py-1 px-2">{rule.enabled ? 'Pausar' : 'Ativar'}</button>
              <button type="button" onClick={() => onDelete(rule)} className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1"><Trash2 className="h-3 w-3" /> Excluir</button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma regra criada ainda.</p>}
      </div>
    </section>
  );
}

function QueuePanel({ queue, filters, options, busyAction, onFilterChange, onClear, onApprove, onCancel }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-2">
        <ListChecks className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">3-5. Fila e follow-ups</h2>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <Select value={filters.status} onChange={(value) => onFilterChange({ status: value })}><option value="">Todos status</option>{['pending', 'approved', 'queued', 'sent', 'cancelled', 'failed'].map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</Select>
        <Select value={filters.message_type} onChange={(value) => onFilterChange({ message_type: value })}><option value="">Todos tipos</option>{options.types.map((type) => <option key={type} value={type}>{type}</option>)}</Select>
        <Select value={filters.city} onChange={(value) => onFilterChange({ city: value })}><option value="">Todas cidades</option>{options.cities.map((city) => <option key={city} value={city}>{city}</option>)}</Select>
        <Select value={filters.niche} onChange={(value) => onFilterChange({ niche: value })}><option value="">Todos nichos</option>{options.niches.map((niche) => <option key={niche} value={niche}>{niche}</option>)}</Select>
        <button type="button" onClick={onClear} className="btn btn-secondary">Limpar</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900/40">
            <tr><th className="px-3 py-2 text-left">Lead</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {queue.length === 0 ? <tr><td colSpan="4" className="px-3 py-6 text-center text-gray-500">Nenhuma mensagem no filtro.</td></tr> : queue.map((message) => (
              <tr key={message.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-3 py-3 min-w-64"><div className="font-medium text-gray-900 dark:text-gray-100">{message.nome_empresa || 'Lead sem nome'}</div><div className="text-xs text-gray-500 dark:text-gray-400">{message.cidade || '-'} • {message.nicho || '-'} • score {message.score ?? '-'}</div></td>
                <td className="px-3 py-3 text-sm">{message.message_type}</td>
                <td className="px-3 py-3"><StatusBadge status={message.status} /></td>
                <td className="px-3 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onApprove(message)} disabled={busyAction || message.status !== 'pending'} className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Aprovar</button><button type="button" onClick={() => onCancel(message)} disabled={busyAction || message.status === 'sent'} className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelar</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BatchPanel({ form, busyAction, onChange, onSubmit }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-2"><Send className="h-5 w-5 text-primary-600 dark:text-primary-300" /><h2 className="font-semibold text-gray-900 dark:text-gray-100">Criar lote</h2></div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="input" type="number" min="1" max="10" value={form.limit} onChange={(event) => onChange('limit', event.target.value)} placeholder="Limite" />
          <input className="input" type="number" min="10" max="1440" value={form.expires_in_minutes} onChange={(event) => onChange('expires_in_minutes', event.target.value)} placeholder="Expira min" />
          <input className="input" value={form.min_score} onChange={(event) => onChange('min_score', event.target.value)} placeholder="Score mínimo" />
          <input className="input" value={form.source_type} onChange={(event) => onChange('source_type', event.target.value)} placeholder="Fonte" />
          <input className="input" value={form.city} onChange={(event) => onChange('city', event.target.value)} placeholder="Cidade" />
          <input className="input" value={form.niche} onChange={(event) => onChange('niche', event.target.value)} placeholder="Nicho" />
        </div>
        <label className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/40"><input type="checkbox" checked={form.send_approval_request} onChange={(event) => onChange('send_approval_request', event.target.checked)} /> Enviar solicitação ao WhatsApp pessoal</label>
        <button type="submit" className="btn btn-primary w-full" disabled={busyAction === 'create-batch'}>Criar lote</button>
      </form>
    </section>
  );
}

function BatchesList({ batches, onOpen }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-primary-600 dark:text-primary-300" /><h2 className="font-semibold text-gray-900 dark:text-gray-100">Lotes recentes</h2></div>
      <div className="space-y-3">
        {batches.map((batch) => <button key={batch.id} type="button" onClick={() => onOpen(batch.id)} className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/30"><div className="flex items-start justify-between gap-3"><div><div className="font-medium text-gray-900 dark:text-gray-100">Lote #{batch.id}</div><div className="text-xs text-gray-500 dark:text-gray-400">{batch.approved_items || 0} aprovados • {batch.cancelled_items || 0} cancelados • {batch.total_items || 0} itens</div></div><StatusBadge status={batch.status} /></div></button>)}
        {batches.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum lote criado ainda.</p>}
      </div>
    </section>
  );
}

function UtilityPanel({ appointmentForm, setAppointmentForm, diagnosticLeadId, setDiagnosticLeadId, diagnostic, onCreateAppointment, onLoadDiagnostic, busyAction }) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="card">
        <div className="mb-4 flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary-600 dark:text-primary-300" /><h2 className="font-semibold text-gray-900 dark:text-gray-100">7. Agendamento assistido</h2></div>
        <form onSubmit={onCreateAppointment} className="space-y-3">
          <input className="input" value={appointmentForm.lead_id} onChange={(event) => setAppointmentForm((current) => ({ ...current, lead_id: event.target.value }))} placeholder="ID do lead" />
          <input className="input" value={appointmentForm.scheduled_for} onChange={(event) => setAppointmentForm((current) => ({ ...current, scheduled_for: event.target.value }))} placeholder="Data/horário combinado" />
          <textarea className="input min-h-20" value={appointmentForm.note} onChange={(event) => setAppointmentForm((current) => ({ ...current, note: event.target.value }))} placeholder="Observação" />
          <button type="submit" className="btn btn-primary w-full" disabled={busyAction === 'appointment'}>Registrar reunião</button>
        </form>
      </div>
      <div className="card">
        <div className="mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-primary-600 dark:text-primary-300" /><h2 className="font-semibold text-gray-900 dark:text-gray-100">10. Diagnóstico/PDF base</h2></div>
        <form onSubmit={onLoadDiagnostic} className="flex gap-2"><input className="input" value={diagnosticLeadId} onChange={(event) => setDiagnosticLeadId(event.target.value)} placeholder="ID do lead" /><button type="submit" className="btn btn-secondary" disabled={busyAction === 'diagnostic'}>Gerar</button></form>
        {diagnostic?.markdown && <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">{diagnostic.markdown}</pre>}
      </div>
    </section>
  );
}

function BatchDetails({ selectedBatch }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-900 dark:text-gray-100">Lote #{selectedBatch.batch.id}</h2><p className="text-sm text-gray-500 dark:text-gray-400">{selectedBatch.items.length} item(ns)</p></div><StatusBadge status={selectedBatch.batch.status} /></div>
      <div className="space-y-3">{selectedBatch.items.map((item) => <div key={item.batch_item_id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.position}. {item.nome_empresa || 'Lead sem nome'}</div><div className="text-xs text-gray-500 dark:text-gray-400">{item.cidade || '-'} • {item.nicho || '-'} • score {item.score ?? '-'}</div></div><StatusBadge status={item.batch_item_status || item.status} /></div><p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{item.payload_json?.message || item.payload_json?.text || item.mensagem_whatsapp || 'Mensagem não disponível.'}</p></div>)}</div>
    </section>
  );
}

function RunsPanel({ runs, lastResult }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary-600 dark:text-primary-300" /><h2 className="font-semibold text-gray-900 dark:text-gray-100">8-11. Runs, auditoria e hardening</h2></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">{runs.map((run) => <div key={run.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"><div className="flex items-center justify-between gap-2"><div className="font-medium text-gray-900 dark:text-gray-100">#{run.id} {run.type}</div><StatusBadge status={run.status} /></div><div className="mt-1 text-xs text-gray-500 dark:text-gray-400">avaliados {run.leads_evaluated || 0} • fila {run.messages_queued || 0} • ignorados {run.messages_skipped || 0}</div></div>)}{runs.length === 0 && <p className="text-sm text-gray-500">Nenhuma execução ainda.</p>}</div>
        <div>{lastResult ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">{JSON.stringify(lastResult, null, 2)}</pre> : <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700"><AlertTriangle className="mb-2 h-5 w-5" />O último resultado de ação aparecerá aqui para auditoria rápida.</div>}</div>
      </div>
    </section>
  );
}

function ActionButton({ title, description, onClick, busy, danger = false }) {
  return <button type="button" onClick={onClick} disabled={busy} className={`rounded-lg border p-3 text-left transition ${danger ? 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-900/20' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50'}`}><div className="font-medium text-gray-900 dark:text-gray-100">{busy ? 'Executando...' : title}</div><div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</div></button>;
}

function Metric({ label, value, tone = 'gray' }) {
  const tones = { gray: 'bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100', green: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300', yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-300', blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300' };
  return <div className={`rounded-lg p-4 ${tones[tone]}`}><div className="text-2xl font-bold">{value ?? 0}</div><div className="mt-1 text-xs opacity-80">{label}</div></div>;
}

function Select({ value, onChange, children }) {
  return <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>;
}

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_BADGES[status] || 'badge-secondary'}`}>{STATUS_LABELS[status] || status || '-'}</span>;
}

function uniqueValues(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function normalizeRulePayload(form) {
  return { ...form, min_score: Number(form.min_score || 0), max_daily_sends: Number(form.max_daily_sends || 1), max_hourly_sends: Number(form.max_hourly_sends || 1), followup_1_delay_hours: Number(form.followup_1_delay_hours || 24), followup_2_delay_hours: Number(form.followup_2_delay_hours || 48) };
}

function normalizeBatchPayload(form) {
  const payload = { limit: Number(form.limit || 5), expires_in_minutes: Number(form.expires_in_minutes || 120), send_approval_request: Boolean(form.send_approval_request), city: form.city || '', niche: form.niche || '', source_type: form.source_type || '' };
  if (String(form.min_score || '').trim()) payload.min_score = Number(form.min_score);
  return payload;
}

function confirmDanger(message) {
  return window.confirm(message);
}
