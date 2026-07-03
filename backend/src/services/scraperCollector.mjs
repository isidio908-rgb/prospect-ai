import { query } from '../database/init.mjs';
import { decrypt } from './encryption.mjs';
import * as rapidapi from './scrapers/rapidApiLocalBusiness.mjs';
import * as apify from './scrapers/apifyGoogleMaps.mjs';
import * as serper from './scrapers/serper.mjs';

// Mapa de coletores por tipo de credencial.
const COLLECTORS = {
  rapidapi: rapidapi.collect,
  apify: apify.collect,
  serper: serper.collect,
};

const TESTERS = {
  rapidapi: rapidapi.test,
  apify: apify.test,
  serper: serper.test,
};

/**
 * Coleta leads usando a credencial informada, despachando para o provedor
 * correto conforme credentials.type. Centraliza: verificação de status/cota,
 * descriptografia da chave e contabilização de uso.
 */
export async function collectLeads(userId, options) {
  const { credentialId } = options;

  const credResult = await query(
    `SELECT
      id, type, api_key_encrypted, api_host, base_url, search_endpoint,
      daily_limit, used_today, status
     FROM credentials
     WHERE id = $1 AND user_id = $2`,
    [credentialId, userId]
  );

  if (credResult.rows.length === 0) {
    throw new Error('Credencial não encontrada');
  }

  const credential = credResult.rows[0];

  if (credential.status !== 'active') {
    throw new Error(`Credencial está ${credential.status}`);
  }

  if (credential.used_today >= credential.daily_limit) {
    await query('UPDATE credentials SET status = $1 WHERE id = $2', ['limit_reached', credential.id]);
    throw new Error(`Limite diário atingido: ${credential.used_today}/${credential.daily_limit}`);
  }

  const apiKey = decrypt(credential.api_key_encrypted);
  if (!apiKey) {
    throw new Error('Erro ao descriptografar API Key');
  }

  const collector = COLLECTORS[credential.type];
  if (!collector) {
    throw new Error(`Provedor não suportado: ${credential.type}`);
  }

  const remainingQuota = credential.daily_limit - credential.used_today;
  const { leads } = await collector(apiKey, credential, { ...options, remainingQuota });

  // Contabiliza 1 requisição por coleta (independente do nº de resultados).
  await query(
    `UPDATE credentials
     SET used_today = used_today + 1,
         used_month = used_month + 1,
         last_used_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [credential.id]
  );

  await query(
    `INSERT INTO credential_usage (credential_id, date, requests_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (credential_id, date)
     DO UPDATE SET requests_count = credential_usage.requests_count + 1`,
    [credential.id]
  );

  return {
    leads,
    total: leads.length,
    sourceType: credential.type,
    credentialUsed: credential.id,
    usedToday: credential.used_today + 1,
    dailyLimit: credential.daily_limit,
  };
}

/**
 * Testa uma credencial conforme seu provedor. Retorna { success, statusCode }.
 */
export async function testCredentialByType(type, apiKey, credential) {
  const tester = TESTERS[type];
  if (!tester) {
    throw new Error(`Provedor não suportado: ${type}`);
  }
  return tester(apiKey, credential);
}
