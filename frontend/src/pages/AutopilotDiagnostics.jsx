import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Copy, RefreshCw, Save, Search } from 'lucide-react';
import { autopilot, leads as leadsApi } from '../services/api';

export default function AutopilotDiagnostics() {
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [search, setSearch] = useState('');
  const [diagnostic, setDiagnostic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

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

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLeads(search);
    }, search.trim() ? 350 : 0);

    return () => clearTimeout(timer);
  }, [search]);

  async function generateDiagnostic() {
    if (!selectedLeadId) {
      toast.error('Selecione um lead para gerar o diagnostico');
      return;
    }

    setBusy('generate');
    try {
      const response = await autopilot.advancedDiagnostic(Number(selectedLeadId));
      setDiagnostic(response.data);
      toast.success('Diagnostico comercial gerado');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel gerar diagnostico');
    } finally {
      setBusy('');
    }
  }

  async function applyDiagnostic() {
    if (!selectedLeadId) {
      toast.error('Selecione um lead para aplicar o diagnostico');
      return;
    }

    setBusy('apply');
    try {
      const response = await autopilot.applyAdvancedDiagnostic(Number(selectedLeadId));
      setDiagnostic(response.data.diagnostic);
      toast.success('Diagnostico salvo no lead. Nenhuma mensagem foi enviada.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Nao foi possivel aplicar diagnostico');
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Diagnostico comercial avancado</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Transforme dados do lead em resumo para WhatsApp, diagnostico Markdown, roteiro de Loom/audio, reuniao e oferta recomendada.
          </p>
        </div>
        <button
          onClick={() => loadLeads(search)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100">
        Esta tela nao envia WhatsApp e nao cria fila de mensagens. Ela separa fatos observados de inferencias e evita prometer faturamento, ROI ou volume de leads sem dados confirmados.
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Selecionar lead</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Buscar lead</label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Empresa, cidade, nicho ou status"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                A busca consulta o servidor para encontrar leads alem da primeira pagina carregada.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Lead</label>
              <select
                value={selectedLeadId}
                onChange={(event) => {
                  setSelectedLeadId(event.target.value);
                  setDiagnostic(null);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">Selecione um lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.nome_empresa} - {lead.cidade || '-'} - score {lead.score ?? '-'}
                  </option>
                ))}
              </select>
              {!loading && search.trim() && leads.length === 0 ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Nenhum lead encontrado para esta busca.</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={generateDiagnostic}
                disabled={busy === 'generate'}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {busy === 'generate' ? 'Gerando...' : 'Gerar diagnostico'}
              </button>
              <button
                onClick={applyDiagnostic}
                disabled={busy === 'apply'}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
              >
                <Save className="h-4 w-4" />
                {busy === 'apply' ? 'Salvando...' : 'Salvar no lead'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-50">Material comercial</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Copie apenas depois de revisar os fatos e ajustar ao contexto da conversa.</p>
          </div>

          {!diagnostic ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Selecione um lead e gere um diagnostico.</p>
          ) : (
            <div className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoCard label="Nicho" value={diagnostic.niche?.label || '-'} />
                <InfoCard label="Oferta" value={diagnostic.offer?.primary || '-'} />
                <InfoCard label="Pontos" value={diagnostic.gaps?.length || 0} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ChecklistBox title="Fatos observados" items={(diagnostic.facts || []).map((fact) => fact.label)} />
                <ChecklistBox title="Pontos de atencao" items={(diagnostic.gaps || []).map((gap) => `${gap.label}: ${gap.impact}`)} empty="Nenhum ponto critico identificado." />
              </div>

              <ChecklistBox title="Inferencias comerciais" items={diagnostic.inferences || []} />

              <CopyBox title="Resumo para WhatsApp" text={diagnostic.whatsapp_summary} onCopy={copyText} />
              <CopyBox title="Diagnostico completo em Markdown" text={diagnostic.markdown} onCopy={copyText} tall />
              <CopyBox title="Roteiro Loom/audio" text={diagnostic.loom_script} onCopy={copyText} />
              <CopyBox title="Roteiro de reuniao de 15 minutos" text={diagnostic.meeting_script} onCopy={copyText} />
              <CopyBox title="Contexto para LLM" text={diagnostic.llm_context} onCopy={copyText} muted />
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
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-50">{value}</p>
    </div>
  );
}

function ChecklistBox({ title, items, empty = 'Nenhum item.' }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-200">
        {(items?.length ? items : [empty]).map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function CopyBox({ title, text, onCopy, tall = false, muted = false }) {
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
      <pre className={`mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-700 dark:text-gray-100 ${tall ? 'max-h-96 overflow-auto' : ''}`}>{text}</pre>
    </div>
  );
}
