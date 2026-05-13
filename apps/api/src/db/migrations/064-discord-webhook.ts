import { MigrationInterface, QueryRunner } from 'typeorm';

export class DiscordWebhook1748600000064 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT DEFAULT NULL`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE organisations DROP COLUMN IF EXISTS discord_webhook_url`);
  }
}
