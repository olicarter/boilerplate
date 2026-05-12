import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebClient } from '@slack/web-api';
import { Organisation } from '../organisations/organisation.entity';

@Injectable()
export class SlackService {
  private readonly log = new Logger(SlackService.name);

  constructor(
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
  ) {}

  private clientFor(token: string): WebClient {
    return new WebClient(token);
  }

  async postProposalOpened(orgId: string, proposalTitle: string, proposalUrl: string): Promise<void> {
    const org = await this.orgRepo.findOneBy({ id: orgId });
    if (!org?.slack_bot_token || !org.slack_channel_id) return;
    try {
      await this.clientFor(org.slack_bot_token).chat.postMessage({
        channel: org.slack_channel_id,
        text: `*New proposal open for voting:* ${proposalTitle}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*New proposal open for voting*\n${proposalTitle}` },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'View & vote' },
              url: proposalUrl,
              action_id: 'view_proposal',
            },
          },
        ],
      });
    } catch (err) {
      this.log.warn(`Slack post failed for org ${orgId}: ${err}`);
    }
  }

  async postProposalClosed(orgId: string, proposalTitle: string, outcome: string, proposalUrl: string): Promise<void> {
    const org = await this.orgRepo.findOneBy({ id: orgId });
    if (!org?.slack_bot_token || !org.slack_channel_id) return;
    try {
      const outcomeLabel = outcome === 'passed' ? 'Passed ✅' : outcome === 'failed' ? 'Failed ❌' : 'Closed';
      await this.clientFor(org.slack_bot_token).chat.postMessage({
        channel: org.slack_channel_id,
        text: `*Proposal closed — ${outcomeLabel}:* ${proposalTitle}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Proposal closed — ${outcomeLabel}*\n${proposalTitle}` },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'View results' },
              url: proposalUrl,
              action_id: 'view_results',
            },
          },
        ],
      });
    } catch (err) {
      this.log.warn(`Slack post failed for org ${orgId}: ${err}`);
    }
  }

  async exchangeOAuthCode(code: string, redirectUri: string): Promise<{
    teamId: string;
    teamName: string;
    botToken: string;
    channelId: string | null;
    channelName: string | null;
  }> {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Slack not configured');

    const client = new WebClient();
    const result = await client.oauth.v2.access({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const teamId = (result.team as { id: string })?.id ?? '';
    const teamName = (result.team as { name: string })?.name ?? '';
    const botToken = (result.access_token as string) ?? '';
    const channelId = (result.incoming_webhook as { channel_id?: string } | undefined)?.channel_id ?? null;
    const channelName = (result.incoming_webhook as { channel?: string } | undefined)?.channel ?? null;

    return { teamId, teamName, botToken, channelId, channelName };
  }

  async listChannels(orgId: string): Promise<Array<{ id: string; name: string }>> {
    const org = await this.orgRepo.findOneBy({ id: orgId });
    if (!org?.slack_bot_token) return [];
    try {
      const result = await this.clientFor(org.slack_bot_token).conversations.list({ types: 'public_channel,private_channel', limit: 100 });
      return (result.channels ?? []).map((c) => ({ id: c.id!, name: c.name! }));
    } catch {
      return [];
    }
  }

  async setChannel(orgId: string, channelId: string): Promise<void> {
    const org = await this.orgRepo.findOneBy({ id: orgId });
    if (!org?.slack_bot_token) return;
    const result = await this.clientFor(org.slack_bot_token).conversations.info({ channel: channelId });
    const channelName = (result.channel as { name?: string })?.name ?? channelId;
    await this.orgRepo.update(orgId, { slack_channel_id: channelId, slack_channel_name: channelName });
  }

  async disconnect(orgId: string): Promise<void> {
    await this.orgRepo.update(orgId, {
      slack_team_id: null,
      slack_team_name: null,
      slack_bot_token: null,
      slack_channel_id: null,
      slack_channel_name: null,
    });
  }
}
