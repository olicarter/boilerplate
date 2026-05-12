import { MigrationInterface, QueryRunner } from 'typeorm';

export class Webhooks1000000000059 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE webhook_endpoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        events TEXT[] NOT NULL DEFAULT '{}',
        secret TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE webhook_endpoints`);
  }
}
