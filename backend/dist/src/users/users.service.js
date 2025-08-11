"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema_1 = require("../db/schema");
const argon2 = __importStar(require("argon2"));
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt = __importStar(require("bcrypt"));
const roles_1 = require("../db/schema/roles");
const password_policy_1 = require("./password.policy");
const event_emitter_1 = require("@nestjs/event-emitter");
let UsersService = class UsersService {
    db;
    events;
    constructor(db, events) {
        this.db = db;
        this.events = events;
    }
    async getUserPasswordHash(userId) {
        const [u] = await this.db
            .select({
            id: schema_1.users.id,
            passwordHash: schema_1.users.passwordHash,
            updatedAt: schema_1.users.updatedAt,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        if (!u)
            throw new common_1.NotFoundException('User not found');
        if (!u.passwordHash)
            throw new common_1.BadRequestException('Password is not set for this user');
        return u.passwordHash;
    }
    parseRoles(roles) {
        if (!roles)
            return null;
        const list = roles
            .split('.')
            .map((r) => r.trim())
            .filter(Boolean)
            .map((r) => r.toUpperCase());
        return list.length ? list : null;
    }
    buildWhere({ roles, search }) {
        const conds = [];
        const parsed = this.parseRoles(roles);
        if (parsed) {
            conds.push((0, drizzle_orm_1.inArray)(schema_1.users.role, parsed));
        }
        if (search) {
            const q = `%${search}%`;
            const nameCol = schema_1.users.name ??
                schema_1.users.fullName ??
                schema_1.users.displayName;
            const emailCol = schema_1.users.email;
            if (nameCol && emailCol) {
                conds.push((0, drizzle_orm_1.sql) `(${nameCol} ILIKE ${q} OR ${emailCol} ILIKE ${q})`);
            }
            else if (emailCol) {
                conds.push((0, drizzle_orm_1.ilike)(emailCol, q));
            }
        }
        if (!conds.length)
            return (0, drizzle_orm_1.sql) `true`;
        return (0, drizzle_orm_1.and)(...conds);
    }
    async findAllSimple(params) {
        const where = this.buildWhere(params);
        const rows = await this.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            email: schema_1.users.email,
            role: schema_1.users.role,
            createdAt: schema_1.users.createdAt ?? schema_1.users.created_at,
        })
            .from(schema_1.users)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt ?? schema_1.users.created_at ?? schema_1.users.id));
        return rows.map((r) => ({
            id: r.id,
            name: r.name ?? null,
            email: r.email ?? null,
            role: r.role ?? null,
            created_at: (r.createdAt ?? null),
        }));
    }
    parseSort(sort) {
        const allowed = {
            id: schema_1.users.id,
            name: schema_1.users.name,
            email: schema_1.users.email,
            created_at: schema_1.users.createdAt ?? schema_1.users.created_at ?? schema_1.users.id,
            role: schema_1.users.role,
        };
        if (!sort)
            return [(0, drizzle_orm_1.desc)(allowed.created_at)];
        try {
            const arr = JSON.parse(sort);
            if (!Array.isArray(arr) || !arr.length)
                return [(0, drizzle_orm_1.desc)(allowed.created_at)];
            const orderBys = [];
            for (const item of arr) {
                const col = allowed[item.id];
                if (!col)
                    continue;
                orderBys.push(item.desc ? (0, drizzle_orm_1.desc)(col) : (0, drizzle_orm_1.asc)(col));
            }
            return orderBys.length ? orderBys : [(0, drizzle_orm_1.desc)(allowed.created_at)];
        }
        catch {
            return [(0, drizzle_orm_1.desc)(allowed.created_at)];
        }
    }
    async findPaginated(params) {
        const page = Math.max(Number(params.page ?? 1), 1);
        const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 100);
        const offset = (page - 1) * limit;
        const where = this.buildWhere(params);
        const orderBys = this.parseSort(params.sort);
        const totalRows = await this.db
            .select({ c: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.users)
            .where(where);
        const total = Number(totalRows[0]?.c ?? '0');
        const rows = await this.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            email: schema_1.users.email,
            role: schema_1.users.role,
            createdAt: schema_1.users.createdAt ?? schema_1.users.created_at,
        })
            .from(schema_1.users)
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
            users: rows.map((r) => ({
                id: r.id,
                name: r.name ?? null,
                email: r.email ?? null,
                role: r.role ?? null,
                created_at: (r.createdAt ?? null),
            })),
        };
    }
    async findAll(role) {
        if (role) {
            return this.db.query.users.findMany({
                where: (0, drizzle_orm_1.eq)(schema_1.users.role, role),
            });
        }
        return this.db.query.users.findMany();
    }
    async findOne(id) {
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, id),
        });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async changePassword(actingUser, dto) {
        if (dto.newPassword === dto.currentPassword) {
            throw new common_1.BadRequestException('Password baru tidak boleh sama dengan password lama');
        }
        const issues = (0, password_policy_1.validatePasswordStrength)(dto.newPassword);
        if (issues.length)
            throw new common_1.BadRequestException('Password lemah: ' + issues.join(', '));
        const currentHash = await this.getUserPasswordHash(actingUser.id);
        const ok = await argon2.verify(currentHash, dto.currentPassword);
        if (!ok)
            throw new common_1.ForbiddenException('Password saat ini salah');
        const newHash = await argon2.hash(dto.newPassword, {
            type: argon2.argon2id,
        });
        await this.db
            .update(schema_1.users)
            .set({ passwordHash: newHash, passwordUpdatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, actingUser.id));
        this.events.emit('user.password.changed', { userId: actingUser.id });
        return { ok: true };
    }
    async adminResetPassword(actingUser, dto) {
        if (actingUser.role !== 'ADMIN')
            throw new common_1.ForbiddenException('Hanya admin yang boleh reset password');
        const issues = (0, password_policy_1.validatePasswordStrength)(dto.newPassword);
        if (issues.length)
            throw new common_1.BadRequestException('Password lemah: ' + issues.join(', '));
        const [u] = await this.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, dto.userId));
        if (!u)
            throw new common_1.NotFoundException('User tidak ditemukan');
        const newHash = await argon2.hash(dto.newPassword, {
            type: argon2.argon2id,
        });
        await this.db
            .update(schema_1.users)
            .set({ passwordHash: newHash, passwordUpdatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, dto.userId));
        this.events.emit('user.password.reset', {
            userId: dto.userId,
            byAdminId: actingUser.id,
        });
        return { ok: true };
    }
    async create(createUserDto, currentUserRole) {
        const { email, password, firstName, lastName, role } = createUserDto;
        if (role === 'admin' && currentUserRole !== 'superadmin') {
            throw new common_1.ForbiddenException('Only superadmin can create admin users');
        }
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        const newUser = await this.db
            .insert(schema_1.users)
            .values({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: roles_1.ROLES.USER,
        })
            .returning();
        return newUser[0];
    }
    async update(id, updateUserDto, currentUserRole, currentUserId) {
        const userToUpdate = await this.findOne(id);
        if (userToUpdate.role === 'admin' && currentUserRole !== 'superadmin') {
            throw new common_1.ForbiddenException('Only superadmin can update admin users');
        }
        if (currentUserId !== id &&
            !['admin', 'superadmin'].includes(currentUserRole)) {
            throw new common_1.ForbiddenException('You can only update your own profile');
        }
        let updateData = { ...updateUserDto };
        if (updateUserDto.password) {
            updateData.password = await bcrypt.hash(updateUserDto.password, 10);
        }
        if (updateUserDto.role && currentUserRole !== 'superadmin') {
            delete updateData.role;
        }
        const updatedUser = await this.db
            .update(schema_1.users)
            .set({
            ...updateData,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, id))
            .returning();
        return updatedUser[0];
    }
    async remove(id, currentUserRole) {
        const userToDelete = await this.findOne(id);
        if (userToDelete.role === 'admin' && currentUserRole !== 'superadmin') {
            throw new common_1.ForbiddenException('Only superadmin can delete admin users');
        }
        await this.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
        return { message: 'User deleted successfully' };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        event_emitter_1.EventEmitter2])
], UsersService);
//# sourceMappingURL=users.service.js.map