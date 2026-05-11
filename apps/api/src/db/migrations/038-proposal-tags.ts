import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProposalTags1748560000038 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS tags`);
  }
}
