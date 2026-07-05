import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { autopilot } from '../services/api';

const DEFAULT_FORM = {
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

function toText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function StatCard({ label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-200',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200',
    yellow: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    gray: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <div className={`rounded-lg p-4 ${tones[tone] || tones.blue}`}>
      <p className="text-2xl font-bold">{value ?? 0}</p>
      <p className="mt-1 text-sm">{label}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, label, description, danger, disabled, loading, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`text-left rounded-lg border p-4 transition hover:shadow-sm disabled:opacity-60 ${danger
        ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-100'
        : 'border-gray-200 bg-white text-gray-900 hover:border-primary-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
      }`}
    >
      <div className="flex items-center gap-2 font-semibold">
        <Icon className="h-5 w-5 text-primary-600 dark:text-primary-300" />
        {loading ? 'Executando...' : label}
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </button>
  );
}

export default function AutopilotSemiAuto() {
  const [plan, setPlan] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadPlan();
  }, []);

  async function loadPlan() {
    setLoading(true);
    try {
      const response = await autopilot.semiAutoPlan();
      const nextPlan = response.data.plan;
      setPlan(nextPlan);
      hydrateForm(nextPlan);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao carregar plano semi-automático');
    } finally {
      setLoading(false);
    }
  }

  function hydrateForm(nextPlan) {
    const recommendation = nextPlan?.recommendation || {};
    setForm((current) => ({
      ...current,
      credential_id: toText(recommendation.credential_id, current.credential_id),
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

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function runCycle(actionKey, label, overrides, confirmMessage) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setBusy(actionKey);
    try {
      const payload = compactPayload(form, overrides);
      const response = await autopilot.runSemiAuto(payload);
      setResult({ label, data: response.data, at: new Date().toISOString() });
      toast.success(label);
      await loadPlan();
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || `Erro: ${label}`);
    } finally {
      setBusy('');
    }
  }

  const queue = plan?.queue || {};
  const leads = plan?.leads || {};
  const recommendation = plan?.recommendation || {};
  const canRun = Boolean(form.query && form.credential_id);
  const resultPreview = useMemo(() => result ? JSON.stringify(result.data, null, 2) : '', [result]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300">
            <Bot className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Autopilot Comercial</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">Operação semi-automática</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            O sistema lê o histórico, sugere a próxima coleta, analisa leads, cria mensagens, pede aprovação em lote e trabalha apenas a fila já aprovada.
          </p>
        </div>
        <button type="button" onClick={loadPlan} className="btn-secondary inline-flex items-center justify-center gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar plano
        </button>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-100">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-semibold">Trava principal ativa</p>
            <p className="text-sm">
              Coleta real exige aprovação explícita. Mensagens para leads só saem quando já estiverem com status approved, depois de stop-on-reply, e via worker confirmado.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pendentes" value={queue.pending} tone="yellow" />
        <StatCard label="Aprovadas" value={queue.approved} tone="green" />
        <StatCard label="Enviadas" value={queue.sent} tone="blue" />
        <StatCard label="Leads com score alto" value={leads.high_score} tone="green" />
        <StatCard label="Precisam análise" value={leads.need_analysis} tone="gray" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="card p-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Plano sugerido e parâmetros</h2>
          </div>

          {!plan?.ready && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">Plano ainda precisa de ajuste manual.</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {(plan?.reasons || ['Informe credencial, nicho/cidade e query.']).map((reason) => <li key={reason}>{reason}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="form-label md:col-span-2">
              Query de coleta
              <input className="input mt-1" value={form.query} onChange={(event) => updateField('query', event.target.value)} placeholder="imobiliarias em Cuiaba, MT" />
            </label>
            <label className="form-label">
              ID da credencial
              <input className="input mt-1" value={form.credential_id} onChange={(event) => updateField('credential_id', event.target.value)} placeholder="21" />
            </label>
            <label className="form-label">
              Limite de coleta
              <input className="input mt-1" type="number" min="1" max="100" value={form.limit} onChange={(event) => updateField('limit', event.target.value)} />
            </label>
            <label className="form-label">
              Cidade
              <input className="input mt-1" value={form.city} onChange={(event) => updateField('city', event.target.value)} placeholder="Cuiaba" />
            </label>
            <label className="form-label">
              Nicho
              <input className="input mt-1" value={form.niche} onChange={(event) => updateField('niche', event.target.value)} placeholder="imobiliarias" />
            </label>
            <label className="form-label">
              Região
              <input className="input mt-1" value={form.region} onChange={(event) => updateField('region', event.target.value)} />
            </label>
            <label className="form-label">
              Idioma
              <input className="input mt-1" value={form.language} onChange={(event) => updateField('language', event.target.value)} />
            </label>
            <label className="form-label">
              Score mínimo
              <input className="input mt-1" type="number" min="0" max="100" value={form.min_score} onChange={(event) => updateField('min_score', event.target.value)} />
            </label>
            <label className="form-label">
              Itens por lote
              <input className="input mt-1" type="number" min="1" max="10" value={form.batch_limit} onChange={(event) => updateField('batch_limit', event.target.value)} />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <input type="checkbox" checked={form.verify_whatsapp_exists} onChange={(event) => updateField('verify_whatsapp_exists', event.target.checked)} />
              Verificar WhatsApp na coleta
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <input type="checkbox" checked={form.force_refresh} onChange={(event) => updateField('force_refresh', event.target.checked)} />
              Ignorar cache
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <input type="checkbox" checked={form.analyze_saved_leads} onChange={(event) => updateField('analyze_saved_leads', event.target.checked)} />
              Analisar leads salvos
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <input type="checkbox" checked={form.create_approval_batch} onChange={(event) => updateField('create_approval_batch', event.target.checked)} />
              Criar lote de aprovação
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <input type="checkbox" checked={form.send_approval_request} onChange={(event) => updateField('send_approval_request', event.target.checked)} />
              Enviar lote ao WhatsApp pessoal
            </label>
            <label className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <input type="checkbox" checked={form.process_approved} onChange={(event) => updateField('process_approved', event.target.checked)} />
              Processar fila já aprovada
            </label>
          </div>
        </section>

        <aside className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Leitura do histórico</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p><strong>Fonte sugerida:</strong> {recommendation.source_type || '-'}</p>
            <p><strong>Credencial:</strong> {recommendation.credential_name || recommendation.credential_id || '-'}</p>
            <p><strong>Último recorte produtivo:</strong> {plan?.source_history?.saved_count ?? 0} salvos</p>
            <div>
              <strong>Motivos:</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(plan?.reasons?.length ? plan.reasons : ['Nenhum alerta relevante; pronto para simular.']).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
            <div>
              <strong>Segurança:</strong>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(plan?.safety || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Operação diária</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionButton
            icon={Play}
            label="Simular ciclo completo"
            description="Mostra o que seria coletado, analisado, enfileirado, aprovado e enviado sem executar nada real."
            loading={busy === 'simulate'}
            disabled={!canRun}
            onClick={() => runCycle('simulate', 'Simulação concluída', { dry_run: true, approve_collection: true })}
          />
          <ActionButton
            icon={CheckCircle2}
            label="Aprovar coleta e preparar lote"
            description="Coleta leads, analisa, cria fila pending e envia solicitação de lote para seu WhatsApp pessoal."
            loading={busy === 'execute'}
            disabled={!canRun}
            onClick={() => runCycle(
              'execute',
              'Ciclo semi-automático executado',
              { dry_run: false, approve_collection: true },
              'Executar coleta real, análise e criação de lote de aprovação?'
            )}
          />
          <ActionButton
            icon={ShieldCheck}
            label="Rodar stop-on-reply"
            description="Cancela follow-ups pendentes quando o lead já respondeu. Não envia mensagens."
            loading={busy === 'stop'}
            onClick={() => runCycle('stop', 'Stop-on-reply executado', {
              dry_run: false,
              approve_collection: false,
              create_approval_batch: false,
              process_approved: false,
            })}
          />
          <ActionButton
            icon={Send}
            label="Enviar aprovadas agora"
            description="Processa apenas mensagens approved, mesmo que tenham sido agendadas para mais tarde. Use somente depois de revisar e aprovar o lote."
            danger
            loading={busy === 'approved'}
            onClick={() => runCycle(
              'approved',
              'Fila aprovada processada',
              {
                dry_run: false,
                approve_collection: false,
                create_approval_batch: false,
                process_approved: true,
                ignore_schedule: true,
              },
              'Enviar agora as mensagens que já estão approved, ignorando o horário agendado? Confirme apenas se o WhatsApp está conectado e a fila foi revisada.'
            )}
          />
        </div>
      </section>

      {result && (
        <section className="card p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Último resultado: {result.label}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(result.at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
          <pre className="mt-4 max-h-[520px] overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100">{resultPreview}</pre>
        </section>
      )}
    </div>
  );
}
