import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('comments')
export class Comment {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id' })
  proposal_id!: string;

  @Column({ name: 'author_id', type: 'uuid', nullable: true })
  author_id!: string | null;

  @Column({ type: 'text' })
  body!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
