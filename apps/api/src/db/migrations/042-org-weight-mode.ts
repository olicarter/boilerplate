import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgWeightMode1748560000042 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS weight_mode VARCHAR(20) NOT NULL DEFAULT 'manual'`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS weight_mode`);
  }
}
