import { Body, Controller, Delete, Param, ParseEnumPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AddOptionDto, ReorderOptionDto } from './dto/option.dto';
import { OptionList } from './entities/setting-option.entity';
import { SettingsService } from './settings.service';

/**
 * Admin panel → Settings page. Mirrors the redux actions
 * `addOption`, `removeOption`, `reorderOption`. Each returns the updated list.
 */
@ApiTags('Admin / Settings')
@ApiBearerAuth()
@Roles(UserRole.Admin, UserRole.Manager)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post(':list')
  add(@Param('list', new ParseEnumPipe(OptionList)) list: OptionList, @Body() dto: AddOptionDto) {
    return this.settingsService.add(list, dto.value);
  }

  @Delete(':list/:value')
  remove(
    @Param('list', new ParseEnumPipe(OptionList)) list: OptionList,
    @Param('value') value: string,
  ) {
    return this.settingsService.remove(list, value);
  }

  @Patch(':list/reorder')
  reorder(
    @Param('list', new ParseEnumPipe(OptionList)) list: OptionList,
    @Body() dto: ReorderOptionDto,
  ) {
    return this.settingsService.reorder(list, dto.from, dto.to);
  }
}
