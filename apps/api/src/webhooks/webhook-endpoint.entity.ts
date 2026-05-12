import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('webhook_endpoints')
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  org_id!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ type: 'text', array: true, default: [] })
  events!: string[];

  @Column({ type: 'text' })
  secret!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
