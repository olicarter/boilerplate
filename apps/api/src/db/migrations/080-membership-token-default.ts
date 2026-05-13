import { MigrationInterface, QueryRunner } from 'typeorm';

export class MembershipTokenDefault1748600000080 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`ALTER TABLE memberships ALTER COLUMN unsubscribe_token SET DEFAULT md5(random()::text || clock_timestamp()::text)`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`ALTER TABLE memberships ALTER COLUMN unsubscribe_token DROP DEFAULT`);
  }
}
