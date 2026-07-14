import { query } from '../../database/init.mjs';
import { encrypt, decrypt } from '../encryption.mjs';
import { normalizePhone } from '../deduplicator.mjs';
import { saveBase64Media } from './mediaStorage.mjs';
import * as evolution from './evolutionClient.mjs';

const MESSAGE_TYPE_BY_EVOLUTION_TYPE = {
  conversation: 'text',
  extendedTextMessage: 'text',
  imageMessage: 'image',
  videoMessage: 'video',
  audioMessage: 'audio',
  documentMessage: 'document',
  stickerMessage: 'sticker',
  locationMessage: 'location',
};

function getGlobalApiKey() {
  const key = process.env.EVOLUTION_API_GLOBAL_KEY;
  if (!key) throw new Error('EVOLUTION_API_GLOBAL_KEY não configurada no .env');
  return key;
}

function getWebhookUrl() {
  const url = process.env.EVOLUTION_WEBHOOK_URL;
  if (!url) throw new Error('EVOLUTION_WEBHOOK_URL não configurada no .env');
  return url;
}

function getWebhookSecret() {
  return process.env.EVOLUTION_WEBHOOK_SECRET || '';
}

/**
 * Gera um nome de instância único e previsível por usuário, evitando
 * colisão entre diferentes contas do Prospect AI.
 */
function buildInstanceName(userId) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `prospect-ai-user-${userId}-${suffix}`;
}

function sanitizeLabel(label) {
  const value = String(label || '').trim();
  return value.slice(0, 120) || null;
}

function serializeInstance(row) {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    is_default: row.is_default,
    instance_name: row.instance_name,
    phone_number: row.phone_number,
    profile_name: row.profile_name,
    status: row.status,
    read_messages_auto: row.read_messages_auto,
    read_status_auto: row.read_status_auto,
    reject_call: row.reject_call,
    msg_call: row.msg_call,
    groups_ignore: row.groups_ignore,
    always_online: row.always_online,
    simulate_typing: row.simulate_typing,
    last_qr_code: row.last_qr_code,
    last_qr_at: row.last_qr_at,
    connected_at: row.connected_at,
    disconnected_at: row.disconnected_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Cria (ou recupera, se já existir) a instância WhatsApp de um usuário e
 * inicia o processo de conexão, retornando o QR code para exibição na tela.
 *
 * Opções de segurança (seguem desligadas por padrão, conforme decisão de
 * produto: nunca confirmar leitura automaticamente ao receber mensagem):
 * - readMessagesAuto / readStatusAuto: false por padrão
 * - rejectCall: true por padrão (Baileys não atende chamada de qualquer forma)
 * - groupsIgnore: true por padrão (reduz exposição/volume desnecessário)
 * - alwaysOnline: false por padrão (ficar online 24/7 é padrão não-humano)
 * - simulateTyping: true por padrão (delay simulando digitação ao enviar)
 */
export async function connectInstance(userId, securityOptions = {}) {
  const options = {
    readMessagesAuto: false,
    readStatusAuto: false,
    rejectCall: true,
    msgCall: 'Não realizamos atendimento por chamada. Envie uma mensagem de texto, por favor.',
    groupsIgnore: true,
    alwaysOnline: false,
    simulateTyping: true,
    ...securityOptions,
  };

  let instanceRow = null;
  if (options.instanceId) {
    instanceRow = await getInstanceRow(userId, options.instanceId);
    if (!instanceRow) throw new Error('Instância WhatsApp não encontrada');
  } else if (!options.createNew) {
    instanceRow = await getDefaultInstanceRow(userId);
  }

  const instanceName = instanceRow?.instance_name || buildInstanceName(userId);

  if (!instanceRow) {
    // Primeira conexão: cria a instância na Evolution API e persiste localmente.
    const created = await evolution.createInstance(getGlobalApiKey(), {
      instanceName,
      webhookUrl: getWebhookUrl(),
      webhookSecret: getWebhookSecret(),
    });

    const instanceToken = created?.hash?.apikey || created?.hash || created?.instance?.token;
    if (!instanceToken) {
      throw new Error('Evolution API não retornou um token de instância válido');
    }

    const insertResult = await query(
      `INSERT INTO whatsapp_instances (
        user_id, label, is_default, instance_name, instance_token_encrypted, status,
        read_messages_auto, read_status_auto, reject_call, msg_call,
        groups_ignore, always_online, simulate_typing
      ) VALUES ($1, $2, NOT EXISTS (SELECT 1 FROM whatsapp_instances WHERE user_id = $1), $3, $4, 'connecting', $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        sanitizeLabel(options.label),
        instanceName,
        encrypt(instanceToken),
        options.readMessagesAuto,
        options.readStatusAuto,
        options.rejectCall,
        options.msgCall,
        options.groupsIgnore,
        options.alwaysOnline,
        options.simulateTyping,
      ]
    );

    instanceRow = insertResult.rows[0];
  } else {
    // Instância já existe: apenas atualiza as configurações de segurança escolhidas.
    await query(
      `UPDATE whatsapp_instances SET
        label = COALESCE($1, label),
        read_messages_auto = $2, read_status_auto = $3, reject_call = $4,
        msg_call = $5, groups_ignore = $6, always_online = $7, simulate_typing = $8,
        updated_at = NOW()
       WHERE id = $9`,
      [
        sanitizeLabel(options.label),
        options.readMessagesAuto,
        options.readStatusAuto,
        options.rejectCall,
        options.msgCall,
        options.groupsIgnore,
        options.alwaysOnline,
        options.simulateTyping,
        instanceRow.id,
      ]
    );
  }

  const instanceToken = decrypt(instanceRow.instance_token_encrypted);

  // Aplica as configurações anti-bloqueio na Evolution API (idempotente,
  // pode ser chamado tanto na criação quanto em reconexões).
  await evolution.applySettings(instanceToken, instanceName, {
    rejectCall: options.rejectCall,
    msgCall: options.msgCall,
    groupsIgnore: options.groupsIgnore,
    alwaysOnline: options.alwaysOnline,
    readMessages: options.readMessagesAuto,
    readStatus: options.readStatusAuto,
  });

  const connectResult = await evolution.connectInstance(instanceToken, instanceName);
  const qrcode = connectResult?.qrcode?.base64 || connectResult?.base64 || null;

  if (qrcode) {
    await query(
      `UPDATE whatsapp_instances SET last_qr_code = $1, last_qr_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [qrcode, instanceRow.id]
    );
  }

  return {
    id: instanceRow.id,
    instanceName,
    status: connectResult?.instance?.status || 'connecting',
    qrcode,
  };
}

/**
 * Retorna o estado atual da instância do usuário (sem expor o token).
 */
export async function getInstanceStatus(userId) {
  const instances = await listInstances(userId);
  if (instances.length === 0) return { connected: false, instance: null, instances: [] };

  const instanceRow = instances.find((instance) => instance.is_default) || instances[0];
  const instanceToken = await getInstanceToken(userId, instanceRow.id);

  // Consulta o estado real na Evolution API para refletir desconexões que
  // não passaram pelo webhook (ex: logout feito direto no celular).
  try {
    const state = await evolution.getConnectionState(instanceToken, instanceRow.instance_name);
    const liveState = state?.instance?.state || state?.state;
    if (liveState && liveState !== instanceRow.status) {
      await query(`UPDATE whatsapp_instances SET status = $1, updated_at = NOW() WHERE id = $2`, [liveState, instanceRow.id]);
      instanceRow.status = liveState;
    }
  } catch {
    // Se a Evolution API estiver fora do ar, mantém o último status conhecido.
  }

  return {
    connected: instanceRow.status === 'open',
    instance: serializeInstance(instanceRow),
    instances,
  };
}

export async function listInstances(userId) {
  const result = await query(
    `SELECT id, label, is_default, instance_name, phone_number, profile_name, status,
            read_messages_auto, read_status_auto, reject_call, msg_call,
            groups_ignore, always_online, simulate_typing,
            last_qr_code, last_qr_at, connected_at, disconnected_at, created_at, updated_at
     FROM whatsapp_instances
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at ASC, id ASC`,
    [userId]
  );
  return result.rows.map(serializeInstance);
}

async function getInstanceToken(userId, instanceId = null) {
  const result = await query(
    `SELECT instance_token_encrypted
     FROM whatsapp_instances
     WHERE user_id = $1 AND ($2::int IS NULL OR id = $2)
     ORDER BY is_default DESC, created_at ASC, id ASC
     LIMIT 1`,
    [userId, instanceId]
  );
  if (result.rows.length === 0) return null;
  return decrypt(result.rows[0].instance_token_encrypted);
}

async function getDefaultInstanceRow(userId) {
  const result = await query(
    `SELECT * FROM whatsapp_instances
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at ASC, id ASC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getInstanceRow(userId, instanceId = null) {
  if (!instanceId) return getDefaultInstanceRow(userId);

  const result = await query(
    'SELECT * FROM whatsapp_instances WHERE user_id = $1 AND id = $2',
    [userId, instanceId]
  );
  return result.rows[0] || null;
}

export async function setDefaultInstance(userId, instanceId) {
  const instanceRow = await getInstanceRow(userId, instanceId);
  if (!instanceRow) throw new Error('Instância WhatsApp não encontrada');

  await query('UPDATE whatsapp_instances SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1', [userId]);
  await query('UPDATE whatsapp_instances SET is_default = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2', [instanceId, userId]);

  return serializeInstance({ ...instanceRow, is_default: true });
}

/**
 * Desconecta (logout) a instância, mantendo a configuração salva para
 * facilitar reconexão futura via novo QR code.
 */
/**
 * Verifica existência de WhatsApp para uma lista de telefones usando a
 * instância conectada do usuário. Retorna Map telefoneOriginal -> boolean.
 */
export async function verifyLeadPhonesOnWhatsApp(userId, phones) {
  const instanceRow = await getInstanceRow(userId);
  if (!instanceRow) throw new Error('Conecte o WhatsApp antes de verificar números na coleta.');
  if (instanceRow.status !== 'open') throw new Error('WhatsApp desconectado. Reconecte antes de verificar números na coleta.');

  const normalizedItems = phones
    .map((phone) => ({ raw: phone, number: toWhatsAppNumber(phone) }))
    .filter((item) => item.raw && item.number);

  const resultMap = new Map(phones.map((phone) => [phone, false]));
  if (normalizedItems.length === 0) return resultMap;

  const uniqueNumbers = Array.from(new Set(normalizedItems.map((item) => item.number)));
  const instanceToken = decrypt(instanceRow.instance_token_encrypted);
  const response = await evolution.checkWhatsAppNumbers(instanceToken, instanceRow.instance_name, uniqueNumbers);
  const rows = Array.isArray(response) ? response : response?.data || response?.numbers || [];

  const existsByNumber = new Map();
  for (const row of rows) {
    const number = String(row?.number || row?.jid || row?.existsJid || row?.id || '').split('@')[0].replace(/\D/g, '');
    const exists = Boolean(row?.exists ?? row?.isWhatsapp ?? row?.isWhatsApp ?? row?.jid ?? row?.existsJid);
    if (number) existsByNumber.set(number, exists);
  }

  for (const item of normalizedItems) {
    resultMap.set(item.raw, Boolean(existsByNumber.get(item.number)));
  }

  return resultMap;
}
export async function disconnectInstance(userId, instanceId = null) {
  const instanceRow = await getInstanceRow(userId, instanceId);
  if (!instanceRow) throw new Error('Nenhuma instância WhatsApp encontrada');

  const instanceToken = decrypt(instanceRow.instance_token_encrypted);
  await evolution.logoutInstance(instanceToken, instanceRow.instance_name);

  await query(
    `UPDATE whatsapp_instances SET status = 'close', disconnected_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [instanceRow.id]
  );
}

/**
 * Remove permanentemente a instância (Evolution API + registro local).
 */
export async function deleteInstance(userId, instanceId = null) {
  const instanceRow = await getInstanceRow(userId, instanceId);
  if (!instanceRow) throw new Error('Nenhuma instância WhatsApp encontrada');

  await evolution.deleteInstance(getGlobalApiKey(), instanceRow.instance_name);
  await query('DELETE FROM whatsapp_instances WHERE id = $1', [instanceRow.id]);

  if (instanceRow.is_default) {
    await query(
      `UPDATE whatsapp_instances SET is_default = TRUE, updated_at = NOW()
       WHERE id = (
         SELECT id FROM whatsapp_instances
         WHERE user_id = $1
         ORDER BY created_at ASC, id ASC
         LIMIT 1
       )`,
      [userId]
    );
  }
}

/**
 * Encontra o lead correspondente a um número de telefone.
 *
 * Lida com o "problema do nono dígito" brasileiro: o WhatsApp pode registrar
 * o mesmo celular com ou sem o 9 extra (ex: 65999062706 vs 6599062706). Por
 * isso o casamento é feito pelos últimos 8 dígitos (parte sempre estável),
 * escopado por usuário. Assim uma mensagem recebida vincula ao lead mesmo
 * quando a operadora/WhatsApp devolve o número na forma "antiga".
 */
async function findLeadByPhone(userId, phoneNumber) {
  const normalized = normalizePhone(phoneNumber);
  if (!normalized || normalized.length < 8) return null;

  // 1. Tenta match exato primeiro (mais confiável).
  const exact = await query(
    `SELECT id FROM leads WHERE user_id = $1 AND phone_normalized = $2 LIMIT 1`,
    [userId, normalized]
  );
  if (exact.rows[0]) return exact.rows[0].id;

  // 2. Fallback tolerante ao nono dígito: compara os últimos 8 dígitos.
  const last8 = normalized.slice(-8);
  const fuzzy = await query(
    `SELECT id FROM leads
     WHERE user_id = $1
       AND phone_normalized IS NOT NULL
       AND RIGHT(phone_normalized, 8) = $2
     LIMIT 1`,
    [userId, last8]
  );
  return fuzzy.rows[0]?.id || null;
}

/**
 * Envia uma mensagem de texto para o lead e registra no histórico.
 * Antes de enviar, marca como lidas todas as mensagens pendentes desse
 * contato — é o único momento em que a leitura é confirmada (por decisão de
 * produto: nunca confirmar leitura apenas por abrir o chat no CRM).
 */
export async function sendTextToLead(userId, leadId, text, options = {}) {
  const { instanceRow, instanceToken, lead } = await loadContext(userId, leadId, options);

  await markPendingMessagesAsRead(instanceRow, instanceToken, lead.remoteJid);

  if (instanceRow.simulate_typing) {
    await safeSendPresence(instanceToken, instanceRow.instance_name, lead.phoneForApi, 'composing');
  }

  const result = await evolution.sendText(instanceToken, instanceRow.instance_name, {
    number: lead.phoneForApi,
    text,
    delaySeconds: instanceRow.simulate_typing ? 2 : undefined,
  });

  return saveOutgoingMessage({
    instanceRow, userId, leadId,
    remoteJid: result?.key?.remoteJid || lead.remoteJid,
    whatsappMessageId: result?.key?.id,
    messageType: 'text',
    textContent: text,
  });
}

/**
 * Envia mídia (imagem, vídeo ou documento — ex: propostas/análises em PDF
 * geradas pela plataforma) para o lead.
 */
export async function sendMediaToLead(userId, leadId, {
  mediatype, mimetype, media, fileName, caption,
}, options = {}) {
  const { instanceRow, instanceToken, lead } = await loadContext(userId, leadId, options);

  await markPendingMessagesAsRead(instanceRow, instanceToken, lead.remoteJid);

  const result = await evolution.sendMedia(instanceToken, instanceRow.instance_name, {
    number: lead.phoneForApi,
    mediatype,
    mimetype,
    media,
    fileName,
    caption,
    delaySeconds: instanceRow.simulate_typing ? 2 : undefined,
  });

  // Guarda a própria mídia enviada em disco também, para exibir no histórico do CRM.
  const mediaPath = await saveBase64Media(media.includes('base64') || !media.startsWith('http') ? media : null, {
    mimetype,
    suggestedName: fileName,
  });

  return saveOutgoingMessage({
    instanceRow, userId, leadId,
    remoteJid: result?.key?.remoteJid || lead.remoteJid,
    whatsappMessageId: result?.key?.id,
    messageType: mediatype,
    textContent: caption || null,
    mediaPath,
    mediaMimetype: mimetype,
    mediaFilename: fileName,
  });
}

/**
 * Envia áudio como nota de voz para o lead.
 */
export async function sendAudioToLead(userId, leadId, { audio, mimetype = 'audio/ogg', fileName = 'audio.ogg' }, options = {}) {
  const { instanceRow, instanceToken, lead } = await loadContext(userId, leadId, options);

  await markPendingMessagesAsRead(instanceRow, instanceToken, lead.remoteJid);

  if (instanceRow.simulate_typing) {
    await safeSendPresence(instanceToken, instanceRow.instance_name, lead.phoneForApi, 'recording');
  }

  const result = await evolution.sendAudio(instanceToken, instanceRow.instance_name, {
    number: lead.phoneForApi,
    audio,
    delaySeconds: instanceRow.simulate_typing ? 2 : undefined,
  });

  const mediaPath = await saveBase64Media(audio.includes('base64') || !audio.startsWith('http') ? audio : null, {
    mimetype,
    suggestedName: fileName,
  });

  return saveOutgoingMessage({
    instanceRow, userId, leadId,
    remoteJid: result?.key?.remoteJid || lead.remoteJid,
    whatsappMessageId: result?.key?.id,
    messageType: 'audio',
    mediaPath,
    mediaMimetype: mimetype,
    mediaFilename: fileName,
  });
}

async function loadContext(userId, leadId, { instanceId = null } = {}) {
  const instanceRow = await getInstanceRow(userId, instanceId);
  if (!instanceRow) throw new Error('Conecte um número de WhatsApp antes de enviar mensagens');
  if (instanceRow.status !== 'open') throw new Error('WhatsApp desconectado. Reconecte antes de enviar mensagens.');

  const leadResult = await query('SELECT id, telefone FROM leads WHERE id = $1 AND user_id = $2', [leadId, userId]);
  if (leadResult.rows.length === 0) throw new Error('Lead não encontrado');

  const phoneRaw = leadResult.rows[0].telefone;
  const phoneForApi = toWhatsAppNumber(phoneRaw);
  if (!phoneForApi) throw new Error('Lead não possui telefone válido para envio via WhatsApp');

  const instanceToken = decrypt(instanceRow.instance_token_encrypted);

  return {
    instanceRow,
    instanceToken,
    lead: {
      phoneForApi,
      remoteJid: `${phoneForApi}@s.whatsapp.net`,
    },
  };
}

/**
 * Converte um telefone bruto para o formato que o WhatsApp/Evolution API
 * exige no envio: apenas dígitos, COM código do país.
 *
 * Diferente de normalizePhone() (usada na deduplicação), que remove o código
 * do país (55) — aqui ele é obrigatório, senão o WhatsApp rejeita com HTTP 400.
 * Assume Brasil (55) como padrão quando o número vem sem código de país.
 */
function toWhatsAppNumber(phoneRaw) {
  if (!phoneRaw) return '';
  let digits = String(phoneRaw).replace(/\D/g, '');
  if (!digits) return '';

  // Remove zeros à esquerda (ex: "065..." de discagem interurbana antiga)
  digits = digits.replace(/^0+/, '');

  // Número brasileiro sem código do país: 10 dígitos (fixo com DDD) ou
  // 11 dígitos (celular com DDD + 9). Prefixa 55.
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  return digits;
}

/**
 * Marca como lidas todas as mensagens recebidas e ainda não lidas desse
 * contato. Chamado apenas no momento do envio de uma resposta — nunca ao
 * simplesmente abrir o chat no CRM (decisão de produto explícita).
 */
async function markPendingMessagesAsRead(instanceRow, instanceToken, remoteJid) {
  // Casa pelos últimos 8 dígitos do número (parte estável), tolerando a
  // variação do nono dígito entre o formato de envio e o de recebimento.
  const last8 = String(remoteJid).split('@')[0].replace(/\D/g, '').slice(-8);
  if (!last8) return;

  const pending = await query(
    `SELECT whatsapp_message_id, remote_jid, from_me
     FROM whatsapp_messages
     WHERE instance_id = $1 AND direction = 'received'
       AND status != 'read' AND whatsapp_message_id IS NOT NULL
       AND RIGHT(split_part(remote_jid, '@', 1), 8) = $2`,
    [instanceRow.id, last8]
  );

  if (pending.rows.length === 0) return;

  try {
    await evolution.markMessagesAsRead(
      instanceToken,
      instanceRow.instance_name,
      pending.rows.map((row) => ({
        remoteJid: row.remote_jid,
        fromMe: row.from_me,
        id: row.whatsapp_message_id,
      }))
    );

    await query(
      `UPDATE whatsapp_messages SET status = 'read', read_at = NOW()
       WHERE instance_id = $1 AND direction = 'received' AND status != 'read'
         AND RIGHT(split_part(remote_jid, '@', 1), 8) = $2`,
      [instanceRow.id, last8]
    );
  } catch (error) {
    // Falha ao confirmar leitura não deve impedir o envio da resposta.
    console.error('Erro ao marcar mensagens como lidas:', error.message);
  }
}

async function safeSendPresence(instanceToken, instanceName, number, presence) {
  try {
    await evolution.sendPresence(instanceToken, instanceName, { number, presence });
  } catch (error) {
    // Presence é cosmético; falha aqui não deve interromper o envio real.
    console.error('Erro ao enviar presence:', error.message);
  }
}

async function saveOutgoingMessage({
  instanceRow, userId, leadId, remoteJid, whatsappMessageId,
  messageType, textContent = null, mediaPath = null, mediaMimetype = null, mediaFilename = null,
}) {
  const result = await query(
    `INSERT INTO whatsapp_messages (
      instance_id, lead_id, user_id, whatsapp_message_id, remote_jid, from_me,
      direction, message_type, text_content, media_path, media_mimetype, media_filename, status
    ) VALUES ($1, $2, $3, $4, $5, TRUE, 'sent', $6, $7, $8, $9, $10, 'sent')
    RETURNING *`,
    [instanceRow.id, leadId, userId, whatsappMessageId || null, remoteJid, messageType, textContent, mediaPath, mediaMimetype, mediaFilename]
  );
  return result.rows[0];
}

/**
 * Lista o histórico de mensagens de um lead, do mais antigo para o mais recente.
 */
export async function getLeadMessages(userId, leadId) {
  const result = await query(
    `SELECT wm.* FROM whatsapp_messages wm
     JOIN whatsapp_instances wi ON wi.id = wm.instance_id
     WHERE wm.lead_id = $1 AND wm.user_id = $2
     ORDER BY wm.created_at ASC`,
    [leadId, userId]
  );
  return result.rows;
}

/**
 * Busca uma mensagem específica pertencente ao usuário, com o caminho de
 * mídia (se houver). Usado para servir o arquivo de forma segura — nunca
 * expor o caminho de disco diretamente ao frontend.
 */
export async function getMessageMedia(userId, messageId) {
  const result = await query(
    `SELECT media_path, media_mimetype, media_filename
     FROM whatsapp_messages WHERE id = $1 AND user_id = $2`,
    [messageId, userId]
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  if (!row.media_path) return null;

  return row;
}

/**
 * Processa um evento recebido via webhook da Evolution API.
 * Trata apenas os eventos necessários; demais eventos são ignorados (retorno rápido).
 */
export async function handleWebhookEvent(payload) {
  const { event, instance: instanceName, data } = payload;

  const instanceResult = await query(
    'SELECT * FROM whatsapp_instances WHERE instance_name = $1',
    [instanceName]
  );
  const instanceRow = instanceResult.rows[0];
  if (!instanceRow) return; // Evento de instância não rastreada (ex: já deletada)

  switch (event) {
    case 'QRCODE_UPDATED':
    case 'qrcode.updated':
      await handleQrCodeUpdated(instanceRow, data);
      break;

    case 'CONNECTION_UPDATE':
    case 'connection.update':
      await handleConnectionUpdate(instanceRow, data);
      break;

    case 'MESSAGES_UPSERT':
    case 'messages.upsert':
      await handleMessageUpsert(instanceRow, data);
      break;

    default:
      // Outros eventos (MESSAGES_UPDATE, SEND_MESSAGE, etc) não exigem ação por agora.
      break;
  }
}

async function handleQrCodeUpdated(instanceRow, data) {
  const base64 = data?.qrcode?.base64 || null;
  await query(
    `UPDATE whatsapp_instances SET last_qr_code = $1, last_qr_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [base64, instanceRow.id]
  );
}

async function handleConnectionUpdate(instanceRow, data) {
  const state = data?.state;
  if (!state) return;

  const fields = { status: state };
  if (state === 'open') fields.connected_at = new Date();
  if (state === 'close') fields.disconnected_at = new Date();

  await query(
    `UPDATE whatsapp_instances SET
      status = $1,
      connected_at = COALESCE($2, connected_at),
      disconnected_at = COALESCE($3, disconnected_at),
      updated_at = NOW()
     WHERE id = $4`,
    [fields.status, fields.connected_at || null, fields.disconnected_at || null, instanceRow.id]
  );
}

async function handleMessageUpsert(instanceRow, data) {
  const fromMe = Boolean(data?.key?.fromMe);
  // Mensagens enviadas por nós mesmos também chegam como MESSAGES_UPSERT
  // (comportamento documentado da Evolution API), mas já foram salvas no
  // momento do envio — evitamos duplicar.
  if (fromMe) return;

  const remoteJid = data?.key?.remoteJid;
  if (!remoteJid || remoteJid === 'status@broadcast') return; // ignora "stories"

  const phoneFromJid = remoteJid.split('@')[0];
  const leadId = await findLeadByPhone(instanceRow.user_id, phoneFromJid);

  const { messageType, textContent, mediaBase64, mimetype, filename } = extractMessageContent(data);

  let mediaPath = null;
  if (mediaBase64) {
    mediaPath = await saveBase64Media(mediaBase64, { mimetype, suggestedName: filename });
  }

  await query(
    `INSERT INTO whatsapp_messages (
      instance_id, lead_id, user_id, whatsapp_message_id, remote_jid, from_me,
      direction, message_type, text_content, media_path, media_mimetype, media_filename, status
    ) VALUES ($1, $2, $3, $4, $5, FALSE, 'received', $6, $7, $8, $9, $10, 'received')
    ON CONFLICT (instance_id, whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL DO NOTHING`,
    [
      instanceRow.id, leadId, instanceRow.user_id, data?.key?.id, remoteJid,
      messageType, textContent, mediaPath, mimetype, filename,
    ]
  );

  // Se a mensagem recebida corresponde a um lead que já tinha recebido
  // contato, avança automaticamente o status para "respondeu" no CRM.
  if (leadId) {
    await query(
      `UPDATE leads SET status = 'respondeu', updated_at = NOW()
       WHERE id = $1 AND status IN ('contato_enviado', 'nao_respondeu')`,
      [leadId]
    );
  }
}

function extractMessageContent(data) {
  const message = data?.message || {};
  const evolutionType = data?.messageType;
  const messageType = MESSAGE_TYPE_BY_EVOLUTION_TYPE[evolutionType] || 'other';

  if (messageType === 'text') {
    return {
      messageType,
      textContent: message.conversation || message.extendedTextMessage?.text || '',
      mediaBase64: null,
      mimetype: null,
      filename: null,
    };
  }

  // Para tipos de mídia, a Evolution API (com webhook.base64=true) entrega o
  // conteúdo já decodificado no campo `base64` da própria mensagem.
  const mediaNode = message[evolutionType] || {};
  return {
    messageType,
    textContent: mediaNode.caption || null,
    mediaBase64: data?.base64 || message.base64 || null,
    mimetype: mediaNode.mimetype || null,
    filename: mediaNode.fileName || null,
  };
}
