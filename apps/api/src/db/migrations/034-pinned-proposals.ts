import { MigrationInterface, QueryRunner } from 'typeorm';

export class PinnedProposals1748380000034 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS pinned`);
  }
}
