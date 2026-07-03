import cron from 'node-cron';
import { query } from '../database/init.mjs';

/**
 * Inicia o scheduler de credenciais
 * - Reset diário: todo dia à meia-noite
 * - Reset mensal: todo dia 1º do mês
 */
export function startCredentialScheduler() {
  // Reset diário - todo dia à meia-noite (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 [SCHEDULER] Resetando contadores diários de credenciais...');
    
    try {
      const result = await query(
        `UPDATE credentials 
         SET used_today = 0,
             status = CASE 
               WHEN status = 'limit_reached' AND used_month < monthly_limit THEN 'active'
               ELSE status
             END,
             updated_at = NOW()
         WHERE used_today > 0`
      );
      
      console.log(`✅ [SCHEDULER] ${result.rowCount} credenciais resetadas (diário)`);
    } catch (error) {
      console.error('❌ [SCHEDULER] Erro ao resetar credenciais (diário):', error);
    }
  });

  // Reset mensal - todo dia 1º do mês à 00:05
  cron.schedule('5 0 1 * *', async () => {
    console.log('🔄 [SCHEDULER] Resetando contadores mensais de credenciais...');
    
    try {
      const result = await query(
        `UPDATE credentials 
         SET used_month = 0,
             status = CASE 
               WHEN status = 'limit_reached' THEN 'active'
               ELSE status
             END,
             updated_at = NOW()
         WHERE used_month > 0`
      );
      
      console.log(`✅ [SCHEDULER] ${result.rowCount} credenciais resetadas (mensal)`);
    } catch (error) {
      console.error('❌ [SCHEDULER] Erro ao resetar credenciais (mensal):', error);
    }
  });

  console.log('⏰ [SCHEDULER] Agendador de credenciais iniciado');
  console.log('   • Reset diário: 00:00 (meia-noite)');
  console.log('   • Reset mensal: 00:05 do dia 1º');
}

/**
 * Força reset diário (útil para testes)
 */
export async function forceResetDaily() {
  console.log('🔄 Forçando reset diário...');
  
  const result = await query(
    `UPDATE credentials 
     SET used_today = 0,
         status = CASE 
           WHEN status = 'limit_reached' AND used_month < monthly_limit THEN 'active'
           ELSE status
         END,
         updated_at = NOW()
     WHERE used_today > 0
     RETURNING id, name`
  );
  
  console.log(`✅ ${result.rowCount} credenciais resetadas (diário)`);
  return result.rows;
}

/**
 * Força reset mensal (útil para testes)
 */
export async function forceResetMonthly() {
  console.log('🔄 Forçando reset mensal...');
  
  const result = await query(
    `UPDATE credentials 
     SET used_month = 0,
         status = CASE 
           WHEN status = 'limit_reached' THEN 'active'
           ELSE status
         END,
         updated_at = NOW()
     WHERE used_month > 0
     RETURNING id, name`
  );
  
  console.log(`✅ ${result.rowCount} credenciais resetadas (mensal)`);
  return result.rows;
}
