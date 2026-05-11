import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserBio1748560000039 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE users DROP COLUMN IF EXISTS bio`);
  }
}
