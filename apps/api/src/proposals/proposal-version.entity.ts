import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Proposal } from './proposal.entity';
import { User } from '../users/user.entity';

@Entity('proposal_versions')
export class ProposalVersion {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'proposal_id' })
  proposal_id!: string;

  @Column({ name: 'changed_by', nullable: true })
  changed_by!: string | null;

  @Column()
  title!: string;

  @Column({ default: '' })
  description!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @ManyToOne(() => Proposal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proposal_id' })
  proposal!: Proposal;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by' })
  editor!: User | null;
}
