export async function ensureAutopilotTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS automation_rules (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      enabled BOOLEAN DEFAULT FALSE,
      mode VARCHAR(50) DEFAULT 'assistido',
      source_type VARCHAR(100),
      niche VARCHAR(255),
      city VARCHAR(255),
      min_score INTEGER DEFAULT 60,
      max_daily_sends INTEGER DEFAULT 20,
      max_hourly_sends INTEGER DEFAULT 5,
      send_window_start VARCHAR(5) DEFAULT '09:00',
      send_window_end VARCHAR(5) DEFAULT '17:00',
      timezone VARCHAR(100) DEFAULT 'America/Cuiaba',
      require_manual_approval BOOLEAN DEFAULT TRUE,
      stop_on_reply BOOLEAN DEFAULT TRUE,
      default_whatsapp_instance_id INTEGER,
      safety_accepted_at TIMESTAMP,
      safety_accepted_by INTEGER,
      quiet_hours_start VARCHAR(5),
      quiet_hours_end VARCHAR(5),
      followup_1_delay_hours INTEGER DEFAULT 24,
      followup_2_delay_hours INTEGER DEFAULT 48,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_rules_user_enabled ON automation_rules(user_id, enabled)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_rules_scope ON automation_rules(user_id, source_type, city, niche)`);
  await client.query(`ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS default_whatsapp_instance_id INTEGER`);
  await client.query(`ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS safety_accepted_at TIMESTAMP`);
  await client.query(`ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS safety_accepted_by INTEGER`);
  await client.query(`ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS quiet_hours_start VARCHAR(5)`);
  await client.query(`ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS quiet_hours_end VARCHAR(5)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_rules_whatsapp_instance ON automation_rules(user_id, default_whatsapp_instance_id) WHERE default_whatsapp_instance_id IS NOT NULL`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS automation_safety_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      automation_rule_id INTEGER REFERENCES automation_rules(id) ON DELETE SET NULL,
      event VARCHAR(100) NOT NULL,
      mode VARCHAR(50),
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_safety_events_rule ON automation_safety_events(user_id, automation_rule_id, created_at DESC)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS automation_runs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      automation_rule_id INTEGER REFERENCES automation_rules(id) ON DELETE SET NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'daily',
      status VARCHAR(50) DEFAULT 'running',
      started_at TIMESTAMP DEFAULT NOW(),
      finished_at TIMESTAMP,
      leads_evaluated INTEGER DEFAULT 0,
      messages_queued INTEGER DEFAULT 0,
      messages_skipped INTEGER DEFAULT 0,
      error_message TEXT,
      daemon_tick_id VARCHAR(100),
      attempt INTEGER DEFAULT 1,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`ALTER TABLE automation_runs ADD COLUMN IF NOT EXISTS daemon_tick_id VARCHAR(100)`);
  await client.query(`ALTER TABLE automation_runs ADD COLUMN IF NOT EXISTS attempt INTEGER DEFAULT 1`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_runs_user_started ON automation_runs(user_id, started_at DESC)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation_runs(user_id, status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_runs_daemon_tick ON automation_runs(daemon_tick_id) WHERE daemon_tick_id IS NOT NULL`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS automation_daemon_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      enabled BOOLEAN DEFAULT TRUE,
      paused_until TIMESTAMP,
      kill_switch_reason TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_daemon_settings_enabled ON automation_daemon_settings(enabled, paused_until)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS automation_daemon_locks (
      lock_key VARCHAR(100) PRIMARY KEY,
      owner_id VARCHAR(100) NOT NULL,
      locked_until TIMESTAMP NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_daemon_locks_until ON automation_daemon_locks(locked_until)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS automation_daemon_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      run_id INTEGER REFERENCES automation_runs(id) ON DELETE SET NULL,
      daemon_tick_id VARCHAR(100),
      level VARCHAR(20) NOT NULL DEFAULT 'info',
      event VARCHAR(100) NOT NULL,
      message TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_daemon_logs_tick ON automation_daemon_logs(daemon_tick_id, created_at DESC)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_daemon_logs_user ON automation_daemon_logs(user_id, created_at DESC)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS sdr_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
      whatsapp_message_id INTEGER,
      classification JSONB DEFAULT '{}'::jsonb,
      decision JSONB DEFAULT '{}'::jsonb,
      scheduling_intent JSONB DEFAULT '{}'::jsonb,
      escalation_required BOOLEAN DEFAULT FALSE,
      status_anterior VARCHAR(50),
      status_novo VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_sdr_events_user_created ON sdr_events(user_id, created_at DESC)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_sdr_events_lead_created ON sdr_events(lead_id, created_at DESC)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS collection_automation_rules (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      credential_id INTEGER REFERENCES credentials(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      enabled BOOLEAN DEFAULT FALSE,
      query TEXT,
      niche VARCHAR(255),
      city VARCHAR(255),
      region VARCHAR(50) DEFAULT 'br',
      language VARCHAR(20) DEFAULT 'pt',
      limit_requested INTEGER DEFAULT 20,
      verify_whatsapp_exists BOOLEAN DEFAULT FALSE,
      extract_emails_and_contacts BOOLEAN DEFAULT FALSE,
      force_refresh BOOLEAN DEFAULT FALSE,
      min_interval_minutes INTEGER DEFAULT 1440,
      next_run_at TIMESTAMP DEFAULT NOW(),
      paused_until TIMESTAMP,
      pause_reason TEXT,
      consecutive_failures INTEGER DEFAULT 0,
      max_consecutive_failures INTEGER DEFAULT 3,
      optimization_weight INTEGER DEFAULT 100,
      optimization_locked BOOLEAN DEFAULT FALSE,
      last_run_id INTEGER REFERENCES collection_runs(id) ON DELETE SET NULL,
      last_run_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`ALTER TABLE collection_automation_rules ADD COLUMN IF NOT EXISTS optimization_weight INTEGER DEFAULT 100`);
  await client.query(`ALTER TABLE collection_automation_rules ADD COLUMN IF NOT EXISTS optimization_locked BOOLEAN DEFAULT FALSE`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_automation_due ON collection_automation_rules(user_id, enabled, next_run_at)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_automation_credential ON collection_automation_rules(user_id, credential_id) WHERE credential_id IS NOT NULL`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_collection_automation_weight ON collection_automation_rules(user_id, optimization_weight DESC)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS niche_optimization_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      enabled BOOLEAN DEFAULT FALSE,
      min_sample_size INTEGER DEFAULT 10,
      max_weight_delta_percent INTEGER DEFAULT 20,
      last_applied_at TIMESTAMP,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS niche_optimization_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      event VARCHAR(100) NOT NULL,
      scope_key VARCHAR(500),
      previous_weight INTEGER,
      new_weight INTEGER,
      recommendation JSONB DEFAULT '{}'::jsonb,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_niche_optimization_events_user ON niche_optimization_events(user_id, created_at DESC)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS approval_batches (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'pending',
      approval_whatsapp VARCHAR(50) NOT NULL,
      total_items INTEGER DEFAULT 0,
      approved_items INTEGER DEFAULT 0,
      cancelled_items INTEGER DEFAULT 0,
      expires_at TIMESTAMP NOT NULL,
      requested_at TIMESTAMP,
      responded_at TIMESTAMP,
      response_text TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_approval_batches_user_status ON approval_batches(user_id, status, created_at DESC)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_approval_batches_expires ON approval_batches(expires_at)`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS message_queue (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
      automation_rule_id INTEGER REFERENCES automation_rules(id) ON DELETE SET NULL,
      whatsapp_instance_id INTEGER,
      automation_run_id INTEGER REFERENCES automation_runs(id) ON DELETE SET NULL,
      approval_batch_id INTEGER REFERENCES approval_batches(id) ON DELETE SET NULL,
      channel VARCHAR(50) DEFAULT 'whatsapp',
      message_type VARCHAR(50) NOT NULL DEFAULT 'initial',
      status VARCHAR(50) DEFAULT 'pending',
      scheduled_at TIMESTAMP NOT NULL,
      approval_requested_at TIMESTAMP,
      approved_at TIMESTAMP,
      sent_at TIMESTAMP,
      cancelled_at TIMESTAMP,
      approved_by_channel VARCHAR(50),
      approval_response_text TEXT,
      locked_at TIMESTAMP,
      attempts INTEGER DEFAULT 0,
      last_error TEXT,
      payload_json JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`ALTER TABLE message_queue ADD COLUMN IF NOT EXISTS approval_batch_id INTEGER REFERENCES approval_batches(id) ON DELETE SET NULL`);
  await client.query(`ALTER TABLE message_queue ADD COLUMN IF NOT EXISTS whatsapp_instance_id INTEGER`);
  await client.query(`ALTER TABLE message_queue ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMP`);
  await client.query(`ALTER TABLE message_queue ADD COLUMN IF NOT EXISTS approved_by_channel VARCHAR(50)`);
  await client.query(`ALTER TABLE message_queue ADD COLUMN IF NOT EXISTS approval_response_text TEXT`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS approval_batch_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      approval_batch_id INTEGER REFERENCES approval_batches(id) ON DELETE CASCADE,
      message_queue_id INTEGER REFERENCES message_queue(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(approval_batch_id, position),
      UNIQUE(approval_batch_id, message_queue_id)
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_approval_batch_items_batch ON approval_batch_items(approval_batch_id, position ASC)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_approval_batch_items_queue ON approval_batch_items(user_id, message_queue_id)`);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_message_queue_user_status_scheduled ON message_queue(user_id, status, scheduled_at ASC)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_message_queue_lead ON message_queue(user_id, lead_id, created_at DESC)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_message_queue_rule ON message_queue(user_id, automation_rule_id, created_at DESC)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_message_queue_whatsapp_instance ON message_queue(user_id, whatsapp_instance_id) WHERE whatsapp_instance_id IS NOT NULL`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_message_queue_approval_batch ON message_queue(user_id, approval_batch_id) WHERE approval_batch_id IS NOT NULL`);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_message_queue_unique_active_message
    ON message_queue(user_id, lead_id, message_type)
    WHERE status IN ('pending', 'approved', 'queued', 'sent')
  `);
}
