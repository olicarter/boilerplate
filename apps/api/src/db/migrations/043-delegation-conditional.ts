import { MigrationInterface, QueryRunner } from 'typeorm';

export class DelegationConditional1748560000043 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE delegations ADD COLUMN IF NOT EXISTS fallback_abstain_hours INTEGER`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE delegations DROP COLUMN IF EXISTS fallback_abstain_hours`);
  }
}
