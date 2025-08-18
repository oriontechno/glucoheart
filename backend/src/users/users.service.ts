import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../db/schema';
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
        passwordHash: users.password, // <- alias dari kolom 'password'
        updatedAt: users.updatedAt, // <- kolom ada di schema
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!u) throw new NotFoundException('User not found');
    if (!u.passwordHash) {
      throw new BadRequestException('Password is not set for this user');
    }
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

  async changePassword(
    actingUser: { id: number },
    dto: { currentPassword: string; newPassword: string },
  ) {
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException(
        'Password baru tidak boleh sama dengan password lama',
      );
    }

    const issues = validatePasswordStrength(dto.newPassword);
    if (issues.length) {
      throw new BadRequestException('Password lemah: ' + issues.join(', '));
    }

    // ambil hash sekarang dari DB
    const currentHash = await this.getUserPasswordHash(actingUser.id);

    // ✅ urutan benar: compare(plain, hash)
    const ok = await bcrypt.compare(dto.currentPassword, currentHash);
    if (!ok) {
      throw new ForbiddenException('Password saat ini salah');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    try {
      await this.db
        .update(users)
        .set({
          password: newHash, // ✅ kolom sesuai schema
          updatedAt: new Date(), // ✅ gunakan updatedAt
        })
        .where(eq(users.id, actingUser.id));

      // Emit event downstream kalau kamu memang punya event emitter ini
      this.events?.emit?.('user.password.changed', { userId: actingUser.id });

      return { message: 'Password changed successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to change password');
    }
  }

  async adminResetPassword(
    actingUser: { id: number; role?: string },
    dto: { userId: number | string; newPassword: string },
  ) {
    // hanya ADMIN
    if (actingUser.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya admin yang boleh reset password');
    }

    // validasi userId number
    const userId = Number(dto.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('userId tidak valid');
    }

    // cek kekuatan password
    const issues = validatePasswordStrength(dto.newPassword);
    if (issues.length) {
      throw new BadRequestException('Password lemah: ' + issues.join(', '));
    }

    // pastikan user ada
    const [u] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) throw new NotFoundException('User tidak ditemukan');

    // hash baru
    const newHash = await bcrypt.hash(dto.newPassword, 10);

    try {
      await this.db
        .update(users)
        .set({
          password: newHash, // ✅ kolom sesuai schema
          updatedAt: new Date(), // ✅ kolom sesuai schema
        })
        .where(eq(users.id, userId));

      // Emit event kalau ada emitter yang diinject
      this.events?.emit?.('user.password.reset', {
        userId,
        byAdminId: actingUser.id,
      });

      return { message: 'Password reset successfully' };
    } catch (err: any) {
      // kalau perlu debugging:
      // console.error('adminResetPassword error:', err?.message, err);
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  async create(createUserDto: CreateUserDto, currentUserRole: string) {
    const { email, password, firstName, lastName, role } = createUserDto;

    // Only superadmin can create admin users
    if (role === 'SUPPORT' && currentUserRole !== 'ADMIN') {
      throw new ForbiddenException('Only Admin can create Support users');
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    try {
      const newUser = await this.db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role.toUpperCase(),
        })
        .returning();

      return newUser[0];
    } catch (error) {
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUserRole: string,
    currentUserId: number,
  ) {
    // Find the user to be updated
    const userToUpdate = await this.findOne(id);

    // Only Admin can update Support users
    if (userToUpdate.role === 'SUPPORT' && currentUserRole !== 'ADMIN') {
      throw new ForbiddenException('Only Admin can update Support users');
    }

    // Users can only update their own profile, unless they're admin or superadmin
    if (
      currentUserId !== id &&
      !['SUPPORT', 'ADMIN'].includes(currentUserRole)
    ) {
      throw new ForbiddenException('You can only update your own profile');
    }

    let updateData: any = { ...updateUserDto };

    // Only Admin can change roles
    if (updateUserDto.role && currentUserRole !== 'ADMIN') {
      delete updateData.role;
    }

    try {
      const updatedUser = await this.db
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      return updatedUser[0];
    } catch (error) {
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async remove(id: number, currentUserRole: string) {
    const userToDelete = await this.findOne(id);

    // Only Admin can delete Support users
    if (userToDelete.role === 'SUPPORT' && currentUserRole !== 'ADMIN') {
      throw new ForbiddenException('Only Admin can delete Support users');
    }

    try {
      await this.db.delete(users).where(eq(users.id, id));
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
