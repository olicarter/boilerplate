import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import type { ProposalJobData } from './jobs.service';

@Processor('proposals')
export class ProposalJobProcessor extends WorkerHost {
  private readonly logger = new Logger(ProposalJobProcessor.name);

  async process(job: Job<ProposalJobData>): Promise<void> {
    const data = job.data;
    this.logger.debug(`Processing proposal job type=${data.type}`);
  }
}
