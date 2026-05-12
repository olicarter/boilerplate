import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProposalsService } from './proposals.service';

@Injectable()
export class ProposalsScheduler {
  private readonly logger = new Logger(ProposalsScheduler.name);

  constructor(private readonly proposalsService: ProposalsService) {}

  @Cron('* * * * *')
  async closeExpiredProposals() {
    const closed = await this.proposalsService.autoCloseExpired();
    if (closed > 0) this.logger.log(`Auto-closed ${closed} expired proposal(s)`);
  }

  @Cron('* * * * *')
  async openScheduledProposals() {
    const opened = await this.proposalsService.autoOpenScheduled();
    if (opened > 0) this.logger.log(`Auto-opened ${opened} scheduled proposal(s)`);
  }
}
