import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InviteToken1748200000013 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organisations ADD COLUMN invite_token uuid DEFAULT NULL`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organisations DROP COLUMN invite_token`);
  }
}
