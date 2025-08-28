import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { healthMetrics, users } from '../db/schema';
import { CreateHealthMetricDto } from './dto/create-health-metric.dto';
import { UpdateHealthMetricDto } from './dto/update-health-metric.dto';

type RequestUser = { id: number; role?: string };

@Injectable()
export class HealthMetricsService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private db: NodePgDatabase<typeof import('../db/schema')>,
  ) {}

  private isStaff(role?: string) {
    return role === 'ADMIN' || role === 'SUPPORT';
  }

  private ensureOwnerOrStaff(acting: RequestUser, ownerUserId: number) {
    if (this.isStaff(acting.role)) return;
    if (acting.id !== ownerUserId) {
      throw new ForbiddenException('Not allowed');
    }
  }

  // CREATE
  async create(acting: RequestUser, dto: CreateHealthMetricDto) {
    const targetUserId =
      this.isStaff(acting.role) && dto.userId ? dto.userId : acting.id;

    // validasi tanggal
    const when = new Date(dto.dateTime);
    if (isNaN(+when)) throw new BadRequestException('Invalid dateTime');

    const [row] = await this.db
      .insert(healthMetrics)
      .values({
        userId: targetUserId,
        bloodGlucoseRandom: dto.bloodGlucoseRandom ?? null,
        bloodGlucoseFasting: dto.bloodGlucoseFasting ?? null,
        hba1c: dto.hba1c ?? null,
        hemoglobin: dto.hemoglobin ?? null,
        bloodGlucosePostprandial: dto.bloodGlucosePostprandial ?? null,
        bloodPressure: dto.bloodPressure,
        dateTime: when,
        notes: dto.notes ?? null,
      })
      .returning();

    return row;
  }

  // GET ONE
  async getById(acting: RequestUser, id: number) {
    const [row] = await this.db
      .select()
      .from(healthMetrics)
      .where(eq(healthMetrics.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Record not found');
    this.ensureOwnerOrStaff(acting, row.userId);
    return row;
  }

  async getAllByUserId(acting: RequestUser, userId: number) {
    if (!Number.isInteger(userId)) {
      throw new BadRequestException('Invalid userId');
    }
    // user biasa hanya boleh lihat miliknya sendiri
    if (!this.isStaff(acting.role) && acting.id !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    const rows = await this.db
      .select({
        id: healthMetrics.id,
        userId: healthMetrics.userId,
        bloodGlucoseRandom: healthMetrics.bloodGlucoseRandom,
        bloodGlucoseFasting: healthMetrics.bloodGlucoseFasting,
        hba1c: healthMetrics.hba1c,
        hemoglobin: healthMetrics.hemoglobin,
        bloodGlucosePostprandial: healthMetrics.bloodGlucosePostprandial,
        bloodPressure: healthMetrics.bloodPressure,
        dateTime: healthMetrics.dateTime,
        notes: healthMetrics.notes,
        createdAt: healthMetrics.createdAt,
        updatedAt: healthMetrics.updatedAt,
      })
      .from(healthMetrics)
      .leftJoin(users, eq(users.id, healthMetrics.userId))
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.dateTime));

    return {
      success: true,
      time: new Date().toISOString(),
      userId,
      total: rows.length,
      items: rows,
    };
  }

  // LIST (pagination + filter)
  async list(
    acting: RequestUser,
    params: {
      page?: number;
      limit?: number;
      userId?: number; // staff only
      from?: string;
      to?: string;
      sort?: 'asc' | 'desc'; // by dateTime
    },
  ) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 100);
    const offset = (page - 1) * limit;

    const whereParts: any[] = [];

    const isStaff = this.isStaff(acting.role);
    const targetUserId = isStaff
      ? params.userId
        ? Number(params.userId)
        : undefined
      : acting.id;

    if (!isStaff) whereParts.push(eq(healthMetrics.userId, acting.id));
    else if (targetUserId)
      whereParts.push(eq(healthMetrics.userId, targetUserId));

    if (params.from) {
      const d = new Date(params.from);
      if (isNaN(+d)) throw new BadRequestException('Invalid from');
      whereParts.push(gte(healthMetrics.dateTime as any, d));
    }
    if (params.to) {
      const d = new Date(params.to);
      if (isNaN(+d)) throw new BadRequestException('Invalid to');
      whereParts.push(lte(healthMetrics.dateTime as any, d));
    }

    const where = whereParts.length ? and(...whereParts) : undefined;

    const order =
      params.sort === 'asc'
        ? asc(healthMetrics.dateTime)
        : desc(healthMetrics.dateTime);

    const totalRows = await this.db
      .select({ c: sql<number>`count(*)::int` as any })
      .from(healthMetrics as any)
      .where(where as any);

    const rows = await this.db
      .select({
        id: healthMetrics.id,
        userId: healthMetrics.userId,
        bloodGlucoseRandom: healthMetrics.bloodGlucoseRandom,
        bloodGlucoseFasting: healthMetrics.bloodGlucoseFasting,
        hba1c: healthMetrics.hba1c,
        hemoglobin: healthMetrics.hemoglobin,
        bloodGlucosePostprandial: healthMetrics.bloodGlucosePostprandial,
        bloodPressure: healthMetrics.bloodPressure,
        dateTime: healthMetrics.dateTime,
        notes: healthMetrics.notes,
        createdAt: healthMetrics.createdAt,
        updatedAt: healthMetrics.updatedAt,
        // optional: info user
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(healthMetrics)
      .leftJoin(users, eq(users.id, healthMetrics.userId))
      .where(where as any)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      time: new Date().toISOString(),
      total: totalRows[0]?.c ?? 0,
      page,
      limit,
      items: rows,
    };
  }

  // UPDATE
  async update(acting: RequestUser, id: number, dto: UpdateHealthMetricDto) {
    const [cur] = await this.db
      .select()
      .from(healthMetrics)
      .where(eq(healthMetrics.id, id))
      .limit(1);

    if (!cur) throw new NotFoundException('Record not found');
    this.ensureOwnerOrStaff(acting, cur.userId);

    const patch: any = { updatedAt: sql`now()` };

    if (dto.bloodGlucoseRandom !== undefined)
      patch.bloodGlucoseRandom = dto.bloodGlucoseRandom;
    if (dto.bloodGlucoseFasting !== undefined)
      patch.bloodGlucoseFasting = dto.bloodGlucoseFasting;
    if (dto.hba1c !== undefined) patch.hba1c = dto.hba1c;
    if (dto.hemoglobin !== undefined) patch.hemoglobin = dto.hemoglobin;
    if (dto.bloodGlucosePostprandial !== undefined)
      patch.bloodGlucosePostprandial = dto.bloodGlucosePostprandial;

    if (dto.bloodPressure !== undefined)
      patch.bloodPressure = dto.bloodPressure;

    if (dto.dateTime !== undefined) {
      const d = new Date(dto.dateTime);
      if (isNaN(+d)) throw new BadRequestException('Invalid dateTime');
      patch.dateTime = d;
    }

    if (dto.notes !== undefined) patch.notes = dto.notes ?? null;

    const [row] = await this.db
      .update(healthMetrics)
      .set(patch)
      .where(eq(healthMetrics.id, id))
      .returning();

    return row;
  }

  // DELETE
  async remove(acting: RequestUser, id: number) {
    const [cur] = await this.db
      .select({ id: healthMetrics.id, userId: healthMetrics.userId })
      .from(healthMetrics)
      .where(eq(healthMetrics.id, id))
      .limit(1);

    if (!cur) throw new NotFoundException('Record not found');
    this.ensureOwnerOrStaff(acting, cur.userId);

    await this.db.delete(healthMetrics).where(eq(healthMetrics.id, id));
    return { ok: true, id };
  }
}
