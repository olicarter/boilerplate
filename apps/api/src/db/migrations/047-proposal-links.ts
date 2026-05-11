import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProposalLinks1748560000047 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS proposal_links (
        id UUID PRIMARY KEY,
        source_proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        target_proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        link_type VARCHAR(20) NOT NULL,
        organisation_id UUID NOT NULL,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(source_proposal_id, target_proposal_id, link_type)
      )
    `);
  }
  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE IF EXISTS proposal_links`);
  }
}
