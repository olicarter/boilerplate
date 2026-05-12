import { MigrationInterface, QueryRunner } from 'typeorm';

export class Billing1052 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
        ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE organisations
        DROP COLUMN IF EXISTS plan,
        DROP COLUMN IF EXISTS stripe_customer_id,
        DROP COLUMN IF EXISTS stripe_subscription_id
    `);
  }
}
