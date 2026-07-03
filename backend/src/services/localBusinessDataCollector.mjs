import { query } from '../database/init.mjs';
import { decrypt } from './encryption.mjs';
import { checkDuplicate, updateNormalizedFields } from './deduplicator.mjs';

/**
 * Coleta leads via Local Business Data API usando credencial do banco
 */
export async function collectFromLocalBusinessData(userId, options) {
  const {
    credentialId,
    query: searchQuery,
    city,
    niche,
    limit = 20,
    lat,
    lng,
    zoom = 13,
    language = 'pt',
    region = 'br',
    extractEmailsAndContacts = false
  } = options;

  // Buscar credencial do banco
  const credResult = await query(
    `SELECT 
      id, api_key_encrypted, api_host, base_url, search_endpoint,
      daily_limit, used_today, status
     FROM credentials
     WHERE id = $1 AND user_id = $2`,
    [credentialId, userId]
  );

  if (credResult.rows.length === 0) {
    throw new Error('Credencial não encontrada');
  }

  const credential = credResult.rows[0];

  // Verificar status
  if (credential.status !== 'active') {
    throw new Error(`Credencial está ${credential.status}`);
  }

  // Verificar cota
  if (credential.used_today >= credential.daily_limit) {
    await query(
      'UPDATE credentials SET status = $1 WHERE id = $2',
      ['limit_reached', credential.id]
    );
    throw new Error(`Limite diário atingido: ${credential.used_today}/${credential.daily_limit}`);
  }

  // Descriptografar API Key
  const apiKey = decrypt(credential.api_key_encrypted);
  if (!apiKey) {
    throw new Error('Erro ao descriptografar API Key');
  }

  // Construir URL
  const params = new URLSearchParams();
  params.append('query', searchQuery || `${niche} em ${city}`);
  params.append('limit', Math.min(limit, credential.daily_limit - credential.used_today));
  
  if (lat) params.append('lat', lat);
  if (lng) params.append('lng', lng);
  if (zoom) params.append('zoom', zoom);
  if (language) params.append('language', language);
  if (region) params.append('region', region);
  if (extractEmailsAndContacts) params.append('extract_emails_and_contacts', 'true');

  const url = `${credential.base_url}${credential.search_endpoint}?${params.toString()}`;

  // Fazer requisição
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': credential.api_host,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API retornou ${response.status}: ${error.slice(0, 200)}`);
  }

  const data = await response.json();

  // Incrementar uso da credencial
  await query(
    `UPDATE credentials 
     SET used_today = used_today + 1,
         used_month = used_month + 1,
         last_used_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [credential.id]
  );

  // Atualizar histórico de uso
  await query(
    `INSERT INTO credential_usage (credential_id, date, requests_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (credential_id, date)
     DO UPDATE SET requests_count = credential_usage.requests_count + 1`,
    [credential.id]
  );

  // Processar resposta
  const businesses = data.data || [];
  
  // Normalizar leads
  const leads = businesses.map(business => normalizeLocalBusinessData(business, {
    city,
    niche,
    source: 'local_business_data'
  }));

  return {
    leads,
    total: leads.length,
    credentialUsed: credential.id,
    usedToday: credential.used_today + 1,
    dailyLimit: credential.daily_limit
  };
}

/**
 * Normaliza dados do Local Business Data para o contrato interno.
 * Mapeamento conforme docs/providers/local-business-data.md:
 * - IDs (place_id, business_id, google_id) e rating/review_count vão em
 *   colunas dedicadas (usadas para deduplicação e exportação/filtros).
 * - Dados complementares (endereço, distrito, links, etc) ficam em
 *   `observacoes` como texto legível "chave=valor | chave=valor".
 */
function normalizeLocalBusinessData(business, context = {}) {
  const address = business.full_address || business.address || '';
  const about = business.about?.summary || '';

  const observacoesParts = [
    address ? `address=${address}` : '',
    business.district ? `district=${business.district}` : '',
    business.street_address ? `street_address=${business.street_address}` : '',
    business.zipcode ? `zipcode=${business.zipcode}` : '',
    business.state ? `state=${business.state}` : '',
    business.country ? `country=${business.country}` : '',
    business.latitude !== undefined ? `latitude=${business.latitude}` : '',
    business.longitude !== undefined ? `longitude=${business.longitude}` : '',
    business.business_status ? `status=${business.business_status}` : '',
    business.verified !== undefined ? `verified=${business.verified}` : '',
    business.reviews_link ? `reviews_link=${business.reviews_link}` : '',
    Array.isArray(business.subtypes) && business.subtypes.length
      ? `subtypes=${business.subtypes.join(',')}`
      : '',
    about ? `about=${about}` : ''
  ].filter(Boolean);

  return {
    // Campos principais
    nome_empresa: business.name || '',
    site: business.website || '',
    telefone: business.phone_number || '',
    cidade: business.city || context.city || '',
    nicho: context.niche || '',
    categoria: business.type || '',
    fonte: context.source || 'local_business_data',

    // IDs externos (usados para deduplicação com prioridade máxima)
    place_id: business.place_id || null,
    business_id: business.business_id || null,
    google_id: business.google_id || null,

    // Avaliações e mapa (colunas dedicadas)
    rating: business.rating ?? null,
    total_avaliacoes: business.review_count ?? null,
    google_maps_url: business.place_link || null,

    // Dados complementares em texto legível
    observacoes: observacoesParts.join(' | ')
  };
}

/**
 * Salva leads no banco com deduplicação avançada
 */
export async function saveLeadsWithDeduplication(userId, leads) {
  const saved = [];
  const duplicates = [];
  const errors = [];

  for (const lead of leads) {
    try {
      // Verificar duplicatas usando o novo sistema
      const duplicateCheck = await checkDuplicate(userId, lead);
      
      if (duplicateCheck.isDuplicate) {
        duplicates.push({
          empresa: lead.nome_empresa,
          existing_id: duplicateCheck.duplicateId,
          existing_name: duplicateCheck.duplicateName,
          reason: duplicateCheck.reason,
          confidence: duplicateCheck.confidence,
          field: duplicateCheck.field
        });
        continue;
      }

      // Inserir lead
      const result = await query(
        `INSERT INTO leads (
          user_id, nome_empresa, site, telefone, cidade, nicho, categoria, fonte, observacoes,
          place_id, business_id, google_id, rating, total_avaliacoes, google_maps_url, data_coleta
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        RETURNING id, nome_empresa, site, cidade, nicho`,
        [
          userId,
          lead.nome_empresa,
          lead.site,
          lead.telefone,
          lead.cidade,
          lead.nicho,
          lead.categoria,
          lead.fonte,
          typeof lead.observacoes === 'string' ? lead.observacoes : JSON.stringify(lead.observacoes),
          lead.place_id || null,
          lead.business_id || null,
          lead.google_id || null,
          lead.rating ?? null,
          lead.total_avaliacoes ?? null,
          lead.google_maps_url || null
        ]
      );

      const savedLead = result.rows[0];
      
      // Atualizar campos normalizados
      await updateNormalizedFields(savedLead.id, lead);
      
      saved.push(savedLead);
    } catch (error) {
      errors.push({
        lead: lead.nome_empresa,
        error: error.message
      });
    }
  }

  return { saved, duplicates, errors };
}
