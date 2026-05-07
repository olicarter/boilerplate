import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organisation } from './organisation.entity';
import { Membership } from './membership.entity';
import { OrganisationsService } from './organisations.service';
import { OrganisationsController } from './organisations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organisation, Membership])],
  providers: [OrganisationsService],
  controllers: [OrganisationsController],
  exports: [OrganisationsService],
})
export class OrganisationsModule {}
