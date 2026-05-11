import { MigrationInterface, QueryRunner } from 'typeorm';

export class DelegationSplit1748560000044 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS weight_fraction DECIMAL(5,4) NOT NULL DEFAULT 1.0`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE delegations DROP COLUMN IF EXISTS weight_fraction`);
  }
}
