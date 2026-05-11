import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

export type ProposalLinkType = 'supersedes' | 'related_to' | 'blocks' | 'depends_on';

@Entity('proposal_links')
export class ProposalLink {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'source_proposal_id', type: 'uuid' })
  source_proposal_id!: string;

  @Column({ name: 'target_proposal_id', type: 'uuid' })
  target_proposal_id!: string;

  @Column({ name: 'link_type', type: 'varchar', length: 20 })
  link_type!: ProposalLinkType;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  created_by!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
