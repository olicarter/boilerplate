import { MigrationInterface, QueryRunner } from 'typeorm';

export class DelegationExpiry1746576000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE delegations
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE delegations DROP COLUMN IF EXISTS expires_at
    `);
  }
}
