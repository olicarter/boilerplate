import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './topic.entity';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Topic, Organisation, Membership])],
  controllers: [TopicsController],
  providers: [TopicsService],
})
export class TopicsModule {}
