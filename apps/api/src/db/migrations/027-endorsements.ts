import { MigrationInterface, QueryRunner } from 'typeorm';

export class Endorsements1748200000027 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE endorsements (
        id UUID PRIMARY KEY,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (proposal_id, user_id)
      )
    `);
    await runner.query(`
      ALTER TABLE organisations ADD COLUMN min_endorsements INT NOT NULL DEFAULT 0
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE IF EXISTS endorsements`);
    await runner.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS min_endorsements`);
  }
}
