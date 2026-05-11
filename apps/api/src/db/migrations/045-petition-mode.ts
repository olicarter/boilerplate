import { MigrationInterface, QueryRunner } from 'typeorm';

export class PetitionMode1748560000045 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS signature_threshold INTEGER`);
    await runner.query(`
      CREATE TABLE IF NOT EXISTS proposal_signatures (
        id UUID PRIMARY KEY,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        organisation_id UUID NOT NULL,
        user_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(proposal_id, user_id)
      )
    `);
  }
  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE IF EXISTS proposal_signatures`);
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS signature_threshold`);
  }
}
