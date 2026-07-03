import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bot, Loader2 } from 'lucide-react';
import { ai } from '../services/api';

export default function AiAssistant({ leadId, onLeadUpdated }) {
  const [tasks, setTasks] = useState([]);
  const [taskId, setTaskId] = useState('');
  const [credentialId] = useState('');
  const [activeCredential, setActiveCredential] = useState(null);
  const [hasActiveAi, setHasActiveAi] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadAiData = async () => {
      setInitialLoading(true);
      setError('');
      try {
        const [statusResponse, tasksResponse] = await Promise.all([ai.status(), ai.tasks()]);
        if (ignore) return;

        const credentials = statusResponse.data.credentials || [];
        const active = credentials.find((credential) => credential.status === 'active') || null;
        const loadedTasks = tasksResponse.data.tasks || [];

        setHasActiveAi(Boolean(statusResponse.data.enabled));
        setActiveCredential(active);
        setTasks(loadedTasks);
        setTaskId((current) => current || loadedTasks[0]?.id || '');
      } catch (err) {
        if (!ignore) {
          setError('Erro ao carregar o assistente de IA.');
        }
      } finally {
        if (!ignore) {
          setInitialLoading(false);
        }
      }
    };

    loadAiData();

    return () => {
      ignore = true;
    };
  }, [leadId]);

  const selectedTask = tasks.find((task) => task.id === taskId);

  const runTask = async ({ apply }) => {
    if (!taskId || loading) return;

    setLoading(true);
    setError('');
    try {
      const payload = { leadId, taskId, apply };
      if (credentialId) payload.credentialId = credentialId;

      const response = await ai.run(payload);
      setResult(response.data);
      setActiveCredential({
        type: response.data.provider,
        model: response.data.model,
      });
      setHasActiveAi(true);

      if (response.data.applied) {
        toast.success('Resultado aplicado ao lead.');
        if (onLeadUpdated) await onLeadUpdated();
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'no_llm_credential') {
        setHasActiveAi(false);
        setError(data.message || 'Nenhuma credencial de IA ativa.');
      } else {
        setError(data?.error || data?.message || 'Erro ao executar a tarefa de IA.');
      }
    } finally {
      setLoading(false);
    }
  };

  const canApply = Boolean(result?.text && result?.savesTo && !result.applied);

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            Assistente IA
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gere diagnósticos, mensagens e materiais comerciais personalizados para este lead.
          </p>
        </div>
        {hasActiveAi && activeCredential ? (
          <span className="badge badge-info">{activeCredential.type}</span>
        ) : (
          <span className="badge bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Sem IA ativa</span>
        )}
      </div>

      {!hasActiveAi && !initialLoading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300 rounded-lg p-4 mb-4 text-sm">
          Nenhuma credencial de IA ativa. Cadastre uma em{' '}
          <Link to="/credentials" className="text-primary-600 dark:text-primary-400 hover:underline">
            Credenciais
          </Link>{' '}
          para usar o assistente.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 rounded-lg p-4 mb-4 text-sm">
          {error}{' '}
          {error.includes('credencial') && (
            <Link to="/credentials" className="text-primary-600 dark:text-primary-400 hover:underline">
              Abrir credenciais
            </Link>
          )}
        </div>
      )}

      {initialLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">Carregando assistente de IA...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => {
                  setTaskId(task.id);
                  setResult(null);
                }}
                className={`btn text-left ${task.id === taskId ? 'btn-primary' : 'btn-secondary'}`}
              >
                <span className="block font-semibold">{task.label}</span>
                <span className={task.id === taskId ? 'block text-xs text-primary-100 mt-1' : 'block text-xs text-gray-600 dark:text-gray-400 mt-1'}>
                  {task.description}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => runTask({ apply: false })}
              disabled={loading || !taskId}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Processando com IA...' : 'Executar'}
            </button>
            {canApply && (
              <button
                type="button"
                onClick={() => runTask({ apply: true })}
                disabled={loading}
                className="btn btn-secondary disabled:opacity-50"
              >
                Aplicar ao lead
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            ⚠️ Esta ação consome créditos da sua credencial de IA. Responsabilidade própria.
          </p>

          {selectedTask?.savesTo && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Esta tarefa pode atualizar o campo: {selectedTask.savesTo}.
            </p>
          )}

          {result?.text && (
            <div className="mt-4 bg-primary-50 border border-primary-200 dark:bg-primary-900/20 dark:border-primary-800 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Resultado gerado por {result.provider}{result.model ? ` (${result.model})` : ''}
              </div>
              <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                {result.text}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
