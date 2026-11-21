import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { VehiclesService } from './vehicles.service';

/** Public website: /vehicles listing, home page featured cars, vehicle detail page. */
@ApiTags('Vehicles')
@Public()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@Query() query: QueryVehiclesDto) {
    return query.includeFacets
      ? this.vehiclesService.findAllWithFacets(query)
      : this.vehiclesService.findAll(query);
  }

  /**
   * Filter sidebar data: price/year bounds and per-option counts.
   * Accepts the same filters as GET /vehicles (page/limit/sortBy are ignored).
   */
  @Get('facets')
  facets(@Query() query: QueryVehiclesDto) {
    return this.vehiclesService.facets(query);
  }

  @Get('featured')
  findFeatured(@Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number) {
    return this.vehiclesService.findFeatured(Math.min(limit, 24));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Get(':id/similar')
  findSimilar(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findSimilar(id);
  }
}
