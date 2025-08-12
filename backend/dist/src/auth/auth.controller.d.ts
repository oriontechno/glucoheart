import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './token-blacklist.service';
import { JwtService } from '@nestjs/jwt';
import type { CreateRegisterDto } from './schema/register.schema';
export declare class AuthController {
    private readonly authService;
    private readonly configService;
    private readonly tokenBlacklistService;
    private readonly jwtService;
    private readonly logger;
    constructor(authService: AuthService, configService: ConfigService, tokenBlacklistService: TokenBlacklistService, jwtService: JwtService);
    register(createRegisterDto: CreateRegisterDto): Promise<{
        message: string;
        user: {
            id: number;
            email: string;
            role: string;
        };
    }>;
    login(loginDto: LoginDto, user: any): Promise<{
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
    getProfile(user: any, req: Request): Promise<{
        email: string;
        firstName: string | null;
        lastName: string | null;
        id: number;
        googleId: string | null;
        role: string;
        profilePicture: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    }>;
    googleAuth(): void;
    googleAuthCallback(req: any, res: Response): Promise<void>;
    refreshToken(user: any): Promise<{
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
    checkApiStatus(req: Request): {
        status: string;
        time: string;
    };
    logout(req: Request): Promise<{
        message: string;
    }>;
}
