import { MigrationInterface, QueryRunner } from 'typeorm';

export class JurySelection1748600000065 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS jury_size INTEGER DEFAULT NULL`);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS proposal_juries (
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (proposal_id, user_id)
      )
    `);
  }

  async down(qr: QueryRunner) {
    await qr.query(`DROP TABLE IF EXISTS proposal_juries`);
    await qr.query(`ALTER TABLE proposals DROP COLUMN IF EXISTS jury_size`);
  }
}
