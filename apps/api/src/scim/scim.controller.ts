import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Headers,
  Query, Req, Res, UnauthorizedException, NotFoundException, BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID, randomBytes } from 'crypto';

function scimError(res: Response, status: number, detail: string) {
  return res.status(status).json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
    status: String(status),
    detail,
  });
}

@Controller('scim/v2')
export class ScimController {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  private async getOrgByToken(token: string | undefined) {
    if (!token?.startsWith('Bearer ')) return null;
    const raw = token.slice(7);
    const rows: { id: string; slug: string }[] = await this.db.query(
      `SELECT id, slug FROM organisations WHERE scim_token = $1 LIMIT 1`, [raw],
    );
    return rows[0] ?? null;
  }

  // --- Users ---

  @Get('Users')
  async listUsers(
    @Headers('authorization') auth: string | undefined,
    @Query('startIndex') startIndex = '1',
    @Query('count') count = '100',
    @Query('filter') filter: string | undefined,
    @Res() res: Response,
  ) {
    const org = await this.getOrgByToken(auth);
    if (!org) return scimError(res, 401, 'Unauthorized');

    const start = Math.max(1, parseInt(startIndex, 10));
    const size = Math.min(200, parseInt(count, 10));
    const offset = start - 1;

    let emailFilter: string | null = null;
    if (filter) {
      const m = filter.match(/userName\s+eq\s+"([^"]+)"/i);
      if (m) emailFilter = m[1].toLowerCase();
    }

    const rows: { id: string; email: string; name: string; role: string; status: string }[] = await this.db.query(
      `SELECT u.id, u.email, u.name, m.role, m.status
       FROM users u
       JOIN memberships m ON m.user_id = u.id
       WHERE m.organisation_id = $1
       ${emailFilter ? `AND lower(u.email) = $4` : ''}
       ORDER BY u.name
       LIMIT $2 OFFSET $3`,
      emailFilter ? [org.id, size, offset, emailFilter] : [org.id, size, offset],
    );

    const totalCount: { count: string }[] = await this.db.query(
      `SELECT count(*) FROM users u JOIN memberships m ON m.user_id = u.id WHERE m.organisation_id = $1`, [org.id],
    );

    return res.json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: parseInt(totalCount[0]?.count ?? '0', 10),
      startIndex: start,
      itemsPerPage: size,
      Resources: rows.map((r) => this.toScimUser(r, org.slug)),
    });
  }

  @Get('Users/:id')
  async getUser(
    @Param('id') id: string,
    @Headers('authorization') auth: string | undefined,
    @Res() res: Response,
  ) {
    const org = await this.getOrgByToken(auth);
    if (!org) return scimError(res, 401, 'Unauthorized');

    const rows: { id: string; email: string; name: string; role: string; status: string }[] = await this.db.query(
      `SELECT u.id, u.email, u.name, m.role, m.status
       FROM users u
       JOIN memberships m ON m.user_id = u.id
       WHERE m.organisation_id = $1 AND u.id = $2 LIMIT 1`,
      [org.id, id],
    );
    if (!rows[0]) return scimError(res, 404, 'User not found');
    return res.json(this.toScimUser(rows[0], org.slug));
  }

  @Post('Users')
  async createUser(
    @Body() body: Record<string, unknown>,
    @Headers('authorization') auth: string | undefined,
    @Res() res: Response,
  ) {
    const org = await this.getOrgByToken(auth);
    if (!org) return scimError(res, 401, 'Unauthorized');

    const email = String(body.userName ?? (body.emails as { value: string }[])?.[0]?.value ?? '').toLowerCase();
    if (!email) return scimError(res, 400, 'userName is required');

    const displayName = String(body.displayName ?? (body.name as { formatted?: string })?.formatted ?? email.split('@')[0]);

    // Find or create user
    let user = (await this.db.query<{ id: string; email: string; name: string }[]>(
      `SELECT id, email, name FROM users WHERE email = $1 LIMIT 1`, [email],
    ))[0];
    if (!user) {
      const uid = randomUUID();
      await this.db.query(
        `INSERT INTO users (id, email, name, email_verified) VALUES ($1, $2, $3, true)`,
        [uid, email, displayName],
      );
      user = { id: uid, email, name: displayName };
    }

    // Add to org if not already a member
    const existing = (await this.db.query<{ id: string }[]>(
      `SELECT id FROM memberships WHERE organisation_id = $1 AND user_id = $2 LIMIT 1`,
      [org.id, user.id],
    ))[0];
    if (!existing) {
      await this.db.query(
        `INSERT INTO memberships (id, organisation_id, user_id, role, status) VALUES ($1, $2, $3, 'member', 'approved')`,
        [randomUUID(), org.id, user.id],
      );
    }

    return res.status(201).json(this.toScimUser({ ...user, role: 'member', status: 'approved' }, org.slug));
  }

  @Put('Users/:id')
  async replaceUser(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') auth: string | undefined,
    @Res() res: Response,
  ) {
    const org = await this.getOrgByToken(auth);
    if (!org) return scimError(res, 401, 'Unauthorized');

    const active = (body.active as boolean | undefined) !== false;
    if (!active) {
      await this.db.query(
        `DELETE FROM memberships WHERE organisation_id = $1 AND user_id = $2`, [org.id, id],
      );
      return res.status(204).send();
    }

    const rows = await this.db.query<{ id: string; email: string; name: string; role: string; status: string }[]>(
      `SELECT u.id, u.email, u.name, m.role, m.status
       FROM users u JOIN memberships m ON m.user_id = u.id
       WHERE m.organisation_id = $1 AND u.id = $2 LIMIT 1`,
      [org.id, id],
    );
    if (!rows[0]) return scimError(res, 404, 'User not found');
    return res.json(this.toScimUser(rows[0], org.slug));
  }

  @Patch('Users/:id')
  async patchUser(
    @Param('id') id: string,
    @Body() body: { Operations?: Array<{ op: string; path?: string; value?: unknown }> },
    @Headers('authorization') auth: string | undefined,
    @Res() res: Response,
  ) {
    const org = await this.getOrgByToken(auth);
    if (!org) return scimError(res, 401, 'Unauthorized');

    for (const op of body.Operations ?? []) {
      if (op.op?.toLowerCase() === 'replace' && op.path === 'active' && op.value === false) {
        await this.db.query(
          `DELETE FROM memberships WHERE organisation_id = $1 AND user_id = $2`, [org.id, id],
        );
        return res.status(204).send();
      }
    }

    const rows = await this.db.query<{ id: string; email: string; name: string; role: string; status: string }[]>(
      `SELECT u.id, u.email, u.name, m.role, m.status
       FROM users u JOIN memberships m ON m.user_id = u.id
       WHERE m.organisation_id = $1 AND u.id = $2 LIMIT 1`,
      [org.id, id],
    );
    if (!rows[0]) return scimError(res, 404, 'User not found');
    return res.json(this.toScimUser(rows[0], org.slug));
  }

  @Delete('Users/:id')
  async deleteUser(
    @Param('id') id: string,
    @Headers('authorization') auth: string | undefined,
    @Res() res: Response,
  ) {
    const org = await this.getOrgByToken(auth);
    if (!org) return scimError(res, 401, 'Unauthorized');
    await this.db.query(
      `DELETE FROM memberships WHERE organisation_id = $1 AND user_id = $2`, [org.id, id],
    );
    return res.status(204).send();
  }

  // --- Service provider config ---

  @Get('ServiceProviderConfig')
  serviceProviderConfig() {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [{ type: 'oauthbearertoken', name: 'Bearer Token' }],
    };
  }

  private toScimUser(r: { id: string; email: string; name: string; role: string; status: string }, orgSlug: string) {
    const apiBase = process.env.API_URL ?? 'http://localhost:3000';
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: r.id,
      userName: r.email,
      displayName: r.name,
      name: { formatted: r.name },
      emails: [{ value: r.email, primary: true }],
      active: r.status === 'approved',
      meta: {
        resourceType: 'User',
        location: `${apiBase}/api/scim/v2/Users/${r.id}`,
      },
    };
  }
}
