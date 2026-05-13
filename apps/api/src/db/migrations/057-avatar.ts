import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Avatar1748600000057 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE users DROP COLUMN avatar_url`);
  }
}
