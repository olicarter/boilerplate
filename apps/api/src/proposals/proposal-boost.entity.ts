import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('proposal_boosts')
export class ProposalBoost {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  proposal_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'int', default: 1 })
  amount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
