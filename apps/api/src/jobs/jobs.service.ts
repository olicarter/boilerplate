import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export type EmailJobData =
  | { type: 'magic-link'; to: string; link: string }
  | { type: 'invite'; to: string; inviterName: string; orgName: string; acceptUrl: string }
  | { type: 'notification'; to: string; subject: string; html: string }
  | { type: 'vote-reminder'; to: string; proposalTitle: string; proposalUrl: string; closesAt: string | null };

export type ProposalJobData =
  | { type: 'auto-close'; proposalId: string };

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('proposals') private readonly proposalsQueue: Queue,
  ) {}

  async enqueueEmail(data: EmailJobData, opts?: { delay?: number; attempts?: number }) {
    return this.emailQueue.add(data.type, data, {
      attempts: opts?.attempts ?? 3,
      delay: opts?.delay,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    });
  }

  async enqueueAutoClose(proposalId: string, delayMs?: number) {
    return this.proposalsQueue.add('auto-close', { type: 'auto-close', proposalId }, {
      delay: delayMs,
      jobId: `auto-close:${proposalId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: { age: 86400 },
    });
  }
}
