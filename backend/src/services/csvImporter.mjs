import { query } from '../database/init.mjs';

/**
 * Importa leads de um CSV
 * Formato esperado: nome_empresa,site,telefone,cidade,nicho,categoria,fonte,observacoes
 */
export async function importLeadsFromCSV(userId, csvContent) {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV deve ter pelo menos cabeçalho e uma linha de dados');
  }
  
  // Remover cabeçalho
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const dataLines = lines.slice(1);
  
  // Validar cabeçalho mínimo
  const requiredFields = ['nome_empresa'];
  const hasRequired = requiredFields.every(field => 
    header.some(h => h.includes('empresa') || h.includes('nome') || h.includes('name'))
  );
  
  if (!hasRequired) {
    throw new Error('CSV deve ter pelo menos a coluna "nome_empresa"');
  }
  
  const results = {
    imported: [],
    errors: [],
    duplicates: []
  };
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;
    
    try {
      const values = parseCSVLine(line);
      const lead = mapCSVToLead(header, values);
      
      if (!lead.nome_empresa) {
        results.errors.push({
          line: i + 2,
          error: 'Nome da empresa é obrigatório',
          data: line
        });
        continue;
      }
      
      // Verificar duplicado (mesmo nome + cidade ou mesmo site)
      const duplicateCheck = await query(
        `SELECT id FROM leads 
         WHERE user_id = $1 
         AND (
           (LOWER(nome_empresa) = LOWER($2) AND LOWER(cidade) = LOWER($3))
           OR (site IS NOT NULL AND site != '' AND LOWER(site) = LOWER($4))
         )
         LIMIT 1`,
        [userId, lead.nome_empresa, lead.cidade || '', lead.site || '']
      );
      
      if (duplicateCheck.rows.length > 0) {
        results.duplicates.push({
          line: i + 2,
          empresa: lead.nome_empresa,
          existing_id: duplicateCheck.rows[0].id
        });
        continue;
      }
      
      // Inserir no banco
      const result = await query(
        `INSERT INTO leads (
          user_id, nome_empresa, site, telefone, cidade, nicho, categoria, fonte, observacoes, data_coleta
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING id, nome_empresa, site, cidade, nicho`,
        [
          userId,
          lead.nome_empresa,
          lead.site || '',
          lead.telefone || '',
          lead.cidade || '',
          lead.nicho || '',
          lead.categoria || '',
          lead.fonte || 'csv_import',
          lead.observacoes || ''
        ]
      );
      
      results.imported.push(result.rows[0]);
    } catch (error) {
      results.errors.push({
        line: i + 2,
        error: error.message,
        data: line
      });
    }
  }
  
  return results;
}

/**
 * Parse linha CSV considerando vírgulas dentro de aspas
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/**
 * Mapeia valores do CSV para objeto lead
 */
function mapCSVToLead(header, values) {
  const lead = {};
  
  for (let i = 0; i < header.length; i++) {
    const field = header[i];
    const value = values[i] || '';
    
    // Mapear variações de nomes de colunas
    if (field.includes('empresa') || field.includes('nome')) {
      lead.nome_empresa = value;
    } else if (field.includes('site') || field.includes('website') || field.includes('url')) {
      lead.site = value;
    } else if (field.includes('telefone') || field.includes('phone') || field.includes('whatsapp')) {
      lead.telefone = value;
    } else if (field.includes('cidade') || field.includes('city')) {
      lead.cidade = value;
    } else if (field.includes('nicho') || field.includes('niche')) {
      lead.nicho = value;
    } else if (field.includes('categoria') || field.includes('category')) {
      lead.categoria = value;
    } else if (field.includes('fonte') || field.includes('source')) {
      lead.fonte = value;
    } else if (field.includes('observa') || field.includes('notes') || field.includes('obs')) {
      lead.observacoes = value;
    }
  }
  
  return lead;
}

/**
 * Exporta leads para CSV
 */
export async function exportLeadsToCSV(userId, filters = {}) {
  // Construir query com filtros
  let whereConditions = ['user_id = $1'];
  let params = [userId];
  let paramIndex = 2;
  
  if (filters.status) {
    whereConditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }
  
  if (filters.prioridade) {
    whereConditions.push(`prioridade = $${paramIndex++}`);
    params.push(filters.prioridade);
  }
  
  if (filters.cidade) {
    whereConditions.push(`LOWER(cidade) = LOWER($${paramIndex++})`);
    params.push(filters.cidade);
  }
  
  if (filters.nicho) {
    whereConditions.push(`LOWER(nicho) = LOWER($${paramIndex++})`);
    params.push(filters.nicho);
  }
  
  if (filters.minScore) {
    whereConditions.push(`score >= $${paramIndex++}`);
    params.push(filters.minScore);
  }
  
  const whereClause = whereConditions.join(' AND ');
  
  const result = await query(
    `SELECT 
      nome_empresa, site, telefone, whatsapp, email,
      cidade, bairro, endereco, nicho, categoria,
      rating, total_avaliacoes,
      score, prioridade, status,
      tem_site, site_online,
      tem_pixel_meta, tem_gtm, tem_ga4, tem_google_ads_tag,
      tem_whatsapp_site, tem_formulario, tem_https,
      tem_pagina_contato, tem_cta_visivel,
      instagram, facebook, linkedin,
      oportunidades, pontos_positivos, diagnostico,
      mensagem_whatsapp, mensagem_whatsapp_followup,
      fonte, observacoes,
      data_coleta, data_analise
     FROM leads 
     WHERE ${whereClause}
     ORDER BY score DESC, nome_empresa ASC`,
    params
  );
  
  if (result.rows.length === 0) {
    return '';
  }
  
  // Criar CSV
  const headers = Object.keys(result.rows[0]);
  const csvLines = [headers.join(',')];
  
  for (const row of result.rows) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      
      // Escapar vírgulas e aspas
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    });
    
    csvLines.push(values.join(','));
  }
  
  return csvLines.join('\n');
}
