import { JwtService } from '@nestjs/jwt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private db;
    private jwtService;
    constructor(db: NodePgDatabase<typeof import('../db/schema')>, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        user: {
            id: number;
            email: string;
            role: string;
        };
    }>;
    validateUser(email: string, password: string): Promise<any>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            role: any;
            profilePicture: any;
        };
    }>;
    generateToken(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            role: any;
            profilePicture: any;
        };
    }>;
    getProfile(userId: number): Promise<{
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
    validateGoogleUser(profile: any): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            firstName: any;
            lastName: any;
            role: any;
            profilePicture: any;
        };
    }>;
}
