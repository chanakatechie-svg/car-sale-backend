import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OptionList, SettingOption } from './entities/setting-option.entity';

export type SettingsLists = Record<OptionList, string[]>;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingOption) private readonly options: Repository<SettingOption>,
    private readonly dataSource: DataSource,
  ) {}

  /** Shape matches the frontend `SettingsState`: `{ makes: [...], bodyTypes: [...], ... }`. */
  async getAll(): Promise<SettingsLists> {
    const rows = await this.options.find({ order: { list: 'ASC', sortOrder: 'ASC' } });
    const result = Object.fromEntries(
      Object.values(OptionList).map((l) => [l, [] as string[]]),
    ) as SettingsLists;
    for (const row of rows) result[row.list].push(row.value);
    return result;
  }

  async getList(list: OptionList) {
    const rows = await this.options.find({ where: { list }, order: { sortOrder: 'ASC' } });
    return rows.map((r) => r.value);
  }

  hasOption(list: OptionList, value: string) {
    return this.options.exists({ where: { list, value } });
  }

  async add(list: OptionList, value: string) {
    if (await this.hasOption(list, value)) {
      throw new ConflictException(`"${value}" already exists in ${list}`);
    }
    const max = await this.options
      .createQueryBuilder('o')
      .select('COALESCE(MAX(o.sortOrder), -1)', 'max')
      .where('o.list = :list', { list })
      .getRawOne<{ max: number }>();
    await this.options.save(this.options.create({ list, value, sortOrder: Number(max?.max) + 1 }));
    return this.getList(list);
  }

  async remove(list: OptionList, value: string) {
    const result = await this.options.delete({ list, value });
    if (!result.affected) throw new NotFoundException(`"${value}" not found in ${list}`);
    return this.getList(list);
  }

  async reorder(list: OptionList, from: number, to: number) {
    const rows = await this.options.find({ where: { list }, order: { sortOrder: 'ASC' } });
    if (from >= rows.length || to >= rows.length) {
      throw new BadRequestException('Index out of range');
    }
    const [moved] = rows.splice(from, 1);
    rows.splice(to, 0, moved);

    await this.dataSource.transaction(async (em) => {
      for (const [i, row] of rows.entries()) {
        if (row.sortOrder !== i) await em.update(SettingOption, row.id, { sortOrder: i });
      }
    });
    return rows.map((r) => r.value);
  }

  /** Idempotent seed helper — inserts any missing values, preserving order. */
  async ensureDefaults(defaults: SettingsLists) {
    for (const list of Object.values(OptionList)) {
      for (const [i, value] of defaults[list].entries()) {
        if (!(await this.hasOption(list, value))) {
          await this.options.save(this.options.create({ list, value, sortOrder: i }));
        }
      }
    }
  }
}
