import { query } from '../database/init.mjs';
import { checkDuplicate, updateNormalizedFields } from './deduplicator.mjs';

/**
 * Normaliza dados do Local Business Data para o contrato interno.
 * Mapeamento conforme docs/providers/local-business-data.md:
 * - IDs (place_id, business_id, google_id) e rating/review_count vão em
 *   colunas dedicadas (usadas para deduplicação e exportação/filtros).
 * - Dados complementares (endereço, distrito, links, etc) ficam em
 *   `observacoes` como texto legível "chave=valor | chave=valor".
 */
export function normalizeLocalBusinessData(business, context = {}) {
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
          user_id, nome_empresa, site, telefone, whatsapp, cidade, nicho, categoria, fonte, observacoes,
          place_id, business_id, google_id, rating, total_avaliacoes, google_maps_url, data_coleta
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
        RETURNING id, nome_empresa, site, cidade, nicho`,
        [
          userId,
          lead.nome_empresa,
          lead.site,
          lead.telefone,
          lead.whatsapp || null,
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
