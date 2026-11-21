import { OptionList } from './entities/setting-option.entity';

export type SettingsLists = Record<OptionList, string[]>;

/**
 * Starting options for each admin-managed dropdown. Applied to a list only while
 * it is empty (first boot / after adding a new list) — admins edit them afterwards
 * on the Settings page.
 */
export const DEFAULT_SETTINGS: SettingsLists = {
  makes: [
    'Audi',
    'BMW',
    'Mercedes-Benz',
    'Range Rover',
    'Volkswagen',
    'Volvo',
    'Porsche',
    'Jaguar',
    'Land Rover',
    'Tesla',
  ],
  bodyTypes: ['Saloon', 'SUV', 'Hatchback', 'Estate', 'Coupe', 'Convertible'],
  fuelTypes: ['Petrol', 'Diesel', 'Hybrid', 'Plug-in Hybrid', 'Electric'],
  transmissions: ['Automatic', 'Manual'],
  conditions: ['New', 'Used', 'Certified Pre-Owned'],
  drivetrains: ['FWD', 'RWD', 'AWD', '4WD'],
};

/** The vehicles column each list validates. */
export const OPTION_LIST_COLUMNS: Record<OptionList, string> = {
  makes: 'make',
  bodyTypes: 'bodyType',
  fuelTypes: 'fuelType',
  transmissions: 'transmission',
  conditions: 'condition',
  drivetrains: 'drivetrain',
};
