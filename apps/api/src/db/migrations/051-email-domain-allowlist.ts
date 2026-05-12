import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailDomainAllowlist1748560000051 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS allowed_email_domains TEXT[] NOT NULL DEFAULT '{}'
    `);
  }
  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS allowed_email_domains`);
  }
}
