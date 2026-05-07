import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Comment } from './comment.entity';
import { User } from '../users/user.entity';

@Entity('comment_reactions')
export class CommentReaction {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'comment_id' })
  comment_id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'user_id' })
  user_id!: string;

  @Column()
  emoji!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Comment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'comment_id' })
  comment!: Comment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
