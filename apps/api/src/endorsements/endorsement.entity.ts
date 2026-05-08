import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('endorsements')
export class Endorsement {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposal_id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
