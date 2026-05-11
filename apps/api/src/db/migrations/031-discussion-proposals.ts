import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiscussionProposals1748200000031 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE proposals
      ADD COLUMN proposal_type VARCHAR(20) NOT NULL DEFAULT 'standard'
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE proposals DROP COLUMN proposal_type`);
  }
}
