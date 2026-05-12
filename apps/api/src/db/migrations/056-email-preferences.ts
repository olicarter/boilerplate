import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailPreferences056 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE memberships
        ADD COLUMN email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN email_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN unsubscribe_token TEXT
    `);
    // Backfill unsubscribe tokens for existing memberships
    await runner.query(`
      UPDATE memberships SET unsubscribe_token = encode(gen_random_bytes(24), 'hex')
      WHERE unsubscribe_token IS NULL
    `);
    await runner.query(`ALTER TABLE memberships ALTER COLUMN unsubscribe_token SET NOT NULL`);
    await runner.query(`CREATE UNIQUE INDEX memberships_unsubscribe_token_idx ON memberships(unsubscribe_token)`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP INDEX memberships_unsubscribe_token_idx`);
    await runner.query(`
      ALTER TABLE memberships
        DROP COLUMN email_notifications_enabled,
        DROP COLUMN email_digest_enabled,
        DROP COLUMN unsubscribe_token
    `);
  }
}
