import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Mic, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { whatsapp } from '../../services/api';
import MessageMedia from './MessageMedia';

const POLL_INTERVAL_MS = 10000;

/**
 * Painel de chat WhatsApp embutido no card do lead. Faz polling simples do
 * histórico (sem WebSocket, para manter a primeira versão simples) e envia
 * texto/mídia/áudio via API.
 *
 * IMPORTANTE (decisão de produto): abrir este painel NUNCA confirma leitura
 * das mensagens do lead — isso só acontece no backend, no momento exato em
 * que uma resposta é enviada (ver whatsappService.markPendingMessagesAsRead).
 * Este componente não chama nenhum endpoint de "marcar como lido".
 */
export default function WhatsAppChat({ leadId, whatsappConnected, instanceId = null }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!whatsappConnected) {
      setLoading(false);
      return;
    }

    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [leadId, whatsappConnected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await whatsapp.getLeadMessages(leadId);
      setMessages(response.data.messages || []);
    } catch {
      // Falha silenciosa no polling; não interrompe a experiência do usuário.
    } finally {
      setLoading(false);
    }
  };

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await whatsapp.sendText(leadId, text.trim(), instanceId ? { instanceId } : {});
      setText('');
      await loadMessages();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo depois

    setUploadingFile(true);
    try {
      const base64 = await fileToBase64(file);
      const isAudio = file.type.startsWith('audio/');

      if (isAudio) {
        await whatsapp.sendAudio(leadId, {
          audio: base64,
          mimetype: file.type,
          fileName: file.name,
          ...(instanceId ? { instanceId } : {}),
        });
      } else {
        const mediatype = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : 'document';

        await whatsapp.sendMedia(leadId, {
          mediatype,
          mimetype: file.type || 'application/octet-stream',
          media: base64,
          fileName: file.name,
          ...(instanceId ? { instanceId } : {}),
        });
      }

      await loadMessages();
      toast.success('Arquivo enviado!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setUploadingFile(false);
    }
  };

  if (!whatsappConnected) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Conecte um número de WhatsApp em Configurações para conversar com este lead.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando conversa...</div>;
  }

  return (
    <div className="flex flex-col h-[500px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-2 bg-gray-50 rounded-lg">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 mt-8">Nenhuma mensagem ainda.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 ${
                  msg.from_me ? 'bg-green-100 text-green-900' : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                {msg.message_type === 'text' ? (
                  <p className="text-sm whitespace-pre-line">{msg.text_content}</p>
                ) : (
                  <div className="space-y-1">
                    <MessageMedia message={msg} />
                    {msg.text_content && <p className="text-sm">{msg.text_content}</p>}
                  </div>
                )}
                <div className="text-[10px] text-gray-400 mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {msg.from_me && msg.status === 'read' && ' · lida'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendText} className="flex items-center gap-2 mt-3">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelected}
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFile}
          className="p-2 text-gray-500 hover:text-primary-600 disabled:opacity-50"
          title="Enviar arquivo (imagem, vídeo, documento ou áudio)"
        >
          {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="input flex-1"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="btn btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
        <Mic className="w-3 h-3" />
        Dica: envie um arquivo de áudio pelo clipe para mandar como nota de voz.
      </p>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // já vem como data-URI (data:*;base64,...)
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
