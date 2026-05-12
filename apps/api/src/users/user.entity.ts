import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ name: 'notification_preferences', type: 'jsonb', default: {} })
  notification_preferences!: Record<string, boolean>;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  email_verified!: boolean;

  @Column({ name: 'email_verification_token', type: 'text', nullable: true, default: null })
  email_verification_token!: string | null;

  @Column({ name: 'email_verification_token_expires_at', type: 'timestamptz', nullable: true, default: null })
  email_verification_token_expires_at!: Date | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatar_url!: string | null;
}
