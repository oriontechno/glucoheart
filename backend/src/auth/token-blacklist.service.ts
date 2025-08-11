import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenBlacklistService {
  private readonly blacklistedTokens: Map<string, Date> = new Map();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private configService: ConfigService) {
    // Bersihkan token yang sudah expired setiap jam
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredTokens(),
      3600000,
    );
  }

  blacklistToken(token: string, expiryDate: Date): void {
    this.blacklistedTokens.set(token, expiryDate);
  }

  isBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    this.blacklistedTokens.forEach((expiry, token) => {
      if (expiry <= now) {
        this.blacklistedTokens.delete(token);
      }
    });
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }
}
