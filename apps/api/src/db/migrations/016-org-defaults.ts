import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OrgDefaults1748200000016 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE organisations
        ADD COLUMN topic_creation_role VARCHAR(20) NOT NULL DEFAULT 'member',
        ADD COLUMN default_voting_duration_days INTEGER DEFAULT NULL,
        ADD COLUMN default_threshold INTEGER NOT NULL DEFAULT 50;
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query(`
      ALTER TABLE organisations
        DROP COLUMN IF EXISTS topic_creation_role,
        DROP COLUMN IF EXISTS default_voting_duration_days,
        DROP COLUMN IF EXISTS default_threshold;
    `);
  }
}
