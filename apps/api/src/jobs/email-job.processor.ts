import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import type { EmailJobData } from './jobs.service';

@Processor('email')
export class EmailJobProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailJobProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const data = job.data;
    this.logger.debug(`Processing email job type=${data.type} to=${(data as any).to}`);
    switch (data.type) {
      case 'magic-link':
        await this.emailService.sendMagicLink(data.to, data.link);
        break;
      case 'invite':
        await this.emailService.sendInvite(data.to, data.inviterName, data.orgName, data.acceptUrl);
        break;
      case 'notification':
        await this.emailService.send({ to: data.to, subject: data.subject, html: data.html });
        break;
      case 'vote-reminder':
        await this.emailService.sendVoteReminder(data.to, data.proposalTitle, data.proposalUrl, data.closesAt ? new Date(data.closesAt) : null);
        break;
      default:
        this.logger.warn(`Unknown email job type: ${(data as any).type}`);
    }
  }
}
