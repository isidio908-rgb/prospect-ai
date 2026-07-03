import { query } from '../database/init.mjs';

/**
 * Normaliza um domínio/URL
 * Remove www, protocolo, trailing slash, query params
 */
export function normalizeDomain(url) {
  if (!url || typeof url !== 'string') return '';
  
  try {
    // Adicionar protocolo se não tiver
    let normalized = url.trim().toLowerCase();
    if (!normalized.startsWith('http')) {
      normalized = 'https://' + normalized;
    }
    
    const urlObj = new URL(normalized);
    let domain = urlObj.hostname;
    
    // Remover www
    domain = domain.replace(/^www\./, '');
    
    return domain;
  } catch (error) {
    // Se não conseguir parsear como URL, tentar extrair domínio manualmente
    let cleaned = url.trim().toLowerCase();
    cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, '');
    cleaned = cleaned.split('/')[0];
    cleaned = cleaned.split('?')[0];
    cleaned = cleaned.split('#')[0];
    
    return cleaned;
  }
}

/**
 * Normaliza um telefone
 * Remove espaços, hífens, parênteses, +55, etc
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove tudo que não é número
  let normalized = phone.replace(/\D/g, '');
  
  // Remove código do país (55 para Brasil)
  if (normalized.startsWith('55') && normalized.length > 11) {
    normalized = normalized.slice(2);
  }
  
  // Remove leading zeros
  normalized = normalized.replace(/^0+/, '');
  
  return normalized;
}

/**
 * Normaliza um nome de empresa
 * Lowercase, remove acentos, espaços extras, pontuação
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  
  let normalized = name.trim().toLowerCase();
  
  // Remover acentos
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Remover pontuação e caracteres especiais
  normalized = normalized.replace(/[^\w\s]/g, ' ');
  
  // Remover espaços extras
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Remover palavras comuns de empresa
  const stopWords = ['ltda', 'eireli', 'me', 'epp', 'sa', 's/a', 's.a', 'comercio', 'servicos'];
  const words = normalized.split(' ');
  normalized = words.filter(w => !stopWords.includes(w)).join(' ');
  
  return normalized;
}

/**
 * Calcula similaridade entre dois textos (0 a 1)
 * Usa algoritmo de Levenshtein
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return 0;
  if (len2 === 0) return 0;
  
  // Matriz de distâncias
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Calcular distâncias
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  const similarity = 1 - (distance / maxLen);
  
  return similarity;
}

/**
 * Verifica se um lead já existe no banco (duplicata)
 * Prioridade (conforme regra de negócio): place_id > business_id > google_id >
 * telefone > domínio do site > nome_empresa + cidade
 * Retorna { isDuplicate: boolean, duplicateId: number|null, reason: string, confidence: number }
 */
export async function checkDuplicate(userId, lead) {
  // 0.1 Verificar por place_id (chave mais confiável, 100% confiança)
  if (lead.place_id) {
    const result = await query(
      `SELECT id, nome_empresa FROM leads 
       WHERE user_id = $1 AND place_id = $2
       LIMIT 1`,
      [userId, lead.place_id]
    );

    if (result.rows.length > 0) {
      return {
        isDuplicate: true,
        duplicateId: result.rows[0].id,
        duplicateName: result.rows[0].nome_empresa,
        reason: 'place_id idêntico',
        confidence: 1.0,
        field: 'place_id'
      };
    }
  }

  // 0.2 Verificar por business_id (100% confiança)
  if (lead.business_id) {
    const result = await query(
      `SELECT id, nome_empresa FROM leads 
       WHERE user_id = $1 AND business_id = $2
       LIMIT 1`,
      [userId, lead.business_id]
    );

    if (result.rows.length > 0) {
      return {
        isDuplicate: true,
        duplicateId: result.rows[0].id,
        duplicateName: result.rows[0].nome_empresa,
        reason: 'business_id idêntico',
        confidence: 1.0,
        field: 'business_id'
      };
    }
  }

  // 0.3 Verificar por google_id (100% confiança)
  if (lead.google_id) {
    const result = await query(
      `SELECT id, nome_empresa FROM leads 
       WHERE user_id = $1 AND google_id = $2
       LIMIT 1`,
      [userId, lead.google_id]
    );

    if (result.rows.length > 0) {
      return {
        isDuplicate: true,
        duplicateId: result.rows[0].id,
        duplicateName: result.rows[0].nome_empresa,
        reason: 'google_id idêntico',
        confidence: 1.0,
        field: 'google_id'
      };
    }
  }

  // 4. Verificar por telefone normalizado (95% confiança)
  if (lead.telefone) {
    const phone = normalizePhone(lead.telefone);
    if (phone && phone.length >= 8) {
      const result = await query(
        `SELECT id, nome_empresa FROM leads 
         WHERE user_id = $1 AND phone_normalized = $2
         LIMIT 1`,
        [userId, phone]
      );
      
      if (result.rows.length > 0) {
        return {
          isDuplicate: true,
          duplicateId: result.rows[0].id,
          duplicateName: result.rows[0].nome_empresa,
          reason: 'Telefone idêntico',
          confidence: 0.95,
          field: 'telefone'
        };
      }
    }
  }

  // 5. Verificar por domínio do site (90% confiança)
  if (lead.site) {
    const domain = normalizeDomain(lead.site);
    if (domain) {
      const result = await query(
        `SELECT id, nome_empresa FROM leads 
         WHERE user_id = $1 AND domain_normalized = $2
         LIMIT 1`,
        [userId, domain]
      );
      
      if (result.rows.length > 0) {
        return {
          isDuplicate: true,
          duplicateId: result.rows[0].id,
          duplicateName: result.rows[0].nome_empresa,
          reason: 'Domínio idêntico',
          confidence: 0.90,
          field: 'site'
        };
      }
    }
  }
  
  // 6. Verificar por nome normalizado + cidade (85% confiança)
  if (lead.nome_empresa && lead.cidade) {
    const name = normalizeName(lead.nome_empresa);
    if (name) {
      const result = await query(
        `SELECT id, nome_empresa, name_normalized FROM leads 
         WHERE user_id = $1 
         AND name_normalized = $2
         AND LOWER(cidade) = LOWER($3)
         LIMIT 1`,
        [userId, name, lead.cidade]
      );
      
      if (result.rows.length > 0) {
        return {
          isDuplicate: true,
          duplicateId: result.rows[0].id,
          duplicateName: result.rows[0].nome_empresa,
          reason: 'Nome + cidade idênticos',
          confidence: 0.85,
          field: 'nome_empresa'
        };
      }
    }
  }
  
  // 7. Verificar por similaridade de nome + cidade (threshold 90%)
  if (lead.nome_empresa && lead.cidade) {
    const name = normalizeName(lead.nome_empresa);
    if (name) {
      const result = await query(
        `SELECT id, nome_empresa, name_normalized FROM leads 
         WHERE user_id = $1 
         AND LOWER(cidade) = LOWER($2)
         AND name_normalized IS NOT NULL
         LIMIT 50`,
        [userId, lead.cidade]
      );
      
      for (const row of result.rows) {
        const similarity = calculateSimilarity(name, row.name_normalized);
        if (similarity >= 0.90) {
          return {
            isDuplicate: true,
            duplicateId: row.id,
            duplicateName: row.nome_empresa,
            reason: `Nome similar (${Math.round(similarity * 100)}%) na mesma cidade`,
            confidence: similarity * 0.85,
            field: 'nome_empresa',
            similarity
          };
        }
      }
    }
  }
  
  // Não é duplicata
  return {
    isDuplicate: false,
    duplicateId: null,
    reason: 'Lead único',
    confidence: 0
  };
}

/**
 * Encontra todas as duplicatas no banco do usuário
 * Retorna array de grupos de duplicatas
 */
export async function findAllDuplicates(userId, options = {}) {
  const { threshold = 0.85, limit = 100 } = options;
  
  // Buscar todos os leads do usuário
  const result = await query(
    `SELECT id, nome_empresa, site, telefone, cidade, 
            place_id, business_id, google_id,
            domain_normalized, phone_normalized, name_normalized
     FROM leads 
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  const leads = result.rows;
  const duplicateGroups = [];
  const processed = new Set();
  
  // Comparar cada lead com os outros
  for (let i = 0; i < leads.length; i++) {
    if (processed.has(leads[i].id)) continue;
    
    const group = [leads[i]];
    
    for (let j = i + 1; j < leads.length; j++) {
      if (processed.has(leads[j].id)) continue;
      
      // Verificar se são duplicatas (mesma prioridade usada em checkDuplicate)
      const isDuplicate = 
        (leads[i].place_id && leads[i].place_id === leads[j].place_id) ||
        (leads[i].business_id && leads[i].business_id === leads[j].business_id) ||
        (leads[i].google_id && leads[i].google_id === leads[j].google_id) ||
        (leads[i].phone_normalized && leads[i].phone_normalized === leads[j].phone_normalized) ||
        (leads[i].domain_normalized && leads[i].domain_normalized === leads[j].domain_normalized) ||
        (leads[i].name_normalized && leads[j].name_normalized && 
         leads[i].cidade && leads[j].cidade &&
         leads[i].cidade.toLowerCase() === leads[j].cidade.toLowerCase() &&
         calculateSimilarity(leads[i].name_normalized, leads[j].name_normalized) >= threshold);
      
      if (isDuplicate) {
        group.push(leads[j]);
        processed.add(leads[j].id);
      }
    }
    
    if (group.length > 1) {
      duplicateGroups.push(group);
      group.forEach(lead => processed.add(lead.id));
    }
  }
  
  return duplicateGroups;
}

/**
 * Mescla dois leads (mantém o primeiro, deleta o segundo)
 * Combina informações dos dois
 */
export async function mergeLeads(userId, keepId, deleteId) {
  // Buscar ambos os leads
  const result = await query(
    `SELECT * FROM leads 
     WHERE id IN ($1, $2) AND user_id = $3`,
    [keepId, deleteId, userId]
  );
  
  if (result.rows.length !== 2) {
    throw new Error('Um ou ambos os leads não foram encontrados');
  }
  
  const keep = result.rows.find(l => l.id === keepId);
  const del = result.rows.find(l => l.id === deleteId);
  
  // Mesclar informações (preferir dados mais completos)
  const merged = {
    site: keep.site || del.site,
    telefone: keep.telefone || del.telefone,
    whatsapp: keep.whatsapp || del.whatsapp,
    email: keep.email || del.email,
    endereco: keep.endereco || del.endereco,
    bairro: keep.bairro || del.bairro,
    instagram: keep.instagram || del.instagram,
    facebook: keep.facebook || del.facebook,
    emails_encontrados: keep.emails_encontrados || del.emails_encontrados,
    telefones_encontrados: keep.telefones_encontrados || del.telefones_encontrados,
    observacoes: [keep.observacoes, del.observacoes].filter(Boolean).join(' | '),
    
    // Se o lead que será deletado foi analisado e o mantido não, copiar análise
    ...(del.data_analise && !keep.data_analise && {
      site_final: del.site_final,
      status_site: del.status_site,
      tempo_carregamento_ms: del.tempo_carregamento_ms,
      tamanho_kb: del.tamanho_kb,
      tem_pixel_meta: del.tem_pixel_meta,
      tem_gtm: del.tem_gtm,
      tem_ga4: del.tem_ga4,
      tem_google_ads_tag: del.tem_google_ads_tag,
      tem_whatsapp_site: del.tem_whatsapp_site,
      tem_formulario: del.tem_formulario,
      tem_https: del.tem_https,
      score: del.score,
      prioridade: del.prioridade,
      oportunidades: del.oportunidades,
      pontos_positivos: del.pontos_positivos,
      diagnostico: del.diagnostico,
      mensagem_whatsapp: del.mensagem_whatsapp,
      data_analise: del.data_analise
    })
  };
  
  // Atualizar lead mantido
  const updateFields = Object.keys(merged);
  const updateValues = Object.values(merged);
  const updatePlaceholders = updateFields.map((field, i) => `${field} = $${i + 1}`).join(', ');
  
  await query(
    `UPDATE leads 
     SET ${updatePlaceholders}, updated_at = NOW()
     WHERE id = $${updateFields.length + 1} AND user_id = $${updateFields.length + 2}`,
    [...updateValues, keepId, userId]
  );
  
  // Deletar lead duplicado
  await query(
    'DELETE FROM leads WHERE id = $1 AND user_id = $2',
    [deleteId, userId]
  );
  
  return {
    merged: true,
    keptId: keepId,
    deletedId: deleteId,
    mergedFields: updateFields
  };
}

/**
 * Atualiza campos normalizados de um lead
 */
export async function updateNormalizedFields(leadId, lead) {
  const domain = lead.site ? normalizeDomain(lead.site) : null;
  const phone = lead.telefone ? normalizePhone(lead.telefone) : null;
  const name = lead.nome_empresa ? normalizeName(lead.nome_empresa) : null;
  
  await query(
    `UPDATE leads 
     SET domain_normalized = $1,
         phone_normalized = $2,
         name_normalized = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [domain, phone, name, leadId]
  );
}

/**
 * Normaliza todos os leads existentes do usuário (migração)
 */
export async function normalizeAllLeads(userId) {
  const result = await query(
    `SELECT id, nome_empresa, site, telefone FROM leads 
     WHERE user_id = $1 AND domain_normalized IS NULL`,
    [userId]
  );
  
  let updated = 0;
  
  for (const lead of result.rows) {
    try {
      await updateNormalizedFields(lead.id, lead);
      updated++;
    } catch (error) {
      console.error(`Erro ao normalizar lead ${lead.id}:`, error.message);
    }
  }
  
  return {
    total: result.rows.length,
    updated,
    message: `${updated} leads normalizados`
  };
}
