import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProposalBoosting1700000071 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS boost_threshold INTEGER DEFAULT NULL`);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS proposal_boosts (
        id UUID PRIMARY KEY,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(proposal_id, user_id)
      )
    `);
    await qr.query(`CREATE INDEX IF NOT EXISTS proposal_boosts_proposal_id ON proposal_boosts(proposal_id)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS proposal_boosts_user_id ON proposal_boosts(user_id)`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`DROP TABLE IF EXISTS proposal_boosts`);
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS boost_threshold`);
  }
}
