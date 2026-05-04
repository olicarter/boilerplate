import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('credentials')
export class Credential {
  @PrimaryColumn()
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'public_key', type: 'bytea' })
  publicKey!: Buffer;

  @Column({ type: 'bigint' })
  counter!: number;

  @Column({ type: 'text', array: true, nullable: true })
  transports!: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
