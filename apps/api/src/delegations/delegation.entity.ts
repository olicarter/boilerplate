import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('delegations')
export class Delegation {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'delegator_id', type: 'uuid' })
  delegator_id!: string;

  @Column({ name: 'delegate_id', type: 'uuid' })
  delegate_id!: string;

  /** null = global delegation (applies to all topics) */
  @Column({ name: 'topic_id', type: 'uuid', nullable: true })
  topic_id!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
