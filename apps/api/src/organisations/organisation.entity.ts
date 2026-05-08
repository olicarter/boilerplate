import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('organisations')
export class Organisation {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'uuid', nullable: true, default: null })
  invite_token!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  proposal_creation_role!: 'member' | 'moderator' | 'admin';

  @Column({ type: 'varchar', length: 20, default: 'member' })
  topic_creation_role!: 'member' | 'moderator' | 'admin';

  @Column({ type: 'int', nullable: true, default: null })
  default_voting_duration_days!: number | null;

  @Column({ type: 'int', default: 50 })
  default_threshold!: number;

  @Column({ type: 'varchar', length: 20, default: 'public' })
  voting_visibility!: 'public' | 'hidden';

  @Column({ type: 'int', nullable: true, default: null })
  default_quorum!: number | null;

  @Column({ type: 'boolean', default: false })
  is_public!: boolean;

  @Column({ name: 'veto_role', type: 'varchar', length: 20, default: 'admin' })
  veto_role!: 'moderator' | 'admin';

  @Column({ name: 'min_endorsements', type: 'int', default: 0 })
  min_endorsements!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
