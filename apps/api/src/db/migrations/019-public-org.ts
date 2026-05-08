import { MigrationInterface, QueryRunner } from 'typeorm';

export class PublicOrg1748200000019 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organisations ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS is_public`);
  }
}
