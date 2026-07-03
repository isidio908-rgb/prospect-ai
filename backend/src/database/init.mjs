import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDatabase() {
  const client = await pool.connect();
  
  try {
    // Criar tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        profession VARCHAR(255) DEFAULT 'Gestor de Tráfego',
        primary_niche VARCHAR(255),
        internal_context TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migração: contexto profissional do usuário usado pela UI e pelos prompts internos de IA.
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(255) DEFAULT 'Gestor de Tráfego'`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_niche VARCHAR(255)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS internal_context TEXT`);

    // Criar tabela de configurações do usuário (credenciais RapidAPI)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rapidapi_key VARCHAR(500),
        rapidapi_host VARCHAR(255),
        rapidapi_provider_name VARCHAR(255),
        rapidapi_search_url TEXT,
        rapidapi_daily_limit INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    // Criar tabela de controle de cota RapidAPI
    await client.query(`
      CREATE TABLE IF NOT EXISTS rapidapi_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE DEFAULT CURRENT_DATE,
        requests_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      )
    `);

    // Criar tabela de credenciais
    await client.query(`
      CREATE TABLE IF NOT EXISTS credentials (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(20) DEFAULT 'scraper',
        provider VARCHAR(255),
        api_host VARCHAR(255),
        api_key_encrypted TEXT NOT NULL,
        base_url TEXT,
        search_endpoint VARCHAR(255),
        details_endpoint VARCHAR(255),
        model VARCHAR(255),
        daily_limit INTEGER DEFAULT 100,
        monthly_limit INTEGER DEFAULT 3000,
        used_today INTEGER DEFAULT 0,
        used_month INTEGER DEFAULT 0,
        last_used_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migração: garante as colunas category/model em bancos já existentes
    await client.query(`ALTER TABLE credentials ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'scraper'`);
    await client.query(`ALTER TABLE credentials ADD COLUMN IF NOT EXISTS model VARCHAR(255)`);

    // Criar tabela de uso de credenciais
    await client.query(`
      CREATE TABLE IF NOT EXISTS credential_usage (
        id SERIAL PRIMARY KEY,
        credential_id INTEGER REFERENCES credentials(id) ON DELETE CASCADE,
        date DATE DEFAULT CURRENT_DATE,
        requests_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(credential_id, date)
      )
    `);

    // Histórico persistente de execuções de coleta.
    await client.query(`
      CREATE TABLE IF NOT EXISTS collection_runs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        credential_id INTEGER REFERENCES credentials(id) ON DELETE SET NULL,
        source_type VARCHAR(100),
        query TEXT,
        niche VARCHAR(255),
        city VARCHAR(255),
        region VARCHAR(50),
        limit_requested INTEGER,
        total_found INTEGER DEFAULT 0,
        saved_count INTEGER DEFAULT 0,
        duplicate_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        whatsapp_check_enabled BOOLEAN DEFAULT FALSE,
        whatsapp_verified_count INTEGER DEFAULT 0,
        whatsapp_rejected_count INTEGER DEFAULT 0,
        without_phone_count INTEGER DEFAULT 0,
        cache_key VARCHAR(128),
        cache_hit BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'running',
        error_message TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        finished_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE collection_runs ADD COLUMN IF NOT EXISTS cache_key VARCHAR(128)`);
    await client.query(`ALTER TABLE collection_runs ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN DEFAULT FALSE`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_runs_user_started ON collection_runs(user_id, started_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_runs_status ON collection_runs(user_id, status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_runs_cache_key ON collection_runs(user_id, cache_key) WHERE cache_key IS NOT NULL`);

    // Logs persistentes das execuções de coleta.
    await client.query(`
      CREATE TABLE IF NOT EXISTS collection_run_logs (
        id SERIAL PRIMARY KEY,
        run_id INTEGER REFERENCES collection_runs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        level VARCHAR(20) DEFAULT 'info',
        event VARCHAR(100),
        message TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_run_logs_run ON collection_run_logs(run_id, created_at ASC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_run_logs_user ON collection_run_logs(user_id, created_at DESC)`);

    // Cache de busca/coleta para evitar chamadas repetidas ao mesmo provedor.
    await client.query(`
      CREATE TABLE IF NOT EXISTS collection_cache (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cache_key VARCHAR(128) NOT NULL,
        source_type VARCHAR(100),
        query TEXT,
        niche VARCHAR(255),
        city VARCHAR(255),
        region VARCHAR(50),
        limit_requested INTEGER,
        params_json JSONB DEFAULT '{}'::jsonb,
        response_json JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, cache_key)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_cache_user_key ON collection_cache(user_id, cache_key)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_cache_expires ON collection_cache(expires_at)`);

    // Criar tabela de leads
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        
        -- Dados básicos
        nome_empresa VARCHAR(500) NOT NULL,
        site VARCHAR(1000),
        telefone VARCHAR(50),
        whatsapp VARCHAR(50),
        email VARCHAR(255),
        cidade VARCHAR(255),
        bairro VARCHAR(255),
        endereco TEXT,
        nicho VARCHAR(255),
        categoria VARCHAR(255),
        
        -- Campos normalizados para deduplicação
        domain_normalized VARCHAR(500),
        phone_normalized VARCHAR(50),
        name_normalized VARCHAR(500),
        
        -- Dados de origem
        fonte VARCHAR(100),
        google_maps_url TEXT,
        rating DECIMAL(2,1),
        total_avaliacoes INTEGER,
        place_id VARCHAR(255),
        business_id VARCHAR(255),
        google_id VARCHAR(255),
        
        -- Análise técnica
        tem_site BOOLEAN DEFAULT FALSE,
        site_final TEXT,
        site_online BOOLEAN DEFAULT FALSE,
        status_site VARCHAR(50),
        erro_site TEXT,
        tempo_carregamento_ms INTEGER,
        tamanho_kb DECIMAL(10,2),
        tem_pixel_meta BOOLEAN DEFAULT FALSE,
        tem_gtm BOOLEAN DEFAULT FALSE,
        tem_ga4 BOOLEAN DEFAULT FALSE,
        tem_google_ads_tag BOOLEAN DEFAULT FALSE,
        tem_whatsapp_site BOOLEAN DEFAULT FALSE,
        tem_formulario BOOLEAN DEFAULT FALSE,
        tem_https BOOLEAN DEFAULT FALSE,
        tem_pagina_contato BOOLEAN DEFAULT FALSE,
        tem_cta_visivel BOOLEAN DEFAULT FALSE,
        
        -- Redes sociais
        instagram VARCHAR(255),
        facebook VARCHAR(255),
        linkedin VARCHAR(255),
        
        -- Contatos encontrados
        emails_encontrados TEXT,
        telefones_encontrados TEXT,
        
        -- Score e priorização
        score INTEGER,
        prioridade VARCHAR(50),
        oportunidades TEXT,
        pontos_positivos TEXT,
        diagnostico TEXT,
        mensagem_whatsapp TEXT,
        mensagem_whatsapp_followup TEXT,
        
        -- Status de prospecção (CRM interno, spec secao 11)
        status VARCHAR(50) DEFAULT 'novo',
        observacoes TEXT,
        responsavel VARCHAR(255),
        proxima_acao VARCHAR(500),
        valor_potencial DECIMAL(12,2),
        motivo_perda TEXT,
        
        -- Datas
        data_coleta TIMESTAMP DEFAULT NOW(),
        data_analise TIMESTAMP,
        data_contato TIMESTAMP,
        data_proxima_acao TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Criar índices para performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_prioridade ON leads(prioridade)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_cidade ON leads(cidade)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_nicho ON leads(nicho)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_domain_normalized ON leads(user_id, domain_normalized) WHERE domain_normalized IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON leads(user_id, phone_normalized) WHERE phone_normalized IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_name_normalized ON leads(user_id, name_normalized, cidade) WHERE name_normalized IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_place_id ON leads(user_id, place_id) WHERE place_id IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(user_id, business_id) WHERE business_id IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_google_id ON leads(user_id, google_id) WHERE google_id IS NOT NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_responsavel ON leads(user_id, responsavel) WHERE responsavel IS NOT NULL`);

    // Criar tabela de histórico de follow-up (CRM interno, spec seção 11)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_followups (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL DEFAULT 'nota',
        status_anterior VARCHAR(50),
        status_novo VARCHAR(50),
        mensagem TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON lead_followups(lead_id, created_at DESC)`);

    // Criar tabela de instâncias WhatsApp (Evolution API)
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_instances (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        instance_name VARCHAR(255) NOT NULL UNIQUE,
        instance_token_encrypted TEXT,
        phone_number VARCHAR(50),
        profile_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'created',

        -- Configurações anti-bloqueio (seção "Segurança" na tela de conexão)
        read_messages_auto BOOLEAN DEFAULT FALSE,
        read_status_auto BOOLEAN DEFAULT FALSE,
        reject_call BOOLEAN DEFAULT TRUE,
        msg_call TEXT DEFAULT 'Não realizamos atendimento por chamada. Envie uma mensagem de texto, por favor.',
        groups_ignore BOOLEAN DEFAULT TRUE,
        always_online BOOLEAN DEFAULT FALSE,
        simulate_typing BOOLEAN DEFAULT TRUE,

        last_qr_code TEXT,
        last_qr_at TIMESTAMP,
        connected_at TIMESTAMP,
        disconnected_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(user_id)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON whatsapp_instances(user_id)`);

    // Criar tabela de mensagens WhatsApp, vinculadas a um lead
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        instance_id INTEGER REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
        lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

        whatsapp_message_id VARCHAR(255),
        remote_jid VARCHAR(255) NOT NULL,
        from_me BOOLEAN NOT NULL DEFAULT FALSE,

        direction VARCHAR(20) NOT NULL, -- 'sent' | 'received'
        message_type VARCHAR(50) NOT NULL DEFAULT 'text', -- text|image|video|audio|document|sticker|location|other
        text_content TEXT,

        media_path TEXT, -- caminho relativo em data/whatsapp-media/, quando houver mídia
        media_mimetype VARCHAR(150),
        media_filename VARCHAR(500),

        status VARCHAR(20) DEFAULT 'sent', -- sent|delivered|read|failed|received
        read_at TIMESTAMP,

        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_id ON whatsapp_messages(lead_id, created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance_id ON whatsapp_messages(instance_id, created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_remote_jid ON whatsapp_messages(instance_id, remote_jid)`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_id ON whatsapp_messages(instance_id, whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL`);

    console.log('✅ Tabelas criadas/verificadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }
  
  return res;
}