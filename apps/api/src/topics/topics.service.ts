import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Topic } from './topic.entity';
import { Organisation } from '../organisations/organisation.entity';
import { Membership } from '../organisations/membership.entity';

const TOPIC_NAME_MAX = 100;
const ROLE_RANK: Record<string, number> = { member: 1, moderator: 2, admin: 3 };

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepo: Repository<Topic>,
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
    @InjectRepository(Membership)
    private readonly memberRepo: Repository<Membership>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Topic[]> {
    return this.topicRepo.find({ order: { created_at: 'ASC' } });
  }

  findByOrg(organisationId: string): Promise<Topic[]> {
    return this.topicRepo.find({ where: { organisation_id: organisationId }, order: { created_at: 'ASC' } });
  }

  async create(
    data: { id: string; organisation_id: string; name: string; description?: string },
    actorId: string,
  ): Promise<{ item: Topic; txid: number }> {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Topic name is required');
    if (name.length > TOPIC_NAME_MAX) throw new BadRequestException(`Topic name must be ${TOPIC_NAME_MAX} characters or fewer`);

    const org = await this.orgRepo.findOneBy({ id: data.organisation_id });
    if (!org) throw new NotFoundException('Organisation not found');
    const membership = await this.memberRepo.findOneBy({ organisation_id: data.organisation_id, user_id: actorId });
    if (!membership) throw new ForbiddenException('Not a member of this organisation');
    const required = ROLE_RANK[org.topic_creation_role] ?? 1;
    const actual = ROLE_RANK[membership.role] ?? 0;
    if (actual < required) {
      throw new ForbiddenException(`Only ${org.topic_creation_role}s and above can create topics`);
    }

    return this.dataSource.transaction(async (manager) => {
      const topic = manager.create(Topic, { description: '', ...data });
      const saved = await manager.save(topic);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });
  }

  async update(id: string, data: Partial<Pick<Topic, 'name' | 'description'>>): Promise<{ item: Topic; txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      await manager.update(Topic, id, data);
      const item = await manager.findOneByOrFail(Topic, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async delete(id: string): Promise<{ txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(Topic, id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }
}
