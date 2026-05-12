import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrganisationsService } from './organisations.service';

@Injectable()
export class OrganisationsScheduler {
  private readonly logger = new Logger(OrganisationsScheduler.name);

  constructor(private readonly orgsService: OrganisationsService) {}

  @Cron('0 4 * * *')
  async runCreditDecay() {
    await this.orgsService.runCreditDecay();
    this.logger.log('Credit decay check complete');
  }
}
