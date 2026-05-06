import { BadRequestException, Injectable } from '@nestjs/common';

const TOPIC_NAME_MAX = 100;
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Topic } from './topic.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepo: Repository<Topic>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<Topic[]> {
    return this.topicRepo.find({ order: { created_at: 'ASC' } });
  }

  async create(data: { id: string; name: string; description?: string }): Promise<{ item: Topic; txid: number }> {
    const name = data.name?.trim();
    if (!name) throw new BadRequestException('Topic name is required');
    if (name.length > TOPIC_NAME_MAX) throw new BadRequestException(`Topic name must be ${TOPIC_NAME_MAX} characters or fewer`);

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
