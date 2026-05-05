import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('proposals/:proposalId/comments')
  findByProposal(@Param('proposalId') proposalId: string) {
    return this.commentsService.findByProposal(proposalId);
  }

  @Post('proposals/:proposalId/comments')
  @UseGuards(AuthGuard)
  create(
    @Param('proposalId') proposalId: string,
    @Body() body: { id: string; body: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.commentsService.create({
      id: body.id,
      proposal_id: proposalId,
      author_id: req.user!.id,
      body: body.body,
    });
  }

  @Delete('comments/:id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.commentsService.delete(id, req.user!.id);
  }
}
