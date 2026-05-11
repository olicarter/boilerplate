import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('proposal_reactions')
export class ProposalReaction {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposal_id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 10 })
  emoji!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
