import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscordService } from './discord.service';
import { Organisation } from '../organisations/organisation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organisation])],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
