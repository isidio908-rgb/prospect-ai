import { useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { whatsapp } from '../../services/api';

/**
 * Renderiza a mídia de uma mensagem WhatsApp (imagem, áudio, vídeo ou
 * documento), buscando o arquivo como blob autenticado — o backend exige
 * o header Authorization, que <img>/<audio> não conseguem enviar direto.
 */
export default function MessageMedia({ message }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    whatsapp.getMediaBlobUrl(message.id)
      .then((url) => {
        if (cancelled) return;
        objectUrl = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [message.id]);

  if (error) {
    return <p className="text-sm text-red-600">Não foi possível carregar a mídia.</p>;
  }

  if (!blobUrl) {
    return <p className="text-sm text-gray-400">Carregando mídia...</p>;
  }

  if (message.message_type === 'image') {
    return <img src={blobUrl} alt={message.media_filename || 'Imagem'} className="max-w-xs rounded-lg" />;
  }

  if (message.message_type === 'video') {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <video src={blobUrl} controls className="max-w-xs rounded-lg" />;
  }

  if (message.message_type === 'audio') {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio src={blobUrl} controls />;
  }

  // document e outros tipos: link de download
  return (
    <a
      href={blobUrl}
      download={message.media_filename || 'arquivo'}
      className="flex items-center gap-2 text-primary-700 hover:text-primary-900 bg-white/60 rounded-lg px-3 py-2"
    >
      <FileText className="w-5 h-5" />
      <span className="text-sm truncate max-w-[180px]">{message.media_filename || 'Documento'}</span>
      <Download className="w-4 h-4" />
    </a>
  );
}
