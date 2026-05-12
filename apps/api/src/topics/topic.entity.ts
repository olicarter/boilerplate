import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('topics')
export class Topic {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ name: 'is_constitutional', type: 'boolean', default: false })
  is_constitutional!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
