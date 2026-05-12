import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organisation } from '../organisations/organisation.entity';

@Injectable()
export class DiscordService {
  private readonly log = new Logger(DiscordService.name);

  constructor(
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
  ) {}

  async postProposalOpened(orgId: string, proposalTitle: string, proposalUrl: string): Promise<void> {
    const org = await this.orgRepo.findOneBy({ id: orgId });
    if (!org?.discord_webhook_url) return;
    await this.send(org.discord_webhook_url, {
      embeds: [{
        title: 'New proposal open for voting',
        description: `**${proposalTitle}**`,
        color: 0x2563eb,
        url: proposalUrl,
        footer: { text: org.name },
      }],
    });
  }

  async postProposalClosed(orgId: string, proposalTitle: string, outcome: string, proposalUrl: string): Promise<void> {
    const org = await this.orgRepo.findOneBy({ id: orgId });
    if (!org?.discord_webhook_url) return;
    const passed = outcome === 'passed';
    await this.send(org.discord_webhook_url, {
      embeds: [{
        title: `Proposal closed — ${passed ? 'Passed ✅' : 'Failed ❌'}`,
        description: `**${proposalTitle}**`,
        color: passed ? 0x16a34a : 0xdc2626,
        url: proposalUrl,
        footer: { text: org.name },
      }],
    });
  }

  private async send(webhookUrl: string, body: object): Promise<void> {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) this.log.warn(`Discord webhook returned ${res.status}`);
    } catch (err) {
      this.log.warn(`Discord webhook failed: ${err}`);
    }
  }
}
