import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('delegations')
export class Delegation {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'delegator_id', type: 'uuid' })
  delegator_id!: string;

  @Column({ name: 'delegate_id', type: 'uuid' })
  delegate_id!: string;

  /** null = global delegation (applies to all topics) */
  @Column({ name: 'topic_id', type: 'uuid', nullable: true })
  topic_id!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expires_at!: Date | null;

  /** If set, delegation is voided if delegate hasn't voted within this many hours of the proposal deadline */
  @Column({ name: 'fallback_abstain_hours', type: 'integer', nullable: true, default: null })
  fallback_abstain_hours!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
