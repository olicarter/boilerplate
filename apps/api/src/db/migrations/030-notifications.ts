import { MigrationInterface, QueryRunner } from 'typeorm';

export class Notifications1748200000030 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        target_type VARCHAR(50),
        target_id UUID,
        metadata JSONB NOT NULL DEFAULT '{}',
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runner.query(`CREATE INDEX notifications_user_idx ON notifications(user_id, read_at, created_at DESC)`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS notifications`);
  }
}
