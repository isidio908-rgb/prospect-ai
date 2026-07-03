import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.mjs';
import * as whatsappService from '../../services/whatsapp/whatsappService.mjs';
import { getAbsolutePath } from '../../services/whatsapp/mediaStorage.mjs';

const router = express.Router();

// Todas as rotas deste arquivo exigem autenticação (o webhook público vive
// em outro arquivo, registrado separadamente no server.mjs sem este middleware).
router.use(authenticate);

const securityOptionsSchema = z.object({
  readMessagesAuto: z.boolean().optional(),
  readStatusAuto: z.boolean().optional(),
  rejectCall: z.boolean().optional(),
  msgCall: z.string().max(500).optional(),
  groupsIgnore: z.boolean().optional(),
  alwaysOnline: z.boolean().optional(),
  simulateTyping: z.boolean().optional(),
});

const sendTextSchema = z.object({
  text: z.string().min(1, 'Mensagem não pode ser vazia'),
});

const sendMediaSchema = z.object({
  mediatype: z.enum(['image', 'video', 'document']),
  mimetype: z.string().min(1),
  media: z.string().min(1, 'media (URL, base64 ou data-URI) é obrigatório'),
  fileName: z.string().min(1),
  caption: z.string().optional(),
});

const sendAudioSchema = z.object({
  audio: z.string().min(1, 'audio (URL, base64 ou data-URI) é obrigatório'),
  mimetype: z.string().optional(),
  fileName: z.string().optional(),
});

// POST /api/whatsapp/connect - Cria/conecta a instância do usuário e retorna o QR code
router.post('/connect', async (req, res, next) => {
  try {
    const securityOptions = securityOptionsSchema.parse(req.body || {});
    const result = await whatsappService.connectInstance(req.user.id, securityOptions);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/whatsapp/status - Status atual da conexão (e opções de segurança salvas)
router.get('/status', async (req, res, next) => {
  try {
    const result = await whatsappService.getInstanceStatus(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/whatsapp/disconnect - Logout (mantém a instância, pede novo QR code depois)
router.post('/disconnect', async (req, res, next) => {
  try {
    await whatsappService.disconnectInstance(req.user.id);
    res.json({ message: 'WhatsApp desconectado' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/whatsapp - Remove a instância permanentemente
router.delete('/', async (req, res, next) => {
  try {
    await whatsappService.deleteInstance(req.user.id);
    res.json({ message: 'Instância WhatsApp removida' });
  } catch (error) {
    next(error);
  }
});

// GET /api/whatsapp/leads/:leadId/messages - Histórico de conversa com o lead
router.get('/leads/:leadId/messages', async (req, res, next) => {
  try {
    const messages = await whatsappService.getLeadMessages(req.user.id, req.params.leadId);
    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

// GET /api/whatsapp/messages/:messageId/media - Baixa o arquivo de mídia de uma mensagem
// (verifica propriedade via user_id antes de servir; nunca expõe o caminho de disco)
router.get('/messages/:messageId/media', async (req, res, next) => {
  try {
    const media = await whatsappService.getMessageMedia(req.user.id, req.params.messageId);
    if (!media) {
      return res.status(404).json({ error: 'Mídia não encontrada' });
    }

    res.setHeader('Content-Type', media.media_mimetype || 'application/octet-stream');
    if (media.media_filename) {
      res.setHeader('Content-Disposition', `inline; filename="${media.media_filename}"`);
    }
    res.sendFile(getAbsolutePath(media.media_path));
  } catch (error) {
    next(error);
  }
});

// POST /api/whatsapp/leads/:leadId/messages/text - Envia texto (confirma leitura pendente antes)
router.post('/leads/:leadId/messages/text', async (req, res, next) => {
  try {
    const { text } = sendTextSchema.parse(req.body);
    const message = await whatsappService.sendTextToLead(req.user.id, req.params.leadId, text);
    res.status(201).json({ message: 'Mensagem enviada', data: message });
  } catch (error) {
    next(error);
  }
});

// POST /api/whatsapp/leads/:leadId/messages/media - Envia imagem/vídeo/documento (ex: propostas em PDF)
router.post('/leads/:leadId/messages/media', async (req, res, next) => {
  try {
    const data = sendMediaSchema.parse(req.body);
    const message = await whatsappService.sendMediaToLead(req.user.id, req.params.leadId, data);
    res.status(201).json({ message: 'Mídia enviada', data: message });
  } catch (error) {
    next(error);
  }
});

// POST /api/whatsapp/leads/:leadId/messages/audio - Envia nota de voz
router.post('/leads/:leadId/messages/audio', async (req, res, next) => {
  try {
    const data = sendAudioSchema.parse(req.body);
    const message = await whatsappService.sendAudioToLead(req.user.id, req.params.leadId, data);
    res.status(201).json({ message: 'Áudio enviado', data: message });
  } catch (error) {
    next(error);
  }
});

export default router;
