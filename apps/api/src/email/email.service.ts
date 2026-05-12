import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f9f9f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111}
  .wrap{max-width:520px;margin:40px auto;background:#fff;border:1px solid #e5e5e5;border-radius:6px;overflow:hidden}
  .hdr{padding:20px 32px;border-bottom:1px solid #e5e5e5}
  .logo{font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#111;text-decoration:none}
  .body{padding:32px}
  p{margin:0 0 16px;font-size:15px;line-height:1.6;color:#333}
  .btn{display:inline-block;padding:10px 20px;background:#111;color:#fff!important;text-decoration:none;border-radius:4px;font-size:14px;font-weight:500;margin:8px 0 20px}
  .ftr{padding:16px 32px;border-top:1px solid #e5e5e5;font-size:12px;color:#999}
  a{color:#111}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr"><span class="logo">Ripple</span></div>
  <div class="body">${body}</div>
  <div class="ftr">You're receiving this because you have a Ripple account. © Ripple</div>
</div>
</body>
</html>`;
}

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

  async sendWelcome(to: string, name: string, loginUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Welcome to Ripple',
      html: layout(`
        <p>Hi ${name},</p>
        <p>Thanks for joining Ripple — the liquid democracy platform for modern organisations.</p>
        <p>You can now create or join organisations, vote on proposals, and delegate your vote to people you trust.</p>
        <a href="${loginUrl}" class="btn">Go to Ripple</a>
        <p>If you have any questions, just reply to this email.</p>
        <p>— The Ripple team</p>
      `),
      text: `Hi ${name},\n\nThanks for joining Ripple.\n\nSign in here: ${loginUrl}\n\n— The Ripple team`,
    });
  }

  async sendMagicLink(to: string, magicUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Sign in to Ripple',
      html: layout(`
        <p>Hi,</p>
        <p>Click the button below to sign in to Ripple. This link expires in 15 minutes and can only be used once.</p>
        <a href="${magicUrl}" class="btn">Sign in to Ripple</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>— The Ripple team</p>
      `),
      text: `Sign in to Ripple: ${magicUrl}\n\nThis link expires in 15 minutes.`,
    });
  }

  async sendInvite(to: string, inviterName: string, orgName: string, acceptUrl: string): Promise<void> {
    await this.send({
      to,
      subject: `${inviterName} invited you to join ${orgName} on Ripple`,
      html: layout(`
        <p>Hi,</p>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Ripple.</p>
        <p>Ripple is a liquid democracy platform for making decisions together. Once you join, you can vote on proposals, delegate your vote, and participate in governance.</p>
        <a href="${acceptUrl}" class="btn">Accept invitation</a>
        <p>This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>
        <p>— The Ripple team</p>
      `),
      text: `${inviterName} invited you to join ${orgName} on Ripple.\n\nAccept here: ${acceptUrl}\n\nThis invitation expires in 7 days.`,
    });
  }

  async sendVerification(to: string, token: string, baseUrl: string): Promise<void> {
    const link = `${baseUrl}/verify-email?token=${token}`;
    await this.send({
      to,
      subject: 'Verify your Ripple email address',
      html: layout(`
        <p>Hi,</p>
        <p>Please verify your email address to finish setting up your Ripple account.</p>
        <a href="${link}" class="btn">Verify email address</a>
        <p>This link expires in 24 hours. If you didn't create a Ripple account, you can ignore this email.</p>
      `),
      text: `Verify your email address: ${link}\n\nThis link expires in 24 hours.`,
    });
  }

  async sendProposalOpen(to: string, proposalTitle: string, proposalUrl: string): Promise<void> {
    await this.send({
      to,
      subject: `New proposal: ${proposalTitle}`,
      html: layout(`
        <p>A new proposal is open for voting in your organisation:</p>
        <p><strong>${proposalTitle}</strong></p>
        <a href="${proposalUrl}" class="btn">Cast your vote</a>
        <p>Your voice matters — vote before it closes.</p>
      `),
      text: `New proposal: ${proposalTitle}\n\nVote here: ${proposalUrl}`,
    });
  }

  async sendVoteReminder(to: string, proposalTitle: string, proposalUrl: string, closesAt: Date | null): Promise<void> {
    const deadline = closesAt
      ? ` Voting closes on ${closesAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.`
      : '';
    await this.send({
      to,
      subject: `Reminder: vote on "${proposalTitle}"`,
      html: layout(`
        <p>You haven't voted on this proposal yet:</p>
        <p><strong>${proposalTitle}</strong></p>
        ${deadline ? `<p>${deadline}</p>` : ''}
        <a href="${proposalUrl}" class="btn">Vote now</a>
      `),
      text: `Reminder to vote on "${proposalTitle}".${deadline}\n\n${proposalUrl}`,
    });
  }

  async sendDelegateVoted(to: string, delegateName: string, proposalTitle: string, choice: string, proposalUrl: string): Promise<void> {
    await this.send({
      to,
      subject: `Your delegate voted on "${proposalTitle}"`,
      html: layout(`
        <p><strong>${delegateName}</strong>, who you've delegated your vote to, voted <strong>${choice}</strong> on:</p>
        <p><strong>${proposalTitle}</strong></p>
        <a href="${proposalUrl}" class="btn">View proposal</a>
        <p>You can still cast your own vote to override the delegation.</p>
      `),
      text: `${delegateName} voted ${choice} on "${proposalTitle}".\n\nYou can still override: ${proposalUrl}`,
    });
  }

  async sendProposalClosed(to: string, proposalTitle: string, outcome: string, proposalUrl: string): Promise<void> {
    await this.send({
      to,
      subject: `Result: ${proposalTitle}`,
      html: layout(`
        <p>The following proposal has closed:</p>
        <p><strong>${proposalTitle}</strong></p>
        <p>Result: <strong>${outcome}</strong></p>
        <a href="${proposalUrl}" class="btn">View results</a>
      `),
      text: `"${proposalTitle}" has closed.\n\nResult: ${outcome}\n\nView results: ${proposalUrl}`,
    });
  }
}
