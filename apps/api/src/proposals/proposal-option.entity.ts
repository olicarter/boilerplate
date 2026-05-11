import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('proposal_options')
export class ProposalOption {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id', type: 'uuid' })
  proposal_id!: string;

  @Column({ name: 'organisation_id', type: 'uuid' })
  organisation_id!: string;

  @Column({ type: 'varchar', length: 500 })
  text!: string;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
