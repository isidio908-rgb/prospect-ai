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
      followup_1_delay_hours INTEGER DEFAULT 24,
      followup_2_delay_hours INTEGER DEFAULT 48,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_rules_user_enabled ON automation_rules(user_id, enabled)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_rules_scope ON automation_rules(user_id, source_type, city, niche)`);

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
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_runs_user_started ON automation_runs(user_id, started_at DESC)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation_runs(user_id, status)`);

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
  await client.query(`CREATE INDEX IF NOT EXISTS idx_message_queue_approval_batch ON message_queue(user_id, approval_batch_id) WHERE approval_batch_id IS NOT NULL`);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_message_queue_unique_active_message
    ON message_queue(user_id, lead_id, message_type)
    WHERE status IN ('pending', 'approved', 'queued', 'sent')
  `);
}
