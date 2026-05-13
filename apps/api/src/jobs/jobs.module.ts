import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { EmailJobProcessor } from './email-job.processor';
import { ProposalJobProcessor } from './proposal-job.processor';
import { EmailModule } from '../email/email.module';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const url = new URL(REDIS_URL);

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
      },
    }),
    BullModule.registerQueue({ name: 'email' }),
    BullModule.registerQueue({ name: 'proposals' }),
    EmailModule,
  ],
  providers: [JobsService, EmailJobProcessor, ProposalJobProcessor],
  exports: [JobsService],
})
export class JobsModule {}
