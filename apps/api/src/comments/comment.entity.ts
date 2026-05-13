import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('comments')
export class Comment {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id' })
  proposal_id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  author_id!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true, default: null })
  edited_at!: Date | null;

  @Column({ name: 'hidden_by', type: 'uuid', nullable: true, default: null })
  hidden_by!: string | null;

  @Column({ name: 'hidden_reason', type: 'varchar', length: 500, nullable: true, default: null })
  hidden_reason!: string | null;

  @Column({ name: 'pinned_at', type: 'timestamptz', nullable: true, default: null })
  pinned_at!: Date | null;

  @Column({ name: 'parent_comment_id', type: 'uuid', nullable: true, default: null })
  parent_comment_id!: string | null;
}
