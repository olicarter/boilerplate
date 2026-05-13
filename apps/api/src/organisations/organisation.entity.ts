import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('organisations')
export class Organisation {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'text', default: '' })
  description!: string;

  @Column({ type: 'uuid', nullable: true, default: null })
  invite_token!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  proposal_creation_role!: 'member' | 'moderator' | 'admin';

  @Column({ type: 'varchar', length: 20, default: 'member' })
  topic_creation_role!: 'member' | 'moderator' | 'admin';

  @Column({ type: 'int', nullable: true, default: null })
  default_voting_duration_days!: number | null;

  @Column({ type: 'int', default: 50 })
  default_threshold!: number;

  @Column({ type: 'varchar', length: 20, default: 'public' })
  voting_visibility!: 'public' | 'hidden';

  @Column({ type: 'int', nullable: true, default: null })
  default_quorum!: number | null;

  @Column({ type: 'boolean', default: false })
  is_public!: boolean;

  @Column({ name: 'veto_role', type: 'varchar', length: 20, default: 'admin' })
  veto_role!: 'moderator' | 'admin';

  @Column({ name: 'min_endorsements', type: 'int', default: 0 })
  min_endorsements!: number;

  @Column({ name: 'require_member_approval', type: 'boolean', default: false })
  require_member_approval!: boolean;

  @Column({ name: 'weight_mode', type: 'varchar', length: 20, default: 'manual' })
  weight_mode!: 'manual' | 'by_role';

  @Column({ name: 'proposal_templates', type: 'jsonb', default: [] })
  proposal_templates!: Array<{
    id: string;
    name: string;
    description: string;
    proposal_type: 'standard' | 'discussion' | 'multiple_choice';
    threshold: number;
  }>;

  @Column({ name: 'allowed_email_domains', type: 'text', array: true, default: [] })
  allowed_email_domains!: string[];

  @Column({ type: 'text', default: 'free' })
  plan!: 'free' | 'pro';

  @Column({ name: 'slack_team_id', type: 'text', nullable: true, default: null })
  slack_team_id!: string | null;

  @Column({ name: 'slack_team_name', type: 'text', nullable: true, default: null })
  slack_team_name!: string | null;

  @Column({ name: 'slack_bot_token', type: 'text', nullable: true, default: null })
  slack_bot_token!: string | null;

  @Column({ name: 'slack_channel_id', type: 'text', nullable: true, default: null })
  slack_channel_id!: string | null;

  @Column({ name: 'slack_channel_name', type: 'text', nullable: true, default: null })
  slack_channel_name!: string | null;

  @Column({ name: 'stripe_customer_id', type: 'text', nullable: true, default: null })
  stripe_customer_id!: string | null;

  @Column({ name: 'stripe_subscription_id', type: 'text', nullable: true, default: null })
  stripe_subscription_id!: string | null;

  @Column({ name: 'primary_color', type: 'text', nullable: true, default: null })
  primary_color!: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true, default: null })
  logo_url!: string | null;

  @Column({ name: 'data_retention_months', type: 'int', nullable: true, default: null })
  data_retention_months!: number | null;

  @Column({ name: 'discord_webhook_url', type: 'text', nullable: true, default: null })
  discord_webhook_url!: string | null;

  @Column({ name: 'quadratic_credits', type: 'int', nullable: true, default: null })
  quadratic_credits!: number | null;

  @Column({ name: 'credit_period_days', type: 'int', nullable: true, default: null })
  credit_period_days!: number | null;

  @Column({ name: 'credits_allocated_at', type: 'timestamptz', nullable: true, default: null })
  credits_allocated_at!: Date | null;

  @Column({ name: 'email_from_name', type: 'text', nullable: true, default: null })
  email_from_name!: string | null;

  @Column({ name: 'email_from_address', type: 'text', nullable: true, default: null })
  email_from_address!: string | null;

  @Column({ name: 'boost_threshold', type: 'int', nullable: true, default: null })
  boost_threshold!: number | null;

  @Column({ name: 'oidc_issuer', type: 'text', nullable: true, default: null })
  oidc_issuer!: string | null;

  @Column({ name: 'oidc_client_id', type: 'text', nullable: true, default: null })
  oidc_client_id!: string | null;

  @Column({ name: 'oidc_client_secret', type: 'text', nullable: true, default: null })
  oidc_client_secret!: string | null;

  @Column({ name: 'sso_required', type: 'boolean', default: false })
  sso_required!: boolean;

  @Column({ name: 'scim_token', type: 'text', nullable: true, default: null })
  scim_token!: string | null;

  @Column({ name: 'custom_domain', type: 'text', nullable: true, default: null })
  custom_domain!: string | null;

  @Column({ name: 'custom_domain_verified', type: 'boolean', default: false })
  custom_domain_verified!: boolean;

  @Column({ name: 'custom_domain_verified_at', type: 'timestamptz', nullable: true, default: null })
  custom_domain_verified_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
