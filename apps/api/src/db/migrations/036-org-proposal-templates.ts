import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgProposalTemplates1748560000036 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE organisations ADD COLUMN IF NOT EXISTS proposal_templates JSONB NOT NULL DEFAULT '[]'`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS proposal_templates`);
  }
}
