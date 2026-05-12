import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MagicLinks055 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE magic_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ
      )
    `);
    await runner.query(`CREATE INDEX magic_links_token_idx ON magic_links(token)`);
    await runner.query(`CREATE INDEX magic_links_user_id_idx ON magic_links(user_id)`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE magic_links`);
  }
}
