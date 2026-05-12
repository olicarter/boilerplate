import { MigrationInterface, QueryRunner } from 'typeorm';

export class Slack1053 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS slack_team_id TEXT,
        ADD COLUMN IF NOT EXISTS slack_team_name TEXT,
        ADD COLUMN IF NOT EXISTS slack_bot_token TEXT,
        ADD COLUMN IF NOT EXISTS slack_channel_id TEXT,
        ADD COLUMN IF NOT EXISTS slack_channel_name TEXT
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE organisations
        DROP COLUMN IF EXISTS slack_team_id,
        DROP COLUMN IF EXISTS slack_team_name,
        DROP COLUMN IF EXISTS slack_bot_token,
        DROP COLUMN IF EXISTS slack_channel_id,
        DROP COLUMN IF EXISTS slack_channel_name
    `);
  }
}
