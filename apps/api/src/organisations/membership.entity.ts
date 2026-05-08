import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

export type MemberRole = 'admin' | 'moderator' | 'member' | 'observer';
export type MemberStatus = 'pending' | 'approved';

@Entity('memberships')
export class Membership {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role!: MemberRole;

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joined_at!: Date;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invited_by!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'approved' })
  status!: MemberStatus;

  @Column({ type: 'int', default: 1 })
  weight!: number;
}
