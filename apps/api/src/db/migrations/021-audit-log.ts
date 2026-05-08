import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLog1748200000021 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL,
        actor_id UUID,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id VARCHAR(255),
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await runner.query(`CREATE INDEX audit_log_org_created ON audit_log (org_id, created_at DESC)`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE IF EXISTS audit_log`);
  }
}
