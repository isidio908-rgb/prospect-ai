/**
 * Client HTTP puro para a Evolution API (evoapicloud/evolution-api).
 *
 * Responsabilidade única: montar as chamadas HTTP corretas. Nenhuma regra de
 * negócio (banco, criptografia, decisão de quando marcar como lida) deve
 * viver aqui — isso fica em whatsappService.mjs.
 *
 * Referência dos endpoints usados:
 * - POST /instance/create
 * - GET  /instance/connect/:instance          (retorna QR code)
 * - GET  /instance/connectionState/:instance
 * - DELETE /instance/logout/:instance
 * - DELETE /instance/delete/:instance
 * - POST /settings/set/:instance               (config anti-bloqueio)
 * - POST /message/sendText/:instance
 * - POST /message/sendMedia/:instance          (image | video | document)
 * - POST /message/sendWhatsAppAudio/:instance  (nota de voz / PTT)
 * - POST /chat/markMessageAsRead/:instance
 * - POST /chat/sendPresence/:instance          (composing | recording | available | unavailable)
 *
 * A API key nunca deve ser logada. Erros de resposta HTTP podem conter o
 * corpo retornado pela Evolution API, mas nunca os headers de autenticação.
 */

function getBaseUrl() {
  const url = process.env.EVOLUTION_API_URL;
  if (!url) {
    throw new Error('EVOLUTION_API_URL não configurada no .env');
  }
  return url.replace(/\/$/, '');
}

async function request(path, { method = 'GET', apiKey, body } = {}) {
  if (!apiKey) {
    throw new Error('apiKey é obrigatório para chamar a Evolution API');
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    // Resposta não-JSON (raro); mantemos json = null e usamos rawText no erro.
  }

  if (!response.ok) {
    const message = json?.message || json?.error || rawText?.slice(0, 300) || `HTTP ${response.status}`;
    const error = new Error(`Evolution API (${path}) retornou ${response.status}: ${message}`);
    error.status = response.status;
    error.body = json;
    throw error;
  }

  return json;
}

/**
 * Cria uma nova instância WhatsApp.
 * `globalApiKey` é a chave administrativa (única que pode criar instâncias).
 */
export function createInstance(globalApiKey, { instanceName, webhookUrl, webhookSecret }) {
  return request('/instance/create', {
    method: 'POST',
    apiKey: globalApiKey,
    body: {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: true, // mídia recebida (áudio/imagem/vídeo/documento) chega já decodificada
        headers: {
          Authorization: `Bearer ${webhookSecret}`,
        },
        events: [
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE',
        ],
      },
    },
  });
}

/**
 * Solicita/renova o QR code de conexão de uma instância.
 */
export function connectInstance(instanceToken, instanceName) {
  return request(`/instance/connect/${instanceName}`, {
    method: 'GET',
    apiKey: instanceToken,
  });
}

/**
 * Consulta o estado atual da conexão ('close' | 'connecting' | 'open').
 */
export function getConnectionState(instanceToken, instanceName) {
  return request(`/instance/connectionState/${instanceName}`, {
    method: 'GET',
    apiKey: instanceToken,
  });
}

/**
 * Desconecta a instância do WhatsApp, preservando a configuração
 * (é necessário escanear QR code novamente para reconectar).
 */
export function logoutInstance(instanceToken, instanceName) {
  return request(`/instance/logout/${instanceName}`, {
    method: 'DELETE',
    apiKey: instanceToken,
  });
}

/**
 * Remove permanentemente a instância e todos os dados associados na
 * Evolution API (mensagens, contatos, chats armazenados lá).
 */
export function deleteInstance(globalApiKey, instanceName) {
  return request(`/instance/delete/${instanceName}`, {
    method: 'DELETE',
    apiKey: globalApiKey,
  });
}

/**
 * Aplica configurações anti-bloqueio na instância. Pode ser chamado tanto na
 * criação quanto depois, para o usuário ajustar via UI sem recriar a instância.
 */
export function applySettings(instanceToken, instanceName, {
  rejectCall = true,
  msgCall = '',
  groupsIgnore = true,
  alwaysOnline = false,
  readMessages = false,
  readStatus = false,
  syncFullHistory = false,
} = {}) {
  return request(`/settings/set/${instanceName}`, {
    method: 'POST',
    apiKey: instanceToken,
    body: { rejectCall, msgCall, groupsIgnore, alwaysOnline, readMessages, readStatus, syncFullHistory },
  });
}

/**
 * Envia mensagem de texto simples.
 * `delaySeconds`, quando informado, faz a Evolution API simular "digitando..."
 * antes de enviar (reduz padrão de comportamento robótico).
 */
export function sendText(instanceToken, instanceName, { number, text, delaySeconds }) {
  return request(`/message/sendText/${instanceName}`, {
    method: 'POST',
    apiKey: instanceToken,
    body: {
      number,
      text,
      ...(delaySeconds ? { delay: delaySeconds * 1000 } : {}),
    },
  });
}

/**
 * Envia mídia (imagem, vídeo ou documento). `media` aceita URL pública,
 * base64 puro ou data-URI (data:*;base64,...).
 */
export function sendMedia(instanceToken, instanceName, {
  number,
  mediatype, // 'image' | 'video' | 'document'
  mimetype,
  media,
  fileName,
  caption,
  delaySeconds,
}) {
  return request(`/message/sendMedia/${instanceName}`, {
    method: 'POST',
    apiKey: instanceToken,
    body: {
      number,
      mediatype,
      mimetype,
      media,
      fileName,
      ...(caption ? { caption } : {}),
      ...(delaySeconds ? { delay: delaySeconds * 1000 } : {}),
    },
  });
}

/**
 * Envia áudio como nota de voz (PTT), formato preferido do WhatsApp para
 * mensagens de voz.
 */
export function sendAudio(instanceToken, instanceName, { number, audio, delaySeconds }) {
  return request(`/message/sendWhatsAppAudio/${instanceName}`, {
    method: 'POST',
    apiKey: instanceToken,
    body: {
      number,
      audio,
      ...(delaySeconds ? { delay: delaySeconds * 1000 } : {}),
    },
  });
}

/**
 * Marca uma ou mais mensagens como lidas. Deve ser chamado apenas no momento
 * em que o usuário efetivamente responde pelo CRM — nunca ao só abrir o chat.
 * `messages` é um array de { remoteJid, fromMe, id } (a "key" da mensagem).
 */
export function markMessagesAsRead(instanceToken, instanceName, messages) {
  return request(`/chat/markMessageAsRead/${instanceName}`, {
    method: 'POST',
    apiKey: instanceToken,
    body: { readMessages: messages },
  });
}

/**
 * Envia um sinal de presença (ex: "digitando...") para um contato específico.
 */
export function sendPresence(instanceToken, instanceName, { number, presence = 'composing' }) {
  return request(`/chat/sendPresence/${instanceName}`, {
    method: 'POST',
    apiKey: instanceToken,
    body: { number, presence },
  });
}

/**
 * Verifica quais números existem no WhatsApp.
 * Endpoint Evolution API v2: POST /chat/whatsappNumbers/:instance
 */
export function checkWhatsAppNumbers(instanceToken, instanceName, numbers) {
  return request(`/chat/whatsappNumbers/${instanceName}`, {
    method: 'POST',
    apiKey: instanceToken,
    body: { numbers },
  });
}