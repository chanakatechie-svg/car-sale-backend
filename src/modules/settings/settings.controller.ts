import { Controller, Get, Param, ParseEnumPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { OptionList } from './entities/setting-option.entity';
import { SettingsService } from './settings.service';

/** Public: dropdown options for the website search bar and vehicle filters. */
@ApiTags('Settings')
@Public()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Get(':list')
  getList(@Param('list', new ParseEnumPipe(OptionList)) list: OptionList) {
    return this.settingsService.getList(list);
  }
}
