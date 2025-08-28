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

  private hasTimePart(s: string) {
    return /[TtZz]/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s);
  }

  private parseBoundToUTC(input: string, kind: 'from' | 'to'): Date {
    const raw = String(input || '').trim();
    if (!raw) throw new BadRequestException(`Invalid ${kind}`);

    // Jika user sudah kirim waktu/offset (ada 'T', 'Z', atau +07:00), pakai apa adanya
    if (this.hasTimePart(raw)) {
      const d = new Date(raw);
      if (isNaN(+d)) throw new BadRequestException(`Invalid ${kind}`);
      return d;
    }

    // MODE UTC-DAY: tanggal saja → rentang UTC hari itu
    const iso = kind === 'to' ? `${raw}T23:59:59.999Z` : `${raw}T00:00:00.000Z`;
    const d = new Date(iso);
    if (isNaN(+d)) throw new BadRequestException(`Invalid ${kind}`);
    return d;
  }

  // CREATE
  async create(acting: RequestUser, dto: CreateHealthMetricDto) {
    const targetUserId =
      this.isStaff(acting.role) && dto.userId ? dto.userId : acting.id;

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
        notes: healthMetrics.notes,
        createdAt: healthMetrics.createdAt,
        updatedAt: healthMetrics.updatedAt,
      })
      .from(healthMetrics)
      .leftJoin(users, eq(users.id, healthMetrics.userId))
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.updatedAt));

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
    acting: { id: number; role?: string },
    params: {
      page?: number;
      limit?: number;
      userId?: number; // staff only
      from?: string;
      to?: string;
      sort?: 'asc' | 'desc'; // by updatedAt (atau ganti ke dateTime jika mau)
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

    if (!isStaff) {
      whereParts.push(eq(healthMetrics.userId, acting.id));
    } else if (targetUserId) {
      whereParts.push(eq(healthMetrics.userId, targetUserId));
    }

    // ⬇️ use Asia/Jakarta semantics for date-only strings
    if (params.from) {
      const dFrom = this.parseBoundToUTC(params.from, 'from');
      whereParts.push(gte(healthMetrics.updatedAt as any, dFrom));
    }
    if (params.to) {
      const dTo = this.parseBoundToUTC(params.to, 'to');
      whereParts.push(lte(healthMetrics.updatedAt as any, dTo));
    }

    const where = whereParts.length ? and(...whereParts) : undefined;
    const order =
      params.sort === 'asc'
        ? asc(healthMetrics.updatedAt)
        : desc(healthMetrics.updatedAt);

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
        notes: healthMetrics.notes,
        createdAt: healthMetrics.createdAt,
        updatedAt: healthMetrics.updatedAt,
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
