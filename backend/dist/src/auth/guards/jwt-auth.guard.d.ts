import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenBlacklistService } from '../token-blacklist.service';
import { Observable } from 'rxjs';
declare const JwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtAuthGuard extends JwtAuthGuard_base {
    private reflector;
    private tokenBlacklistService;
    private readonly logger;
    constructor(reflector: Reflector, tokenBlacklistService: TokenBlacklistService);
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean>;
    handleRequest(err: any, user: any, info: any): any;
}
export {};
