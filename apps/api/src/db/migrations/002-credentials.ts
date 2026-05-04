import { MigrationInterface, QueryRunner } from 'typeorm';

export class Credentials1744070400001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS credentials (
        id          TEXT PRIMARY KEY,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        public_key  BYTEA NOT NULL,
        counter     BIGINT NOT NULL DEFAULT 0,
        transports  TEXT[],
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS credentials CASCADE`);
  }
}
