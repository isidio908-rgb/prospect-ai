import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './api/routes/auth.mjs';
import leadsRoutes from './api/routes/leads.mjs';
import statsRoutes from './api/routes/stats.mjs';
import credentialsRoutes from './api/routes/credentials.mjs';
import aiRoutes from './api/routes/ai.mjs';
import whatsappRoutes from './api/routes/whatsapp.mjs';
import whatsappWebhookRoutes from './api/routes/whatsappWebhook.mjs';
import { errorHandler } from './api/middleware/errorHandler.mjs';
import { initDatabase } from './database/init.mjs';
import { startCredentialScheduler } from './services/credentialScheduler.mjs';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Segurança
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limite de 100 requisições por IP
  message: 'Muitas requisições deste IP, tente novamente mais tarde.'
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Prospect AI API'
  });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/credentials', credentialsRoutes);
app.use('/api/ai', aiRoutes);
// Webhook público (chamado pela Evolution API, sem autenticação de usuário)
// deve vir ANTES das rotas autenticadas de /api/whatsapp para não conflitar.
app.use('/api/whatsapp', whatsappWebhookRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint não encontrado',
    path: req.path 
  });
});

// Error handler
app.use(errorHandler);

// Inicializar banco e servidor
async function start() {
  try {
    console.log('🔧 Inicializando banco de dados...');
    await initDatabase();
    console.log('✅ Banco de dados pronto!');
    
    // Iniciar scheduler de credenciais
    startCredentialScheduler();
    
    app.listen(PORT, () => {
      console.log(`🚀 API rodando em http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔑 Sistema de credenciais: ATIVO`);
      console.log(`🧹 Sistema de deduplicação: ATIVO`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

start();
