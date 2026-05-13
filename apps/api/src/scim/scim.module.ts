import { Module } from '@nestjs/common';
import { ScimController } from './scim.controller';

@Module({
  controllers: [ScimController],
})
export class ScimModule {}
