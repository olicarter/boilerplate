import { MigrationInterface, QueryRunner } from 'typeorm';

export class AmendmentProposals1748560000046 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS parent_proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL`);
    await runner.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS amendment_text TEXT`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS amendment_text`);
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS parent_proposal_id`);
  }
}
