import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

export type ProposalStatus = 'draft' | 'open' | 'closed' | 'withdrawn';

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

  @Column({ name: 'closes_at', type: 'timestamptz', nullable: true })
  closes_at!: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closed_at!: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  outcome!: 'implemented' | 'not_implemented' | 'in_progress' | null;
}
