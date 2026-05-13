import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('predictions')
export class Prediction {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  proposal_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 10 })
  prediction!: 'pass' | 'fail';

  @Column({ type: 'int', default: 50 })
  confidence!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
