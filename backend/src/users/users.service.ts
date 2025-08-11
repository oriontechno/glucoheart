import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../db/schema';
import * as argon2 from 'argon2';
import { and, asc, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { ROLES } from '../db/schema/roles';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { validatePasswordStrength } from './password.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
  constructor(
    @Inject('DATABASE_CONNECTION')
    private db: NodePgDatabase<typeof import('../db/schema')>,
    private readonly events: EventEmitter2,
  ) {}

  private async getUserPasswordHash(userId: number) {
    const [u] = await this.db
      .select({
        id: users.id,
        passwordHash: (users as any).passwordHash,
        updatedAt: (users as any).updatedAt,
      })
      .from(users as any)
      .where(eq(users.id as any, userId));
    if (!u) throw new NotFoundException('User not found');
    if (!u.passwordHash)
      throw new BadRequestException('Password is not set for this user');
    return u.passwordHash as string;
  }

  private parseRoles(roles?: string): string[] | null {
    if (!roles) return null;
    const list = roles
      .split('.')
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => r.toUpperCase());
    return list.length ? list : null;
  }

  private buildWhere({ roles, search }: { roles?: string; search?: string }) {
    const conds: any[] = [];

    const parsed = this.parseRoles(roles);
    if (parsed) {
      // If your schema uses users.role (TEXT)
      conds.push(inArray((users as any).role, parsed as any));
      // If you use a roles table, replace with a JOIN and filter on roles.name IN (...)
    }

    if (search) {
      const q = `%${search}%`;
      const nameCol =
        (users as any).name ??
        (users as any).fullName ??
        (users as any).displayName;
      const emailCol = (users as any).email;
      if (nameCol && emailCol) {
        conds.push(sql`(${nameCol} ILIKE ${q} OR ${emailCol} ILIKE ${q})`);
      } else if (emailCol) {
        conds.push(ilike(emailCol, q));
      }
    }

    if (!conds.length) return sql`true`;
    return and(...(conds as any));
  }

  async findAllSimple(params: { roles?: string; search?: string }) {
    const where = this.buildWhere(params);
    const rows = await this.db
      .select({
        id: users.id,
        name: (users as any).name,
        email: (users as any).email,
        role: (users as any).role,
        createdAt: (users as any).createdAt ?? (users as any).created_at,
      })
      .from(users as any)
      .where(where)
      .orderBy(
        desc((users as any).createdAt ?? (users as any).created_at ?? users.id),
      );

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name ?? null,
      email: r.email ?? null,
      role: r.role ?? null,
      created_at: (r.createdAt ?? null) as any,
    }));
  }

  private parseSort(sort?: string) {
    // Expect sort as JSON string like: [{"id":"name","desc":false}]
    const allowed: Record<string, any> = {
      id: users.id,
      name: (users as any).name,
      email: (users as any).email,
      created_at:
        (users as any).createdAt ?? (users as any).created_at ?? users.id,
      role: (users as any).role,
    };

    if (!sort) return [desc(allowed.created_at)];
    try {
      const arr = JSON.parse(sort);
      if (!Array.isArray(arr) || !arr.length) return [desc(allowed.created_at)];
      const orderBys: any[] = [];
      for (const item of arr) {
        const col = allowed[item.id];
        if (!col) continue;
        orderBys.push(item.desc ? desc(col) : asc(col));
      }
      return orderBys.length ? orderBys : [desc(allowed.created_at)];
    } catch {
      return [desc(allowed.created_at)];
    }
  }

  async findPaginated(params: {
    page?: number;
    limit?: number;
    roles?: string;
    search?: string;
    sort?: string;
  }) {
    const page = Math.max(Number(params.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 100);
    const offset = (page - 1) * limit;

    const where = this.buildWhere(params);
    const orderBys = this.parseSort(params.sort);

    const totalRows = await this.db
      .select({ c: sql<string>`count(*)` })
      .from(users as any)
      .where(where);
    const total = Number(totalRows[0]?.c ?? '0');

    const rows = await this.db
      .select({
        id: users.id,
        name: (users as any).name,
        email: (users as any).email,
        role: (users as any).role,
        createdAt: (users as any).createdAt ?? (users as any).created_at,
      })
      .from(users as any)
      .where(where)
      .orderBy(...orderBys)
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      time: new Date().toISOString(),
      message: 'Sample user data for testing and learning purposes',
      total_users: total,
      offset,
      limit,
      users: rows.map((r: any) => ({
        id: r.id,
        name: r.name ?? null,
        email: r.email ?? null,
        role: r.role ?? null,
        created_at: (r.createdAt ?? null) as any,
      })),
    };
  }

  async findAll(role?: string) {
    if (role) {
      return this.db.query.users.findMany({
        where: eq(users.role, role),
      });
    }
    return this.db.query.users.findMany();
  }

  async findOne(id: number) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async changePassword(actingUser: { id: number }, dto: ChangePasswordDto) {
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'Password baru tidak boleh sama dengan password lama',
      );
    }

    const issues = validatePasswordStrength(dto.newPassword);
    if (issues.length)
      throw new BadRequestException('Password lemah: ' + issues.join(', '));

    const currentHash = await this.getUserPasswordHash(actingUser.id);
    const ok = await argon2.verify(currentHash, dto.currentPassword);
    if (!ok) throw new ForbiddenException('Password saat ini salah');

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await this.db
      .update(users as any)
      .set({ passwordHash: newHash, passwordUpdatedAt: new Date() } as any)
      .where(eq(users.id as any, actingUser.id));

    // Emit event for downstream (e.g., revoke sessions, notify user)
    this.events.emit('user.password.changed', { userId: actingUser.id });

    return { ok: true };
  }

  async adminResetPassword(
    actingUser: { id: number; role?: string },
    dto: AdminResetPasswordDto,
  ) {
    if (actingUser.role !== 'ADMIN')
      throw new ForbiddenException('Hanya admin yang boleh reset password');

    const issues = validatePasswordStrength(dto.newPassword);
    if (issues.length)
      throw new BadRequestException('Password lemah: ' + issues.join(', '));

    // ensure user exists
    const [u] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, dto.userId));
    if (!u) throw new NotFoundException('User tidak ditemukan');

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await this.db
      .update(users as any)
      .set({ passwordHash: newHash, passwordUpdatedAt: new Date() } as any)
      .where(eq(users.id as any, dto.userId));

    this.events.emit('user.password.reset', {
      userId: dto.userId,
      byAdminId: actingUser.id,
    });
    return { ok: true };
  }

  async create(createUserDto: CreateUserDto, currentUserRole: string) {
    const { email, password, firstName, lastName, role } = createUserDto;

    // Only superadmin can create admin users
    if (role === 'admin' && currentUserRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can create admin users');
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const newUser = await this.db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: ROLES.USER,
      })
      .returning();

    return newUser[0];
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUserRole: string,
    currentUserId: number,
  ) {
    // Find the user to be updated
    const userToUpdate = await this.findOne(id);

    // Only superadmin can update admin users
    if (userToUpdate.role === 'admin' && currentUserRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can update admin users');
    }

    // Users can only update their own profile, unless they're admin or superadmin
    if (
      currentUserId !== id &&
      !['admin', 'superadmin'].includes(currentUserRole)
    ) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Hash password if provided
    let updateData: any = { ...updateUserDto };
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Only superadmin can change roles
    if (updateUserDto.role && currentUserRole !== 'superadmin') {
      delete updateData.role;
    }

    const updatedUser = await this.db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return updatedUser[0];
  }

  async remove(id: number, currentUserRole: string) {
    const userToDelete = await this.findOne(id);

    // Only superadmin can delete admin users
    if (userToDelete.role === 'admin' && currentUserRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmin can delete admin users');
    }

    await this.db.delete(users).where(eq(users.id, id));
    return { message: 'User deleted successfully' };
  }
}
