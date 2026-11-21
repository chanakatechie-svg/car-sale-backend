import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Keys match the frontend `SettingsState` (redux/admin/settings). */
export enum OptionList {
  Makes = 'makes',
  BodyTypes = 'bodyTypes',
  FuelTypes = 'fuelTypes',
  Transmissions = 'transmissions',
}

/** One entry in an admin-managed dropdown list (Settings page). */
@Entity('setting_options')
@Unique(['list', 'value'])
export class SettingOption extends BaseEntity {
  @Column({ type: 'enum', enum: OptionList })
  list: OptionList;

  @Column({ length: 60 })
  value: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
