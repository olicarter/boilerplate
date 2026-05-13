import { createHmac } from 'crypto';

const secret = () => process.env.VOTE_EMAIL_SECRET ?? process.env.RECEIPT_SECRET ?? 'ripple-insecure';

export function generateVoteEmailToken(proposalId: string, userId: string, choice: string): string {
  return createHmac('sha256', secret()).update(`${proposalId}:${userId}:${choice}`).digest('hex');
}

export function verifyVoteEmailToken(proposalId: string, userId: string, choice: string, token: string): boolean {
  return generateVoteEmailToken(proposalId, userId, choice) === token;
}
