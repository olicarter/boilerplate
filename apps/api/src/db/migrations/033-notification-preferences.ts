import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationPreferences1748290000033 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE users DROP COLUMN IF EXISTS notification_preferences`);
  }
}
