import { ConfigService } from '@nestjs/config';
export declare class TokenBlacklistService {
    private configService;
    private readonly blacklistedTokens;
    private readonly cleanupInterval;
    constructor(configService: ConfigService);
    blacklistToken(token: string, expiryDate: Date): void;
    isBlacklisted(token: string): boolean;
    private cleanupExpiredTokens;
    onModuleDestroy(): void;
}
