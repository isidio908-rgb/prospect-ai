import express from 'express';
import * as whatsappService from '../../services/whatsapp/whatsappService.mjs';
import { processApprovalWebhookEvent } from '../../services/autopilot/approvalBatchService.mjs';

const router = express.Router();

/**
 * POST /api/whatsapp/webhook - Endpoint público chamado pela Evolution API.
 *
 * NÃO usa o middleware `authenticate` (é a própria Evolution API chamando,
 * não um usuário logado). A segurança é feita validando o header
 * Authorization contra EVOLUTION_WEBHOOK_SECRET, configurado como header
 * customizado no momento da criação da instância (ver evolutionClient.createInstance).
 *
 * Sempre responde 200 rapidamente (mesmo em erro de processamento) para
 * evitar que a Evolution API entre em loop de retry por um problema que não
 * será resolvido só tentando de novo.
 */
router.post('/webhook', async (req, res) => {
  const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

  if (expectedSecret) {
    const authHeader = req.headers.authorization || '';
    const receivedSecret = authHeader.replace(/^Bearer\s+/i, '');

    if (receivedSecret !== expectedSecret) {
      console.warn('⚠️ Webhook WhatsApp: tentativa com secret inválido');
      return res.status(401).send('Unauthorized');
    }
  }

  try {
    await whatsappService.handleWebhookEvent(req.body);
  } catch (error) {
    console.error('Erro ao processar webhook WhatsApp:', error.message);
  }

  try {
    await processApprovalWebhookEvent(req.body);
  } catch (error) {
    console.error('Erro ao processar aprovação Autopilot via WhatsApp:', error.message);
  }

  res.status(200).send('OK');
});

export default router;
