import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarClock, CheckCircle2, Clock3, Copy, RefreshCw, Search } from 'lucide-react';
import { autopilot, leads as leadsApi } from '../services/api';

const DEFAULT_FORM = {
  timezone: 'America/Cuiaba',
  duration_minutes: 15,
  preferred_period: 'all',
  note: '',
  scheduled_for: '',
};

function selectedLeadLabel(lead) {
  if (!lead) return '';
  return `${lead.nome_empresa} - ${lead.cidade || '-'} - score ${lead.score ?? '-'}`;
}

export default function AutopilotScheduling() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [preview, setPreview] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const selectedLead = useMemo(
    () => leads.find((lead) => String(lead.id) === String(selectedLeadId)),
    [leads, selectedLeadId]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads(search);
    }, search.trim() ? 350 : 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function loadLeads(term = search) {
    setLoading(true);
    try {
      const trimmed = term.trim();
      const response = await leadsApi.list({
        limit: 100,
        search: trimmed || undefined,
        sortBy: 'score',
        sortOrder: 'DESC',
      });
      setLeads(response.data.leads || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel carregar leads');
    } finally {
      setLoading(false);
    }
  }

  async function generatePreview() {
    if (!selectedLeadId) {
      toast.error('Selecione um lead para gerar o convite');
      return;
    }

    setBusy('preview');
    setConfirmation(null);
    try {
      const response = await autopilot.schedulingPreview({
        lead_id: Number(selectedLeadId),
        timezone: form.timezone,
        duration_minutes: Number(form.duration_minutes),
        preferred_period: form.preferred_period,
        note: form.note,
        count: 5,
      });
      setPreview(response.data);
      toast.success('Convite gerado. Nenhuma mensagem foi enviada.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel gerar convite');
    } finally {
      setBusy('');
    }
  }

  async function confirmMeeting() {
    if (!selectedLeadId) {
      toast.error('Selecione um lead');
      return;
    }

    if (!form.scheduled_for.trim()) {
      toast.error('Informe o horario combinado antes de confirmar');
      return;
    }

    const ok = window.confirm('Confirmar reuniao no CRM? Nenhum WhatsApp ou calendario externo sera acionado.');
    if (!ok) return;

    setBusy('confirm');
    try {
      const response = await autopilot.confirmScheduling({
        lead_id: Number(selectedLeadId),
        scheduled_for: form.scheduled_for,
        timezone: form.timezone,
        duration_minutes: Number(form.duration_minutes),
        note: form.note,
      });
      setConfirmation(response.data);
      toast.success('Reuniao registrada no CRM');
      await loadLeads(search);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel registrar reuniao');
    } finally {
      setBusy('');
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text || '');
      toast.success('Texto copiado');
    } catch {
      toast.error('Nao foi possivel copiar');
    }
  }

  function pickSlot(slot) {
    updateField('scheduled_for', slot.value);
    toast.success('Horario sugerido selecionado');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">Autopilot SDR</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Agendamento comercial assistido</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Gere convite de reuniao, copie a mensagem e registre o horario combinado no CRM sem envio automatico.
          </p>
        </div>
        <button
          onClick={() => loadLeads(search)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar leads
        </button>
      </div>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100">
        Esta tela nao envia WhatsApp, nao cria fila de mensagens e nao cria evento em calendario externo. Ela apenas prepara o convite e registra a reuniao quando voce confirmar.
      </section>

      <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Preparar agendamento</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Buscar lead</label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Empresa, cidade ou nicho"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Lead</label>
              <select
                value={selectedLeadId}
                onChange={(event) => {
                  setSelectedLeadId(event.target.value);
                  setPreview(null);
                  setConfirmation(null);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">Selecione um lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{selectedLeadLabel(lead)}</option>
                ))}
              </select>
              {!loading && search.trim() && leads.length === 0 ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nenhum lead encontrado para esta busca.</p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Timezone
                <input
                  value={form.timezone}
                  onChange={(event) => updateField('timezone', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Duracao
                <select
                  value={form.duration_minutes}
                  onChange={(event) => updateField('duration_minutes', Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Periodo preferido
              <select
                value={form.preferred_period}
                onChange={(event) => updateField('preferred_period', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">Manha ou tarde</option>
                <option value="morning">Manha</option>
                <option value="afternoon">Tarde</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Observacao interna
              <textarea
                value={form.note}
                onChange={(event) => updateField('note', event.target.value)}
                rows={3}
                placeholder="Ex.: lead pediu para falar sobre Google Ads e WhatsApp"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </label>

            <button
              onClick={generatePreview}
              disabled={busy === 'preview'}
              className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {busy === 'preview' ? 'Gerando...' : 'Gerar convite'}
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Convite e confirmacao</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Copie a mensagem, envie pelo canal que preferir e registre somente depois que o lead aceitar o horario.
            </p>
          </div>

          {!preview ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Selecione um lead e gere o convite.</p>
          ) : (
            <div className="space-y-4 p-4">
              <div className="rounded-lg bg-primary-50 p-3 text-sm text-primary-900 dark:bg-primary-900/20 dark:text-primary-100">
                <p className="font-semibold">Lead selecionado</p>
                <p>{selectedLeadLabel(selectedLead || preview.lead)}</p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">Mensagem sugerida</h3>
                  <button
                    onClick={() => copyText(preview.suggested_message)}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </button>
                </div>
                <textarea
                  value={preview.suggested_message || ''}
                  readOnly
                  rows={9}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-50">
                  <Clock3 className="h-4 w-4 text-primary-600" />
                  Horarios sugeridos
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(preview.slots || []).map((slot) => (
                    <button
                      key={`${slot.value}-${slot.label}`}
                      onClick={() => pickSlot(slot)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:hover:bg-primary-900/20"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-50">{slot.label}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{slot.duration_minutes} min</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Horario combinado
                <input
                  value={form.scheduled_for}
                  onChange={(event) => updateField('scheduled_for', event.target.value)}
                  placeholder="Ex.: 2026-07-07 15:30 ou quinta as 10h"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
              </label>

              <button
                onClick={confirmMeeting}
                disabled={busy === 'confirm'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {busy === 'confirm' ? 'Confirmando...' : 'Confirmar reuniao no CRM'}
              </button>

              {confirmation ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-100">
                  <p className="font-semibold">Reuniao registrada</p>
                  <p>{confirmation.message}</p>
                  <p className="mt-1">Status do lead: {confirmation.lead?.status}</p>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
