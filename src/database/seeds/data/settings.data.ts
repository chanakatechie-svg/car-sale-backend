import type { SettingsLists } from '../../../modules/settings/settings.service';

/** Same defaults as the frontend settings slice (redux/admin/settings/settingsSlice.ts). */
export const seedSettings: SettingsLists = {
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
};
