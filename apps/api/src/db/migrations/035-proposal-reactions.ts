import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProposalReactions1748470000035 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS proposal_reactions (
        id UUID PRIMARY KEY,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        organisation_id UUID NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(proposal_id, user_id)
      )
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS proposal_reactions`);
  }
}
