import { BadRequestException, Injectable } from '@nestjs/common';

const NAME_MAX = 100;
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { created_at: 'ASC' } });
  }

  findOne(id: string): Promise<User | null> {
    return this.userRepo.findOneBy({ id });
  }

  async create(data: { id: string; name: string; email: string }): Promise<{ item: User; txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, data);
      const saved = await manager.save(user);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item: saved, txid: parseInt(row.txid, 10) };
    });
  }

  async update(id: string, data: Partial<Pick<User, 'name' | 'email' | 'bio'>>): Promise<{ item: User; txid: number }> {
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new BadRequestException('Name is required');
      if (name.length > NAME_MAX) throw new BadRequestException(`Name must be ${NAME_MAX} characters or fewer`);
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(User, id, data);
      const item = await manager.findOneByOrFail(User, { id });
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { item, txid: parseInt(row.txid, 10) };
    });
  }

  async delete(id: string): Promise<{ txid: number }> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(User, id);
      const [row] = await manager.query(`SELECT pg_current_xact_id()::text AS txid`);
      return { txid: parseInt(row.txid, 10) };
    });
  }

  async getNotificationPreferences(id: string): Promise<Record<string, boolean>> {
    const user = await this.userRepo.findOneBy({ id });
    return user?.notification_preferences ?? {};
  }

  async updateNotificationPreferences(
    id: string,
    prefs: Record<string, boolean>,
  ): Promise<Record<string, boolean>> {
    await this.userRepo.update(id, { notification_preferences: prefs });
    const user = await this.userRepo.findOneByOrFail({ id });
    return user.notification_preferences;
  }
}
