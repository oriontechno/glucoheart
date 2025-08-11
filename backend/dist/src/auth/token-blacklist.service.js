"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenBlacklistService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let TokenBlacklistService = class TokenBlacklistService {
    configService;
    blacklistedTokens = new Map();
    cleanupInterval;
    constructor(configService) {
        this.configService = configService;
        this.cleanupInterval = setInterval(() => this.cleanupExpiredTokens(), 3600000);
    }
    blacklistToken(token, expiryDate) {
        this.blacklistedTokens.set(token, expiryDate);
    }
    isBlacklisted(token) {
        return this.blacklistedTokens.has(token);
    }
    cleanupExpiredTokens() {
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
};
exports.TokenBlacklistService = TokenBlacklistService;
exports.TokenBlacklistService = TokenBlacklistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TokenBlacklistService);
//# sourceMappingURL=token-blacklist.service.js.map