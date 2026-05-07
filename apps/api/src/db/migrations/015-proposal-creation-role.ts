import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProposalCreationRole1748200000015 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE organisations
        ADD COLUMN proposal_creation_role VARCHAR(20) NOT NULL DEFAULT 'member';
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS proposal_creation_role`);
  }
}
