import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OptionList, SettingOption } from './entities/setting-option.entity';
import { DEFAULT_SETTINGS, OPTION_LIST_COLUMNS, type SettingsLists } from './settings.defaults';

export type { SettingsLists } from './settings.defaults';

@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(SettingOption) private readonly options: Repository<SettingOption>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Any list that is still empty (first run, or a list added in a later release)
   * gets the defaults plus every value existing vehicles already use, so editing
   * current stock never fails the "must be in Settings" check.
   */
  async onApplicationBootstrap() {
    for (const list of Object.values(OptionList)) {
      if ((await this.options.count({ where: { list } })) > 0) continue;
      const inUse = await this.valuesInUse(list);
      const values = [...new Set([...DEFAULT_SETTINGS[list], ...inUse])];
      await this.options.save(
        values.map((value, sortOrder) => this.options.create({ list, value, sortOrder })),
      );
      this.logger.log(`Initialised "${list}" with ${values.length} options`);
    }
  }

  /** Distinct non-empty values of this list's column on the vehicles table. */
  private async valuesInUse(list: OptionList): Promise<string[]> {
    const column = OPTION_LIST_COLUMNS[list];
    const rows = await this.dataSource
      .createQueryBuilder()
      .select(`DISTINCT v.${column}`, 'value')
      .from('vehicles', 'v')
      .where(`v.${column} IS NOT NULL`)
      .andWhere(`v.${column} <> ''`)
      .getRawMany<{ value: string }>();
    return rows.map((r) => r.value.trim()).filter((v) => v && v.length <= 60);
  }

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
