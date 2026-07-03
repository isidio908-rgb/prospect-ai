import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock3, Database, FileText, RefreshCw } from 'lucide-react';
import { collections } from '../services/api';

const STATUS_LABELS = {
  running: 'Em execução',
  completed: 'Concluída',
  completed_with_errors: 'Concluída com erros',
  failed: 'Falhou',
};

const STATUS_BADGES = {
  running: 'badge-info',
  completed: 'badge-success',
  completed_with_errors: 'badge-warning',
  failed: 'badge-danger',
};

export default function CollectionHistory() {
  const [runs, setRuns] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const response = await collections.list({ limit: 50 });
      setRuns(response.data.runs || []);
    } catch (error) {
      toast.error('Erro ao carregar histórico de coletas');
    } finally {
      setLoading(false);
    }
  };

  const openLogs = async (run) => {
    setSelectedRun(run);
    setLoadingLogs(true);
    try {
      const response = await collections.logs(run.id);
      setLogs(response.data.logs || []);
    } catch (error) {
      toast.error('Erro ao carregar logs da coleta');
    } finally {
      setLoadingLogs(false);
    }
  };

  const totals = useMemo(() => {
    return runs.reduce((acc, run) => {
      acc.total += 1;
      acc.saved += Number(run.saved_count || 0);
      acc.duplicates += Number(run.duplicate_count || 0);
      acc.errors += Number(run.error_count || 0);
      acc.cacheHits += run.cache_hit ? 1 : 0;
      return acc;
    }, { total: 0, saved: 0, duplicates: 0, errors: 0, cacheHits: 0 });
  }, [runs]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Histórico de Coletas</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Acompanhe execuções, cache, erros e resultados salvos em cada busca.
          </p>
        </div>
        <button type="button" onClick={loadRuns} className="btn btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Metric label="Execuções" value={totals.total} />
        <Metric label="Leads salvos" value={totals.saved} tone="green" />
        <Metric label="Duplicados" value={totals.duplicates} tone="yellow" />
        <Metric label="Erros" value={totals.errors} tone="red" />
        <Metric label="Cache hits" value={totals.cacheHits} tone="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-600 dark:text-primary-300" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Execuções recentes</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Busca</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resultado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Carregando...</td>
                  </tr>
                ) : runs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Nenhuma coleta registrada ainda</td>
                  </tr>
                ) : runs.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 min-w-72">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{run.query || run.niche || 'Coleta sem query'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {run.city || 'Sem cidade'} • {run.region || 'sem região'} • {run.credential_name || run.source_type || 'fonte não identificada'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      <div>{run.saved_count || 0} salvos / {run.total_found || 0} encontrados</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {run.duplicate_count || 0} duplicados • {run.error_count || 0} erros
                      </div>
                      {run.cache_hit && <span className="badge badge-info mt-1">cache</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGES[run.status] || 'badge-info'}`}>
                        {STATUS_LABELS[run.status] || run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(run.started_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openLogs(run)} className="btn btn-secondary text-xs py-1 px-2">
                        Ver logs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-300" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Logs da coleta</h2>
          </div>

          {!selectedRun ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecione uma execução para ver eventos e erros persistidos.</p>
          ) : loadingLogs ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando logs...</p>
          ) : (
            <div className="space-y-3">
              <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">#{selectedRun.id} {selectedRun.query}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(selectedRun.started_at)}</div>
              </div>

              {logs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Sem logs registrados para esta execução.</p>
              ) : logs.map((log) => (
                <div key={log.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase ${log.level === 'error' ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-300'}`}>
                      {log.event || log.level}
                    </span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock3 className="w-3 h-3" /> {formatTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{log.message}</p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="mt-2 text-[11px] whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-900/40 rounded p-2 text-gray-500 dark:text-gray-400">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = 'gray' }) {
  const tones = {
    gray: 'bg-gray-50 dark:bg-gray-900/40 text-gray-900 dark:text-gray-100',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-300',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300',
  };

  return (
    <div className={`rounded-lg p-4 ${tones[tone]}`}>
      <div className="text-2xl font-bold">{value ?? 0}</div>
      <div className="text-xs opacity-80 mt-1">{label}</div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function formatTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
