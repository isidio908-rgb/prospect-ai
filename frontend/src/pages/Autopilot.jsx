import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ListChecks,
  MessageSquare,
  Pencil,
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

const QUEUE_STATUS_LABELS = {
  pending: 'Pendente',
  approved: 'Aprovada',
  queued: 'Na fila',
  sent: 'Enviada',
  skipped: 'Ignorada',
  failed: 'Falhou',
  cancelled: 'Cancelada',
};

const BATCH_STATUS_LABELS = {
  pending: 'Pendente',
  partially_approved: 'Parcialmente aprovado',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

const STATUS_BADGES = {
  pending: 'badge-warning',
  partially_approved: 'badge-warning',
  approved: 'badge-success',
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
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [updatingMessageId, setUpdatingMessageId] = useState(null);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE);
  const [batchForm, setBatchForm] = useState(EMPTY_BATCH_FORM);
  const [queueFilters, setQueueFilters] = useState({ status: 'pending', message_type: '', city: '', niche: '', rule: '' });

  useEffect(() => {
    loadAutopilot();
  }, []);

  async function loadAutopilot() {
    setLoading(true);
    try {
      const [rulesResponse, queueResponse, batchesResponse] = await Promise.all([
        autopilot.listRules(),
        autopilot.listQueue({ limit: 100 }),
        autopilot.listApprovalBatches({ limit: 30 }),
      ]);
      setRules(rulesResponse.data.rules || []);
      setQueue(queueResponse.data.messages || []);
      setBatches(batchesResponse.data.batches || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao carregar Autopilot');
    } finally {
      setLoading(false);
    }
  }

  const filteredQueue = useMemo(() => {
    return queue.filter((message) => {
      const city = message.cidade || '';
      const niche = message.nicho || '';
      const ruleName = message.automation_rule_name || '';
      return (!queueFilters.status || message.status === queueFilters.status)
        && (!queueFilters.message_type || message.message_type === queueFilters.message_type)
        && (!queueFilters.city || city === queueFilters.city)
        && (!queueFilters.niche || niche === queueFilters.niche)
        && (!queueFilters.rule || ruleName === queueFilters.rule);
    });
  }, [queue, queueFilters]);

  const queueOptions = useMemo(() => ({
    cities: uniqueValues(queue.map((message) => message.cidade)),
    niches: uniqueValues(queue.map((message) => message.nicho)),
    rules: uniqueValues(queue.map((message) => message.automation_rule_name)),
    types: uniqueValues(queue.map((message) => message.message_type)),
  }), [queue]);

  const summary = useMemo(() => ({
    activeRules: rules.filter((rule) => rule.enabled).length,
    pending: queue.filter((message) => message.status === 'pending').length,
    approved: queue.filter((message) => message.status === 'approved').length,
    sent: queue.filter((message) => message.status === 'sent').length,
    pendingBatches: batches.filter((batch) => batch.status === 'pending' || batch.status === 'partially_approved').length,
  }), [rules, queue, batches]);

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
    setSavingRule(true);
    try {
      const payload = normalizeRulePayload(ruleForm);
      if (editingRuleId) {
        await autopilot.updateRule(editingRuleId, payload);
        toast.success('Regra atualizada');
      } else {
        await autopilot.createRule(payload);
        toast.success('Regra criada');
      }
      resetRuleForm();
      await loadAutopilot();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar regra');
    } finally {
      setSavingRule(false);
    }
  }

  async function deleteRule(rule) {
    const confirmed = window.confirm(`Excluir a regra "${rule.name}"?`);
    if (!confirmed) return;

    try {
      await autopilot.deleteRule(rule.id);
      toast.success('Regra excluída');
      await loadAutopilot();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao excluir regra');
    }
  }

  async function toggleRule(rule) {
    try {
      await autopilot.updateRule(rule.id, { enabled: !rule.enabled });
      toast.success(rule.enabled ? 'Regra pausada' : 'Regra ativada');
      await loadAutopilot();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao alterar regra');
    }
  }

  async function updateQueueMessage(message, action) {
    setUpdatingMessageId(message.id);
    try {
      if (action === 'approve') {
        await autopilot.approveMessage(message.id);
        toast.success('Mensagem aprovada para envio futuro');
      } else {
        await autopilot.cancelMessage(message.id);
        toast.success('Mensagem cancelada');
      }
      await loadAutopilot();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar mensagem');
    } finally {
      setUpdatingMessageId(null);
    }
  }

  async function createBatch(event) {
    event.preventDefault();
    setCreatingBatch(true);
    try {
      const payload = normalizeBatchPayload(batchForm);
      const response = await autopilot.createApprovalBatch(payload);
      toast.success(payload.send_approval_request ? 'Lote enviado para aprovação' : 'Lote criado sem envio externo');
      setBatchForm(EMPTY_BATCH_FORM);
      await loadAutopilot();
      if (response.data?.batch?.id) {
        await openBatch(response.data.batch.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao criar lote');
    } finally {
      setCreatingBatch(false);
    }
  }

  async function openBatch(id) {
    try {
      const response = await autopilot.getApprovalBatch(id);
      setSelectedBatch(response.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao abrir lote');
    }
  }

  function resetQueueFilters() {
    setQueueFilters({ status: 'pending', message_type: '', city: '', niche: '', rule: '' });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-300">
            <Bot className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Autopilot SDR</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Automação assistida</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure regras, revise a fila e aprove lotes pelo WhatsApp pessoal antes de qualquer envio.
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
            <p className="font-semibold">Modo seguro assistido ativo</p>
            <p>Aprovar uma mensagem muda o status para <strong>approved</strong>, mas não envia automaticamente para o lead. O worker de envio controlado será uma etapa futura.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Regras ativas" value={summary.activeRules} tone="blue" />
        <Metric label="Pendentes" value={summary.pending} tone="yellow" />
        <Metric label="Aprovadas" value={summary.approved} tone="green" />
        <Metric label="Enviadas" value={summary.sent} tone="gray" />
        <Metric label="Lotes abertos" value={summary.pendingBatches} tone="blue" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="card xl:col-span-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary-600 dark:text-primary-300" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Regras</h2>
            </div>
            {editingRuleId && (
              <button type="button" onClick={resetRuleForm} className="btn btn-secondary text-xs py-1 px-2">Nova</button>
            )}
          </div>

          <form onSubmit={saveRule} className="space-y-3">
            <input className="input" value={ruleForm.name} onChange={(event) => updateRuleField('name', event.target.value)} placeholder="Nome da regra" required />

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Modo
                <select className="input mt-1" value={ruleForm.mode} onChange={(event) => updateRuleField('mode', event.target.value)}>
                  <option value="assistido">Assistido</option>
                  <option value="automatico">Automático controlado</option>
                </select>
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Score mínimo
                <input className="input mt-1" type="number" min="0" max="100" value={ruleForm.min_score} onChange={(event) => updateRuleField('min_score', event.target.value)} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input className="input" value={ruleForm.source_type} onChange={(event) => updateRuleField('source_type', event.target.value)} placeholder="Fonte: serper/apify/rapidapi" />
              <input className="input" value={ruleForm.city} onChange={(event) => updateRuleField('city', event.target.value)} placeholder="Cidade" />
              <input className="input" value={ruleForm.niche} onChange={(event) => updateRuleField('niche', event.target.value)} placeholder="Nicho" />
              <input className="input" value={ruleForm.timezone} onChange={(event) => updateRuleField('timezone', event.target.value)} placeholder="Timezone" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Limite diário
                <input className="input mt-1" type="number" min="1" value={ruleForm.max_daily_sends} onChange={(event) => updateRuleField('max_daily_sends', event.target.value)} />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Limite horário
                <input className="input mt-1" type="number" min="1" value={ruleForm.max_hourly_sends} onChange={(event) => updateRuleField('max_hourly_sends', event.target.value)} />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Início
                <input className="input mt-1" type="time" value={ruleForm.send_window_start} onChange={(event) => updateRuleField('send_window_start', event.target.value)} />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Fim
                <input className="input mt-1" type="time" value={ruleForm.send_window_end} onChange={(event) => updateRuleField('send_window_end', event.target.value)} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Follow-up 1 (h)
                <input className="input mt-1" type="number" min="1" value={ruleForm.followup_1_delay_hours} onChange={(event) => updateRuleField('followup_1_delay_hours', event.target.value)} />
              </label>
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Follow-up 2 (h)
                <input className="input mt-1" type="number" min="1" value={ruleForm.followup_2_delay_hours} onChange={(event) => updateRuleField('followup_2_delay_hours', event.target.value)} />
              </label>
            </div>

            <div className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={ruleForm.enabled} onChange={(event) => updateRuleField('enabled', event.target.checked)} />
                Regra ativa
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={ruleForm.require_manual_approval} onChange={(event) => updateRuleField('require_manual_approval', event.target.checked)} />
                Exigir aprovação manual
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={ruleForm.stop_on_reply} onChange={(event) => updateRuleField('stop_on_reply', event.target.checked)} />
                Parar follow-ups ao responder
              </label>
            </div>

            <textarea className="input min-h-20" value={ruleForm.notes} onChange={(event) => updateRuleField('notes', event.target.value)} placeholder="Notas internas da regra" />

            <button type="submit" className="btn btn-primary w-full flex items-center justify-center gap-2" disabled={savingRule}>
              <Plus className="h-4 w-4" />
              {savingRule ? 'Salvando...' : editingRuleId ? 'Atualizar regra' : 'Criar regra'}
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {rules.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma regra criada ainda.</p>
            ) : rules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{rule.name}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {rule.city || 'Todas cidades'} • {rule.niche || 'Todos nichos'} • score {rule.min_score}
                    </div>
                  </div>
                  <span className={`badge ${rule.enabled ? 'badge-success' : 'badge-secondary'}`}>{rule.enabled ? 'ativa' : 'pausada'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => editRule(rule)} className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  <button type="button" onClick={() => toggleRule(rule)} className="btn btn-secondary text-xs py-1 px-2">
                    {rule.enabled ? 'Pausar' : 'Ativar'}
                  </button>
                  <button type="button" onClick={() => deleteRule(rule)} className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 xl:col-span-2">
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary-600 dark:text-primary-300" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Fila de mensagens</h2>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
              <Select value={queueFilters.status} onChange={(value) => setQueueFilters((current) => ({ ...current, status: value }))}>
                <option value="">Todos status</option>
                {Object.entries(QUEUE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <Select value={queueFilters.message_type} onChange={(value) => setQueueFilters((current) => ({ ...current, message_type: value }))}>
                <option value="">Todos tipos</option>
                {queueOptions.types.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
              <Select value={queueFilters.city} onChange={(value) => setQueueFilters((current) => ({ ...current, city: value }))}>
                <option value="">Todas cidades</option>
                {queueOptions.cities.map((city) => <option key={city} value={city}>{city}</option>)}
              </Select>
              <Select value={queueFilters.niche} onChange={(value) => setQueueFilters((current) => ({ ...current, niche: value }))}>
                <option value="">Todos nichos</option>
                {queueOptions.niches.map((niche) => <option key={niche} value={niche}>{niche}</option>)}
              </Select>
              <button type="button" onClick={resetQueueFilters} className="btn btn-secondary">Limpar</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Lead</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Agendada</th>
                    <th className="px-3 py-2 text-left">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan="5" className="px-3 py-6 text-center text-gray-500">Carregando...</td></tr>
                  ) : filteredQueue.length === 0 ? (
                    <tr><td colSpan="5" className="px-3 py-6 text-center text-gray-500">Nenhuma mensagem no filtro.</td></tr>
                  ) : filteredQueue.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-3 py-3 min-w-64">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{message.nome_empresa || 'Lead sem nome'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{message.cidade || '-'} • {message.nicho || '-'} • score {message.score ?? '-'}</div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{message.message_type}</td>
                      <td className="px-3 py-3"><StatusBadge status={message.status} labels={QUEUE_STATUS_LABELS} /></td>
                      <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(message.scheduled_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => updateQueueMessage(message, 'approve')} disabled={updatingMessageId === message.id || message.status !== 'pending'} className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Aprovar
                          </button>
                          <button type="button" onClick={() => updateQueueMessage(message, 'cancel')} disabled={updatingMessageId === message.id || message.status === 'sent'} className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="mb-4 flex items-center gap-2">
                <Send className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Criar lote</h2>
              </div>

              <form onSubmit={createBatch} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    Limite
                    <input className="input mt-1" type="number" min="1" max="10" value={batchForm.limit} onChange={(event) => updateBatchField('limit', event.target.value)} />
                  </label>
                  <label className="text-xs text-gray-600 dark:text-gray-400">
                    Expira em min.
                    <input className="input mt-1" type="number" min="10" max="1440" value={batchForm.expires_in_minutes} onChange={(event) => updateBatchField('expires_in_minutes', event.target.value)} />
                  </label>
                  <input className="input" value={batchForm.min_score} onChange={(event) => updateBatchField('min_score', event.target.value)} placeholder="Score mínimo opcional" />
                  <input className="input" value={batchForm.source_type} onChange={(event) => updateBatchField('source_type', event.target.value)} placeholder="Fonte opcional" />
                  <input className="input" value={batchForm.city} onChange={(event) => updateBatchField('city', event.target.value)} placeholder="Cidade opcional" />
                  <input className="input" value={batchForm.niche} onChange={(event) => updateBatchField('niche', event.target.value)} placeholder="Nicho opcional" />
                </div>

                <label className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                  <input type="checkbox" checked={batchForm.send_approval_request} onChange={(event) => updateBatchField('send_approval_request', event.target.checked)} />
                  Enviar solicitação ao WhatsApp pessoal
                </label>

                <button type="submit" className="btn btn-primary w-full flex items-center justify-center gap-2" disabled={creatingBatch}>
                  <MessageSquare className="h-4 w-4" />
                  {creatingBatch ? 'Criando...' : 'Criar lote'}
                </button>
              </form>
            </div>

            <div className="card">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Lotes recentes</h2>
              </div>

              <div className="space-y-3">
                {batches.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum lote criado ainda.</p>
                ) : batches.map((batch) => (
                  <button key={batch.id} type="button" onClick={() => openBatch(batch.id)} className="w-full rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">Lote #{batch.id}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {batch.approved_items || 0} aprovados • {batch.cancelled_items || 0} cancelados • {batch.total_items || 0} itens
                        </div>
                      </div>
                      <StatusBadge status={batch.status} labels={BATCH_STATUS_LABELS} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedBatch && (
            <div className="card">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">Lote #{selectedBatch.batch.id}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Expira em {formatDate(selectedBatch.batch.expires_at)} • {selectedBatch.items.length} item(ns)
                  </p>
                </div>
                <StatusBadge status={selectedBatch.batch.status} labels={BATCH_STATUS_LABELS} />
              </div>

              <div className="space-y-3">
                {selectedBatch.items.map((item) => (
                  <div key={item.batch_item_id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.position}. {item.nome_empresa || 'Lead sem nome'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.cidade || '-'} • {item.nicho || '-'} • score {item.score ?? '-'} • tipo {item.message_type}
                        </div>
                      </div>
                      <StatusBadge status={item.batch_item_status || item.status} labels={QUEUE_STATUS_LABELS} />
                    </div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      {item.payload_json?.message || item.payload_json?.text || item.mensagem_whatsapp || 'Mensagem não disponível.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
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

  if (String(form.min_score || '').trim()) {
    payload.min_score = Number(form.min_score);
  }

  return payload;
}

function Metric({ label, value, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300',
  };

  return (
    <div className={`rounded-lg p-4 ${tones[tone]}`}>
      <div className="text-2xl font-bold">{value ?? 0}</div>
      <div className="mt-1 text-xs opacity-80">{label}</div>
    </div>
  );
}

function Select({ value, onChange, children }) {
  return <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>;
}

function StatusBadge({ status, labels }) {
  return <span className={`badge ${STATUS_BADGES[status] || 'badge-secondary'}`}>{labels[status] || status || '-'}</span>;
}

function uniqueValues(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}
