import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { EndorsementsService } from './endorsements.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller()
export class EndorsementsController {
  constructor(private readonly endorsementsService: EndorsementsService) {}

  @Get('proposals/:id/endorsements')
  @UseGuards(AuthGuard)
  list(@Param('id') proposalId: string) {
    return this.endorsementsService.findByProposal(proposalId);
  }

  @Post('proposals/:id/endorsements')
  @UseGuards(AuthGuard)
  endorse(@Param('id') proposalId: string, @Req() req: AuthenticatedRequest) {
    return this.endorsementsService.endorse(proposalId, req.user!.id);
  }

  @Delete('proposals/:id/endorsements')
  @UseGuards(AuthGuard)
  retract(@Param('id') proposalId: string, @Req() req: AuthenticatedRequest) {
    return this.endorsementsService.retract(proposalId, req.user!.id);
  }
}
