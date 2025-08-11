import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class UsersService {
    private db;
    private readonly events;
    constructor(db: NodePgDatabase<typeof import('../db/schema')>, events: EventEmitter2);
    private getUserPasswordHash;
    private parseRoles;
    private buildWhere;
    findAllSimple(params: {
        roles?: string;
        search?: string;
    }): Promise<{
        id: any;
        name: any;
        email: any;
        role: any;
        created_at: any;
    }[]>;
    private parseSort;
    findPaginated(params: {
        page?: number;
        limit?: number;
        roles?: string;
        search?: string;
        sort?: string;
    }): Promise<{
        success: boolean;
        time: string;
        message: string;
        total_users: number;
        offset: number;
        limit: number;
        users: {
            id: any;
            name: any;
            email: any;
            role: any;
            created_at: any;
        }[];
    }>;
    findAll(role?: string): Promise<{
        password: string | null;
        role: string;
        id: number;
        email: string;
        googleId: string | null;
        firstName: string | null;
        lastName: string | null;
        profilePicture: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }[]>;
    findOne(id: number): Promise<{
        password: string | null;
        role: string;
        id: number;
        email: string;
        googleId: string | null;
        firstName: string | null;
        lastName: string | null;
        profilePicture: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    changePassword(actingUser: {
        id: number;
    }, dto: ChangePasswordDto): Promise<{
        ok: boolean;
    }>;
    adminResetPassword(actingUser: {
        id: number;
        role?: string;
    }, dto: AdminResetPasswordDto): Promise<{
        ok: boolean;
    }>;
    create(createUserDto: CreateUserDto, currentUserRole: string): Promise<{
        password: string | null;
        role: string;
        id: number;
        email: string;
        googleId: string | null;
        firstName: string | null;
        lastName: string | null;
        profilePicture: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    update(id: number, updateUserDto: UpdateUserDto, currentUserRole: string, currentUserId: number): Promise<{
        id: number;
        email: string;
        password: string | null;
        googleId: string | null;
        firstName: string | null;
        lastName: string | null;
        role: string;
        profilePicture: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    remove(id: number, currentUserRole: string): Promise<{
        message: string;
    }>;
}
