import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

export type NotificationType =
  | 'proposal.opened'
  | 'proposal.closed'
  | 'delegate.voted'
  | 'member.joined';

@Entity('notifications')
export class Notification {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id!: string;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  org_id!: string | null;

  @Column({ type: 'varchar', length: 50 })
  type!: NotificationType;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actor_id!: string | null;

  @Column({ name: 'target_type', type: 'varchar', length: 50, nullable: true })
  target_type!: string | null;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  target_id!: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  read_at!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
