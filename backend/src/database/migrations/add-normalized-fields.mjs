import { query } from '../init.mjs';

/**
 * Migração: Adiciona campos normalizados para deduplicação
 */
export async function up() {
  console.log('🔄 Executando migração: add-normalized-fields');
  
  try {
    // Adicionar colunas
    await query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS domain_normalized VARCHAR(500),
      ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(50),
      ADD COLUMN IF NOT EXISTS name_normalized VARCHAR(500)
    `);
    
    console.log('✅ Colunas adicionadas');
    
    // Criar índices para performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_leads_domain_normalized 
      ON leads(user_id, domain_normalized) 
      WHERE domain_normalized IS NOT NULL
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized 
      ON leads(user_id, phone_normalized) 
      WHERE phone_normalized IS NOT NULL
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_leads_name_normalized 
      ON leads(user_id, name_normalized, cidade) 
      WHERE name_normalized IS NOT NULL
    `);
    
    console.log('✅ Índices criados');
    console.log('✅ Migração concluída!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  }
}

/**
 * Rollback da migração
 */
export async function down() {
  console.log('🔄 Revertendo migração: add-normalized-fields');
  
  try {
    // Remover índices
    await query('DROP INDEX IF EXISTS idx_leads_domain_normalized');
    await query('DROP INDEX IF EXISTS idx_leads_phone_normalized');
    await query('DROP INDEX IF EXISTS idx_leads_name_normalized');
    
    // Remover colunas
    await query(`
      ALTER TABLE leads 
      DROP COLUMN IF EXISTS domain_normalized,
      DROP COLUMN IF EXISTS phone_normalized,
      DROP COLUMN IF EXISTS name_normalized
    `);
    
    console.log('✅ Migração revertida');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao reverter migração:', error);
    throw error;
  }
}

// Se executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  up()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
