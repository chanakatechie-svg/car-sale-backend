import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleStatus } from './entities/vehicle.entity';
import { VehiclesService } from './vehicles.service';

/** Admin panel → Vehicles page (vehicle-form-modal / delete-confirm-modal). */
@ApiTags('Admin / Vehicles')
@ApiBearerAuth()
@Roles(UserRole.Admin, UserRole.Manager, UserRole.Staff)
@Controller('admin/vehicles')
export class AdminVehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@Query() query: QueryVehiclesDto) {
    return this.vehiclesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }

  @Patch(':id/featured/:featured')
  setFeatured(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('featured', ParseBoolPipe) featured: boolean,
  ) {
    return this.vehiclesService.setFeatured(id, featured);
  }

  @Patch(':id/status/:status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('status', new ParseEnumPipe(VehicleStatus)) status: VehicleStatus,
  ) {
    return this.vehiclesService.setStatus(id, status);
  }

  /** Deleting stock is restricted to admins and managers. */
  @Roles(UserRole.Admin, UserRole.Manager)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.remove(id);
  }
}
