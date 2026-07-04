import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Ban,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Inbox,
  ListChecks,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
  XCircle,
} from 'lucide-react';
import { autopilot, leads as leadsApi } from '../services/api';

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
  novo: 'Novo',
  analisado: 'Analisado',
  mensagem_pronta: 'Mensagem pronta',
  respondeu: 'Respondeu',
  reuniao_marcada: 'Reunião marcada',
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
  respondeu: 'badge-info',
  reuniao_marcada: 'badge-success',
};

const ELIGIBLE_STATUSES = new Set(['novo', 'analisado', 'mensagem_pronta']);

export default function Autopilot() {
  const [rules, setRules] = useState([]);
  const [queue, setQueue] = useState([]);
  const [batches, setBatches] = useState([]);
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
      const [rulesResponse, queueResponse, batchesResponse, statsResponse, runsResponse, leadsResponse] = await Promise.all([
        autopilot.listRules(),
        autopilot.listQueue({ limit: 150 }),
        autopilot.listApprovalBatches({ limit: 30 }),
        autopilot.stats(),
        autopilot.runs({ limit: 10 }),
        leadsApi.list({ limit: 100, sortBy: 'score', sortOrder: 'DESC' }),
      ]);
      setRules(rulesResponse.data.rules || []);
      setQueue(queueResponse.data.messages || []);
      setBatches(batchesResponse.data.batches || []);
      setStats(statsResponse.data.stats || null);
      setRuns(runsResponse.data.runs || []);
      setLeads(leadsResponse.data.leads || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao carregar Autopilot');
    } finally {
      setLoading(false);
    }
  }

  const activeRules = useMemo(() => rules.filter((rule) => rule.enabled), [rules]);

  const eligibleLeads = useMemo(() => (
    leads.filter((lead) => ELIGIBLE_STATUSES.has(lead.status) && matchesAnyActiveRule(lead, activeRules))
  ), [leads, activeRules]);

  const leadOptions = useMemo(() => (
    uniqueById([
      ...leads,
      ...queue.map((message) => ({
        id: message.lead_id,
        nome_empresa: message.nome_empresa,
        cidade: message.cidade,
        nicho: message.nicho,
        score: message.score,
        status: message.status,
      })),
    ]).filter((lead) => lead.id && lead.nome_empresa)
  ), [leads, queue]);

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

  const localSummary = useMemo(() => {
    const pending = stats?.queue_pending ?? queue.filter((message) => message.status === 'pending').length;
    const approved = stats?.queue_approved ?? queue.filter((message) => message.status === 'approved').length;
    const openBatches = stats?.batches_open ?? batches.filter((batch) => ['pending', 'partially_approved'].includes(batch.status)).length;
    const replies = leads.filter((lead) => lead.status === 'respondeu').length;
    const meetingsToSchedule = leads.filter((lead) => lead.status === 'respondeu').length;

    return {
      eligible: eligibleLeads.length,
      pending,
      approved,
      openBatches,
      replies,
      meetingsToSchedule,
      rulesActive: stats?.rules_active ?? activeRules.length,
      sent: stats?.queue_sent ?? queue.filter((message) => message.status === 'sent').length,
    };
  }, [activeRules.length, batches, eligibleLeads.length, leads, queue, stats]);

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

  async function resendBatch(batch) {
    await runAction(`resend-batch-${batch.id}`, 'Solicitação reenviada ao WhatsApp pessoal', () => autopilot.resendApprovalBatch(batch.id));
  }

  async function cancelBatch(batch) {
    if (!window.confirm(`Cancelar o lote #${batch.id}?`)) return;
    await runAction(`cancel-batch-${batch.id}`, 'Lote cancelado', () => autopilot.processApprovalCommand({ text: `CANCELAR LOTE ${batch.id}` }));
  }

  async function createAppointment(event) {
    event.preventDefault();
    const leadId = Number(appointmentForm.lead_id);
    if (!leadId) {
      toast.error('Selecione um lead');
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
      toast.error('Selecione um lead');
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
            <span className="text-sm font-semibold uppercase">Autopilot SDR</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">Central operacional comercial</h1>
          <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Rotina assistida para revisar leads, aprovar mensagens, acompanhar respostas e preparar diagnóstico sem ligar envio automático.
          </p>
        </div>

        <button type="button" onClick={loadAutopilot} className="btn btn-secondary flex items-center justify-center gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <SecurityNotice />

      <NextActionCards
        summary={localSummary}
        busyAction={busyAction}
        onSchedulerDry={() => runAction('scheduler-dry', 'Leads elegíveis simulados', () => autopilot.runScheduler({ limit: 50, dry_run: true }))}
        onWorkerDry={() => runAction('worker-dry', 'Envio simulado', () => autopilot.processApproved({ limit: 10, dry_run: true, confirm_send: false }))}
        onClassifyDry={() => runAction('classify-dry', 'Respostas classificadas em simulação', () => autopilot.classifyReplies({ limit: 20, dry_run: true }))}
      />

      <section className="space-y-4">
        <SectionHeader icon={Play} title="Operação diária" description="Sequência segura para operar o dia sem envio externo por padrão." />
        <DailyWorkflow
          busyAction={busyAction}
          onSchedulerDry={() => runAction('scheduler-dry', 'Scheduler simulado', () => autopilot.runScheduler({ limit: 50, dry_run: true }))}
          onSchedulerRun={() => runAction('scheduler-run', 'Mensagens pendentes criadas', () => autopilot.runScheduler({ limit: 50, dry_run: false }))}
          onWorkerDry={() => runAction('worker-dry', 'Worker simulado', () => autopilot.processApproved({ limit: 10, dry_run: true, confirm_send: false }))}
          onStop={() => runAction('stop', 'Stop-on-reply aplicado', () => autopilot.stopOnReply())}
          onFollowupsDry={() => runAction('followups-dry', 'Follow-up simulado', () => autopilot.queueFollowups({ limit: 50, dry_run: true }))}
          onClassifyDry={() => runAction('classify-dry', 'Respostas classificadas em simulação', () => autopilot.classifyReplies({ limit: 20, dry_run: true }))}
        />

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

          <div className="space-y-6 xl:col-span-2">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <BatchPanel form={batchForm} busyAction={busyAction} onChange={updateBatchField} onSubmit={createBatch} />
              <BatchesList batches={batches} busyAction={busyAction} onOpen={openBatch} onResend={resendBatch} onCancel={cancelBatch} />
            </div>

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

            <UtilityPanel
              leads={leadOptions}
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
          </div>
        </div>
      </section>

      <section className="card">
        <button
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <SectionHeader icon={Settings} title="Modo avançado/técnico" description="Ações que alteram estado em lote, envio real e auditoria." compact />
          <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
        </button>

        {advancedOpen && (
          <div className="mt-5 space-y-5">
            <AdvancedActions
              busyAction={busyAction}
              onFollowupsRun={() => runAction('followups-run', 'Follow-ups enfileirados', () => autopilot.queueFollowups({ limit: 50, dry_run: false }))}
              onClassifyRun={() => runAction('classify-run', 'Classificação aplicada', () => autopilot.classifyReplies({ limit: 20, dry_run: false }))}
              onWorkerSend={() => confirmDanger('Enviar mensagens aprovadas para leads agora?') && runAction('worker-send', 'Worker processado', () => autopilot.processApproved({ limit: 10, dry_run: false, confirm_send: true }))}
            />
            <RunsPanel runs={runs} lastResult={lastResult} />
          </div>
        )}
      </section>
    </div>
  );
}

function SecurityNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100">
      <div className="flex gap-3">
        <ShieldCheck className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">Travas de segurança ativas</p>
          <p>Simulações usam <strong>dry_run=true</strong>. Envio real fica no modo avançado e exige confirmação explícita com <strong>confirm_send=true</strong>.</p>
        </div>
      </div>
    </div>
  );
}

function NextActionCards({ summary, busyAction, onSchedulerDry, onWorkerDry, onClassifyDry }) {
  const cards = [
    { icon: Target, label: 'Leads elegíveis', value: summary.eligible, tone: 'blue', action: 'Simular', onClick: onSchedulerDry, busy: busyAction === 'scheduler-dry' },
    { icon: Inbox, label: 'Mensagens pendentes', value: summary.pending, tone: 'yellow', action: 'Ver fila' },
    { icon: Clock, label: 'Lotes aguardando aprovação', value: summary.openBatches, tone: 'yellow', action: 'Revisar' },
    { icon: CheckCircle2, label: 'Mensagens aprovadas', value: summary.approved, tone: 'green', action: 'Simular envio', onClick: onWorkerDry, busy: busyAction === 'worker-dry' },
    { icon: MessageCircle, label: 'Respostas recebidas', value: summary.replies, tone: 'blue', action: 'Classificar', onClick: onClassifyDry, busy: busyAction === 'classify-dry' },
    { icon: CalendarClock, label: 'Reuniões para agendar', value: summary.meetingsToSchedule, tone: 'green', action: 'Selecionar lead' },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`rounded-lg border p-4 ${toneClasses(card.tone)}`}>
            <div className="flex items-start justify-between gap-3">
              <Icon className="h-5 w-5 flex-shrink-0" />
              <div className="text-2xl font-bold leading-none">{card.value ?? 0}</div>
            </div>
            <div className="mt-3 min-h-10 text-sm font-medium">{card.label}</div>
            {card.onClick ? (
              <button type="button" onClick={card.onClick} className="mt-3 text-xs font-semibold underline underline-offset-2" disabled={card.busy}>
                {card.busy ? 'Executando...' : card.action}
              </button>
            ) : (
              <div className="mt-3 text-xs opacity-75">{card.action}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DailyWorkflow({ busyAction, onSchedulerDry, onSchedulerRun, onWorkerDry, onStop, onFollowupsDry, onClassifyDry }) {
  const steps = [
    { number: 1, title: 'Conferir leads elegíveis', description: 'Simula o scheduler sem criar fila.', action: 'Simular', busyKey: 'scheduler-dry', onClick: onSchedulerDry },
    { number: 2, title: 'Enfileirar pendentes', description: 'Cria mensagens pending para aprovação.', action: 'Criar pendentes', busyKey: 'scheduler-run', onClick: onSchedulerRun },
    { number: 3, title: 'Criar lote de aprovação', description: 'Use o formulário de lote, sem envio externo por padrão.', action: 'Preencher lote' },
    { number: 4, title: 'Revisar lotes recentes', description: 'Ver, reenviar solicitação ou cancelar lote.', action: 'Abrir lotes' },
    { number: 5, title: 'Aprovar pelo WhatsApp', description: 'Comandos aprovam itens e não enviam ao lead.', action: 'Responder lote' },
    { number: 6, title: 'Simular envio aprovado', description: 'Worker em dry-run mostra o que seria enviado.', action: 'Simular', busyKey: 'worker-dry', onClick: onWorkerDry },
    { number: 7, title: 'Aplicar stop-on-reply', description: 'Cancela follow-ups quando houve resposta.', action: 'Aplicar', busyKey: 'stop', onClick: onStop },
    { number: 8, title: 'Simular follow-up', description: 'Dry-run de follow-ups elegíveis.', action: 'Simular', busyKey: 'followups-dry', onClick: onFollowupsDry },
    { number: 9, title: 'Classificar respostas', description: 'Dry-run de intenção e próxima ação.', action: 'Classificar', busyKey: 'classify-dry', onClick: onClassifyDry },
    { number: 10, title: 'Agendar reunião', description: 'Selecione o lead por nome e registre o combinado.', action: 'Selecionar lead' },
    { number: 11, title: 'Gerar diagnóstico/PDF base', description: 'Escolha o lead por nome e gere Markdown base.', action: 'Gerar base' },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step) => (
        <StepCard key={step.number} step={step} busy={step.busyKey && busyAction === step.busyKey} />
      ))}
    </div>
  );
}

function StepCard({ step, busy }) {
  return (
    <button
      type="button"
      onClick={step.onClick}
      disabled={!step.onClick || busy}
      className={`rounded-lg border bg-white p-4 text-left dark:border-gray-700 dark:bg-gray-800 ${step.onClick ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : 'cursor-default'}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">{step.number}</span>
        <div className="min-w-0 font-semibold text-gray-900 dark:text-gray-100">{step.title}</div>
      </div>
      <p className="mt-3 min-h-10 text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
      <div className="mt-3 text-xs font-semibold text-primary-700 dark:text-primary-300">{busy ? 'Executando...' : step.action}</div>
    </button>
  );
}

function RulePanel({ rules, form, editingRuleId, busyAction, onChange, onSubmit, onReset, onEdit, onToggle, onDelete }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionHeader icon={Settings} title="Regras assistidas" description="Escopo, janela e aprovação manual." compact />
        {editingRuleId && <button type="button" onClick={onReset} className="btn btn-secondary px-2 py-1 text-xs"><Plus className="h-3 w-3" /></button>}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input" value={form.name} onChange={(event) => onChange('name', event.target.value)} placeholder="Nome da regra" required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <div className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
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
              <button type="button" onClick={() => onEdit(rule)} className="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs"><Pencil className="h-3 w-3" /> Editar</button>
              <button type="button" onClick={() => onToggle(rule)} className="btn btn-secondary px-2 py-1 text-xs">{rule.enabled ? 'Pausar' : 'Ativar'}</button>
              <button type="button" onClick={() => onDelete(rule)} className="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs"><Trash2 className="h-3 w-3" /> Excluir</button>
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
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SectionHeader icon={ListChecks} title="Fila comercial" description="Mensagens pendentes, aprovadas e canceláveis." compact />
        <button type="button" onClick={onClear} className="btn btn-secondary">Limpar filtros</button>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <Select value={filters.status} onChange={(value) => onFilterChange({ status: value })}><option value="">Todos status</option>{['pending', 'approved', 'queued', 'sent', 'cancelled', 'failed'].map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</Select>
        <Select value={filters.message_type} onChange={(value) => onFilterChange({ message_type: value })}><option value="">Todos tipos</option>{options.types.map((type) => <option key={type} value={type}>{type}</option>)}</Select>
        <Select value={filters.city} onChange={(value) => onFilterChange({ city: value })}><option value="">Todas cidades</option>{options.cities.map((city) => <option key={city} value={city}>{city}</option>)}</Select>
        <Select value={filters.niche} onChange={(value) => onFilterChange({ niche: value })}><option value="">Todos nichos</option>{options.niches.map((niche) => <option key={niche} value={niche}>{niche}</option>)}</Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900/40">
            <tr><th className="px-3 py-2 text-left">Lead</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {queue.length === 0 ? <tr><td colSpan="4" className="px-3 py-6 text-center text-gray-500">Nenhuma mensagem no filtro.</td></tr> : queue.map((message) => (
              <tr key={message.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="min-w-64 px-3 py-3"><div className="font-medium text-gray-900 dark:text-gray-100">{message.nome_empresa || 'Lead sem nome'}</div><div className="text-xs text-gray-500 dark:text-gray-400">{message.cidade || '-'} • {message.nicho || '-'} • score {message.score ?? '-'}</div></td>
                <td className="px-3 py-3 text-sm">{message.message_type}</td>
                <td className="px-3 py-3"><StatusBadge status={message.status} /></td>
                <td className="px-3 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => onApprove(message)} disabled={busyAction || message.status !== 'pending'} className="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs"><CheckCircle2 className="h-3 w-3" /> Aprovar</button><button type="button" onClick={() => onCancel(message)} disabled={busyAction || message.status === 'sent'} className="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs"><XCircle className="h-3 w-3" /> Cancelar</button></div></td>
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
      <SectionHeader icon={Send} title="Criar lote" description="Agrupa mensagens pendentes para aprovação." compact />
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="input" type="number" min="1" max="10" value={form.limit} onChange={(event) => onChange('limit', event.target.value)} placeholder="Limite" />
          <input className="input" type="number" min="10" max="1440" value={form.expires_in_minutes} onChange={(event) => onChange('expires_in_minutes', event.target.value)} placeholder="Expira em minutos" />
          <input className="input" value={form.min_score} onChange={(event) => onChange('min_score', event.target.value)} placeholder="Score mínimo" />
          <input className="input" value={form.source_type} onChange={(event) => onChange('source_type', event.target.value)} placeholder="Fonte" />
          <input className="input" value={form.city} onChange={(event) => onChange('city', event.target.value)} placeholder="Cidade" />
          <input className="input" value={form.niche} onChange={(event) => onChange('niche', event.target.value)} placeholder="Nicho" />
        </div>
        <label className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/40">
          <input className="mt-1" type="checkbox" checked={form.send_approval_request} onChange={(event) => onChange('send_approval_request', event.target.checked)} />
          <span>Enviar solicitação ao WhatsApp pessoal ao criar o lote</span>
        </label>
        <button type="submit" className="btn btn-primary w-full" disabled={busyAction === 'create-batch'}>Criar lote</button>
      </form>
    </section>
  );
}

function BatchesList({ batches, busyAction, onOpen, onResend, onCancel }) {
  return (
    <section className="card">
      <SectionHeader icon={Clock} title="Lotes recentes" description="Aprovação assistida antes de qualquer envio." compact />
      <div className="mt-4 space-y-3">
        {batches.map((batch) => {
          const isOpen = ['pending', 'partially_approved'].includes(batch.status);
          return (
            <div key={batch.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Lote #{batch.id}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{batch.approved_items || 0} aprovados • {batch.cancelled_items || 0} cancelados • {batch.total_items || 0} itens</div>
                </div>
                <StatusBadge status={batch.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onOpen(batch.id)} className="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs"><Eye className="h-3 w-3" /> Ver lote</button>
                <button type="button" onClick={() => onResend(batch)} disabled={busyAction || !isOpen} className="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs"><Repeat2 className="h-3 w-3" /> Reenviar solicitação</button>
                <button type="button" onClick={() => onCancel(batch)} disabled={busyAction || !isOpen} className="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs"><Ban className="h-3 w-3" /> Cancelar lote</button>
              </div>
            </div>
          );
        })}
        {batches.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum lote criado ainda.</p>}
      </div>
    </section>
  );
}

function UtilityPanel({ leads, appointmentForm, setAppointmentForm, diagnosticLeadId, setDiagnosticLeadId, diagnostic, onCreateAppointment, onLoadDiagnostic, busyAction }) {
  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="card">
        <SectionHeader icon={CalendarClock} title="Agendamento assistido" description="Selecione o lead por nome." compact />
        <form onSubmit={onCreateAppointment} className="mt-4 space-y-3">
          <LeadPicker leads={leads} value={appointmentForm.lead_id} onChange={(leadId) => setAppointmentForm((current) => ({ ...current, lead_id: leadId }))} placeholder="Buscar lead para reunião" />
          <input className="input" value={appointmentForm.scheduled_for} onChange={(event) => setAppointmentForm((current) => ({ ...current, scheduled_for: event.target.value }))} placeholder="Data/horário combinado" />
          <textarea className="input min-h-20" value={appointmentForm.note} onChange={(event) => setAppointmentForm((current) => ({ ...current, note: event.target.value }))} placeholder="Observação" />
          <button type="submit" className="btn btn-primary w-full" disabled={busyAction === 'appointment'}>Registrar reunião</button>
        </form>
      </div>
      <div className="card">
        <SectionHeader icon={FileText} title="Diagnóstico/PDF base" description="Gera o Markdown comercial do lead selecionado." compact />
        <form onSubmit={onLoadDiagnostic} className="mt-4 space-y-3">
          <LeadPicker leads={leads} value={diagnosticLeadId} onChange={setDiagnosticLeadId} placeholder="Buscar lead para diagnóstico" />
          <button type="submit" className="btn btn-secondary w-full" disabled={busyAction === 'diagnostic'}>Gerar diagnóstico</button>
        </form>
        {diagnostic?.markdown && <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">{diagnostic.markdown}</pre>}
      </div>
    </section>
  );
}

function BatchDetails({ selectedBatch }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Lote #{selectedBatch.batch.id}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBatch.items.length} item(ns)</p>
        </div>
        <StatusBadge status={selectedBatch.batch.status} />
      </div>
      <div className="space-y-3">{selectedBatch.items.map((item) => <div key={item.batch_item_id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.position}. {item.nome_empresa || 'Lead sem nome'}</div><div className="text-xs text-gray-500 dark:text-gray-400">{item.cidade || '-'} • {item.nicho || '-'} • score {item.score ?? '-'}</div></div><StatusBadge status={item.batch_item_status || item.status} /></div><p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{item.payload_json?.message || item.payload_json?.text || item.mensagem_whatsapp || 'Mensagem não disponível.'}</p></div>)}</div>
    </section>
  );
}

function AdvancedActions({ busyAction, onFollowupsRun, onClassifyRun, onWorkerSend }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <ActionButton busy={busyAction === 'followups-run'} onClick={onFollowupsRun} title="Enfileirar follow-ups" description="Cria follow-ups pending/approved. Não envia mensagem." />
      <ActionButton busy={busyAction === 'classify-run'} onClick={onClassifyRun} title="Aplicar classificação" description="Atualiza status e próxima ação dos leads." />
      <ActionButton danger busy={busyAction === 'worker-send'} onClick={onWorkerSend} title="Enviar aprovadas" description="Envio real exige confirmação explícita." />
    </div>
  );
}

function RunsPanel({ runs, lastResult }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        {runs.map((run) => <div key={run.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"><div className="flex items-center justify-between gap-2"><div className="font-medium text-gray-900 dark:text-gray-100">#{run.id} {run.type}</div><StatusBadge status={run.status} /></div><div className="mt-1 text-xs text-gray-500 dark:text-gray-400">avaliados {run.leads_evaluated || 0} • fila {run.messages_queued || 0} • ignorados {run.messages_skipped || 0}</div></div>)}
        {runs.length === 0 && <p className="text-sm text-gray-500">Nenhuma execução ainda.</p>}
      </div>
      <div>{lastResult ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">{JSON.stringify(lastResult, null, 2)}</pre> : <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700"><AlertTriangle className="mb-2 h-5 w-5" />O último resultado de ação aparecerá aqui para auditoria rápida.</div>}</div>
    </div>
  );
}

function LeadPicker({ leads, value, onChange, placeholder }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads.slice(0, 30);
    return leads.filter((lead) => `${lead.nome_empresa || ''} ${lead.cidade || ''} ${lead.nicho || ''}`.toLowerCase().includes(term)).slice(0, 30);
  }, [leads, search]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} />
      </div>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione um lead</option>
        {filtered.map((lead) => (
          <option key={lead.id} value={lead.id}>{lead.nome_empresa} - {lead.cidade || '-'} - score {lead.score ?? '-'}</option>
        ))}
      </select>
    </div>
  );
}

function ActionButton({ title, description, onClick, busy, danger = false }) {
  return <button type="button" onClick={onClick} disabled={busy} className={`rounded-lg border p-4 text-left transition ${danger ? 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-900/20' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50'}`}><div className="font-medium text-gray-900 dark:text-gray-100">{busy ? 'Executando...' : title}</div><div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</div></button>;
}

function SectionHeader({ icon: Icon, title, description, compact = false }) {
  return (
    <div className={`flex items-start gap-2 ${compact ? '' : 'mb-1'}`}>
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-300" />
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
    </div>
  );
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

function uniqueById(items) {
  const map = new Map();
  for (const item of items) {
    if (item?.id && !map.has(Number(item.id))) map.set(Number(item.id), item);
  }
  return Array.from(map.values());
}

function normalizeRulePayload(form) {
  return {
    ...form,
    min_score: Number(form.min_score || 0),
    max_daily_sends: Number(form.max_daily_sends || 1),
    max_hourly_sends: Number(form.max_hourly_sends || 1),
    followup_1_delay_hours: Number(form.followup_1_delay_hours || 24),
    followup_2_delay_hours: Number(form.followup_2_delay_hours || 48),
  };
}

function normalizeBatchPayload(form) {
  const payload = {
    limit: Number(form.limit || 5),
    expires_in_minutes: Number(form.expires_in_minutes || 120),
    send_approval_request: Boolean(form.send_approval_request),
    city: form.city || '',
    niche: form.niche || '',
    source_type: form.source_type || '',
  };
  if (String(form.min_score || '').trim()) payload.min_score = Number(form.min_score);
  return payload;
}

function matchesAnyActiveRule(lead, activeRules) {
  if (activeRules.length === 0) return true;
  return activeRules.some((rule) => {
    if (Number(lead.score || 0) < Number(rule.min_score || 0)) return false;
    if (rule.source_type && lower(lead.fonte) !== lower(rule.source_type)) return false;
    if (rule.city && lower(lead.cidade) !== lower(rule.city)) return false;
    if (rule.niche && lower(lead.nicho) !== lower(rule.niche)) return false;
    return true;
  });
}

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

function toneClasses(tone) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-200',
    green: 'border-green-200 bg-green-50 text-green-950 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-200',
    yellow: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200',
  };
  return tones[tone] || tones.blue;
}

function confirmDanger(message) {
  return window.confirm(message);
}
