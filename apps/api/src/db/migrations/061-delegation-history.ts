import { MigrationInterface, QueryRunner } from 'typeorm';

export class DelegationHistory1000000000061 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE delegation_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        delegator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        delegate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
        event TEXT NOT NULL CHECK (event IN ('added', 'removed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_delegation_history_delegator ON delegation_history(delegator_id)`);
    await queryRunner.query(`CREATE INDEX idx_delegation_history_delegate ON delegation_history(delegate_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE delegation_history`);
  }
}
