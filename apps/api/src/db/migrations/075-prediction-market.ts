import { MigrationInterface, QueryRunner } from 'typeorm';

export class PredictionMarket1700000075 implements MigrationInterface {
  async up(qr: QueryRunner) {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id UUID PRIMARY KEY,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prediction VARCHAR(10) NOT NULL CHECK (prediction IN ('pass', 'fail')),
        confidence INTEGER NOT NULL DEFAULT 50 CHECK (confidence >= 1 AND confidence <= 100),
        stake INTEGER NOT NULL DEFAULT 10,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        payout INTEGER DEFAULT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(proposal_id, user_id)
      )
    `);
    await qr.query(`CREATE INDEX IF NOT EXISTS predictions_proposal_id ON predictions(proposal_id)`);
    await qr.query(`CREATE INDEX IF NOT EXISTS predictions_user_id ON predictions(user_id)`);
  }

  async down(qr: QueryRunner) {
    await qr.query(`DROP TABLE IF EXISTS predictions`);
  }
}
