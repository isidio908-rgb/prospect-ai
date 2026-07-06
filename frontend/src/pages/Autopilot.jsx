import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Ban,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Inbox,
  Play,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Target,
  Trash2,
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

const EMPTY_AUTOMATION_FORM = {
  credential_id: '',
  query: '',
  city: '',
  niche: '',
  region: 'br',
  language: 'pt',
  limit: 20,
  verify_whatsapp_exists: true,
  force_refresh: false,
  extract_emails_and_contacts: false,
  approve_collection: true,
  analyze_saved_leads: true,
  analysis_limit: 50,
  min_score: 60,
  scheduler_limit: 50,
  create_approval_batch: true,
  send_approval_request: true,
  batch_limit: 5,
  batch_expires_in_minutes: 120,
  process_approved: true,
  ignore_schedule: false,
  worker_limit: 10,
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
  completed: 'Concluida',
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

const MODULES = [
  {
    title: 'Respostas',
    description: 'Classificar retornos e definir proxima acao.',
    href: '/autopilot/replies',
    icon: Inbox,
  },
  {
    title: 'Templates',
    description: 'Ajustar mensagens por nicho e contexto.',
    href: '/autopilot/templates',
    icon: FileText,
  },
  {
    title: 'Diagnostico',
    description: 'Gerar material comercial para abordagem e reuniao.',
    href: '/autopilot/diagnostics',
    icon: Target,
  },
  {
    title: 'Agendamento',
    description: 'Transformar resposta positiva em reuniao marcada.',
    href: '/autopilot/scheduling',
    icon: CalendarClock,
  },
];

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textValue(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function compactPayload(form, overrides = {}) {
  const payload = {
    ...form,
    ...overrides,
    credential_id: toNumber(overrides.credential_id ?? form.credential_id, 0) || undefined,
    limit: toNumber(overrides.limit ?? form.limit, 20),
    analysis_limit: toNumber(overrides.analysis_limit ?? form.analysis_limit, 50),
    min_score: toNumber(overrides.min_score ?? form.min_score, 60),
    scheduler_limit: toNumber(overrides.scheduler_limit ?? form.scheduler_limit, 50),
    batch_limit: toNumber(overrides.batch_limit ?? form.batch_limit, 5),
    batch_expires_in_minutes: toNumber(overrides.batch_expires_in_minutes ?? form.batch_expires_in_minutes, 120),
    worker_limit: toNumber(overrides.worker_limit ?? form.worker_limit, 10),
  };

  for (const key of Object.keys(payload)) {
    if (payload[key] === '') delete payload[key];
  }

  return payload;
}

export default function Autopilot() {
  const [rules, setRules] = useState([]);
  const [queue, setQueue] = useState([]);
  const [batches, setBatches] = useState([]);
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [plan, setPlan] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
  const [automationForm, setAutomationForm] = useState(EMPTY_AUTOMATION_FORM);
  const [safetyOpen, setSafetyOpen] = useState(false);

  useEffect(() => {
    loadAutopilot();
  }, []);

  async function loadAutopilot() {
    setLoading(true);
    try {
      const [rulesResponse, queueResponse, batchesResponse, statsResponse, runsResponse, planResponse] = await Promise.all([
        autopilot.listRules(),
        autopilot.listQueue({ limit: 150 }),
        autopilot.listApprovalBatches({ limit: 30 }),
        autopilot.stats(),
        autopilot.runs({ limit: 10 }),
        autopilot.semiAutoPlan(),
      ]);

      setRules(rulesResponse.data.rules || []);
      setQueue(queueResponse.data.messages || []);
      setBatches(batchesResponse.data.batches || []);
      setStats(statsResponse.data.stats || null);
      setRuns(runsResponse.data.runs || []);
      setPlan(planResponse.data.plan || null);
      hydrateAutomationForm(planResponse.data.plan || null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao carregar Autopilot');
    } finally {
      setLoading(false);
    }
  }

  function hydrateAutomationForm(nextPlan) {
    const recommendation = nextPlan?.recommendation || {};
    setAutomationForm((current) => ({
      ...current,
      credential_id: textValue(recommendation.credential_id, current.credential_id),
      query: recommendation.query || current.query,
      city: recommendation.city || current.city,
      niche: recommendation.niche || current.niche,
      region: recommendation.region || current.region,
      limit: recommendation.limit || current.limit,
      verify_whatsapp_exists: recommendation.verify_whatsapp_exists ?? current.verify_whatsapp_exists,
      force_refresh: recommendation.force_refresh ?? current.force_refresh,
      min_score: recommendation.min_score || current.min_score,
    }));
  }

  const summary = useMemo(() => ({
    rulesActive: stats?.rules_active ?? rules.filter((rule) => rule.enabled).length,
    pending: stats?.queue_pending ?? queue.filter((message) => message.status === 'pending').length,
    approved: stats?.queue_approved ?? queue.filter((message) => message.status === 'approved').length,
    sent: stats?.queue_sent ?? queue.filter((message) => message.status === 'sent').length,
    openBatches: stats?.batches_open ?? batches.filter((batch) => ['pending', 'partially_approved'].includes(batch.status)).length,
    highScore: plan?.leads?.high_score ?? 0,
    needAnalysis: plan?.leads?.need_analysis ?? 0,
  }), [batches, plan, queue, rules, stats]);

  const pendingMessages = useMemo(() => queue.filter((message) => message.status === 'pending').slice(0, 8), [queue]);
  const approvedMessages = useMemo(() => queue.filter((message) => message.status === 'approved').slice(0, 8), [queue]);

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

  function updateAutomationField(field, value) {
    setAutomationForm((current) => ({ ...current, [field]: value }));
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
    await runAction('save-rule', editingRuleId ? 'Automacao atualizada' : 'Automacao criada', async () => {
      const payload = normalizeRulePayload(ruleForm);
      return editingRuleId ? autopilot.updateRule(editingRuleId, payload) : autopilot.createRule(payload);
    });
    resetRuleForm();
  }

  async function deleteRule(rule) {
    if (!window.confirm(`Excluir a automacao "${rule.name}"?`)) return;
    await runAction(`delete-rule-${rule.id}`, 'Automacao excluida', () => autopilot.deleteRule(rule.id));
  }

  async function toggleRule(rule) {
    await runAction(`toggle-rule-${rule.id}`, rule.enabled ? 'Automacao pausada' : 'Automacao ativada', () => autopilot.updateRule(rule.id, { enabled: !rule.enabled }));
  }

  async function runAutomation(dryRun = false) {
    if (!automationForm.query || !automationForm.credential_id) {
      toast.error('Informe query e credencial antes de rodar o Autopilot');
      return;
    }

    if (!dryRun) {
      const ok = window.confirm('Rodar Autopilot agora? O sistema pode coletar leads, analisar, criar lote e trabalhar mensagens ja aprovadas. Mensagens novas continuam exigindo aprovacao.');
      if (!ok) return;
    }

    await runAction(
      dryRun ? 'check-automation' : 'run-automation',
      dryRun ? 'Autopilot verificado sem executar' : 'Autopilot executado',
      () => autopilot.runSemiAuto(compactPayload(automationForm, {
        dry_run: dryRun,
        approve_collection: !dryRun,
      }))
    );
  }

  async function sendApprovedNow() {
    if (!window.confirm('Enviar agora somente mensagens ja aprovadas? O stop-on-reply roda antes do worker.')) return;
    await runAction('send-approved', 'Mensagens aprovadas processadas', () => autopilot.runSemiAuto(compactPayload(automationForm, {
      dry_run: false,
      approve_collection: false,
      analyze_saved_leads: false,
      create_approval_batch: false,
      send_approval_request: false,
      process_approved: true,
      ignore_schedule: true,
    })));
  }

  async function openBatch(id) {
    const result = await runAction(`open-batch-${id}`, 'Lote carregado', () => autopilot.getApprovalBatch(id), false);
    if (result) setSelectedBatch(result);
  }

  async function resendBatch(batch) {
    await runAction(`resend-batch-${batch.id}`, 'Solicitacao reenviada ao WhatsApp pessoal', () => autopilot.resendApprovalBatch(batch.id));
  }

  async function cancelBatch(batch) {
    if (!window.confirm(`Cancelar o lote #${batch.id}?`)) return;
    await runAction(`cancel-batch-${batch.id}`, 'Lote cancelado', () => autopilot.processApprovalCommand({ text: `CANCELAR LOTE ${batch.id}` }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300">
            <Bot className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase">Autopilot</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">Automacoes comerciais</h1>
          <p className="max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Configure o que o sistema pode fazer sozinho, acompanhe aprovacoes e controle os envios com seguranca.
          </p>
        </div>

        <button type="button" onClick={loadAutopilot} className="btn btn-secondary flex items-center justify-center gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <SecurityNotice />

      <SummaryCards summary={summary} onSendApproved={sendApprovedNow} busyAction={busyAction} />

      <ModuleShortcuts />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AutomationRunPanel
          form={automationForm}
          plan={plan}
          busyAction={busyAction}
          onChange={updateAutomationField}
          onRun={() => runAutomation(false)}
          onCheck={() => runAutomation(true)}
          onSendApproved={sendApprovedNow}
        />

        <AutomationRulesPanel
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
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ApprovalPanel
          batches={batches}
          pendingMessages={pendingMessages}
          approvedMessages={approvedMessages}
          busyAction={busyAction}
          onOpenBatch={openBatch}
          onResendBatch={resendBatch}
          onCancelBatch={cancelBatch}
          onSendApproved={sendApprovedNow}
        />
        <AuditPanel runs={runs} lastResult={lastResult} selectedBatch={selectedBatch} />
      </div>

      <section className="card">
        <button
          type="button"
          onClick={() => setSafetyOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <SectionHeader icon={ShieldCheck} title="Travas e auditoria" description="O que fica automatico, o que exige aprovacao e o ultimo resultado tecnico." compact />
          <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${safetyOpen ? 'rotate-180' : ''}`} />
        </button>

        {safetyOpen && (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SafetyList />
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              {lastResult ? JSON.stringify(lastResult, null, 2) : 'Nenhuma acao recente para auditar.'}
            </pre>
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
          <p className="font-semibold">Autopilot controlado</p>
          <p>O sistema pode coletar, analisar, criar lote e trabalhar fila aprovada. Mensagens novas continuam passando por aprovacao em lote antes de qualquer envio.</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ summary, onSendApproved, busyAction }) {
  const cards = [
    { icon: Settings, label: 'Automacoes ativas', value: summary.rulesActive, tone: 'blue' },
    { icon: Target, label: 'Leads score alto', value: summary.highScore, tone: 'green' },
    { icon: Inbox, label: 'Aguardando aprovacao', value: summary.pending, tone: 'yellow' },
    { icon: Clock, label: 'Lotes abertos', value: summary.openBatches, tone: 'yellow' },
    { icon: CheckCircle2, label: 'Aprovadas para envio', value: summary.approved, tone: 'green', action: 'Enviar aprovadas', onClick: onSendApproved, busy: busyAction === 'send-approved' },
    { icon: Send, label: 'Enviadas', value: summary.sent, tone: 'blue' },
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
                {card.busy ? 'Processando...' : card.action}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ModuleShortcuts() {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {MODULES.map((module) => {
        const Icon = module.icon;
        return (
          <Link key={module.href} to={module.href} className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-primary-900/20">
            <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
              <Icon className="h-5 w-5 text-primary-600 dark:text-primary-300" />
              {module.title}
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{module.description}</p>
          </Link>
        );
      })}
    </section>
  );
}

function AutomationRunPanel({ form, plan, busyAction, onChange, onRun, onCheck, onSendApproved }) {
  const reasons = plan?.reasons || [];
  const safety = plan?.safety || [];

  return (
    <section className="card">
      <div className="mb-5 flex items-start justify-between gap-4">
        <SectionHeader icon={Play} title="Rodar Autopilot" description="Rotina automatica: coleta aprovada, analise, score, mensagens, lote de aprovacao e fila aprovada." compact />
        <span className={`badge ${plan?.ready ? 'badge-success' : 'badge-warning'}`}>{plan?.ready ? 'Pronto' : 'Revisar'}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Credencial de coleta">
          <input className="input" value={form.credential_id} onChange={(event) => onChange('credential_id', event.target.value)} placeholder="ID da credencial" />
        </Field>
        <Field label="Limite de leads">
          <input className="input" type="number" min="1" max="100" value={form.limit} onChange={(event) => onChange('limit', event.target.value)} />
        </Field>
        <Field label="Busca do dia">
          <input className="input" value={form.query} onChange={(event) => onChange('query', event.target.value)} placeholder="Ex.: clinicas em Cuiaba, MT" />
        </Field>
        <Field label="Cidade">
          <input className="input" value={form.city} onChange={(event) => onChange('city', event.target.value)} placeholder="Cidade" />
        </Field>
        <Field label="Nicho">
          <input className="input" value={form.niche} onChange={(event) => onChange('niche', event.target.value)} placeholder="Nicho" />
        </Field>
        <Field label="Score minimo para abordagem">
          <input className="input" type="number" min="0" max="100" value={form.min_score} onChange={(event) => onChange('min_score', event.target.value)} />
        </Field>
        <Field label="Itens por lote">
          <input className="input" type="number" min="1" max="10" value={form.batch_limit} onChange={(event) => onChange('batch_limit', event.target.value)} />
        </Field>
        <Field label="Expiracao do lote">
          <input className="input" type="number" min="10" max="1440" value={form.batch_expires_in_minutes} onChange={(event) => onChange('batch_expires_in_minutes', event.target.value)} />
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/40">
          <input className="mt-1" type="checkbox" checked={form.verify_whatsapp_exists} onChange={(event) => onChange('verify_whatsapp_exists', event.target.checked)} />
          <span>Verificar WhatsApp antes de salvar</span>
        </label>
        <label className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/40">
          <input className="mt-1" type="checkbox" checked={form.send_approval_request} onChange={(event) => onChange('send_approval_request', event.target.checked)} />
          <span>Enviar lote para meu WhatsApp pessoal</span>
        </label>
        <label className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/40">
          <input className="mt-1" type="checkbox" checked={form.process_approved} onChange={(event) => onChange('process_approved', event.target.checked)} />
          <span>Trabalhar mensagens ja aprovadas</span>
        </label>
        <label className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900/40">
          <input className="mt-1" type="checkbox" checked={form.ignore_schedule} onChange={(event) => onChange('ignore_schedule', event.target.checked)} />
          <span>Enviar aprovadas agora, sem esperar horario agendado</span>
        </label>
      </div>

      {reasons.length > 0 ? <InfoList title="O que o sistema observou" items={reasons} /> : null}
      {safety.length > 0 ? <InfoList title="Travas aplicadas" items={safety} /> : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onRun} className="btn btn-primary flex-1" disabled={busyAction === 'run-automation'}>
          {busyAction === 'run-automation' ? 'Rodando...' : 'Rodar Autopilot agora'}
        </button>
        <button type="button" onClick={onSendApproved} className="btn btn-secondary flex-1" disabled={busyAction === 'send-approved'}>
          Enviar aprovadas agora
        </button>
        <button type="button" onClick={onCheck} className="btn btn-secondary flex-1" disabled={busyAction === 'check-automation'}>
          Verificar sem executar
        </button>
      </div>
    </section>
  );
}

function AutomationRulesPanel({ rules, form, editingRuleId, busyAction, onChange, onSubmit, onReset, onEdit, onToggle, onDelete }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <SectionHeader icon={Settings} title="Configuracao da automacao" description="Define quais leads o Autopilot pode escolher, quando pode atuar e quais limites deve obedecer." compact />
        {editingRuleId ? <button type="button" onClick={onReset} className="btn btn-secondary px-2 py-1 text-xs">Nova</button> : null}
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input" value={form.name} onChange={(event) => onChange('name', event.target.value)} placeholder="Nome da automacao" required />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select className="input" value={form.mode} onChange={(event) => onChange('mode', event.target.value)}>
            <option value="assistido">Assistido</option>
            <option value="automatico">Automatico controlado</option>
          </select>
          <input className="input" type="number" min="0" max="100" value={form.min_score} onChange={(event) => onChange('min_score', event.target.value)} placeholder="Score minimo" />
          <input className="input" value={form.source_type} onChange={(event) => onChange('source_type', event.target.value)} placeholder="Fonte" />
          <input className="input" value={form.city} onChange={(event) => onChange('city', event.target.value)} placeholder="Cidade" />
          <input className="input" value={form.niche} onChange={(event) => onChange('niche', event.target.value)} placeholder="Nicho" />
          <input className="input" value={form.timezone} onChange={(event) => onChange('timezone', event.target.value)} placeholder="Timezone" />
          <input className="input" type="number" min="1" value={form.max_daily_sends} onChange={(event) => onChange('max_daily_sends', event.target.value)} placeholder="Limite diario" />
          <input className="input" type="number" min="1" value={form.max_hourly_sends} onChange={(event) => onChange('max_hourly_sends', event.target.value)} placeholder="Limite por hora" />
          <input className="input" type="time" value={form.send_window_start} onChange={(event) => onChange('send_window_start', event.target.value)} />
          <input className="input" type="time" value={form.send_window_end} onChange={(event) => onChange('send_window_end', event.target.value)} />
        </div>
        <div className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(event) => onChange('enabled', event.target.checked)} /> Automacao ativa</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.require_manual_approval} onChange={(event) => onChange('require_manual_approval', event.target.checked)} /> Exigir aprovacao antes de mensagens novas</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.stop_on_reply} onChange={(event) => onChange('stop_on_reply', event.target.checked)} /> Parar follow-up quando houver resposta</label>
        </div>
        <textarea className="input min-h-20" value={form.notes} onChange={(event) => onChange('notes', event.target.value)} placeholder="Notas internas" />
        <button type="submit" className="btn btn-primary w-full" disabled={busyAction === 'save-rule'}>{editingRuleId ? 'Atualizar automacao' : 'Salvar automacao'}</button>
      </form>

      <div className="mt-5 space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{rule.city || 'Todas cidades'} • {rule.niche || 'Todos nichos'} • score {rule.min_score}</div>
              </div>
              <StatusBadge status={rule.enabled ? 'approved' : 'cancelled'} label={rule.enabled ? 'ativa' : 'pausada'} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onEdit(rule)} className="btn btn-secondary px-2 py-1 text-xs">Editar</button>
              <button type="button" onClick={() => onToggle(rule)} className="btn btn-secondary px-2 py-1 text-xs">{rule.enabled ? 'Pausar' : 'Ativar'}</button>
              <button type="button" onClick={() => onDelete(rule)} className="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs"><Trash2 className="h-3 w-3" /> Excluir</button>
            </div>
          </div>
        ))}
        {rules.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma automacao configurada ainda.</p> : null}
      </div>
    </section>
  );
}

function ApprovalPanel({ batches, pendingMessages, approvedMessages, busyAction, onOpenBatch, onResendBatch, onCancelBatch, onSendApproved }) {
  return (
    <section className="card">
      <SectionHeader icon={Inbox} title="Aprovacoes e fila" description="Lotes sao criados pelo Autopilot. Aqui voce revisa, reenvia solicitacao e acompanha a fila." compact />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QueuePreview title="Aguardando aprovacao" items={pendingMessages} empty="Nenhuma mensagem pendente." />
        <QueuePreview title="Aprovadas para envio" items={approvedMessages} empty="Nenhuma mensagem aprovada." actionLabel="Enviar aprovadas" onAction={onSendApproved} busy={busyAction === 'send-approved'} />
      </div>

      <div className="mt-5 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Lotes recentes</h3>
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
                <button type="button" onClick={() => onOpenBatch(batch.id)} className="btn btn-secondary px-2 py-1 text-xs">Ver lote</button>
                <button type="button" onClick={() => onResendBatch(batch)} disabled={busyAction || !isOpen} className="btn btn-secondary px-2 py-1 text-xs">Reenviar aprovacao</button>
                <button type="button" onClick={() => onCancelBatch(batch)} disabled={busyAction || !isOpen} className="btn btn-secondary flex items-center gap-1 px-2 py-1 text-xs"><Ban className="h-3 w-3" /> Cancelar</button>
              </div>
            </div>
          );
        })}
        {batches.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum lote criado ainda.</p> : null}
      </div>
    </section>
  );
}

function QueuePreview({ title, items, empty, actionLabel, onAction, busy }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {onAction ? <button type="button" onClick={onAction} disabled={busy} className="btn btn-secondary px-2 py-1 text-xs">{busy ? 'Processando...' : actionLabel}</button> : null}
      </div>
      <div className="mt-3 space-y-2">
        {items.map((message) => (
          <div key={message.id} className="rounded-md bg-gray-50 p-2 text-sm dark:bg-gray-900/40">
            <div className="font-medium text-gray-900 dark:text-gray-100">{message.nome_empresa || 'Lead sem nome'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{message.message_type} • {message.cidade || '-'} • {message.nicho || '-'}</div>
          </div>
        ))}
        {items.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">{empty}</p> : null}
      </div>
    </div>
  );
}

function AuditPanel({ runs, lastResult, selectedBatch }) {
  return (
    <section className="card">
      <SectionHeader icon={Clock} title="Auditoria da automacao" description="Ultimas execucoes e lote aberto para conferencia." compact />
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {runs.slice(0, 6).map((run) => (
            <div key={run.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-gray-900 dark:text-gray-100">#{run.id} {run.type}</div>
                <StatusBadge status={run.status} />
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">avaliados {run.leads_evaluated || 0} • fila {run.messages_queued || 0} • ignorados {run.messages_skipped || 0}</div>
            </div>
          ))}
          {runs.length === 0 ? <p className="text-sm text-gray-500">Nenhuma execucao ainda.</p> : null}
        </div>
        <div>
          {selectedBatch ? <BatchDetails selectedBatch={selectedBatch} /> : (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              {lastResult ? JSON.stringify(lastResult, null, 2) : 'Selecione um lote ou rode uma acao para ver detalhes.'}
            </pre>
          )}
        </div>
      </div>
    </section>
  );
}

function BatchDetails({ selectedBatch }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Lote #{selectedBatch.batch.id}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBatch.items.length} item(ns)</p>
        </div>
        <StatusBadge status={selectedBatch.batch.status} />
      </div>
      <div className="space-y-2">
        {selectedBatch.items.map((item) => (
          <div key={item.batch_item_id} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.position}. {item.nome_empresa || 'Lead sem nome'}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{item.cidade || '-'} • {item.nicho || '-'} • score {item.score ?? '-'}</div>
              </div>
              <StatusBadge status={item.batch_item_status || item.status} />
            </div>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{item.payload_json?.message || item.payload_json?.text || item.mensagem_whatsapp || 'Mensagem nao disponivel.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SafetyList() {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Como o Autopilot deve se comportar</h3>
      <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
        <li>Coleta real so acontece quando voce roda o Autopilot com coleta aprovada.</li>
        <li>Mensagens novas entram em lote e precisam de aprovacao.</li>
        <li>Aprovar lote nao envia automaticamente; so libera para a fila aprovada.</li>
        <li>Enviar aprovadas processa somente itens com status `approved`.</li>
        <li>Stop-on-reply deve cancelar follow-ups quando o lead respondeu.</li>
        <li>Configuracoes de regra definem limites, janela e filtros comerciais.</li>
      </ul>
    </div>
  );
}

function InfoList({ title, items }) {
  return (
    <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
        {items.slice(0, 5).map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SectionHeader({ icon: Icon, title, description, compact = false }) {
  return (
    <div className={`flex items-start gap-2 ${compact ? '' : 'mb-1'}`}>
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-300" />
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {description ? <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p> : null}
      </div>
    </div>
  );
}

function StatusBadge({ status, label }) {
  return <span className={`badge ${STATUS_BADGES[status] || 'badge-secondary'}`}>{label || STATUS_LABELS[status] || status || '-'}</span>;
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

function toneClasses(tone) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/60 dark:bg-blue-900/20 dark:text-blue-200',
    green: 'border-green-200 bg-green-50 text-green-950 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-200',
    yellow: 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200',
  };
  return tones[tone] || tones.blue;
}
