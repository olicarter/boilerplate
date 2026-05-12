import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConstitutionalTopics069 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE topics ADD COLUMN IF NOT EXISTS is_constitutional BOOLEAN NOT NULL DEFAULT FALSE`);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS constitutional_outcomes (
        proposal_id UUID PRIMARY KEY,
        outcome     VARCHAR(50) NOT NULL,
        hash        TEXT NOT NULL,
        votes_summary JSONB NOT NULL DEFAULT '{}',
        signed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async down(qr: QueryRunner) {
    await qr.query(`DROP TABLE IF EXISTS constitutional_outcomes`);
    await qr.query(`ALTER TABLE topics DROP COLUMN IF EXISTS is_constitutional`);
  }
}
