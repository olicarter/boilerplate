import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('org_invites')
export class OrgInvite {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'org_id', type: 'uuid' })
  org_id!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text', unique: true })
  token!: string;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invited_by!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expires_at!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true, default: null })
  accepted_at!: Date | null;
}
