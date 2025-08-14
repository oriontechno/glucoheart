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

  // --- Helpers aman ---

  private parseRoles(roles?: string): string[] | null {
    if (!roles) return null;
    const list = roles
      .split('.')
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => r.toUpperCase());
    return list.length ? list : null;
  }

  private buildWhere(params: { roles?: string; search?: string }) {
    const conds: any[] = [];

    // roles filter: enum users.role
    const parsed = this.parseRoles(params.roles);
    if (parsed) conds.push(inArray(users.role, parsed as any));

    // search by email / firstName / lastName
    if (params.search) {
      const q = `%${params.search}%`;
      conds.push(
        sql`(
          ${users.email} ILIKE ${q}
          OR ${users.firstName} ILIKE ${q}
          OR ${users.lastName} ILIKE ${q}
        )`,
      );
    }

    return conds.length ? and(...conds) : sql`true`;
  }

  private parseSort(sort?: string) {
    // dukung kunci: id, first_name, last_name, email, created_at, role
    const allowed: Record<string, any> = {
      id: users.id,
      first_name: users.firstName,
      last_name: users.lastName,
      firstName: users.firstName, // kompatibel
      lastName: users.lastName, // kompatibel
      email: users.email,
      created_at: users.createdAt,
      role: users.role,
    };

    const def = users.createdAt;

    if (!sort) return [desc(def)];
    try {
      const arr = JSON.parse(sort);
      if (!Array.isArray(arr) || !arr.length) return [desc(def)];
      const orderBys: any[] = [];
      for (const item of arr) {
        const col = allowed[item?.id as string];
        if (!col) continue;
        orderBys.push(item?.desc ? desc(col) : asc(col));
      }
      return orderBys.length ? orderBys : [desc(def)];
    } catch {
      return [desc(def)];
    }
  }

  // === GET /users/all ===
  async findAllSimple(params: { roles?: string; search?: string }) {
    const where = this.buildWhere(params);

    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePicture: users.profilePicture,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt));

    return rows.map((r) => ({
      id: r.id,
      firstName: r.firstName ?? null,
      lastName: r.lastName ?? null,
      email: r.email ?? null,
      role: r.role ?? null,
      profilePicture: r.profilePicture ?? null,
      created_at: r.createdAt ?? null,
    }));
  }

  // === GET /users (paginate + sort) ===
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
      .select({ c: sql<number>`count(*)::int` })
      .from(users)
      .where(where);

    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePicture: users.profilePicture,
      })
      .from(users)
      .where(where)
      .orderBy(...orderBys)
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      time: new Date().toISOString(),
      message: 'Sample user data for testing and learning purposes',
      total_users: totalRows[0]?.c ?? 0,
      offset,
      limit,
      users: rows.map((r) => ({
        id: r.id,
        firstName: r.firstName ?? null,
        lastName: r.lastName ?? null,
        email: r.email ?? null,
        role: r.role ?? null,
        profilePicture: r.profilePicture ?? null,
        created_at: r.createdAt ?? null,
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
