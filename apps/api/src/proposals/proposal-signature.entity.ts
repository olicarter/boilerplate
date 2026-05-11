import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('proposal_signatures')
export class ProposalSignature {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposal_id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
