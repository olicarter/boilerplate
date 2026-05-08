import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuorumType1748200000020 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals ADD COLUMN quorum_type VARCHAR(10) NOT NULL DEFAULT 'soft'`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS quorum_type`);
  }
}
