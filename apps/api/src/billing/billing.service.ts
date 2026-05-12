import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';

export const FREE_MEMBER_LIMIT = 15;
export const FREE_ORG_LIMIT = 1;

type StripeInstance = InstanceType<typeof Stripe>;

@Injectable()
export class BillingService {
  private readonly stripe: StripeInstance | null;
  private readonly log = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
    @InjectRepository(Membership)
    private readonly memberRepo: Repository<Membership>,
  ) {
    const key = process.env.STRIPE_SECRET_KEY;
    this.stripe = key ? new Stripe(key) : null;
    if (!key) this.log.warn('STRIPE_SECRET_KEY not set — billing is disabled');
  }

  async getStatus(orgId: string): Promise<{
    plan: 'free' | 'pro';
    memberCount: number;
    memberLimit: number | null;
    canUpgrade: boolean;
  }> {
    const org = await this.orgRepo.findOneByOrFail({ id: orgId });
    const memberCount = await this.memberRepo.count({
      where: { organisation_id: orgId, status: 'approved' as any },
    });
    return {
      plan: org.plan ?? 'free',
      memberCount,
      memberLimit: org.plan === 'pro' ? null : FREE_MEMBER_LIMIT,
      canUpgrade: !!this.stripe && !!process.env.STRIPE_PRO_PRICE_ID,
    };
  }

  async createCheckoutSession(orgId: string, actorId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Billing not configured');
    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) throw new BadRequestException('Billing not configured');

    const membership = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: actorId });
    if (membership?.role !== 'admin') throw new ForbiddenException('Admin only');

    const org = await this.orgRepo.findOneByOrFail({ id: orgId });
    if (org.plan === 'pro') throw new BadRequestException('Already on Pro plan');

    let customerId = org.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await this.stripe.customers.create({ metadata: { org_id: orgId } });
      customerId = customer.id;
      await this.orgRepo.update(orgId, { stripe_customer_id: customerId });
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}?upgrade=success`,
      cancel_url: `${returnUrl}?upgrade=cancelled`,
      metadata: { org_id: orgId },
    });

    return { url: session.url! };
  }

  async createPortalSession(orgId: string, actorId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Billing not configured');

    const membership = await this.memberRepo.findOneBy({ organisation_id: orgId, user_id: actorId });
    if (membership?.role !== 'admin') throw new ForbiddenException('Admin only');

    const org = await this.orgRepo.findOneByOrFail({ id: orgId });
    if (!org.stripe_customer_id) throw new BadRequestException('No billing account found');

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe) return;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orgId: string | undefined = session.metadata?.org_id;
      if (orgId && session.subscription) {
        await this.orgRepo.update(orgId, {
          plan: 'pro',
          stripe_subscription_id: String(session.subscription),
        });
        this.log.log(`Org ${orgId} upgraded to Pro`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const org = await this.orgRepo.findOneBy({ stripe_subscription_id: sub.id as string });
      if (org) {
        await this.orgRepo.update(org.id, { plan: 'free', stripe_subscription_id: null });
        this.log.log(`Org ${org.id} downgraded to Free`);
      }
    }
  }
}
