import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, query } from '../src/database/init.mjs';
import { encrypt } from '../src/services/encryption.mjs';
import { getInstanceStatus, listInstances, setDefaultInstance } from '../src/services/whatsapp/whatsappService.mjs';

describe('multi-whatsapp service', () => {
  let userId;
  let otherUserId;
  let firstInstanceId;
  let secondInstanceId;
  let otherInstanceId;
  const uniqueTag = Date.now();

  before(async () => {
    await initDatabase();

    const user = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Multi WhatsApp Test')
       RETURNING id`,
      [`multi-whatsapp-${uniqueTag}@prospect.ai`]
    );
    userId = user.rows[0].id;

    const otherUser = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, 'hash', 'Outro Usuário WhatsApp')
       RETURNING id`,
      [`multi-whatsapp-other-${uniqueTag}@prospect.ai`]
    );
    otherUserId = otherUser.rows[0].id;

    const first = await query(
      `INSERT INTO whatsapp_instances (
        user_id, label, is_default, instance_name, instance_token_encrypted, status, phone_number, profile_name
      ) VALUES ($1, 'Numero Principal', TRUE, $2, $3, 'open', '5565999910001', 'BDR Principal')
      RETURNING id`,
      [userId, `multi-main-${uniqueTag}`, encrypt('token-main')]
    );
    firstInstanceId = first.rows[0].id;

    const second = await query(
      `INSERT INTO whatsapp_instances (
        user_id, label, is_default, instance_name, instance_token_encrypted, status, phone_number, profile_name
      ) VALUES ($1, 'Numero SDR', FALSE, $2, $3, 'close', '5565999910002', 'SDR Backup')
      RETURNING id`,
      [userId, `multi-sdr-${uniqueTag}`, encrypt('token-sdr')]
    );
    secondInstanceId = second.rows[0].id;

    const other = await query(
      `INSERT INTO whatsapp_instances (
        user_id, label, is_default, instance_name, instance_token_encrypted, status, phone_number
      ) VALUES ($1, 'Numero Terceiro', TRUE, $2, $3, 'open', '5565999919999')
      RETURNING id`,
      [otherUserId, `multi-other-${uniqueTag}`, encrypt('token-other')]
    );
    otherInstanceId = other.rows[0].id;
  });

  after(async () => {
    if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
    if (otherUserId) await query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });

  test('lista múltiplos números sem expor token e mantém padrão primeiro', async () => {
    const instances = await listInstances(userId);

    assert.equal(instances.length, 2);
    assert.equal(instances[0].id, firstInstanceId);
    assert.equal(instances[0].is_default, true);
    assert.equal(instances[1].id, secondInstanceId);
    assert.equal('instance_token_encrypted' in instances[0], false);
    assert.equal('token' in instances[0], false);

    const status = await getInstanceStatus(userId);
    assert.equal(status.connected, true);
    assert.equal(status.instance.id, firstInstanceId);
    assert.equal(status.instances.length, 2);
  });

  test('altera número padrão e isola instância de outro usuário', async () => {
    const updated = await setDefaultInstance(userId, secondInstanceId);
    assert.equal(updated.id, secondInstanceId);
    assert.equal(updated.is_default, true);

    const instances = await listInstances(userId);
    assert.equal(instances[0].id, secondInstanceId);
    assert.equal(instances[0].is_default, true);
    assert.equal(instances.filter((instance) => instance.is_default).length, 1);

    await assert.rejects(
      setDefaultInstance(userId, otherInstanceId),
      /Instância WhatsApp não encontrada/
    );
  });
});
