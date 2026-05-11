import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProposalImpactLevel1748560000041 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS impact_level VARCHAR(20)`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS impact_level`);
  }
}
