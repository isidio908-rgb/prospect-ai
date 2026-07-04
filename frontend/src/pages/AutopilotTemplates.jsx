import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, FileText, RefreshCw, Save, Search } from 'lucide-react';
import { autopilot, leads as leadsApi } from '../services/api';

export default function AutopilotTemplates() {
  const [catalog, setCatalog] = useState({ tones: [], niches: [] });
  const [leads, setLeads] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ lead_id: '', tone: 'consultivo', niche_key: '' });

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) => [lead.nome_empresa, lead.cidade, lead.nicho, lead.categoria]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)));
  }, [leads, search]);

  async function loadData() {
    setLoading(true);
    try {
      const [catalogResponse, leadsResponse] = await Promise.all([
        autopilot.templateCatalog(),
        leadsApi.list({ limit: 100, sortBy: 'score', sortOrder: 'DESC' }),
      ]);
      setCatalog(catalogResponse.data || { tones: [], niches: [] });
      setLeads(leadsResponse.data.leads || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel carregar templates');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function buildPreview() {
    if (!form.lead_id) {
      toast.error('Selecione um lead para gerar o template');
      return;
    }

    setBusy('preview');
    try {
      const response = await autopilot.previewTemplate({
        lead_id: Number(form.lead_id),
        tone: form.tone,
        niche_key: form.niche_key || undefined,
      });
      setPreview(response.data);
      toast.success('Template gerado para revisao');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel gerar template');
    } finally {
      setBusy('');
    }
  }

  async function applyTemplate() {
    if (!form.lead_id) {
      toast.error('Selecione um lead para aplicar o template');
      return;
    }

    setBusy('apply');
    try {
      const response = await autopilot.applyTemplate({
        lead_id: Number(form.lead_id),
        tone: form.tone,
        niche_key: form.niche_key || undefined,
      });
      setPreview(response.data.template);
      toast.success('Template aplicado ao lead. Revise antes de enviar.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel aplicar template');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">Autopilot SDR</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Templates comerciais</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Gere mensagens por nicho, tom e contexto profissional. Aplicar template apenas atualiza o lead; nao envia WhatsApp.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100">
        Templates usam apenas dados observados no lead. Eles nao devem inventar campanha ativa, faturamento, investimento, resultado ou problema nao detectado.
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Gerar template</h2>
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
                value={form.lead_id}
                onChange={(event) => setForm((current) => ({ ...current, lead_id: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">Selecione um lead</option>
                {filteredLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.nome_empresa} - {lead.cidade || '-'} - score {lead.score ?? '-'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Nicho</label>
                <select
                  value={form.niche_key}
                  onChange={(event) => setForm((current) => ({ ...current, niche_key: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Detectar pelo lead</option>
                  {catalog.niches.map((niche) => (
                    <option key={niche.key} value={niche.key}>{niche.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Tom</label>
                <select
                  value={form.tone}
                  onChange={(event) => setForm((current) => ({ ...current, tone: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  {catalog.tones.map((tone) => (
                    <option key={tone.key} value={tone.key}>{tone.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={buildPreview}
                disabled={busy === 'preview'}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {busy === 'preview' ? 'Gerando...' : 'Gerar previa'}
              </button>
              <button
                onClick={applyTemplate}
                disabled={busy === 'apply'}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
              >
                <Save className="h-4 w-4" />
                {busy === 'apply' ? 'Aplicando...' : 'Aplicar no lead'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Previa do template</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Revise antes de copiar, aplicar ou colocar em qualquer fila de mensagem.</p>
          </div>

          {!preview ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Selecione um lead e gere uma previa.</p>
          ) : (
            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoCard label="Nicho" value={preview.niche_label} />
                <InfoCard label="Tom" value={preview.tone_label} />
                <InfoCard label="Dores" value={preview.pains?.length || 0} />
              </div>

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Fatos observados</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-200">
                  {(preview.observed_facts || []).map((fact) => <li key={fact}>{fact}</li>)}
                </ul>
              </div>

              <TemplateBox title="Mensagem inicial" text={preview.messages.initial} onCopy={copyText} />
              <TemplateBox title="Follow-up" text={preview.messages.followup} onCopy={copyText} />
              <TemplateBox title="Diagnostico curto" text={preview.messages.diagnostic} onCopy={copyText} />
              <TemplateBox title="Contexto profissional para LLM" text={preview.professional_context} onCopy={copyText} muted />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-lg bg-primary-50 p-3 dark:bg-primary-900/20">
      <p className="text-xs text-primary-700 dark:text-primary-200">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-50">{value}</p>
    </div>
  );
}

function TemplateBox({ title, text, onCopy, muted = false }) {
  return (
    <div className={`rounded-lg border p-3 ${muted ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50' : 'border-primary-100 bg-white dark:border-primary-900/50 dark:bg-gray-900'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</p>
        <button
          onClick={() => onCopy(text)}
          className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100"
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar
        </button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-700 dark:text-gray-100">{text}</pre>
    </div>
  );
}
