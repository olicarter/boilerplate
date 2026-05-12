import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

export type ProposalStatus = 'draft' | 'open' | 'closed' | 'withdrawn';
export type ProposalType = 'standard' | 'discussion' | 'multiple_choice' | 'temperature_check' | 'consent' | 'approval' | 'score_voting' | 'ranked_choice' | 'petition' | 'amendment';
export type ImpactLevel = 'low' | 'medium' | 'high' | 'constitutional';

@Entity('proposals')
export class Proposal {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'topic_id', type: 'uuid' })
  topic_id!: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  author_id!: string | null;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'varchar', length: 10, default: 'open' })
  status!: ProposalStatus;

  @Column({ type: 'integer', default: 50 })
  threshold!: number;

  @Column({ type: 'integer', nullable: true, default: null })
  quorum!: number | null;

  @Column({ type: 'varchar', length: 10, default: 'soft' })
  quorum_type!: 'soft' | 'hard';

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ name: 'deliberation_ends_at', type: 'timestamptz', nullable: true, default: null })
  deliberation_ends_at!: Date | null;

  @Column({ name: 'opens_at', type: 'timestamptz', nullable: true, default: null })
  opens_at!: Date | null;

  @Column({ name: 'closes_at', type: 'timestamptz', nullable: true })
  closes_at!: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closed_at!: Date | null;

  @Column({ name: 'proposal_type', type: 'varchar', length: 20, default: 'standard' })
  proposal_type!: ProposalType;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  outcome!: 'implemented' | 'not_implemented' | 'in_progress' | null;

  @Column({ type: 'boolean', default: false })
  pinned!: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ name: 'impact_level', type: 'varchar', length: 20, nullable: true, default: null })
  impact_level!: ImpactLevel | null;

  @Column({ name: 'signature_threshold', type: 'integer', nullable: true, default: null })
  signature_threshold!: number | null;

  @Column({ name: 'parent_proposal_id', type: 'uuid', nullable: true, default: null })
  parent_proposal_id!: string | null;

  @Column({ name: 'amendment_text', type: 'text', nullable: true, default: null })
  amendment_text!: string | null;

  @Column({ name: 'anonymous_voting', type: 'boolean', default: false })
  anonymous_voting!: boolean;

  @Column({ name: 'jury_size', type: 'integer', nullable: true, default: null })
  jury_size!: number | null;

  @Column({ name: 'conviction_voting', type: 'boolean', default: false })
  conviction_voting!: boolean;

  @Column({ name: 'quadratic_voting', type: 'boolean', default: false })
  quadratic_voting!: boolean;
}
