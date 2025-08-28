import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HealthMetricsService } from './health-metrics.service';
import { CreateHealthMetricDto } from './dto/create-health-metric.dto';
import { UpdateHealthMetricDto } from './dto/update-health-metric.dto';

// Sesuaikan guard JWT kamu:
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type RequestUser = { id: number; role?: string };

@Controller('health-metrics')
@UseGuards(JwtAuthGuard)
export class HealthMetricsController {
  constructor(private readonly svc: HealthMetricsService) {}

  @Get('user/:userId')
  async getAllByUserId(
    @Req() req: Request & { user: RequestUser },
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.svc.getAllByUserId(req.user, userId);
  }

  @Post()
  async create(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CreateHealthMetricDto,
  ) {
    return this.svc.create(req.user, dto);
  }

  @Get(':id')
  async getById(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.getById(req.user, id);
  }

  @Get()
  async list(
    @Req() req: Request & { user: RequestUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string, // hanya berfungsi untuk ADMIN/SUPPORT
    @Query('from') from?: string, // ISO
    @Query('to') to?: string, // ISO
    @Query('sort') sort?: 'asc' | 'desc',
  ) {
    return this.svc.list(req.user, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userId: userId ? Number(userId) : undefined,
      from,
      to,
      sort,
    });
  }

  @Patch(':id')
  async update(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHealthMetricDto,
  ) {
    return this.svc.update(req.user, id, dto);
  }

  @Delete(':id')
  async remove(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.remove(req.user, id);
  }
}
