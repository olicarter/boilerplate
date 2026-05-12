import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.EMAIL_FROM ?? 'Ripple <noreply@ripple.vote>';
    this.enabled = !!apiKey;
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!this.enabled) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only');
    }
  }

  async send(opts: { to: string; subject: string; html: string; text?: string }): Promise<void> {
    if (!this.enabled || !this.resend) {
      this.logger.log(`[EMAIL SKIPPED] to=${opts.to} subject="${opts.subject}"`);
      return;
    }
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (error) {
      this.logger.error(`Failed to send email to ${opts.to}: ${error.message}`);
      throw new Error(`Email send failed: ${error.message}`);
    }
  }

  async sendVerification(to: string, token: string, baseUrl: string): Promise<void> {
    const link = `${baseUrl}/verify-email?token=${token}`;
    await this.send({
      to,
      subject: 'Verify your Ripple email address',
      html: `
        <p>Hi,</p>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${link}">${link}</a></p>
        <p>This link expires in 24 hours.</p>
        <p>— The Ripple team</p>
      `,
      text: `Verify your email: ${link}\n\nThis link expires in 24 hours.`,
    });
  }

  async sendProposalOpen(to: string, proposalTitle: string, proposalUrl: string): Promise<void> {
    await this.send({
      to,
      subject: `New proposal: ${proposalTitle}`,
      html: `
        <p>A new proposal is open for voting in your organisation:</p>
        <p><strong><a href="${proposalUrl}">${proposalTitle}</a></strong></p>
        <p>Cast your vote before it closes.</p>
        <p>— The Ripple team</p>
      `,
      text: `New proposal: ${proposalTitle}\n\nVote here: ${proposalUrl}`,
    });
  }

  async sendVoteReminder(to: string, proposalTitle: string, proposalUrl: string, closesAt: Date | null): Promise<void> {
    const deadline = closesAt
      ? ` Voting closes ${closesAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`
      : '';
    await this.send({
      to,
      subject: `Reminder: vote on "${proposalTitle}"`,
      html: `
        <p>You haven't voted on this proposal yet:</p>
        <p><strong><a href="${proposalUrl}">${proposalTitle}</a></strong></p>
        <p>${deadline}</p>
        <p>— The Ripple team</p>
      `,
      text: `Reminder to vote on "${proposalTitle}".${deadline}\n\n${proposalUrl}`,
    });
  }

  async sendDelegateVoted(to: string, delegateName: string, proposalTitle: string, choice: string, proposalUrl: string): Promise<void> {
    await this.send({
      to,
      subject: `Your delegate voted on "${proposalTitle}"`,
      html: `
        <p><strong>${delegateName}</strong>, who you have delegated your vote to, voted <strong>${choice}</strong> on:</p>
        <p><strong><a href="${proposalUrl}">${proposalTitle}</a></strong></p>
        <p>You can still cast your own vote to override the delegation.</p>
        <p>— The Ripple team</p>
      `,
      text: `${delegateName} voted ${choice} on "${proposalTitle}".\n\nYou can still override: ${proposalUrl}`,
    });
  }

  async sendProposalClosed(to: string, proposalTitle: string, outcome: string, proposalUrl: string): Promise<void> {
    await this.send({
      to,
      subject: `Proposal closed: ${proposalTitle}`,
      html: `
        <p>The following proposal has closed:</p>
        <p><strong><a href="${proposalUrl}">${proposalTitle}</a></strong></p>
        <p>Result: <strong>${outcome}</strong></p>
        <p>— The Ripple team</p>
      `,
      text: `"${proposalTitle}" has closed. Result: ${outcome}.\n\nView results: ${proposalUrl}`,
    });
  }
}
