import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

export type VoteChoice = 'yes' | 'no' | 'abstain';

@Entity('votes')
export class Vote {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposal_id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  choice!: VoteChoice | null;

  @Column({ name: 'option_id', type: 'uuid', nullable: true })
  option_id!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
