import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('vetoes')
export class Veto {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposal_id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ name: 'author_id', type: 'uuid' })
  author_id!: string;

  @Column({ type: 'text' })
  reason!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
