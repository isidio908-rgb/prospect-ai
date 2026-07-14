import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { QrCode, CheckCircle2, XCircle, Loader2, ShieldCheck, Unplug, Trash2, Plus, Star } from 'lucide-react';
import { whatsapp } from '../services/api';

const STATUS_POLL_MS = 5000;

const DEFAULT_SECURITY = {
  readMessagesAuto: false,
  readStatusAuto: false,
  rejectCall: true,
  msgCall: 'Não realizamos atendimento por chamada. Envie uma mensagem de texto, por favor.',
  groupsIgnore: true,
  alwaysOnline: false,
  simulateTyping: true,
};

export default function WhatsAppSettings() {
  const [statusData, setStatusData] = useState(null);
  const [instances, setInstances] = useState([]);
  const [activeInstanceId, setActiveInstanceId] = useState(null);
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [qrcode, setQrcode] = useState(null);
  const [security, setSecurity] = useState(DEFAULT_SECURITY);
  const pollRef = useRef(null);

  useEffect(() => {
    loadStatus();
    return () => clearInterval(pollRef.current);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await whatsapp.status();
      setStatusData(response.data);
      const nextInstances = response.data.instances || (response.data.instance ? [response.data.instance] : []);
      setInstances(nextInstances);
      setActiveInstanceId((current) => current || response.data.instance?.id || nextInstances[0]?.id || null);

      if (response.data.instance) {
        setSecurity({
          readMessagesAuto: response.data.instance.read_messages_auto,
          readStatusAuto: response.data.instance.read_status_auto,
          rejectCall: response.data.instance.reject_call,
          msgCall: response.data.instance.msg_call || DEFAULT_SECURITY.msgCall,
          groupsIgnore: response.data.instance.groups_ignore,
          alwaysOnline: response.data.instance.always_online,
          simulateTyping: response.data.instance.simulate_typing,
        });
      }

      // Enquanto não estiver conectado, continua mostrando o último QR code salvo
      if (!response.data.connected && response.data.instance?.last_qr_code) {
        setQrcode(response.data.instance.last_qr_code);
      }

      if (response.data.connected) {
        setQrcode(null);
        clearInterval(pollRef.current);
      }
    } catch {
      // Sem instância ainda ou erro de rede; mantém tela de "conectar"
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(loadStatus, STATUS_POLL_MS);
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = activeInstanceId
        ? await whatsapp.reconnectInstance(activeInstanceId, security)
        : await whatsapp.connect(security);
      setQrcode(response.data.qrcode);
      toast.success('Escaneie o QR code com o WhatsApp do número que deseja conectar.');
      startPolling();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao conectar WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const handleAddNumber = async () => {
    setConnecting(true);
    try {
      const response = await whatsapp.createInstance({ ...security, label: newLabel });
      setActiveInstanceId(response.data.id);
      setQrcode(response.data.qrcode);
      setNewLabel('');
      toast.success('Novo número criado. Escaneie o QR code para conectar.');
      startPolling();
      await loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar número');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (instanceId = null) => {
    if (!confirm('Desconectar o WhatsApp? Você poderá reconectar depois escaneando um novo QR code.')) return;
    try {
      if (instanceId) await whatsapp.disconnectInstance(instanceId);
      else await whatsapp.disconnect();
      toast.success('WhatsApp desconectado');
      await loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao desconectar');
    }
  };

  const handleRemove = async (instanceId = null) => {
    if (!confirm('Remover a instância permanentemente? Isso apaga a configuração salva.')) return;
    try {
      if (instanceId) await whatsapp.removeInstance(instanceId);
      else await whatsapp.remove();
      toast.success('Instância removida');
      setStatusData(null);
      setInstances((current) => current.filter((instance) => instance.id !== instanceId));
      setActiveInstanceId(null);
      setQrcode(null);
      setSecurity(DEFAULT_SECURITY);
      await loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao remover instância');
    }
  };

  const handleSetDefault = async (instanceId) => {
    try {
      await whatsapp.setDefaultInstance(instanceId);
      toast.success('Número padrão atualizado');
      await loadStatus();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao definir número padrão');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Carregando...</div>;
  }

  const connected = statusData?.connected;
  const instance = statusData?.instance;
  const activeInstance = instances.find((item) => item.id === activeInstanceId) || instance;
  const shouldShowQrPanel = Boolean(qrcode) || !activeInstance || activeInstance.status !== 'open';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">WhatsApp</h1>
        <p className="text-gray-600 dark:text-gray-400">Conecte um ou mais números para conversar com os leads direto pelo CRM</p>
      </div>

      {/* Status atual */}
      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {connected ? (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-gray-400" />
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {connected ? 'Número padrão conectado' : instance ? 'Número padrão desconectado' : 'Nenhum número conectado'}
              </p>
              {instance?.phone_number && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{instance.phone_number}</p>
              )}
            </div>
          </div>

          {connected ? (
            <div className="flex gap-2">
              <button onClick={() => handleDisconnect(instance?.id)} className="btn btn-secondary flex items-center gap-2">
                <Unplug className="w-4 h-4" />
                Desconectar
              </button>
              <button onClick={() => handleRemove(instance?.id)} className="btn btn-danger flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Remover
              </button>
            </div>
          ) : instance ? (
            <button onClick={() => handleRemove(instance?.id)} className="btn btn-danger flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          ) : null}
        </div>
      </div>

      {instances.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Números conectados</h2>
          <div className="space-y-3">
            {instances.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${activeInstanceId === item.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveInstanceId(item.id)}
                    className="text-left"
                  >
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {item.label || item.profile_name || item.phone_number || `Número ${item.id}`}
                      {item.is_default && <span className="ml-2 text-xs text-primary-600">padrão</span>}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.phone_number || 'Aguardando conexão'} · {item.status || 'created'}
                    </p>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {!item.is_default && (
                      <button onClick={() => handleSetDefault(item.id)} className="btn btn-secondary flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Padrão
                      </button>
                    )}
                    <button onClick={() => setActiveInstanceId(item.id)} className="btn btn-secondary">
                      Selecionar
                    </button>
                    <button onClick={() => handleDisconnect(item.id)} className="btn btn-secondary flex items-center gap-2">
                      <Unplug className="w-4 h-4" />
                      Desconectar
                    </button>
                    <button onClick={() => handleRemove(item.id)} className="btn btn-danger flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Adicionar outro número</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="Ex: BDR 01, SDR Cuiabá, Atendimento 02"
            className="input flex-1"
          />
          <button onClick={handleAddNumber} disabled={connecting} className="btn btn-primary bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2">
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar número
          </button>
        </div>
      </div>

      {/* QR Code */}
      {shouldShowQrPanel && (
        <div className="card text-center">
          {qrcode ? (
            <>
              <p className="text-gray-700 dark:text-gray-300 mb-4">Abra o WhatsApp no celular, vá em Aparelhos conectados e escaneie:</p>
              <img src={qrcode} alt="QR Code WhatsApp" className="mx-auto rounded-lg border bg-white p-2" style={{ maxWidth: 280 }} />
              <p className="text-xs text-gray-400 mt-3">O código expira em alguns minutos. Clique em "Gerar novo QR code" se necessário.</p>
              <button onClick={handleConnect} disabled={connecting || !activeInstanceId} className="btn btn-secondary mt-4">
                {connecting ? 'Gerando...' : 'Gerar novo QR code'}
              </button>
            </>
          ) : (
            <>
              <QrCode className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">Configure as opções de segurança abaixo e conecte seu WhatsApp.</p>
            </>
          )}
        </div>
      )}

      {/* Configurações de segurança anti-bloqueio */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configurações de Segurança</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Reduzem o risco de bloqueio do número. Recomendamos manter os valores padrão.
        </p>

        <div className="space-y-4">
          <SecurityToggle
            label="Confirmar leitura automaticamente ao receber mensagem"
            description="Recomendado manter desligado. Quando ligado, marca como lida toda mensagem no instante em que chega — comportamento incomum e mais fácil de identificar como automação. Por padrão, a leitura só é confirmada quando você responde pelo CRM."
            checked={security.readMessagesAuto}
            onChange={(v) => setSecurity({ ...security, readMessagesAuto: v })}
          />
          <SecurityToggle
            label="Marcar status/stories como visto automaticamente"
            checked={security.readStatusAuto}
            onChange={(v) => setSecurity({ ...security, readStatusAuto: v })}
          />
          <SecurityToggle
            label="Rejeitar chamadas automaticamente"
            description="O WhatsApp Web não atende chamadas; rejeitar evita a chamada ficar tocando indefinidamente."
            checked={security.rejectCall}
            onChange={(v) => setSecurity({ ...security, rejectCall: v })}
          />
          <SecurityToggle
            label="Ignorar mensagens de grupos"
            description="Reduz volume e exposição desnecessária da instância."
            checked={security.groupsIgnore}
            onChange={(v) => setSecurity({ ...security, groupsIgnore: v })}
          />
          <SecurityToggle
            label="Sempre aparecer online"
            description="Recomendado manter desligado — ficar online 24/7 é um padrão não-humano."
            checked={security.alwaysOnline}
            onChange={(v) => setSecurity({ ...security, alwaysOnline: v })}
          />
          <SecurityToggle
            label="Simular digitando antes de enviar"
            description="Adiciona um pequeno delay com indicador de 'digitando...' antes de cada envio."
            checked={security.simulateTyping}
            onChange={(v) => setSecurity({ ...security, simulateTyping: v })}
          />
        </div>

        <div className="mt-6">
          <button onClick={handleConnect} disabled={connecting} className="btn btn-primary bg-green-600 hover:bg-green-700">
            {connecting ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Conectando...</span>
            ) : activeInstanceId ? (
              'Salvar e reconectar número selecionado'
            ) : (
              'Conectar WhatsApp'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecurityToggle({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4"
      />
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
    </label>
  );
}
