import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailVerification1748560000049 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
        ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMPTZ
    `);
  }
  async down(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE users
        DROP COLUMN IF EXISTS email_verified,
        DROP COLUMN IF EXISTS email_verification_token,
        DROP COLUMN IF EXISTS email_verification_token_expires_at
    `);
  }
}
