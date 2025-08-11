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
var JwtAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const passport_1 = require("@nestjs/passport");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const token_blacklist_service_1 = require("../token-blacklist.service");
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    reflector;
    tokenBlacklistService;
    logger = new common_1.Logger(JwtAuthGuard_1.name);
    constructor(reflector, tokenBlacklistService) {
        super();
        this.reflector = reflector;
        this.tokenBlacklistService = tokenBlacklistService;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
            const token = authHeader.split(' ')[1];
            if (this.tokenBlacklistService.isBlacklisted(token)) {
                this.logger.log('Token blacklisted, access denied');
                throw new common_1.UnauthorizedException('Token has been invalidated');
            }
        }
        return super.canActivate(context);
    }
    handleRequest(err, user, info) {
        if (err || !user) {
            this.logger.error('Authentication failed:', err?.message || 'No user found');
            this.logger.error('Auth info:', info);
            throw err || new common_1.UnauthorizedException('Authentication required');
        }
        return user;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        token_blacklist_service_1.TokenBlacklistService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map