import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  organisation_id!: string;

  @Column()
  name!: string;

  @Column()
  key_hash!: string;

  @Column()
  key_preview!: string;

  @Column()
  created_by_user_id!: string;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at!: Date | null;
}
