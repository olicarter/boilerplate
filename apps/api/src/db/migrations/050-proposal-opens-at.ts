import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProposalOpensAt1748560000050 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE proposals ADD COLUMN IF NOT EXISTS opens_at TIMESTAMPTZ
    `);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS opens_at`);
  }
}
