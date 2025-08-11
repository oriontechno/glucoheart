import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
type RequestUser = {
    id: number;
    role?: 'ADMIN' | 'SUPPORT' | 'NURSE' | 'USER';
};
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto, req: any): Promise<{
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
    getAll(roles?: string, search?: string): Promise<{
        id: any;
        name: any;
        email: any;
        role: any;
        created_at: any;
    }[]>;
    getPaginated(page?: string, limit?: string, roles?: string, search?: string, sort?: string): Promise<{
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
    findOne(id: string): Promise<{
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
    update(id: string, updateUserDto: UpdateUserDto, req: any): Promise<{
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
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
    changePassword(req: Request & {
        user: RequestUser;
    }, dto: ChangePasswordDto): Promise<{
        ok: boolean;
    }>;
    adminResetPassword(req: Request & {
        user: RequestUser;
    }, dto: AdminResetPasswordDto): Promise<{
        ok: boolean;
    }>;
}
export {};
