import { MigrationInterface, QueryRunner } from 'typeorm';

export class MemberApproval1748200000028 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS require_member_approval boolean NOT NULL DEFAULT false`);
    await runner.query(`ALTER TABLE memberships ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'approved'`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE memberships DROP COLUMN IF EXISTS status`);
    await runner.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS require_member_approval`);
  }
}
